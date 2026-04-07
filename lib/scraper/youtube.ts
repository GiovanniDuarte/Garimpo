const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'
const INNERTUBE_BASE = 'https://www.youtube.com/youtubei/v1'

const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'WEB',
    clientVersion: '2.20240101.00.00',
    hl: 'en',
    gl: 'US',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
}

const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': INNERTUBE_CONTEXT.client.userAgent,
  'Accept-Language': 'en-US,en;q=0.9',
}

export function parseYouTubeUrl(input: string): {
  type: 'video' | 'channel' | 'search'
  id?: string
  query?: string
} {
  try {
    const url = new URL(input)

    if (
      url.hostname.includes('youtube.com') ||
      url.hostname.includes('youtu.be')
    ) {
      if (url.pathname.includes('/watch')) {
        const videoId = url.searchParams.get('v')
        if (videoId) return { type: 'video', id: videoId }
      }

      if (url.pathname.includes('/shorts/')) {
        const videoId = url.pathname.split('/shorts/')[1]?.split('/')[0]
        if (videoId) return { type: 'video', id: videoId }
      }

      const channelPatterns = ['/channel/', '/@', '/c/']
      for (const pattern of channelPatterns) {
        if (url.pathname.includes(pattern)) {
          const id = url.pathname.split(pattern)[1]?.split('/')[0]
          if (id) return { type: 'channel', id }
        }
      }

      if (url.hostname === 'youtu.be') {
        const videoId = url.pathname.slice(1)
        if (videoId) return { type: 'video', id: videoId }
      }
    }
  } catch {
    // not a URL
  }

  return { type: 'search', query: input }
}

function searchParamsForDias(dias: number): string {
  let searchParams = 'EgIQAQ%3D%3D'
  if (dias > 0 && dias <= 7) searchParams = 'EgQIAhAB'
  else if (dias > 7 && dias <= 30) searchParams = 'EgQIAxAB'
  else if (dias > 30 && dias <= 365) searchParams = 'EgQIBBAB'
  return searchParams
}

/** Extrai um resultado de busca a partir de um videoRenderer do InnerTube. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function searchResultFromVideoRenderer(video: any): SearchResult | null {
  const videoId = video?.videoId
  if (!videoId) return null

  const title = extractText(video.title)
  const views = parseViewCount(extractText(video.viewCountText))
  const publishedText = extractText(video.publishedTimeText)
  const duration = parseDurationText(extractText(video.lengthText))
  const thumbnailUrl = video.thumbnail?.thumbnails?.slice(-1)[0]?.url || ''

  const longByline = video.longBylineText
  const channelName = extractText(longByline)
  const channelEndpoint =
    longByline?.runs?.[0]?.navigationEndpoint?.browseEndpoint
  const channelId = channelEndpoint?.browseId || ''
  const canonical = channelEndpoint?.canonicalBaseUrl || ''
  const channelUrl = canonical
    ? `https://www.youtube.com${canonical}`
    : channelId
      ? `https://www.youtube.com/channel/${channelId}`
      : ''

  return {
    videoId,
    title,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl,
    views,
    publishedText,
    duration,
    channelName,
    channelUrl,
    channelId,
  }
}

/** Primeira página de busca + token para "carregar mais". */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSearchFirstPage(data: any): {
  results: SearchResult[]
  continuation: string | null
} {
  const results: SearchResult[] = []
  let continuation: string | null = null
  const contents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents || []

  for (const section of contents) {
    if (section?.continuationItemRenderer) {
      continuation =
        section.continuationItemRenderer.continuationEndpoint
          ?.continuationCommand?.token || null
      continue
    }
    const items = section?.itemSectionRenderer?.contents || []
    for (const item of items) {
      const sr = searchResultFromVideoRenderer(item?.videoRenderer)
      if (sr) results.push(sr)
    }
  }
  return { results, continuation }
}

/** Próximas páginas da busca (scroll / continuação). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSearchContinuationResponse(data: any): {
  results: SearchResult[]
  continuation: string | null
} {
  const results: SearchResult[] = []
  let continuation: string | null = null
  const cmds = data?.onResponseReceivedCommands || []

  for (const cmd of cmds) {
    const items = cmd?.appendContinuationItemsAction?.continuationItems || []
    for (const item of items) {
      if (item?.continuationItemRenderer) {
        continuation =
          item.continuationItemRenderer.continuationEndpoint
            ?.continuationCommand?.token || null
        continue
      }
      const inner = item?.itemSectionRenderer?.contents || []
      for (const it of inner) {
        const sr = searchResultFromVideoRenderer(it?.videoRenderer)
        if (sr) results.push(sr)
      }
    }
  }
  return { results, continuation }
}

/**
 * Uma requisição de busca (primeira ou continuação). ~20 vídeos por página.
 */
