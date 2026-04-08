import { NextRequest, NextResponse } from 'next/server'
import {
  parseYouTubeUrl,
  searchYouTubePage,
  getVideoDetails,
  getRelatedVideosPage,
} from '@/lib/scraper/youtube'
import { enrichSearchResults } from '@/lib/garimpo/enrich-search-results'
import type { VideoGarimpo } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      query,
      minViews = 15_000,
      maxInscritos = 1_000,
      presetId = null,
      maxVideosCanal = 0,
      minVideosCanal = 0,
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
      presetId?: string | null
      /** `0` ou omitido = sem teto. */
      maxVideosCanal?: number
      /** `0` ou omitido = sem piso (ex.: 101 = só canais com mais de 100 vídeos). */
      minVideosCanal?: number
      diasPublicacao?: number
      duracaoMin?: number
      duracaoMax?: number
      continuation?: string | null
      seedVideoId?: string | null
      seenVideoIds?: string[]
      referenceChannelId?: string | null
    }

    const sortByPreset = (list: VideoGarimpo[]): VideoGarimpo[] => {
      const score = (v: VideoGarimpo): number => {
        const subs = Math.max(1, v.canal.inscritos || 0)
        const ratio = v.views / subs
        if (presetId === 'recent_explosion') return v.viewsPorDia
        if (presetId === 'asymmetry') return ratio
        if (presetId === 'small_traction') return ratio * 0.7 + v.viewsPorDia * 0.3
        if (presetId === 'new_channel_signal') return v.viewsPorDia * 0.6 + ratio * 0.4
        return v.gemScore.total
      }
      return [...list].sort((a, b) => {
        const sa = score(a)
        const sb = score(b)
        if (sb !== sa) return sb - sa
        return b.gemScore.total - a.gemScore.total
      })
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
      maxVideosCanal:
        typeof maxVideosCanal === 'number' && maxVideosCanal > 0
          ? maxVideosCanal
          : undefined,
      minVideosCanal:
        typeof minVideosCanal === 'number' && minVideosCanal > 0
          ? Math.floor(minVideosCanal)
          : undefined,
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
      items.push(...sortByPreset(batch))
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
      items.push(...sortByPreset(relatedBatch))
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
    items.push(...sortByPreset(batch))
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
