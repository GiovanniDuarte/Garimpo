import type { GemScoreDetalhado } from '@/types'

const MPM_BONUS_MAX = 8

function pontosBonusMpm(mpmIndice: number | null | undefined): number {
  if (mpmIndice == null || isNaN(mpmIndice)) return 0
  return Math.min(
    MPM_BONUS_MAX,
    Math.round(Math.min(100, Math.max(0, mpmIndice)) * 0.08)
  )
}

export function calcularGemScore(
  video: { views: number; dataPublicacao: Date },
  canal: {
    inscritos: number
    topVideos: { views: number }[]
    totalViews?: number
  },
  nicho?: { rpmMedio: number; viralidade: number },
  mpmIndice?: number | null
): GemScoreDetalhado {
  const dias = Math.max(
    1,
    (Date.now() - video.dataPublicacao.getTime()) / 86400000
  )
  const viewsPorDia = video.views / dias
  const subs = Math.max(1, canal.inscritos)

  const ratio = video.views / subs
  const ptsPorInscrito = Math.min(
    32,
    (Math.log2(Math.max(1, ratio)) / 6) * 32
  )

  const ptsVelocidade = Math.min(
    28,
    (Math.log10(Math.max(1, viewsPorDia)) / Math.log10(50000)) * 28
  )

  let ptsConsistencia = 0
  if (canal.topVideos.length > 0) {
    const threshold = subs * 0.5
    const above = canal.topVideos.filter((v) => v.views >= threshold).length
    const fraction = above / canal.topVideos.length
    ptsConsistencia = Math.sqrt(fraction) * 18
  }

  const ptsTamanho = Math.max(
    0,
    12 - (Math.log10(Math.max(1, subs)) / 6) * 12
  )

  const tv = Math.max(0, canal.totalViews ?? 0)
  const logLo = Math.log10(1000)
  const logHi = Math.log10(10_000_000_000)
  const ptsAlcance =
    tv < 1000
      ? 0
      : Math.min(10, ((Math.log10(tv) - logLo) / (logHi - logLo)) * 10)

  const totalBase = Math.round(
    ptsPorInscrito +
      ptsVelocidade +
      ptsConsistencia +
      ptsTamanho +
      ptsAlcance
  )

  const pontosMpm = pontosBonusMpm(mpmIndice)
  const total = Math.min(100, totalBase + pontosMpm)

  const result: GemScoreDetalhado = {
    total,
    breakdown: {
      viewsPorInscrito: Math.round(ptsPorInscrito),
      velocidade: Math.round(ptsVelocidade),
      consistencia: Math.round(ptsConsistencia),
      tamanhoCanal: Math.round(ptsTamanho),
      alcanceCanal: Math.round(ptsAlcance),
    },
    classificacao:
      total >= 75
        ? 'pepita'
        : total >= 50
          ? 'promissor'
          : total >= 25
            ? 'mediano'
            : 'fraco',
  }

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
