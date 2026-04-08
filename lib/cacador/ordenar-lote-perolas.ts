import type { VideoGarimpo } from '@/types'

/**
 * Prioriza capturas: Gem mais alto primeiro; empate → canal com **menos** inscritos
 * (mais “teto” para pérola); depois ritmo de views/dia e views absolutas no vídeo.
 */
export function ordenarLoteParaCaptura(rows: VideoGarimpo[]): VideoGarimpo[] {
  return [...rows].sort((a, b) => {
    const gDiff = b.gemScore.total - a.gemScore.total
    if (Math.abs(gDiff) >= 0.05) return gDiff

    const sa = a.canal.inscritos ?? Number.POSITIVE_INFINITY
    const sb = b.canal.inscritos ?? Number.POSITIVE_INFINITY
    const subDiff = sa - sb
    if (subDiff !== 0) return subDiff

    const vpdDiff = (b.viewsPorDia ?? 0) - (a.viewsPorDia ?? 0)
    if (Math.abs(vpdDiff) > 1e-6) return vpdDiff

    return (b.views ?? 0) - (a.views ?? 0)
  })
}
