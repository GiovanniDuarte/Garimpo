import type { GemScoreDetalhado, GemScoreSinaisV3 } from '@/types'

const MPM_BONUS_MAX = 8

/** Quatro sinais · soma 100 (ex-pulso de comentários redistribuído). */
const MAX = {
  autonomia: 28,
  aceleracao: 27,
  densidadeHits: 22,
  pressaoUnidade: 23,
} as const

const HIT_VIEWS = 100_000

function pontosBonusMpm(mpmIndice: number | null | undefined): number {
  if (mpmIndice == null || isNaN(mpmIndice)) return 0
  return Math.min(
    MPM_BONUS_MAX,
    Math.round(Math.min(100, Math.max(0, mpmIndice)) * 0.08)
  )
}

export interface GemScoreVideoInput {
  views: number
  dataPublicacao: Date | null
}

export interface GemScoreCanalInput {
  inscritos: number
  videos: GemScoreVideoInput[]
  totalViewsCanal: number
  videoCountCanal: number
  idadeCanalDias: number
  /**
   * Total de vídeos públicos no YouTube (quando o scraper devolve).
   * Null evita confundir «1/1» no Garimpo com o canal inteiro.
   */
  videosPublicadosYoutube?: number | null
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function formatCompactPt(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000)
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(Math.round(n))
}

/** Índice de autonomia: média de views por vídeo ÷ inscritos */
function sinalAutonomia(avgViewsPorVideo: number, inscritos: number): GemScoreSinaisV3['autonomia'] {
  const subs = Math.max(1, inscritos)
  const ratio = avgViewsPorVideo / subs
  const pts = Math.min(
    MAX.autonomia,
    (Math.log2(Math.max(1, ratio)) / 6) * MAX.autonomia
  )
  const p = Math.round(pts)
  return {
    pontos: p,
    max: MAX.autonomia,
    formula: 'Views por vídeo ÷ inscritos · canal distribui sem muleta',
    resultado: `${round1(ratio)}× a base`,
    ratioMultiplo: round1(ratio),
  }
}

/** Últimas k vs primeiras k publicações (por data). */
function sinalAceleracao(
  videos: GemScoreVideoInput[]
): GemScoreSinaisV3['aceleracao'] {
  const dated = videos
    .filter((v) => v.dataPublicacao != null)
    .sort(
      (a, b) =>
        a.dataPublicacao!.getTime() - b.dataPublicacao!.getTime()
    )

  if (dated.length < 2) {
    return {
      pontos: 13,
      max: MAX.aceleracao,
      formula:
        'Últimas 3 publicações ÷ primeiras 3 · canal está crescendo?',
      resultado: 'Dados insuficientes · neutro',
      multiplo: 1,
      insuficiente: true,
    }
  }

  const n = dated.length
  const k = Math.min(3, Math.max(1, Math.floor(n / 2)))
  const first = dated.slice(0, k)
  const last = dated.slice(-k)
  const avgFirst =
    first.reduce((s, v) => s + Math.max(0, v.views), 0) / first.length
  const avgLast =
    last.reduce((s, v) => s + Math.max(0, v.views), 0) / last.length
  const coef =
    avgFirst > 0 ? avgLast / avgFirst : avgLast > 0 ? 4 : 1

  const pts = Math.min(
    MAX.aceleracao,
    Math.max(0, 5 + (coef - 1) * 11.5)
  )
  const p = Math.round(pts)

  return {
    pontos: p,
    max: MAX.aceleracao,
    formula:
      'Últimas 3 publicações ÷ primeiras 3 · canal está crescendo?',
    resultado: `${round1(coef)}× de aceleração`,
    multiplo: round1(coef),
    insuficiente: false,
  }
}

function sinalDensidade(
  videos: GemScoreVideoInput[],
  videosPublicadosYoutube: number | null
): GemScoreSinaisV3['densidadeHits'] {
  const n = videos.length
  if (n === 0) {
    return {
      pontos: 0,
      max: MAX.densidadeHits,
      formula:
        'Vídeos acima de 100k ÷ total · consistência absoluta',
      resultado: '—',
      hits: 0,
      totalVideos: 0,
      pct: 0,
    }
  }

  const hits = videos.filter((v) => v.views >= HIT_VIEWS).length
  const pub = videosPublicadosYoutube

  // Garimpo: uma linha = 1 vídeo; não representa o canal completo.
  const amostraSoUmVideo =
    n === 1 && (pub == null || pub > 1)
  if (amostraSoUmVideo) {
    const hit0 = hits
    const pts = Math.round(MAX.densidadeHits * 0.5)
    return {
      pontos: pts,
      max: MAX.densidadeHits,
      formula:
        'Vídeos acima de 100k ÷ total · consistência absoluta',
      resultado:
        pub != null
          ? `Só este vídeo na listagem (${hit0 ? '≥100k views' : '<100k'}) · ${pub} vídeos no canal no YouTube`
          : `Só este vídeo na listagem (${hit0 ? '≥100k views' : '<100k'}) · total no canal indisponível`,
      hits: hit0,
      totalVideos: 1,
      pct: hit0 * 100,
    }
  }

  const pct = hits / n
  const pts = Math.round(pct * MAX.densidadeHits)
  let resultado = `${hits}/${n} vídeos · ${Math.round(pct * 100)}%`
  if (pub != null && n < pub) {
    resultado += ` · amostra ${n}/${pub} no canal`
  }
  return {
    pontos: pts,
    max: MAX.densidadeHits,
    formula:
      'Vídeos acima de 100k ÷ total · consistência absoluta',
    resultado,
    hits,
    totalVideos: n,
    pct: Math.round(pct * 1000) / 10,
  }
}

