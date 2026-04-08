import type { VideoGarimpo } from '@/types'

export type CacadaRegrasCaptura = {
  exigirGem: boolean
  exigirFiltroMetricas: boolean
  minGem: number
  capturaMinViews: number
  capturaMaxInscritos: number | null
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
  const views = r.views
  const subs = r.canal.inscritos ?? 0
  const minV = Math.max(0, regras.capturaMinViews)
  const maxS = regras.capturaMaxInscritos
  const passFiltro =
    !regras.exigirFiltroMetricas ||
    (views >= minV && (maxS == null || subs <= maxS))

  if (regras.exigirGem && regras.exigirFiltroMetricas) {
    return regras.capturaCombinacao === 'OU'
      ? passGem || passFiltro
      : passGem && passFiltro
  }
  if (regras.exigirGem) return passGem
  if (regras.exigirFiltroMetricas) return passFiltro
  return passGem
}

export function resumoRegrasCapturaParaLog(c: {
  exigirGem: boolean
  exigirFiltroMetricas: boolean
  minGem: number
  capturaMinViews: number
  capturaMaxInscritos: number | null
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
    parts.push(bits.length ? bits.join(', ') : 'filtro métricas (sem limite extra)')
  }
  if (c.exigirGem && c.exigirFiltroMetricas) {
    parts.push(c.capturaCombinacao === 'OU' ? 'combinação OU' : 'combinação E')
  }
  return parts.join(' · ')
}
