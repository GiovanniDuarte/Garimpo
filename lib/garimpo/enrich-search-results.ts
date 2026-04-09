import {
  getVideoDetails,
  getChannelInfo,
  parsePublishedDate,
  type SearchResult,
  type VideoDetails,
} from '@/lib/scraper/youtube'
import { parseJoinDateYoutube } from '@/lib/scraper/channel-info'
import {
  calcularGemScore,
  type GemScoreVideoInput,
} from '@/lib/scoring/gem-score'
import type { VideoGarimpo } from '@/types'

export const CHANNEL_FETCH_CONCURRENCY = 5

/** Mesmos números padrão do POST em `/api/garimpo`. */
export const GARIMPO_ENRICH_DEFAULTS = {
  minViews: 15_000,
  maxInscritos: 1_000,
} as const

/**
 * Caçador: só o necessário para calcular Gem — sem cortes de curadoria do Garimpo
 * (views mínimas, duração, teto de inscritos, totais de vídeos do canal, etc.).
 * `minViews` / `maxInscritos` ficam “neutros” mas são ignorados com `apenasGem`.
 */
export const CACADA_PRATELEIRA_ENRICH = {
  minViews: 0,
  maxInscritos: 2_000_000_000,
  apenasGem: true,
} as const satisfies Pick<
  GarimpoEnrichFilterOpts,
  'minViews' | 'maxInscritos' | 'apenasGem'
>

export type GarimpoEnrichFilterOpts = {
  minViews: number
  maxInscritos: number
  maxVideosCanal?: number
  minVideosCanal?: number
  duracaoMin?: number
  duracaoMax?: number
  seenVideoIds: Set<string>
  excludeChannelId?: string | null
  /**
   * Caçador / avaliação só de Gem: mantém exclusão de referência e duplicados,
   * mas não aplica filtros listagem do Garimpo antes nem depois do fetch de canal.
   */
  apenasGem?: boolean
  /**
   * Mineirador: mín/máx de vídeos públicos no canal (contagem do `getChannelInfo`).
   * Aplica-se **mesmo com** `apenasGem` — antes só era filtrado em `linhaPassaCaptura`.
   */
  capturaMinVideosCanal?: number
  capturaMaxVideosCanal?: number | null
}

export type GarimpoEnrichProgress = {
  done: number
  total: number
  canalNome: string
  videoId: string
}

export type GarimpoEnrichStreamOpts = {
  onBatchStart?: (totalLinhas: number) => void
  onRowDone?: (p: GarimpoEnrichProgress) => void
}

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

/**
 * Enriquece resultados da busca/prateleira: resolve canal, opcionalmente aplica
 * filtros Garimpo, calcula `gemScore` por linha.
 */
