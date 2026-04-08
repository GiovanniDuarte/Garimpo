import { NextRequest, NextResponse } from 'next/server'
import {
  listarCanais,
  criarCanal,
  criarVideo,
  atualizarCanal,
} from '@/lib/db/queries'
import {
  getChannelInfo,
  getChannelVideos,
  getVideoDetails,
  parseYouTubeUrl,
  parsePublishedDate,
  type ChannelVideo,
} from '@/lib/scraper/youtube'
import {
  calcularFrequencia,
  parseJoinDateYoutube,
  resolverDataReferenciaIdadeCanal,
} from '@/lib/scraper/channel-info'
import { calcularGemScore } from '@/lib/scoring/gem-score'
import {
  detectarNichoTopVideos,
  rpmENichoDoRotulo,
  type AmostraNichoVideo,
} from '@/lib/nichos'
import { getCanalAvatarCached, clearCanalAvatarFiles } from '@/lib/canal-avatar-cache'
import { calcularPotencialModelagem } from '@/lib/scoring/potencial-modelagem'
import type { CanalStatus } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as CanalStatus | null
  const categoria = searchParams.get('categoria')
  const tag = searchParams.get('tag')
  const ORDER_FIELDS = [
    'criadoEm',
    'gemScore',
    'inscritos',
    'nome',
    'totalViews',
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
    orderBy: orderByParam,
    orderDir,
  })

  const withPotencial = canais.map((c) => {
    const dataRefIdade = resolverDataReferenciaIdadeCanal(
      c.videos.map((v) => ({ dataPublicacao: v.dataPublicacao })),
      c.dataCriacaoCanal
    )
    const { videos: _videosIdade, ...canalJson } = c
    return {
      ...canalJson,
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

    const { prisma } = await import('@/lib/db/prisma')
    const existing = await prisma.canal.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Canal não encontrado.' }, { status: 404 })
    }

    if (!existing.youtubeId) {
      return NextResponse.json(
        { error: 'Canal sem youtubeId. Não é possível atualizar.' },
        { status: 400 }
      )
    }

    const refVideo = await prisma.video.findFirst({
      where: { canalId: id },
      orderBy: { views: 'desc' },
      select: { youtubeId: true },
    })

    const enrichedData = await enrichChannelData(
      {
        youtubeId: existing.youtubeId,
        nome: existing.nome,
        url: existing.url,
        inscritos: existing.inscritos ?? undefined,
        thumbnailUrl: existing.thumbnailUrl ?? undefined,
        videoId: refVideo?.youtubeId,
      },
      {
        dataCriacaoCanal: existing.dataCriacaoCanal,
        nichoInferido: existing.nichoInferido,
      }
    )

    const thumbChanged =
      (enrichedData.thumbnailUrl || '') !== (existing.thumbnailUrl || '')
    if (thumbChanged) {
      await clearCanalAvatarFiles(id)
    }

    const updatePayload: Record<string, unknown> = {
      nome: enrichedData.nome,
      inscritos: enrichedData.inscritos,
      totalViews: enrichedData.totalViews,
      videosPublicados: enrichedData.videosPublicados,
      descricao: enrichedData.descricao,
      thumbnailUrl: enrichedData.thumbnailUrl,
      pais: enrichedData.pais,
      idiomaPrincipal: enrichedData.idiomaPrincipal,
      frequenciaPostagem: enrichedData.frequenciaPostagem,
      ultimaAtividade: enrichedData.ultimaAtividade,
      url: enrichedData.url,
    }
    if (thumbChanged) {
      updatePayload.avatarLocal = null
    }
    if (enrichedData.dataCriacaoCanal != null) {
      updatePayload.dataCriacaoCanal = enrichedData.dataCriacaoCanal
    }
    if (enrichedData.gemScore != null) {
      updatePayload.gemScore = enrichedData.gemScore
    }
    if (enrichedData.gemScoreDetalhado) {
      updatePayload.gemScoreDetalhado = enrichedData.gemScoreDetalhado
    }
    if (enrichedData.nichoInferido) {
      updatePayload.nichoInferido = enrichedData.nichoInferido
    }

    const updated = await atualizarCanal(
      id,
      updatePayload as Parameters<typeof atualizarCanal>[1]
    )

    if (updated.thumbnailUrl) {
      void getCanalAvatarCached(id).catch(() => {})
    }

    try {
      const videos = await getChannelVideos(existing.youtubeId, 20)
      for (const v of videos) {
        const pubDate = parsePublishedDate(v.publishedText)
        try {
          await criarVideo({
            youtubeId: v.videoId,
            canalId: id,
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
      console.error('Failed to refresh channel videos:', e)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Channel update error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar canal.' },
      { status: 500 }
    )
  }
}

type EnrichExisting = {
  dataCriacaoCanal?: Date | null
  /** Mantém RPM do Gem alinhado ao nicho guardado se a deteção automática falhar. */
  nichoInferido?: string | null
}

async function enrichChannelData(
  body: {
    youtubeId: string
    videoId?: string
    nome?: string
    url?: string
    inscritos?: number
    thumbnailUrl?: string
    gemScore?: number
    gemScoreDetalhado?: string
  },
  existing?: EnrichExisting
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let enrichedData: Record<string, any> = { ...body }
  let channelId = body.youtubeId

  try {
    let info = await getChannelInfo(channelId)

    if (!info.name && body.videoId) {
      try {
        const videoDetails = await getVideoDetails(body.videoId)
        if (videoDetails.channelId && videoDetails.channelId !== channelId) {
          channelId = videoDetails.channelId
          info = await getChannelInfo(channelId)
        }
      } catch {
        // ignore
      }
    }

    let dataCriacaoMerged: Date | undefined
    if (info.joinDate) {
      const p = parseJoinDateYoutube(info.joinDate)
      if (p && !isNaN(p.getTime())) dataCriacaoMerged = p
    }
    if (!dataCriacaoMerged && existing?.dataCriacaoCanal != null) {
      const e =
        existing.dataCriacaoCanal instanceof Date
          ? existing.dataCriacaoCanal
          : new Date(existing.dataCriacaoCanal)
      if (!isNaN(e.getTime())) dataCriacaoMerged = e
    }

    enrichedData = {
      ...enrichedData,
      youtubeId: channelId,
      nome: info.name || body.nome,
      inscritos: info.subscribers || body.inscritos,
      totalViews: info.totalViews || undefined,
      videosPublicados: info.videoCount || undefined,
      descricao: info.description || undefined,
      thumbnailUrl: info.avatar || body.thumbnailUrl,
      pais: info.country || undefined,
      idiomaPrincipal: 'en',
      dataCriacaoCanal: dataCriacaoMerged,
      url: info.url || body.url || `https://www.youtube.com/channel/${channelId}`,
    }

    const videos = await getChannelVideos(channelId, 20)

    let parsedVideos: Array<ChannelVideo & { pubDate?: Date | null }> = []

    if (videos.length > 0) {
      parsedVideos = videos.map((v) => {
        const pubDate = parsePublishedDate(v.publishedText)
        return { ...v, pubDate }
      })

      const dates = parsedVideos
        .map((v) => v.pubDate)
        .filter(Boolean) as Date[]

      if (dates.length >= 2) {
        enrichedData.frequenciaPostagem = calcularFrequencia(dates)
      }

      if (dates.length > 0) {
        enrichedData.ultimaAtividade = dates.sort(
          (a, b) => b.getTime() - a.getTime()
        )[0]
      }

      const top5PorViews = [...parsedVideos]
        .filter((v) => v.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
      const amostraNicho: AmostraNichoVideo[] = await Promise.all(
        top5PorViews.map(async (v) => {
          try {
            const vd = await getVideoDetails(v.videoId)
            return {
              titulo: v.title || vd.title || '',
              tags: Array.isArray(vd.keywords) ? vd.keywords : [],
            }
          } catch {
            return { titulo: v.title || '', tags: [] }
          }
        })
      )
      const nichoResult = detectarNichoTopVideos(amostraNicho)
      if (nichoResult) {
        enrichedData.nichoInferido = `${nichoResult.nicho} > ${nichoResult.subNicho}`
      }
    }

    /** Mesma lógica que `enrichSearchResults` no garimpo — evita salvar outro total do que o utilizador viu. */
    let gemAlinhadoAoGarimpo = false
    if (body.videoId) {
      try {
        const vd = await getVideoDetails(body.videoId)
        const pubDate =
          parsePublishedDate(vd.publishDate || vd.uploadDate || '') ||
          new Date(Date.now() - 86400000)
        const joinParsed = info.joinDate
          ? parseJoinDateYoutube(info.joinDate)
          : undefined
        const idadeCanalDias = joinParsed
          ? Math.max(
              1,
              (Date.now() - joinParsed.getTime()) / 86400000
            )
          : Math.max(
              1,
              (Date.now() - pubDate.getTime()) / 86400000
            )
        const videoCount = info.videoCount || 0
        const vc = videoCount > 0 ? videoCount : 1
        const pubYt = videoCount > 0 ? videoCount : null
        const subs = enrichedData.inscritos || 0
        const nichoDataGarimpo =
          rpmENichoDoRotulo(enrichedData.nichoInferido) ??
          rpmENichoDoRotulo(existing?.nichoInferido) ??
          undefined
        const gemScore = calcularGemScore(
          {
            inscritos: Math.max(1, subs || 1),
            videos: [{ views: vd.views, dataPublicacao: pubDate }],
            totalViewsCanal: Math.max(0, info.totalViews || 0),
            videoCountCanal: vc,
            idadeCanalDias,
            videosPublicadosYoutube: pubYt,
          },
          nichoDataGarimpo,
          undefined
        )
        enrichedData.gemScore = gemScore.total
        enrichedData.gemScoreDetalhado = JSON.stringify(gemScore)
        gemAlinhadoAoGarimpo = true
      } catch {
        // fallback: cálculo com amostra de vídeos (ex.: GET do vídeo falhou)
      }
    }

    if (!gemAlinhadoAoGarimpo && videos.length > 0) {
      const subs = enrichedData.inscritos || 0
      const topVideos = parsedVideos
        .filter((v) => v.views > 0)
        .sort((a, b) => b.views - a.views)

      const nichoData =
        rpmENichoDoRotulo(enrichedData.nichoInferido) ??
        rpmENichoDoRotulo(existing?.nichoInferido) ??
        undefined

      if (topVideos.length > 0) {
        const dates = parsedVideos
          .map((v) => v.pubDate)
          .filter(Boolean) as Date[]
        const oldestPub = dates.length
          ? new Date(Math.min(...dates.map((d) => d.getTime())))
          : null
        const refIdadeDate =
          enrichedData.dataCriacaoCanal ?? oldestPub ?? null
        const refIdadeDias = refIdadeDate
          ? Math.max(
              1,
              (Date.now() - refIdadeDate.getTime()) / 86400000
            )
          : 90
        const potencial = calcularPotencialModelagem({
          inscritos: subs,
          totalViews: enrichedData.totalViews ?? 0,
          videosPublicados: enrichedData.videosPublicados,
          dataCriacaoCanal: refIdadeDate ?? enrichedData.dataCriacaoCanal,
          frequenciaPostagem: enrichedData.frequenciaPostagem,
        })
        const totalV =
          enrichedData.totalViews ??
          parsedVideos.reduce((acc, v) => acc + Math.max(0, v.views), 0)
        const vidCount =
          enrichedData.videosPublicados && enrichedData.videosPublicados > 0
            ? enrichedData.videosPublicados
            : parsedVideos.length

        const gemScore = calcularGemScore(
          {
            inscritos: Math.max(1, subs),
            videos: parsedVideos.map((v) => ({
              views: v.views,
              dataPublicacao: v.pubDate ?? null,
            })),
            totalViewsCanal: Math.max(0, totalV),
            videoCountCanal: Math.max(1, vidCount),
            idadeCanalDias: refIdadeDias,
            videosPublicadosYoutube:
              enrichedData.videosPublicados != null &&
              enrichedData.videosPublicados > 0
                ? enrichedData.videosPublicados
                : null,
          },
          nichoData,
          potencial.mpmIndice
        )
        enrichedData.gemScore = gemScore.total
        enrichedData.gemScoreDetalhado = JSON.stringify(gemScore)
      }
    }
  } catch (enrichError) {
    console.error('Channel enrichment failed:', enrichError)
  }

  return enrichedData
}
