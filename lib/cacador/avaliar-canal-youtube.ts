import {
  getChannelInfo,
  getChannelVideos,
  getVideoDetails,
  parsePublishedDate,
  type ChannelVideo,
} from '@/lib/scraper/youtube'
import {
  calcularFrequencia,
  parseJoinDateYoutube,
} from '@/lib/scraper/channel-info'
import { calcularGemScore } from '@/lib/scoring/gem-score'
import {
  detectarNicho,
  detectarNichoTopVideos,
  nichoAPartirCategoriaYoutube,
  rpmENichoDoRotulo,
  type AmostraNichoVideo,
} from '@/lib/nichos'
import { calcularPotencialModelagem } from '@/lib/scoring/potencial-modelagem'

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export type DadosCanalCacada = {
  gemScore: number
  gemScoreDetalhado: string
  nichoInferido: string | null
  nome: string
  url: string
  youtubeId: string
  inscritos: number | undefined
  totalViews: number | undefined
  videosPublicados: number | undefined
  descricao: string | undefined
  thumbnailUrl: string | undefined
  pais: string | undefined
  dataCriacaoCanal: Date | undefined
  frequenciaPostagem: string | undefined
  ultimaAtividade: Date | undefined
}

/**
 * Avalia Gem + nicho com poucos hits ao YouTube (lista de vídeos sem 1 getVideoDetails por título).
 * Entre chamadas usa pequenas pausas para reduzir risco de throttle.
 */
export async function avaliarCanalYoutubeParaCacada(
  youtubeChannelId: string,
  opts?: { delayMs?: number }
): Promise<DadosCanalCacada | null> {
  const d = opts?.delayMs ?? 550
  await sleep(d)
  const info = await getChannelInfo(youtubeChannelId)
  await sleep(d)
  const videos = await getChannelVideos(youtubeChannelId, 20)

  const parsedVideos: Array<ChannelVideo & { pubDate?: Date | null }> =
    videos.map((v) => ({
      ...v,
      pubDate: parsePublishedDate(v.publishedText),
    }))

  let dataCriacaoMerged: Date | undefined
  if (info.joinDate) {
    const p = parseJoinDateYoutube(info.joinDate)
    if (p && !isNaN(p.getTime())) dataCriacaoMerged = p
  }

  let frequenciaPostagem: string | undefined
  let ultimaAtividade: Date | undefined
  const dates = parsedVideos.map((v) => v.pubDate).filter(Boolean) as Date[]
  if (dates.length >= 2) {
    frequenciaPostagem = calcularFrequencia(dates)
  }
  if (dates.length > 0) {
    ultimaAtividade = dates.sort((a, b) => b.getTime() - a.getTime())[0]
  }

  let top5PorViews = [...parsedVideos]
    .filter((v) => v.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
  if (top5PorViews.length === 0) {
    top5PorViews = parsedVideos.slice(0, 5)
  }

  const textoContextoNicho = [
    info.description || '',
    typeof info.keywords === 'string' ? info.keywords : '',
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n')

  const amostraFinal: AmostraNichoVideo[] = top5PorViews.map((v) => ({
    titulo: v.title || '',
    tags: [],
  }))
  let categoriaYoutube = ''
  if (top5PorViews[0]?.videoId) {
    try {
      await sleep(d)
      const vd0 = await getVideoDetails(top5PorViews[0].videoId)
      if (vd0.category) categoriaYoutube = vd0.category
      if (Array.isArray(vd0.keywords) && vd0.keywords.length && amostraFinal[0]) {
        amostraFinal[0] = {
          titulo: amostraFinal[0].titulo || vd0.title || '',
          tags: vd0.keywords,
        }
      }
    } catch {
      // só títulos da listagem
    }
  }

  const nome = info.name || 'Canal'
  let nichoInferido: string | null = null
  let nichoResult = detectarNichoTopVideos(
    amostraFinal,
    textoContextoNicho,
    nome
  )
  if (!nichoResult) {
    const titulos = amostraFinal
      .map((v) => v.titulo)
      .filter((t) => t.trim().length >= 2)
    if (titulos.length > 0) {
      nichoResult = detectarNicho(textoContextoNicho, titulos)
    }
  }
  if (!nichoResult && categoriaYoutube) {
    nichoResult = nichoAPartirCategoriaYoutube(categoriaYoutube)
  }
  if (nichoResult) {
    nichoInferido = `${nichoResult.nicho} > ${nichoResult.subNicho}`
  }

  const subs = info.subscribers || 0
  const nichoData = rpmENichoDoRotulo(nichoInferido) ?? undefined
  const topVideos = parsedVideos
    .filter((v) => v.views > 0)
    .sort((a, b) => b.views - a.views)
  let gemScore = 0
  let gemScoreDetalhado = ''

  if (topVideos.length > 0) {
    const oldestPub = dates.length
      ? new Date(Math.min(...dates.map((x) => x.getTime())))
      : null
    const refIdadeDate = dataCriacaoMerged ?? oldestPub ?? null
    const refIdadeDias = refIdadeDate
      ? Math.max(1, (Date.now() - refIdadeDate.getTime()) / 86400000)
      : 90
    const potencial = calcularPotencialModelagem({
      inscritos: subs,
      totalViews: info.totalViews ?? 0,
      videosPublicados: info.videoCount,
      dataCriacaoCanal: refIdadeDate,
      frequenciaPostagem,
    })
    const totalV =
      info.totalViews ??
      parsedVideos.reduce((acc, v) => acc + Math.max(0, v.views), 0)
    const vidCount =
      info.videoCount && info.videoCount > 0
        ? info.videoCount
        : parsedVideos.length
    const g = calcularGemScore(
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
          info.videoCount != null && info.videoCount > 0
            ? info.videoCount
            : null,
      },
      nichoData,
      potencial.mpmIndice
    )
    gemScore = g.total
    gemScoreDetalhado = JSON.stringify(g)
  }

  return {
    gemScore,
    gemScoreDetalhado,
    nichoInferido,
    nome,
    url: info.url || `https://www.youtube.com/channel/${youtubeChannelId}`,
    youtubeId: info.channelId || youtubeChannelId,
    inscritos: info.subscribers,
    totalViews: info.totalViews,
    videosPublicados: info.videoCount,
    descricao: info.description,
    thumbnailUrl: info.avatar,
    pais: info.country,
    dataCriacaoCanal: dataCriacaoMerged,
    frequenciaPostagem,
    ultimaAtividade,
  }
}