export async function enrichSearchResults(
  searchResults: SearchResult[],
  opts: GarimpoEnrichFilterOpts,
  channelTotalViews: Map<string, number>,
  enrichStream?: GarimpoEnrichStreamOpts
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
    if (opts.apenasGem) return true
    if (s.views < opts.minViews) return false
    if (s.duration > 0 && opts.duracaoMin != null && s.duration < opts.duracaoMin) {
      return false
    }
    if (s.duration > 0 && opts.duracaoMax != null && s.duration > opts.duracaoMax) {
      return false
    }
    return true
  })

  enrichStream?.onBatchStart?.(filtered.length)

  let enriquecidos = 0
  const enrichedRows = await mapWithConcurrency(filtered, CHANNEL_FETCH_CONCURRENCY, async (s) => {
    let resolvedChannelId = s.channelId
    let videoDetails: VideoDetails | null = null
    try {
      videoDetails = await getVideoDetails(s.videoId)
      if (videoDetails.channelId) resolvedChannelId = videoDetails.channelId
    } catch {
      videoDetails = null
    }

    let subs = 0
    let channelThumb = ''
    let totalViews = channelTotalViews.get(resolvedChannelId) ?? 0
    let videoCount = 0
    let joinDateStr = ''
    let channelName = s.channelName
    let channelUrl = s.channelUrl
    if (resolvedChannelId) {
      try {
        const info = await getChannelInfo(resolvedChannelId)
        subs = info.subscribers
        channelThumb = info.avatar
        totalViews = info.totalViews || 0
        videoCount = info.videoCount || 0
        joinDateStr = info.joinDate || ''
        channelTotalViews.set(resolvedChannelId, totalViews)
        if (info.name) channelName = info.name
        if (info.url) channelUrl = info.url
      } catch {
        subs = 0
      }
    }
    enriquecidos += 1
    enrichStream?.onRowDone?.({
      done: enriquecidos,
      total: filtered.length,
      canalNome: channelName,
      videoId: s.videoId,
    })
    return {
      s,
      videoDetails,
      subs,
      channelThumb,
      totalViews,
      videoCount,
      joinDateStr,
      resolvedChannelId,
      channelName,
      channelUrl,
    }
  })

  const out: VideoGarimpo[] = []

  for (const row of enrichedRows) {
    const {
      s,
      videoDetails,
      subs,
      channelThumb,
      totalViews,
      videoCount,
      joinDateStr,
      resolvedChannelId,
      channelName,
      channelUrl,
    } = row
    if (
      opts.excludeChannelId &&
      resolvedChannelId &&
      resolvedChannelId === opts.excludeChannelId
    ) {
      continue
    }
    if (!opts.apenasGem) {
      if (subs > opts.maxInscritos) continue
      if (
        opts.maxVideosCanal != null &&
        opts.maxVideosCanal > 0 &&
        videoCount > 0 &&
        videoCount > opts.maxVideosCanal
      ) {
        continue
      }
      if (
        opts.minVideosCanal != null &&
        opts.minVideosCanal > 0 &&
        (videoCount === 0 || videoCount < opts.minVideosCanal)
      ) {
        continue
      }
    }

    const capMinV = Math.max(0, Number(opts.capturaMinVideosCanal) || 0)
    const capMaxRaw = opts.capturaMaxVideosCanal
    const capMaxV =
      capMaxRaw != null && Number.isFinite(Number(capMaxRaw))
        ? Math.floor(Number(capMaxRaw))
        : null
    if (capMaxV != null && capMaxV > 0) {
      if (!(videoCount > 0 && videoCount <= capMaxV)) continue
    }
    if (capMinV > 0) {
      if (!(videoCount > 0 && videoCount >= capMinV)) continue
    }

    const pubDate =
      (videoDetails != null &&
        parsePublishedDate(
          videoDetails.publishDate || videoDetails.uploadDate || ''
        )) ||
      parsePublishedDate(s.publishedText) ||
      new Date(Date.now() - 86400000)
    const gemViews = videoDetails != null ? videoDetails.views : s.views
    const dias = Math.max(1, (Date.now() - pubDate.getTime()) / 86400000)
    const viewsPorDia = gemViews / dias

    const joinParsed = joinDateStr
      ? parseJoinDateYoutube(joinDateStr)
      : undefined

    const idadeCanalDias = joinParsed
      ? Math.max(1, (Date.now() - joinParsed.getTime()) / 86400000)
      : Math.max(1, (Date.now() - pubDate.getTime()) / 86400000)
    const vc = videoCount > 0 ? videoCount : 1
    const videosGem: GemScoreVideoInput[] = [
      { views: gemViews, dataPublicacao: pubDate },
    ]

    const pubYt = videoCount > 0 ? videoCount : null

    const gemScore = calcularGemScore(
      {
        inscritos: Math.max(1, subs),
        videos: videosGem,
        totalViewsCanal: Math.max(0, totalViews),
        videoCountCanal: vc,
        idadeCanalDias,
        videosPublicadosYoutube: pubYt,
      },
      undefined,
      undefined
    )

    const titulo =
      videoDetails != null && videoDetails.title
        ? videoDetails.title
        : s.title
    const thumbRow =
      videoDetails != null && videoDetails.thumbnailUrl
        ? videoDetails.thumbnailUrl
        : s.thumbnailUrl
    const duracaoSegundos =
      videoDetails != null && videoDetails.lengthSeconds > 0
        ? videoDetails.lengthSeconds
        : s.duration

    out.push({
      youtubeId: s.videoId,
      titulo,
      url: s.url,
      thumbnailUrl: thumbRow,
      views: gemViews,
      dataPublicacao: pubDate.toISOString(),
      duracaoSegundos,
      viewsPorDia,
      canal: {
        youtubeId: resolvedChannelId,
        nome: channelName,
        url:
          channelUrl ||
          (resolvedChannelId
            ? `https://www.youtube.com/channel/${resolvedChannelId}`
            : s.channelUrl),
        inscritos: subs,
        thumbnailUrl: channelThumb,
        totalViews,
        videosPublicados: videoCount,
      },
      gemScore,
    })
  }

  return out
}
