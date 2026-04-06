import { NextRequest, NextResponse } from 'next/server'
import {
  parseYouTubeUrl,
  searchYouTubePage,
  getVideoDetails,
  getChannelInfo,
  parsePublishedDate,
  getRelatedVideosPage,
  type SearchResult,
} from '@/lib/scraper/youtube'
import { calcularGemScore } from '@/lib/scoring/gem-score'
import type { VideoGarimpo } from '@/types'

const CHANNEL_FETCH_CONCURRENCY = 5

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const ret: R[] = new Array(items.length)
  let nextIndex = 0
  async function worker() {
    while (true) {
      const i = nextIndex++
      if (i >= items.length) break
      ret[i] = await fn(items[i]!)
    }
  }
  const n = Math.min(concurrency, Math.max(1, items.length))
  await Promise.all(Array.from({ length: n }, () => worker()))
  return ret
}

async function enrichSearchResults(
  searchResults: SearchResult[],
  opts: {
    minViews: number
    maxInscritos: number
    duracaoMin?: number
    duracaoMax?: number
    seenVideoIds: Set<string>
    /** Em busca por vídeo de referência: não listar outros vídeos do mesmo canal. */
    excludeChannelId?: string | null
  },
  channelTotalViews: Map<string, number>
): Promise<VideoGarimpo[]> {
  const filtered = searchResults.filter((s) => {
    if (!s.videoId || opts.seenVideoIds.has(s.videoId)) return false
    if (
      opts.excludeChannelId &&
      s.channelId &&
      s.channelId === opts.excludeChannelId
    ) {
      return false
    }
    if (s.views < opts.minViews) return false
    if (s.duration > 0 && opts.duracaoMin != null && s.duration < opts.duracaoMin) {
      return false
    }
    if (s.duration > 0 && opts.duracaoMax != null && s.duration > opts.duracaoMax) {
      return false
    }
    return true
  })

  const enrichedRows = await mapWithConcurrency(filtered, CHANNEL_FETCH_CONCURRENCY, async (s) => {
    let subs = 0
    let channelThumb = ''
    let totalViews = channelTotalViews.get(s.channelId) ?? 0
    if (s.channelId) {
      try {
        const info = await getChannelInfo(s.channelId)
        subs = info.subscribers
        channelThumb = info.avatar
        totalViews = info.totalViews || 0
        channelTotalViews.set(s.channelId, totalViews)
      } catch {
        subs = 0
      }
    }
    return { s, subs, channelThumb, totalViews }
  })

  const out: VideoGarimpo[] = []

  for (const row of enrichedRows) {
    const { s, subs, channelThumb, totalViews } = row
    if (subs > opts.maxInscritos) continue

    const pubDate =
      parsePublishedDate(s.publishedText) || new Date(Date.now() - 86400000)
    const dias = Math.max(1, (Date.now() - pubDate.getTime()) / 86400000)
    const viewsPorDia = s.views / dias

    const gemScore = calcularGemScore(
      { views: s.views, dataPublicacao: pubDate },
      {
        inscritos: Math.max(1, subs),
        topVideos: [{ views: s.views }],
        totalViews,
      },
      undefined
    )

    out.push({
      youtubeId: s.videoId,
      titulo: s.title,
      url: s.url,
      thumbnailUrl: s.thumbnailUrl,
      views: s.views,
      dataPublicacao: pubDate.toISOString(),
      duracaoSegundos: s.duration,
      viewsPorDia,
      canal: {
        youtubeId: s.channelId,
        nome: s.channelName,
        url: s.channelUrl,
        inscritos: subs,
        thumbnailUrl: channelThumb,
        totalViews,
      },
      gemScore,
    })
  }

  return out
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      query,
      minViews = 15_000,
      maxInscritos = 1_000,
      diasPublicacao = 0,
      duracaoMin,
      duracaoMax,
      continuation = null,
      seedVideoId = null,
      seenVideoIds = [],
      referenceChannelId = null,
    } = body as {
      query: string
      minViews?: number
      maxInscritos?: number
      diasPublicacao?: number
      duracaoMin?: number
      duracaoMax?: number
      continuation?: string | null
      seedVideoId?: string | null
      seenVideoIds?: string[]
      referenceChannelId?: string | null
    }

    if (!query?.trim() && !seedVideoId) {
      return NextResponse.json({ error: 'Query vazia' }, { status: 400 })
    }

    // IDs já mostrados na UI (evita duplicar linhas). Não reutilizar o mesmo Set que
    // getRelatedVideosPage — aquele Set é mutado ao parsear a prateleira e marcaria
    // todos os relacionados como "já vistos", zerando o lote.
    const displaySeen = new Set<string>(seenVideoIds)
    const channelTotalViews = new Map<string, number>()
    const filterOpts = {
      minViews,
      maxInscritos,
      duracaoMin,
      duracaoMax,
      seenVideoIds: displaySeen,
    }

    const items: VideoGarimpo[] = []
    let nextContinuation: string | null = null
    let nextSeed: string | null = null
    let responseReferenceChannelId: string | null = null

    // ── Carregar mais: coluna relacionados (mesmo vídeo semente) ─────────
    if (seedVideoId && continuation) {
      let excludeCh = referenceChannelId
      if (!excludeCh) {
        try {
          const seedDetails = await getVideoDetails(seedVideoId)
          excludeCh = seedDetails.channelId || null
        } catch {
          excludeCh = null
        }
      }
      responseReferenceChannelId = excludeCh

      const shelfSeen = new Set<string>(seenVideoIds)
      const page = await getRelatedVideosPage(seedVideoId, continuation, shelfSeen)
      const batch = await enrichSearchResults(
        page.results,
        { ...filterOpts, excludeChannelId: excludeCh },
        channelTotalViews
      )
      items.push(...batch)
      nextContinuation = page.continuation
      nextSeed = seedVideoId
      return NextResponse.json({
        items,
        continuation: nextContinuation,
        seedVideoId: nextSeed,
        referenceChannelId: responseReferenceChannelId,
      })
    }

    const q = query?.trim() || ''
    const parsed = parseYouTubeUrl(q)

    // ── URL de vídeo: só sugestões de outros canais (não lista o vídeo/canal de referência) ─
    if (parsed.type === 'video' && parsed.id && !continuation) {
      const videoId = parsed.id
      nextSeed = videoId

      const vd = await getVideoDetails(videoId)
      responseReferenceChannelId = vd.channelId || null

      const shelfSeen = new Set<string>(seenVideoIds)
      shelfSeen.add(vd.videoId)
      const relatedPage = await getRelatedVideosPage(videoId, null, shelfSeen)
      const relatedBatch = await enrichSearchResults(
        relatedPage.results,
        { ...filterOpts, excludeChannelId: vd.channelId || null },
        channelTotalViews
      )
      items.push(...relatedBatch)
      nextContinuation = relatedPage.continuation

      return NextResponse.json({
        items,
        continuation: nextContinuation,
        seedVideoId: nextSeed,
        referenceChannelId: responseReferenceChannelId,
      })
    }

    // ── Busca por palavra-chave (primeira página ou continuação) ─────────
    if (!q) {
      return NextResponse.json({ error: 'Query vazia' }, { status: 400 })
    }

    const searchPage = await searchYouTubePage(
      q,
      { diasPublicacao },
      continuation || null
    )
    const batch = await enrichSearchResults(
      searchPage.results,
      filterOpts,
      channelTotalViews
    )
    items.push(...batch)
    nextContinuation = searchPage.continuation
    nextSeed = null

    return NextResponse.json({
      items,
      continuation: nextContinuation,
      seedVideoId: nextSeed,
      referenceChannelId: null,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Falha na busca' }, { status: 500 })
  }
}