function sinalPressao(
  totalViews: number,
  idadeDias: number,
  videoCount: number
): GemScoreSinaisV3['pressaoUnidade'] {
  const dias = Math.max(1, idadeDias)
  const nv = Math.max(1, videoCount)
  const press = totalViews / (dias * nv)
  const logP = Math.log10(Math.max(1, press))
  const logRef = Math.log10(12_000)
  const pts = Math.min(
    MAX.pressaoUnidade,
    Math.max(0, (logP / logRef) * MAX.pressaoUnidade)
  )
  const p = Math.round(pts)
  return {
    pontos: p,
    max: MAX.pressaoUnidade,
    formula:
      'Views totais ÷ (dias × vídeos) · detecta pepitas precoces',
    resultado: `${formatCompactPt(press)} views/dia/vídeo`,
    viewsPorDiaPorVideo: Math.round(press),
  }
}

function insightV3(sinais: GemScoreSinaisV3): string | undefined {
  if (
    sinais.aceleracao.multiplo < 1 &&
    !sinais.aceleracao.insuficiente
  ) {
    return 'Aceleração abaixo de 1× — ritmo de views nas publicações recentes não supera as primeiras; canal pode estar estagnado.'
  }
  return undefined
}

/**
 * Gem Score v3 — quatro sinais (máx. 100 antes do bónus MPM).
 */
export function calcularGemScore(
  canal: GemScoreCanalInput,
  nicho?: { rpmMedio: number; viralidade: number },
  mpmIndice?: number | null
): GemScoreDetalhado {
  const subs = Math.max(1, canal.inscritos)
  const vids = canal.videos

  const sumViews = vids.reduce((s, v) => s + Math.max(0, v.views), 0)
  const nSample = vids.length
  const avgFromSample =
    nSample > 0 ? sumViews / nSample : 0
  const avgFromCanal =
    canal.videoCountCanal > 0
      ? canal.totalViewsCanal / canal.videoCountCanal
      : avgFromSample
  const avgViewsPorVideo =
    canal.videoCountCanal > 0 && canal.totalViewsCanal > 0
      ? avgFromCanal
      : avgFromSample

  const pubYt =
    canal.videosPublicadosYoutube !== undefined
      ? canal.videosPublicadosYoutube
      : null

  const autonomia = sinalAutonomia(
    avgViewsPorVideo > 0 ? avgViewsPorVideo : avgFromSample,
    subs
  )
  const aceleracao = sinalAceleracao(vids)
  const densidade = sinalDensidade(vids, pubYt)
  const pressao = sinalPressao(
    Math.max(0, canal.totalViewsCanal),
    canal.idadeCanalDias,
    canal.videoCountCanal > 0 ? canal.videoCountCanal : Math.max(1, nSample)
  )

  const sinais: GemScoreSinaisV3 = {
    autonomia,
    aceleracao,
    densidadeHits: densidade,
    pressaoUnidade: pressao,
  }

  const totalBase =
    autonomia.pontos +
    aceleracao.pontos +
    densidade.pontos +
    pressao.pontos

  const pontosMpm = pontosBonusMpm(mpmIndice)
  const total = Math.min(100, totalBase + pontosMpm)

  const classificacao =
    total >= 75
      ? 'pepita'
      : total >= 50
        ? 'promissor'
        : total >= 25
          ? 'mediano'
          : 'fraco'

  const result: GemScoreDetalhado = {
    versao: 3,
    total,
    sinais,
    classificacao,
    resumoRodape: [
      `${round1(autonomia.ratioMultiplo)}×`,
      `${round1(aceleracao.multiplo)}×`,
      `${densidade.pct}%`,
      formatCompactPt(pressao.viewsPorDiaPorVideo),
    ],
  }

  const ins = insightV3(sinais)
  if (ins) result.insight = ins

  if (pontosMpm > 0 && mpmIndice != null && !isNaN(mpmIndice)) {
    result.mpmBonus = {
      mpmIndice: Math.round(mpmIndice),
      pontos: pontosMpm,
    }
  }

  if (nicho) {
    const rpmNorm = Math.min(10, (nicho.rpmMedio / 40) * 10)
    const potencialOuro =
      Math.round(Math.sqrt(rpmNorm * nicho.viralidade) * 10) / 10
    result.nichoBonus = {
      rpmMedio: Math.round(nicho.rpmMedio * 10) / 10,
      viralidade: nicho.viralidade,
      potencialOuro,
    }
  }

  return result
}
