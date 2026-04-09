import type { VideoGarimpo } from '@/types'

export type CacadaRegrasCaptura = {
  exigirGem: boolean
  exigirFiltroMetricas: boolean
  minGem: number
  capturaMinViews: number
  capturaMaxInscritos: number | null
  /** Mínimo de vídeos públicos no canal (0 = sem mínimo). Já vem do `getChannelInfo` no enrich. */
  capturaMinVideosCanal: number
  capturaMaxVideosCanal: number | null
  capturaCombinacao: 'E' | 'OU'
  refChannelId: string | null
}

/** Uma linha entra na fila de captura se passar nas regras (Gem e/ou métricas). */
export function linhaPassaCaptura(
  r: VideoGarimpo,
  regras: CacadaRegrasCaptura
): boolean {
  const yid = r.canal.youtubeId
  if (!yid || (regras.refChannelId && yid === regras.refChannelId)) {
    return false
  }

  const passGem = !regras.exigirGem || r.gemScore.total >= regras.minGem
  const views = Number(r.views) || 0
  const subs = Number(r.canal.inscritos) || 0
  const nv = Math.max(0, Math.floor(Number(r.canal.videosPublicados) || 0))
  const minV = Math.max(0, Number(regras.capturaMinViews) || 0)
  const maxSRaw =
    regras.capturaMaxInscritos != null
      ? Number(regras.capturaMaxInscritos)
      : null
  const maxS =
    maxSRaw != null && Number.isFinite(maxSRaw) ? maxSRaw : null
  const minVid = Math.max(0, Math.floor(Number(regras.capturaMinVideosCanal) || 0))
  const maxRaw = regras.capturaMaxVideosCanal
  const maxVid =
    maxRaw != null && Number.isFinite(Number(maxRaw))
      ? Math.floor(Number(maxRaw))
      : null
  /** exige contagem > 0 quando há limite — evita passar com scrape falhado (nv 0). */
  const passVideos =
    (minVid <= 0 || (nv > 0 && nv >= minVid)) &&
    (maxVid == null || maxVid <= 0 || (nv > 0 && nv <= maxVid))
  /** Limite de vídeos no canal aplica-se sempre que estiver definido (mesmo com combinação OU ou só Gem). */
  const videoRuleActive = minVid > 0 || (maxVid != null && maxVid > 0)

  const passMetricasViewsSubs =
    views >= minV && (maxS == null || subs <= maxS)

  const passFiltro =
    !regras.exigirFiltroMetricas ||
    (passMetricasViewsSubs && passVideos)

  let result: boolean
  if (regras.exigirGem && regras.exigirFiltroMetricas) {
    result =
      regras.capturaCombinacao === 'OU'
        ? passGem || passMetricasViewsSubs
        : passGem && passFiltro
  } else if (regras.exigirGem) {
    result = passGem
  } else if (regras.exigirFiltroMetricas) {
    result = passFiltro
  } else {
    result = passGem
  }

  if (videoRuleActive && !passVideos) return false
  return result
}

export function resumoRegrasCapturaParaLog(c: {
  exigirGem: boolean
  exigirFiltroMetricas: boolean
  minGem: number
  capturaMinViews: number
  capturaMaxInscritos: number | null
  capturaMinVideosCanal?: number
  capturaMaxVideosCanal?: number | null
  capturaCombinacao: string
}): string {
  const parts: string[] = []
  if (c.exigirGem) parts.push(`Gem≥${c.minGem}`)
  if (c.exigirFiltroMetricas) {
    const bits: string[] = []
    if (c.capturaMinViews > 0) bits.push(`views vídeo≥${c.capturaMinViews}`)
    if (c.capturaMaxInscritos != null && c.capturaMaxInscritos > 0) {
      bits.push(`inscritos≤${c.capturaMaxInscritos}`)
    }
    const minVc = c.capturaMinVideosCanal ?? 0
    if (minVc > 0) bits.push(`vídeos canal≥${minVc}`)
    if (
      c.capturaMaxVideosCanal != null &&
      c.capturaMaxVideosCanal > 0
    ) {
      bits.push(`vídeos canal≤${c.capturaMaxVideosCanal}`)
    }
    parts.push(bits.length ? bits.join(', ') : 'filtro métricas (sem limite extra)')
  }
  if (c.exigirGem && c.exigirFiltroMetricas) {
    parts.push(c.capturaCombinacao === 'OU' ? 'combinação OU' : 'combinação E')
  }
  return parts.join(' · ')
}