export async function searchYouTubePage(
  query: string,
  options?: { diasPublicacao?: number },
  continuation?: string | null
): Promise<{ results: SearchResult[]; continuation: string | null }> {
  const dias = options?.diasPublicacao ?? 0
  const searchParams = searchParamsForDias(dias)

  const body = continuation
    ? { context: INNERTUBE_CONTEXT, continuation }
    : {
        context: INNERTUBE_CONTEXT,
        query,
        params: searchParams,
      }

  const res = await fetch(`${INNERTUBE_BASE}/search?key=${INNERTUBE_API_KEY}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`)
  const data = await res.json()

  if (continuation) {
    return parseSearchContinuationResponse(data)
  }
  return parseSearchFirstPage(data)
}

export async function searchYouTube(
  query: string,
  options?: { diasPublicacao?: number }
): Promise<SearchResult[]> {
  const page = await searchYouTubePage(query, options, null)
  return page.results
}

export async function getVideoDetails(videoId: string): Promise<VideoDetails> {
  const res = await fetch(`${INNERTUBE_BASE}/player?key=${INNERTUBE_API_KEY}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      videoId,
    }),
  })

  if (!res.ok) throw new Error(`Video details failed: ${res.status}`)
  const data = await res.json()

  const vd = data?.videoDetails
  const micro = data?.microformat?.playerMicroformatRenderer

  const title = vd?.title || ''
  const description = vd?.shortDescription || ''
  const channelId = vd?.channelId || ''
  const channelName = vd?.author || ''
  const views = parseInt(String(vd?.viewCount || '0'), 10) || 0
  const lengthSeconds = parseInt(String(vd?.lengthSeconds || '0'), 10) || 0
  const thumb =
    vd?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    micro?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    ''

  const keywords: string[] = Array.isArray(micro?.keywords)
    ? micro.keywords
    : []

  const publishDate =
    micro?.publishDate ||
    micro?.uploadDate ||
    vd?.publishDate ||
    ''

  return {
    videoId,
    title,
    description,
    channelId,
    channelName,
    views,
    lengthSeconds,
    keywords,
    thumbnailUrl: thumb,
    publishDate: String(publishDate),
    uploadDate: String(micro?.uploadDate || ''),
  }
}

export async function getChannelInfo(channelId: string): Promise<ChannelInfo> {
  let resolvedId = channelId

  if (channelId.startsWith('@')) {
    const page = await fetch(`https://www.youtube.com/${channelId}`, {
      headers: {
        'User-Agent': INNERTUBE_CONTEXT.client.userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    const html = await page.text()
    const match = html.match(/"browseId":"(UC[^"]+)"/)
    if (match) resolvedId = match[1]
  }

  const res = await fetch(`${INNERTUBE_BASE}/browse?key=${INNERTUBE_API_KEY}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      browseId: resolvedId,
    }),
  })

  if (!res.ok) throw new Error(`Channel info failed: ${res.status}`)
  const data = await res.json()

  const header =
    data?.header?.c4TabbedHeaderRenderer ||
    data?.header?.pageHeaderRenderer ||
    {}

  const metadata = data?.metadata?.channelMetadataRenderer || {}

  const name =
    metadata.title || header.title || extractText(header.title) || ''
  const description = metadata.description || ''
  const avatar = pickBestThumbnailUrl(
    metadata.avatar?.thumbnails || header.avatar?.thumbnails || []
  )

  const subscriberText = extractText(header.subscriberCountText) || ''
  let subscribers = parseSubscriberCount(subscriberText)

  if (subscribers === 0) {
    const fullStr = JSON.stringify(data)
    const patterns = [
      /"content":"([\d,.]+[KMB]?\s*subscribers?)"/i,
      /"subscriberCountText":\s*\{[^}]*"simpleText":\s*"([^"]+)"/i,
      /"subscriberCountText":"([^"]+)"/i,
    ]
    for (const pattern of patterns) {
      const subMatch = fullStr.match(pattern)
      if (subMatch) {
        const parsed = parseSubscriberCount(subMatch[1])
        if (parsed > 0) {
          subscribers = parsed
          break
        }
      }
    }
  }

  const url = metadata.channelUrl || metadata.vanityChannelUrl || ''
  const keywords = metadata.keywords || ''
  const country = metadata.country || ''

  let joinDate = ''
  let totalViews = 0
  let videoCount = 0

  const fullStr = JSON.stringify(data)
  const videoCountMatch =
    fullStr.match(/"content":"(\d+)\s*videos?"/) ||
    fullStr.match(/"videoCountText":\s*"([\d,]+)\s*videos?"/)
  if (videoCountMatch) {
    videoCount = parseInt(videoCountMatch[1].replace(/,/g, ''), 10)
  }

  // Views totais do canal: só confiáveis em aboutChannelViewModel (página /about).
  // O InnerTube "about" costuma misturar JSON da Home — o 1º "X views" é de vídeo.
  try {
    const aboutUrl = `https://www.youtube.com/channel/${encodeURIComponent(resolvedId)}/about`
    const aboutPage = await fetch(aboutUrl, {
      headers: {
        'User-Agent': INNERTUBE_CONTEXT.client.userAgent,
        'Accept-Language': HEADERS['Accept-Language'],
      },
      redirect: 'follow',
    })
    if (aboutPage.ok) {
      const aboutHtml = await aboutPage.text()
      const aboutStats = extractAboutChannelViewModelFromHtml(aboutHtml)
      if (aboutStats) {
        const v = parseViewCount(aboutStats.viewCountText)
        if (v > 0) totalViews = v
        const vc = parseVideoCountFromAboutText(aboutStats.videoCountText)
        if (vc > 0) videoCount = vc
      }
      const ytData = parseYtInitialDataFromAboutHtml(aboutHtml)
      const joinedFromPage = ytData
        ? findJoinedDateTextInYtData(ytData)
        : null
      if (joinedFromPage) joinDate = joinedFromPage
    }
  } catch {
    // ignore
  }

  try {
    const aboutRes = await fetch(
      `${INNERTUBE_BASE}/browse?key=${INNERTUBE_API_KEY}`,
      {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          context: INNERTUBE_CONTEXT,
          browseId: resolvedId,
          params: 'EgVhYm91dPIGBAoCEgA%3D',
        }),
      }
    )

    if (aboutRes.ok) {
      const aboutData = await aboutRes.json()
      if (!joinDate) {
        const fromTree = findJoinedDateTextInYtData(aboutData)
        if (fromTree) joinDate = fromTree
      }
      if (!joinDate) {
        const aboutStr = JSON.stringify(aboutData)
        const joinPatterns = [
          /Joined\s+([\w\s,.-–—]+\d{4})/i,
          /Aderiu\s+(?:a|em)\s+([\w\s,.-–—º°]+\d{4})/iu,
          /Se unió\s+(?:el|en)\s+([\w\s,.-–—]+\d{4})/iu,
          /"text"\s*:\s*"(Joined[^"]*\d{4}[^"]*)"/i,
          /"text"\s*:\s*"(Aderiu[^"]*\d{4}[^"]*)"/iu,
        ]
        for (const re of joinPatterns) {
          const m = aboutStr.match(re)
          if (m) {
            joinDate = m[1].trim()
            break
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return {
    channelId: resolvedId,
    name,
    description,
    avatar,
    subscribers,
    url,
    country,
    keywords,
    joinDate,
    totalViews,
    videoCount,
  }
}

export async function getChannelVideos(
  channelId: string,
  maxResults = 30
): Promise<ChannelVideo[]> {
  let resolvedId = channelId

  if (channelId.startsWith('@')) {
    const page = await fetch(`https://www.youtube.com/${channelId}`, {
      headers: {
        'User-Agent': INNERTUBE_CONTEXT.client.userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    const html = await page.text()
    const match = html.match(/"browseId":"(UC[^"]+)"/)
    if (match) resolvedId = match[1]
  }

  const res = await fetch(`${INNERTUBE_BASE}/browse?key=${INNERTUBE_API_KEY}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      browseId: resolvedId,
      params: 'EgZ2aWRlb3PyBgQKAjoA',
    }),
  })

  if (!res.ok) throw new Error(`Channel videos failed: ${res.status}`)
  const data = await res.json()

  const videos: ChannelVideo[] = []
  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || []

  for (const tab of tabs) {
    const tabContent = tab?.tabRenderer?.content
    if (!tabContent) continue

    const richGrid = tabContent?.richGridRenderer?.contents || []
    for (const item of richGrid) {
      const video = item?.richItemRenderer?.content?.videoRenderer
      if (video) {
        const videoId = video.videoId
        if (!videoId) continue

        videos.push({
          videoId,
          title: extractText(video.title),
          url: `https://www.youtube.com/watch?v=${videoId}`,
          views: parseViewCount(extractText(video.viewCountText)),
          publishedText: extractText(video.publishedTimeText),
          duration: parseDurationText(extractText(video.lengthText)),
          thumbnailUrl:
            video.thumbnail?.thumbnails?.slice(-1)[0]?.url || '',
        })

        if (videos.length >= maxResults) break
        continue
      }

      const lockup = item?.richItemRenderer?.content?.lockupViewModel
      if (lockup) {
        const parsed = parseLockupViewModel(lockup)
        if (parsed) {
          videos.push(parsed)
          if (videos.length >= maxResults) break
        }
      }
    }
    if (videos.length > 0) break
  }

  return videos
}

function pickBestThumbnailUrl(
  thumbs: Array<{ url?: string; width?: number }>
): string {
  if (!thumbs?.length) return ''
  let best = thumbs[0]
  let bestScore = best.width ?? 0
  for (const t of thumbs) {
    const w = t.width ?? 0
    if (w > bestScore) {
      best = t
      bestScore = w
    }
  }
  let url = best?.url || ''
  if (url && (url.includes('ggpht.com') || url.includes('googleusercontent'))) {
    url = url.replace(/=s\d+-/, '=s288-')
  }
  return url
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(obj: any): string {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  if (obj.simpleText) return obj.simpleText
  if (typeof obj.content === 'string' && obj.content.trim()) return obj.content
  if (obj.runs) return obj.runs.map((r: { text: string }) => r.text).join('')
  return ''
}

function parseViewCount(text: string): number {
  if (!text) return 0
  const cleaned = text
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .replace(/views?/gi, '')
    .replace(/visualiza(çc)ões?/gi, '')
  const match = cleaned.match(/([\d.]+)\s*([KMB])?/i)
  if (!match) return 0

  const num = parseFloat(match[1])
  const mult = match[2]
    ? ({ K: 1000, M: 1000000, B: 1000000000 } as Record<string, number>)[
        match[2].toUpperCase()
      ] || 1
    : 1

  return Math.round(num * mult)
}

/** Total de views / qtd. vídeos do canal no painel Sobre (ytInitialData). */
function extractAboutChannelViewModelFromHtml(html: string): {
  viewCountText: string
  videoCountText: string
} | null {
  const m = html.match(/var ytInitialData = ({[\s\S]+?});\s*<\/script>/)
  if (!m) return null
  try {
    const data = JSON.parse(m[1]) as unknown
    return findAboutChannelViewModel(data)
  } catch {
    return null
  }
}

/** Data de entrada no canal: `joinedDateText` no ytInitialData / InnerTube (várias línguas). */
function findJoinedDateTextInYtData(node: unknown): string | null {
  if (node === null || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findJoinedDateTextInYtData(item)
      if (hit) return hit
    }
    return null
  }
  const o = node as Record<string, unknown>
  if ('joinedDateText' in o && o.joinedDateText != null) {
    const t = extractText(o.joinedDateText).trim()
    if (t && /\d{4}/.test(t)) return t
  }
  if (
    'channelAboutFullMetadataRenderer' in o &&
    o.channelAboutFullMetadataRenderer != null
  ) {
    const hit = findJoinedDateTextInYtData(o.channelAboutFullMetadataRenderer)
    if (hit) return hit
  }
  for (const k of Object.keys(o)) {
    const hit = findJoinedDateTextInYtData(o[k])
    if (hit) return hit
  }
  return null
}

function parseYtInitialDataFromAboutHtml(html: string): unknown | null {
  const m = html.match(/var ytInitialData = ({[\s\S]+?});\s*<\/script>/)
  if (!m) return null
  try {
    return JSON.parse(m[1]) as unknown
  } catch {
    return null
  }
}

function findAboutChannelViewModel(
  node: unknown
): { viewCountText: string; videoCountText: string } | null {
  if (node === null || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findAboutChannelViewModel(item)
      if (hit) return hit
    }
    return null
  }
  const o = node as Record<string, unknown>
  const vm = o.aboutChannelViewModel
  if (vm && typeof vm === 'object') {
    const v = vm as Record<string, unknown>
    const viewRaw = v.viewCountText
    const videoRaw = v.videoCountText
    const viewCountText =
      typeof viewRaw === 'string'
        ? viewRaw
        : extractText(viewRaw)
    const videoCountText =
      typeof videoRaw === 'string'
        ? videoRaw
        : extractText(videoRaw)
    if (viewCountText && /\d/.test(viewCountText)) {
      return { viewCountText, videoCountText: videoCountText || '' }
    }
  }
  for (const k of Object.keys(o)) {
    const hit = findAboutChannelViewModel(o[k])
    if (hit) return hit
  }
  return null
}

