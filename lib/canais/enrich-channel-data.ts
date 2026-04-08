import {
  getChannelInfo,
  getChannelVideos,
  getVideoDetails,
  parsePublishedDate,
  type ChannelVideo,
} from '@/lib/scraper/youtube'
import { calcularFrequencia, parseJoinDateYoutube } from '@/lib/scraper/channel-info'
import { calcularGemScore } from '@/lib/scoring/gem-score'
import {
  detectarNicho,
  detectarNichoTopVideos,
  nichoAPartirCategoriaYoutube,
  rpmENichoDoRotulo,
  type AmostraNichoVideo,
} from '@/lib/nichos'
import { calcularPotencialModelagem } from '@/lib/scoring/potencial-modelagem'

export type EnrichExisting = {
  dataCriacaoCanal?: Date | null
  /** Mantém RPM do Gem alinhado ao nicho guardado se a deteção automática falhar. */
  nichoInferido?: string | null
  /** Títulos já na BD (PUT) quando o scrape da tab vídeos vem sem título. */
  videosFallback?: Array<{ titulo: string; tags: string | null }>
}

function tagsVideoDbParaKeywords(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  try {
    const j = JSON.parse(raw) as unknown
    if (Array.isArray(j)) {
      return j.filter((x): x is string => typeof x === 'string')
    }
  } catch {
    // texto livre
  }
  return raw
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export async function enrichChannelData(
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

      let top5PorViews = [...parsedVideos]
        .filter((v) => v.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
      if (top5PorViews.length === 0) {
        top5PorViews = parsedVideos.slice(0, 5)
      }

      const textoContextoNicho = [
        enrichedData.descricao || '',
        typeof info.keywords === 'string' ? info.keywords : '',
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join('\n')

      let categoriaYoutube = ''
      const amostraNicho: AmostraNichoVideo[] = await Promise.all(
        top5PorViews.map(async (v) => {
          try {
            const vd = await getVideoDetails(v.videoId)
            if (!categoriaYoutube && vd.category) categoriaYoutube = vd.category
            return {
              titulo: v.title || vd.title || '',
              tags: Array.isArray(vd.keywords) ? vd.keywords : [],
            }
          } catch {
            return { titulo: v.title || '', tags: [] }
          }
        })
      )

      let amostraFinal = amostraNicho
      if (amostraFinal.every((x) => !x.titulo?.trim())) {
        const fb = existing?.videosFallback
        if (fb?.length) {
          amostraFinal = fb.slice(0, 5).map((row) => ({
            titulo: row.titulo || '',
            tags: tagsVideoDbParaKeywords(row.tags),
          }))
        }
      }

      let nichoResult = detectarNichoTopVideos(
        amostraFinal,
        textoContextoNicho,
        enrichedData.nome || ''
      )
      if (!nichoResult) {
        const titulos = amostraFinal
          .map((v) => v.titulo)
          .filter((t) => t.trim().length >= 2)
        if (titulos.length > 0) {
          nichoResult = detectarNicho(textoContextoNicho, titulos)
        }
      }
      if (!nichoResult && !categoriaYoutube && body.videoId) {
        try {
          const vdCat = await getVideoDetails(body.videoId)
          if (vdCat.category) categoriaYoutube = vdCat.category
        } catch {
          // ignore
        }
      }
      if (!nichoResult && categoriaYoutube) {
        nichoResult = nichoAPartirCategoriaYoutube(categoriaYoutube)
      }
      if (nichoResult) {
        enrichedData.nichoInferido = `${nichoResult.nicho} > ${nichoResult.subNicho}`
      }
    } else {
      const textoContextoNicho = [
        enrichedData.descricao || '',
        typeof info.keywords === 'string' ? info.keywords : '',
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join('\n')

      let amostraFinal: AmostraNichoVideo[] = []
      const fb = existing?.videosFallback
      if (fb?.length) {
        amostraFinal = fb.slice(0, 5).map((row) => ({
          titulo: row.titulo || '',
          tags: tagsVideoDbParaKeywords(row.tags),
        }))
      }

      let categoriaYoutube = ''
      if (body.videoId) {
        try {
          const vd0 = await getVideoDetails(body.videoId)
          if (vd0.category) categoriaYoutube = vd0.category
        } catch {
          // ignore
        }
      }

      let nichoResult = detectarNichoTopVideos(
        amostraFinal,
        textoContextoNicho,
        enrichedData.nome || ''
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
