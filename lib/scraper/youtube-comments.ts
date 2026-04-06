/**
 * Comentários “Top” via InnerTube (/next), mesmo stack do resto do scraper.
 */

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

export type ComentarioCurtido = {
  autor: string
  texto: string
  curtidas: number
  curtidasTexto: string
}

function parseCurtidasTexto(s: string): number {
  const t = String(s).trim().replace(/,/g, '').replace(/\s/g, '')
  const m = t.match(/^([\d.]+)([KMB])?$/i)
  if (!m) {
    const n = parseInt(t.replace(/\D/g, ''), 10)
    return Number.isFinite(n) ? n : 0
  }
  const n = parseFloat(m[1])
  const suf = (m[2] || '').toUpperCase()
  if (suf === 'K') return Math.round(n * 1000)
  if (suf === 'M') return Math.round(n * 1_000_000)
  if (suf === 'B') return Math.round(n * 1_000_000_000)
  return Math.round(n)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extrairTokenTopComentarios(data: any): string | null {
  const panels = data?.engagementPanels
  if (!Array.isArray(panels)) return null
  for (const p of panels) {
    const sl = p?.engagementPanelSectionListRenderer
    if (sl?.panelIdentifier !== 'engagement-panel-comments-section') continue
    const items =
      sl?.header?.engagementPanelTitleHeaderRenderer?.menu
        ?.sortFilterSubMenuRenderer?.subMenuItems
    if (!Array.isArray(items)) continue
    for (const it of items) {
      if (!it?.selected) continue
      const raw = it?.serviceEndpoint?.continuationCommand?.token
      if (typeof raw === 'string') {
        try {
          return decodeURIComponent(raw)
        } catch {
          return raw
        }
      }
    }
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function comentariosDeMutations(data: any): ComentarioCurtido[] {
  const out: ComentarioCurtido[] = []
  const muts = data?.frameworkUpdates?.entityBatchUpdate?.mutations
  if (!Array.isArray(muts)) return out
  for (const m of muts) {
    const ce = m?.payload?.commentEntityPayload
    const texto = ce?.properties?.content?.content
    if (typeof texto !== 'string' || !texto.trim()) continue
    const autor = ce?.author?.displayName || '—'
    const raw =
      ce?.toolbar?.likeCountNotliked ||
      ce?.toolbar?.likeCountLiked ||
      '0'
    const curtidasTexto = String(raw)
    out.push({
      autor,
      texto: texto.trim(),
      curtidas: parseCurtidasTexto(curtidasTexto),
      curtidasTexto,
    })
  }
  return out
}

/**
 * Até `max` comentários com mais curtidas (entre os carregados na primeira página “Top”).
 */
export async function buscarComentariosTopCurtidas(
  videoId: string,
  max = 16
): Promise<ComentarioCurtido[]> {
  const watch = await fetch(`${INNERTUBE_BASE}/next?key=${INNERTUBE_API_KEY}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      videoId,
    }),
  })
  if (!watch.ok) return []
  const watchJson = await watch.json()
  const token = extrairTokenTopComentarios(watchJson)
  if (!token) return []

  const page = await fetch(`${INNERTUBE_BASE}/next?key=${INNERTUBE_API_KEY}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      continuation: token,
    }),
  })
  if (!page.ok) return []
  const pageJson = await page.json()
  const lista = comentariosDeMutations(pageJson)
  lista.sort((a, b) => b.curtidas - a.curtidas)
  return lista.slice(0, max)
}

export function formatarArquivoComentarios(
  videoId: string,
  tituloVideo: string,
  comentarios: ComentarioCurtido[]
): string {
  const linhas = [
    '16 comentários com mais curtidas (ordem: mais → menos curtidas)',
    `Vídeo: ${tituloVideo}`,
    `URL: https://www.youtube.com/watch?v=${videoId}`,
    '',
  ]
  if (comentarios.length === 0) {
    linhas.push(
      '(Não foi possível obter comentários — vídeo sem comentários ou limite da API.)'
    )
    return linhas.join('\n')
  }
  comentarios.forEach((c, i) => {
    linhas.push(`${i + 1}. ${c.autor} — ${c.curtidasTexto} curtidas`)
    linhas.push(c.texto)
    linhas.push('')
  })
  return linhas.join('\n').trimEnd()
}