function parseVideoCountFromAboutText(text: string): number {
  if (!text) return 0
  const m = text.match(/([\d,]+)\s*videos?/i)
  if (!m) return 0
  return parseInt(m[1].replace(/,/g, ''), 10)
}

function parseSubscriberCount(text: string): number {
  if (!text) return 0
  const match = text.match(/([\d.]+)\s*([KMB])?/i)
  if (!match) return 0

  const num = parseFloat(match[1])
  const mult = match[2]
    ? ({ K: 1000, M: 1000000, B: 1000000000 } as Record<string, number>)[
        match[2].toUpperCase()
      ] || 1
    : 1

  return Math.round(num * mult)
}

function parseDurationText(text: string): number {
  if (!text) return 0
  const parts = text.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

/** Tolerância para relógio / scraping — datas além disto tratam-se como inválidas. */
const PUBLISHED_FUTURE_TOLERANCE_MS = 48 * 3600 * 1000
const PUBLISHED_MIN_YEAR = 2005

/**
 * Rejeita datas inválidas ou claramente no futuro (bugs de parse / lixo).
 */
export function clampPublishedDateForStorage(d: Date | null): Date | null {
  if (!d || isNaN(d.getTime())) return null
  const t = d.getTime()
  if (t > Date.now() + PUBLISHED_FUTURE_TOLERANCE_MS) return null
  return d
}

const RELATIVE_PUBLISHED_RE =
  /(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i

/**
 * Extrai data relativa (“3 days ago”, “Streamed 2 weeks ago”) ou absoluta parseável.
 */
export function parsePublishedDate(text: string): Date | null {
  if (!text) return null

  const trimmed = text.trim().replace(/\s+/g, ' ')
  const relMatch = trimmed.match(RELATIVE_PUBLISHED_RE)
  if (relMatch) {
    const amount = parseInt(relMatch[1], 10)
    if (!Number.isFinite(amount) || amount < 0 || amount > 50_000) return null
    const unit = relMatch[2].toLowerCase()

    const ms: Record<string, number> = {
      second: 1000,
      minute: 60 * 1000,
      hour: 3600 * 1000,
      day: 86400 * 1000,
      week: 7 * 86400 * 1000,
      month: 30 * 86400 * 1000,
      year: 365 * 86400 * 1000,
    }

    const d = new Date(Date.now() - amount * (ms[unit] || 0))
    return clampPublishedDateForStorage(d)
  }

  const abs = new Date(trimmed)
  if (!isNaN(abs.getTime())) {
    const y = abs.getFullYear()
    const nowY = new Date().getFullYear()
    if (y < PUBLISHED_MIN_YEAR || y > nowY + 1) return null
    return clampPublishedDateForStorage(abs)
  }

  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLockupViewModel(lockup: any): ChannelVideo | null {
  const contentId = lockup?.contentId
  if (!contentId || typeof contentId !== 'string') return null
  const videoId = contentId.startsWith('watch?v=')
    ? contentId.split('v=')[1]?.split('&')[0]
    : contentId
  if (!videoId || videoId.length !== 11) return null

  let title = ''
  const titleObj = lockup?.metadata?.contentMetadataViewModel?.title
  if (titleObj?.content) title = titleObj.content
  else title = extractText(lockup?.title)

  let views = 0
  const parts = lockup?.metadata?.contentMetadataViewModel?.metadataParts
  if (Array.isArray(parts)) {
    for (const p of parts) {
      const t = p?.text?.content || ''
      const v = parseViewCount(t)
      if (v > 0) {
        views = v
        break
      }
    }
  }

  let publishedText = ''
  if (Array.isArray(parts)) {
    for (const p of parts) {
      const t = p?.text?.content || ''
      if (/ago$/i.test(t.trim()) || /\d+\s*(day|hour|week|month|year)/i.test(t)) {
        publishedText = t
        break
      }
    }
  }

  let duration = 0
  const badges = lockup?.badge?.badgeViewModel
  if (badges?.text) duration = parseDurationText(badges.text)

  return {
    videoId,
    title,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    views,
    publishedText,
    duration,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRelatedShelfItem(item: any, seen: Set<string>): SearchResult | null {
  const video = item?.compactVideoRenderer
  if (video?.videoId) {
    if (seen.has(video.videoId)) return null
    seen.add(video.videoId)

    const title = extractText(video.title)
    const views = parseViewCount(
      extractText(video.viewCountText) || extractText(video.shortViewCountText)
    )
    const publishedText = extractText(video.publishedTimeText)
    const duration = parseDurationText(extractText(video.lengthText))
    const thumbnailUrl = video.thumbnail?.thumbnails?.slice(-1)[0]?.url || ''

    const longByline = video.longBylineText || video.shortBylineText
    const channelName = extractText(longByline)
    const channelEndpoint = longByline?.runs?.[0]?.navigationEndpoint?.browseEndpoint
    const channelId = channelEndpoint?.browseId || ''
    const canonical = channelEndpoint?.canonicalBaseUrl || ''
    const channelUrl = canonical
      ? `https://www.youtube.com${canonical}`
      : channelId
        ? `https://www.youtube.com/channel/${channelId}`
        : ''

    return {
      videoId: video.videoId,
      title,
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      thumbnailUrl,
      views,
      publishedText,
      duration,
      channelName,
      channelUrl,
      channelId,
    }
  }

  const lockup = item?.lockupViewModel
  if (!lockup) return null

  const contentId = lockup.contentId
  if (!contentId || typeof contentId !== 'string') return null
  const vid = contentId.startsWith('watch?v=')
    ? contentId.split('v=')[1]?.split('&')[0]
    : contentId
  if (!vid || vid.length !== 11) return null
  if (seen.has(vid)) return null
  seen.add(vid)

  let title = ''
  const titleObj = lockup.metadata?.lockupMetadataViewModel?.title
  if (titleObj?.content) title = titleObj.content
  else {
    const cmTitle = lockup.metadata?.contentMetadataViewModel?.title
    if (cmTitle?.content) title = cmTitle.content
    else title = extractText(lockup.title)
  }

  let views = 0
  let publishedText = ''
  const metaRows =
    lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel
      ?.metadataRows
  if (Array.isArray(metaRows)) {
    for (const row of metaRows) {
      const parts = row?.metadataParts
      if (!Array.isArray(parts)) continue
      for (const p of parts) {
        const t = p?.text?.content || ''
        if (!t) continue
        const v = parseViewCount(t)
        if (v > 0 && views === 0) views = v
        if (
          /ago$/i.test(t.trim()) ||
          /\d+\s*(day|hour|week|month|year)/i.test(t)
        ) {
          if (!publishedText) publishedText = t
        }
      }
    }
  }
  if (views === 0) {
    const parts = lockup.metadata?.contentMetadataViewModel?.metadataParts
    if (Array.isArray(parts)) {
      for (const p of parts) {
        const t = p?.text?.content || ''
        const v = parseViewCount(t)
        if (v > 0) {
          views = v
          break
        }
      }
    }
  }

  let duration = 0
  const overlays = lockup.contentImage?.thumbnailViewModel?.overlays
  if (Array.isArray(overlays)) {
    for (const ov of overlays) {
      const bottomBadges = ov?.thumbnailBottomOverlayViewModel?.badges
      if (Array.isArray(bottomBadges)) {
        for (const b of bottomBadges) {
          const badgeText = b?.thumbnailBadgeViewModel?.text
          if (badgeText) {
            duration = parseDurationText(badgeText)
            if (duration > 0) break
          }
        }
        if (duration > 0) break
      }
      const badgeText =
        ov?.thumbnailOverlayBadgeViewModel?.thumbnailBadges?.[0]
          ?.thumbnailBadgeViewModel?.text
      if (badgeText) {
        duration = parseDurationText(badgeText)
        if (duration > 0) break
      }
    }
  }
  if (duration === 0) {
    const badge = lockup.badge?.badgeViewModel
    if (badge?.text) duration = parseDurationText(badge.text)
  }

  let channelName = ''
  let channelId = ''
  let channelUrl = ''
  const avatarBrowse =
    lockup.metadata?.lockupMetadataViewModel?.image?.decoratedAvatarViewModel
      ?.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint
  if (avatarBrowse) {
    channelId = avatarBrowse.browseId || ''
    const canon = avatarBrowse.canonicalBaseUrl || ''
    channelUrl = canon
      ? `https://www.youtube.com${canon}`
      : channelId
        ? `https://www.youtube.com/channel/${channelId}`
        : ''
  }

  const byline =
    lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel
      ?.metadataRows
  if (Array.isArray(byline)) {
    for (const row of byline) {
      const parts = row?.metadataParts
      if (!Array.isArray(parts)) continue
      for (const p of parts) {
        const t = p?.text?.content || ''
        if (
          t &&
          !channelName &&
          parseViewCount(t) === 0 &&
          !/ago$/i.test(t.trim()) &&
          !/\d+\s*(day|hour|week|month|year)/i.test(t)
        ) {
          channelName = t
        }
      }
    }
  }

  return {
    videoId: vid,
    title,
    url: `https://www.youtube.com/watch?v=${vid}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
    views,
    publishedText,
    duration,
    channelName,
    channelUrl,
    channelId,
  }
}

function scanRelatedContents(
  contents: unknown[],
  seen: Set<string>
): { results: SearchResult[]; continuation: string | null } {
  const results: SearchResult[] = []
  let continuation: string | null = null

  for (const raw of contents) {
    const item = raw as {
      continuationItemRenderer?: {
        continuationEndpoint?: { continuationCommand?: { token?: string } }
      }
    }
    if (item?.continuationItemRenderer) {
      continuation =
        item.continuationItemRenderer.continuationEndpoint
          ?.continuationCommand?.token || null
      continue
    }
    const parsed = parseRelatedShelfItem(item, seen)
    if (parsed) results.push(parsed)
  }
  return { results, continuation }
}

/**
 * Uma página da coluna "próximos" (~20 vídeos) + token para carregar mais.
 */
export async function getRelatedVideosPage(
  videoId: string,
  continuation: string | null | undefined,
  seen: Set<string>
): Promise<{ results: SearchResult[]; continuation: string | null }> {
  const body = continuation
    ? { context: INNERTUBE_CONTEXT, continuation }
    : { context: INNERTUBE_CONTEXT, videoId }

  const res = await fetch(`${INNERTUBE_BASE}/next?key=${INNERTUBE_API_KEY}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Related videos failed: ${res.status}`)
  const data = await res.json()

  let contents: unknown[] = []
  if (continuation) {
    const onResponse = data?.onResponseReceivedEndpoints || []
    for (const ep of onResponse) {
      const items = ep?.appendContinuationItemsAction?.continuationItems || []
      if (items.length > 0) {
        contents = items
        break
      }
    }
  } else {
    contents =
      data?.contents?.twoColumnWatchNextResults?.secondaryResults
        ?.secondaryResults?.results || []
  }

  return scanRelatedContents(contents, seen)
}

export async function getRelatedVideos(
  videoId: string,
  maxResults = 100
): Promise<SearchResult[]> {
  const all: SearchResult[] = []
  const seen = new Set<string>()
  let cont: string | null = null
  do {
    const page = await getRelatedVideosPage(videoId, cont, seen)
    all.push(...page.results)
    cont = page.continuation
  } while (cont && all.length < maxResults)
  return all.slice(0, maxResults)
}

export interface SearchResult {
  videoId: string
  title: string
  url: string
  thumbnailUrl: string
  views: number
  publishedText: string
  duration: number
  channelName: string
  channelUrl: string
  channelId: string
}

export interface VideoDetails {
  videoId: string
  title: string
  description: string
  channelId: string
  channelName: string
  views: number
  lengthSeconds: number
  keywords: string[]
  thumbnailUrl: string
  publishDate: string
  uploadDate: string
}

export interface ChannelInfo {
  channelId: string
  name: string
  description: string
  avatar: string
  subscribers: number
  url: string
  country: string
  keywords: string
  joinDate: string
  totalViews: number
  videoCount: number
}

export interface ChannelVideo {
  videoId: string
  title: string
  url: string
  views: number
  publishedText: string
  duration: number
  thumbnailUrl: string
}
