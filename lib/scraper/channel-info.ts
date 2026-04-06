/** Data de entrada no YouTube a partir do texto devolvido pelo scraper. */
export function parseJoinDateYoutube(text: string): Date | undefined {
  if (!text?.trim()) return undefined
  try {
    const date = new Date(text)
    if (!isNaN(date.getTime())) return date
  } catch {
    // ignore
  }
  return undefined
}

export function calcularFrequencia(datas: Date[]): string {
  if (datas.length < 2) return 'Dados insuficientes'

  const sorted = [...datas].sort((a, b) => b.getTime() - a.getTime())
  const intervals: number[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const diff =
      (sorted[i].getTime() - sorted[i + 1].getTime()) / (1000 * 60 * 60 * 24)
    intervals.push(diff)
  }

  const avgDays = intervals.reduce((a, b) => a + b, 0) / intervals.length

  if (avgDays <= 1) return '~1 vídeo/dia'
  if (avgDays <= 3.5) return `~${Math.round(7 / avgDays)} vídeos/semana`
  if (avgDays <= 7) return '~1 vídeo/semana'
  if (avgDays <= 14) return '~2 vídeos/mês'
  if (avgDays <= 30) return '~1 vídeo/mês'
  return `~1 vídeo a cada ${Math.round(avgDays)} dias`
}

/**
 * Data de referência para “idade do canal”: a **data de publicação mais antiga**
 * entre os vídeos guardados (com `dataPublicacao`). Se nenhum tiver data,
 * usa `dataCriacaoCanal` (ex.: data de entrada no YouTube).
 */
export function resolverDataReferenciaIdadeCanal(
  videos: Array<{ dataPublicacao: Date | string | null | undefined }>,
  dataCriacaoCanal: Date | string | null | undefined
): Date | null {
  let oldest: Date | null = null
  for (const v of videos) {
    const raw = v.dataPublicacao
    if (raw == null) continue
    const d = raw instanceof Date ? raw : new Date(raw)
    if (isNaN(d.getTime())) continue
    if (!oldest || d.getTime() < oldest.getTime()) oldest = d
  }
  if (oldest) return oldest
  if (dataCriacaoCanal == null || dataCriacaoCanal === '') return null
  const fb =
    dataCriacaoCanal instanceof Date
      ? dataCriacaoCanal
      : new Date(dataCriacaoCanal)
  return isNaN(fb.getTime()) ? null : fb
}

export function calcularIdadeCanal(dataCriacao: Date): string {
  const now = new Date()
  let years = now.getFullYear() - dataCriacao.getFullYear()
  let months = now.getMonth() - dataCriacao.getMonth()

  if (months < 0) {
    years--
    months += 12
  }

  const parts: string[] = []
  if (years > 0) parts.push(`${years} ano${years > 1 ? 's' : ''}`)
  if (months > 0) parts.push(`${months} ${months > 1 ? 'meses' : 'mês'}`)

  return parts.join(' e ') || 'Menos de 1 mês'
}
