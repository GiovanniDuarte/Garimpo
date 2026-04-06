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
  parsePublishedDate,
} from '@/lib/scraper/youtube'
import { calcularFrequencia } from '@/lib/scraper/channel-info'
import { calcularGemScore } from '@/lib/scoring/gem-score'
import { detectarNicho, NICHOS } from '@/lib/nichos'
import { getCanalAvatarCached, clearCanalAvatarFiles } from '@/lib/canal-avatar-cache'
import { calcularPotencialModelagem } from '@/lib/scoring/potencial-modelagem'
import type { CanalStatus } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as CanalStatus | null
  const categoria = searchParams.get('categoria')
  const tag = searchParams.get('tag')
  const orderBy = searchParams.get('orderBy') as
    | 'criadoEm'
    | 'gemScore'
    | 'inscritos'
    | 'nome'
    | null
  const orderDir = searchParams.get('orderDir') as 'asc' | 'desc' | null

  const canais = await listarCanais({
    status: status || undefined,
    categoria: categoria || undefined,
    tag: tag || undefined,
    orderBy: orderBy || undefined,
    orderDir: orderDir || undefined,
  })

  const withPotencial = canais.map((c) => ({
    ...c,
    potencialModelagem: calcularPotencialModelagem({
      inscritos: c.inscritos,
      totalViews: c.totalViews,
      videosPublicados: c.videosPublicados,
      dataCriacaoCanal: c.dataCriacaoCanal,
      frequenciaPostagem: c.frequenciaPostagem,
      videosSalvosCount: c._count.videos,
    }),
  }))

  return NextResponse.json(withPotencial)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.youtubeId) {
      return NextResponse.json(
        { error: 'Canal sem identificação (youtubeId). Não é possível salvar.' },
        { status: 400 }
      )
    }

    const enrichedData = await enrichChannelData(body)
    const { videoId: _vid, ...canalData } = enrichedData
    const canal = await criarCanal(canalData as Parameters<typeof criarCanal>[0])

    try {
      const videos = await getChannelVideos(enrichedData.youtubeId, 20)
      for (const v of videos) {
        const pubDate = parsePublishedText(v.publishedText)
        try {
          await criarVideo({
            youtubeId: v.videoId,
            canalId: canal.id,
            titulo: v.title,
            url: v.url,
            views: v.views,
            thumbnailUrl: v.thumbnailUrl,
            duracaoSegundos: v.duration,
            dataPublicacao: pubDate || undefined,
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

    const enrichedData = await enrichChannelData({
      youtubeId: existing.youtubeId,
      nome: existing.nome,
      url: existing.url,
      inscritos: existing.inscritos ?? undefined,
      thumbnailUrl: existing.thumbnailUrl ?? undefined,
    })

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
    if (enrichedData.dataCriacaoCanal) {
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
        const pubDate = parsePublishedText(v.publishedText)
        try {
          await criarVideo({
            youtubeId: v.videoId,
            canalId: id,
            titulo: v.title,
            url: v.url,
            views: v.views,
            thumbnailUrl: v.thumbnailUrl,
            duracaoSegundos: v.duration,
            dataPublicacao: pubDate || undefined,
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

async function enrichChannelData(body: {
  youtubeId: string
  videoId?: string
  nome?: string
  url?: string
  inscritos?: number
  thumbnailUrl?: string
  gemScore?: number
  gemScoreDetalhado?: string
}) {
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
      dataCriacaoCanal: info.joinDate
        ? parseJoinDate(info.joinDate)
        : undefined,
      url: info.url || body.url || `https://www.youtube.com/channel/${channelId}`,
    }

    const videos = await getChannelVideos(channelId, 20)

    if (videos.length > 0) {
      const parsedVideos = videos.map((v) => {
        const pubDate = parsePublishedText(v.publishedText)
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

      const subs = enrichedData.inscritos || 0
      const topVideos = parsedVideos
        .filter((v) => v.views > 0)
        .sort((a, b) => b.views - a.views)

      const nichoResult = detectarNicho(
        enrichedData.descricao || '',
        parsedVideos.map((v) => v.title)
      )
      let nichoData: { rpmMedio: number; viralidade: number } | undefined
      if (nichoResult) {
        enrichedData.nichoInferido = `${nichoResult.nicho} > ${nichoResult.subNicho}`
        const parentNicho = NICHOS.find((n) => n.nome === nichoResult.nicho)
        const subNicho = parentNicho?.subNichos.find(
          (s) => s.nome === nichoResult.subNicho
        )
        if (subNicho) {
          nichoData = {
            rpmMedio: (subNicho.rpmEstimado.min + subNicho.rpmEstimado.max) / 2,
            viralidade: subNicho.viralidade,
          }
        }
      }

      if (topVideos.length > 0) {
        const best = topVideos[0]
        const gemScore = calcularGemScore(
          {
            views: best.views,
            dataPublicacao:
              best.pubDate || new Date(Date.now() - 14 * 86400000),
          },
          {
            inscritos: subs,
            topVideos: topVideos.map((v) => ({ views: v.views })),
            totalViews: enrichedData.totalViews ?? 0,
          },
          nichoData
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

function parseJoinDate(text: string): Date | undefined {
  try {
    const date = new Date(text)
    if (!isNaN(date.getTime())) return date
  } catch {
    // ignore
  }
  return undefined
}

function parsePublishedText(text: string): Date | null {
  if (!text) return null
  const match = text.match(
    /(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i
  )
  if (!match) return null
  return parsePublishedDate(text)
}
