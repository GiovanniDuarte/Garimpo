import { NextRequest, NextResponse } from 'next/server'
import { listarCanais, criarCanal, criarVideo } from '@/lib/db/queries'
import {
  getChannelInfo,
  getChannelVideos,
  getVideoDetails,
  parseYouTubeUrl,
  parsePublishedDate,
} from '@/lib/scraper/youtube'
import { resolverDataReferenciaIdadeCanal } from '@/lib/scraper/channel-info'
import { getCanalAvatarCached } from '@/lib/canal-avatar-cache'
import { calcularPotencialModelagem } from '@/lib/scoring/potencial-modelagem'
import type { CanalStatus } from '@/types'
import { enrichChannelData } from '@/lib/canais/enrich-channel-data'
import { refreshPerfilYoutubeCanal } from '@/lib/canais/refresh-perfil-youtube'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as CanalStatus | null
  const categoria = searchParams.get('categoria')
  const tag = searchParams.get('tag')
  const favoritoRaw = searchParams.get('favorito')
  const favorito =
    favoritoRaw === 'true' ? true : favoritoRaw === 'false' ? false : undefined
  const DB_ORDER_FIELDS = [
    'criadoEm',
    'gemScore',
    'inscritos',
    'nome',
    'totalViews',
  ] as const
  type DbOrderField = (typeof DB_ORDER_FIELDS)[number]
  const ORDER_FIELDS = [
    'criadoEm',
    'gemScore',
    'inscritos',
    'nome',
    'totalViews',
    'receitaMediaPorVideo',
  ] as const
  type OrderField = (typeof ORDER_FIELDS)[number]
  const obRaw = searchParams.get('orderBy')
  const orderByParam: OrderField = ORDER_FIELDS.includes(obRaw as OrderField)
    ? (obRaw as OrderField)
    : 'criadoEm'
  const orderDirRaw = searchParams.get('orderDir')
  const orderDir: 'asc' | 'desc' =
    orderDirRaw === 'asc' || orderDirRaw === 'desc' ? orderDirRaw : 'desc'

  const canais = await listarCanais({
    status: status || undefined,
    categoria: categoria || undefined,
    tag: tag || undefined,
    favorito,
    orderBy: (DB_ORDER_FIELDS.includes(orderByParam as DbOrderField)
      ? (orderByParam as DbOrderField)
      : 'criadoEm') as DbOrderField,
    orderDir,
  })

  const withPotencial = canais.map((c) => {
    const dataRefIdade = resolverDataReferenciaIdadeCanal(
      c.videos.map((v) => ({ dataPublicacao: v.dataPublicacao })),
      c.dataCriacaoCanal
    )
    const { videos: _videosIdade, ...canalJson } = c
    let rpmMedio: number | null = null
    if (typeof c.gemScoreDetalhado === 'string' && c.gemScoreDetalhado.trim()) {
      try {
        const parsed = JSON.parse(c.gemScoreDetalhado) as {
          nichoBonus?: { rpmMedio?: number }
        }
        if (typeof parsed?.nichoBonus?.rpmMedio === 'number') {
          rpmMedio = parsed.nichoBonus.rpmMedio
        }
      } catch {
        rpmMedio = null
      }
    }
    const totalViews = Math.max(0, c.totalViews ?? 0)
    const receitaEstimada =
      rpmMedio != null && totalViews > 0 ? (totalViews / 1000) * rpmMedio : null
    const videosCount = c.videosPublicados && c.videosPublicados > 0 ? c.videosPublicados : null
    const receitaMediaPorVideo =
      receitaEstimada != null && videosCount != null && videosCount > 0
        ? receitaEstimada / videosCount
        : null
    return {
      ...canalJson,
      receitaEstimada,
      receitaMediaPorVideo,
      potencialModelagem: calcularPotencialModelagem({
        inscritos: c.inscritos,
        totalViews: c.totalViews,
        videosPublicados: c.videosPublicados,
        dataCriacaoCanal: dataRefIdade ?? c.dataCriacaoCanal,
        frequenciaPostagem: c.frequenciaPostagem,
        videosSalvosCount: c._count.videos,
      }),
    }
  })

  if (orderByParam === 'receitaMediaPorVideo') {
    withPotencial.sort((a, b) => {
      const av = a.receitaMediaPorVideo ?? -1
      const bv = b.receitaMediaPorVideo ?? -1
      return orderDir === 'asc' ? av - bv : bv - av
    })
  }

  return NextResponse.json(withPotencial)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const resolvedYoutubeId =
      (typeof body.youtubeId === 'string' && body.youtubeId.trim()) ||
      (await resolveYoutubeChannelIdFromInput(
        typeof body.url === 'string' ? body.url : undefined
      ))

    if (!resolvedYoutubeId) {
      return NextResponse.json(
        {
          error:
            'Não consegui identificar o canal. Envie um youtubeId ou uma URL válida de canal/vídeo do YouTube.',
        },
        { status: 400 }
      )
    }

    const enrichedData = await enrichChannelData({
      ...body,
      youtubeId: resolvedYoutubeId,
    })
    const { videoId: _vid, ...canalData } = enrichedData
    const canal = await criarCanal(canalData as Parameters<typeof criarCanal>[0])

    try {
      const videos = await getChannelVideos(enrichedData.youtubeId, 20)
      for (const v of videos) {
        const pubDate = parsePublishedDate(v.publishedText)
        try {
          await criarVideo({
            youtubeId: v.videoId,
            canalId: canal.id,
            titulo: v.title,
            url: v.url,
            views: v.views,
            thumbnailUrl: v.thumbnailUrl,
            duracaoSegundos: v.duration,
            dataPublicacao: pubDate ?? null,
          })
        } catch {
          // duplicate
        }
      }
    } catch (e) {
      console.error('Failed to save channel videos:', e)
    }

    if (canal.thumbnailUrl) {
      void getCanalAvatarCached(canal.id).catch(() => {})
    }

    return NextResponse.json(canal, { status: 201 })
  } catch (error) {
    console.error('Channel create error:', error)
    const errMsg = error instanceof Error ? error.message : ''
    const message = errMsg.includes('Unique')
      ? 'Canal já existe na biblioteca.'
      : `Erro ao salvar canal.`
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

async function resolveYoutubeChannelIdFromInput(
  input?: string
): Promise<string | null> {
  const raw = input?.trim()
  if (!raw) return null
  if (/^UC[\w-]{20,}$/.test(raw)) return raw

  const parsed = parseYouTubeUrl(raw)
  if (parsed.type === 'video' && parsed.id) {
    try {
      const vd = await getVideoDetails(parsed.id)
      if (vd.channelId) return vd.channelId
    } catch {
      return null
    }
    return null
  }

  if (parsed.type === 'channel' && parsed.id) {
    if (/^UC[\w-]{20,}$/.test(parsed.id)) return parsed.id
    const byUrl = await resolveChannelIdFromPage(raw)
    if (byUrl) return byUrl

    const asHandle = parsed.id.startsWith('@') ? parsed.id : `@${parsed.id}`
    try {
      const info = await getChannelInfo(asHandle)
      if (info.channelId) return info.channelId
    } catch {
      // ignore
    }
    return null
  }

  if (raw.startsWith('@')) {
    try {
      const info = await getChannelInfo(raw)
      if (info.channelId) return info.channelId
    } catch {
      return null
    }
  }

  return null
}

async function resolveChannelIdFromPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/"browseId":"(UC[^"]+)"/)
    return match?.[1] || null
  } catch {
    return null
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body as { id: string }

    if (!id) {
      return NextResponse.json({ error: 'ID do canal é obrigatório.' }, { status: 400 })
    }

    try {
      const updated = await refreshPerfilYoutubeCanal(id)
      return NextResponse.json(updated)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('não encontrado')) {
        return NextResponse.json({ error: msg }, { status: 404 })
      }
      if (msg.includes('sem youtubeId')) {
        return NextResponse.json({ error: msg }, { status: 400 })
      }
      throw e
    }
  } catch (error) {
    console.error('Channel update error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar canal.' },
      { status: 500 }
    )
  }
}
