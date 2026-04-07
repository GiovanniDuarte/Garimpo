const PT_MONTH_PREFIX: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
}

/** Data de entrada no YouTube a partir do texto devolvido pelo scraper (EN, PT, ES). */
export function parseJoinDateYoutube(text: string): Date | undefined {
  if (!text?.trim()) return undefined
  let s = text.trim()
  s = s
    .replace(/^joined\s+/i, '')
    .replace(/^aderiu\s+(?:a|em)\s+/i, '')
    .replace(/^inscreveu-se\s+em\s+/i, '')
    .replace(/^subscribed\s+on\s+/i, '')
    .replace(/^se unió\s+(?:el|en)\s+/i, '')
    .trim()

  const d0 = new Date(s)
  if (!isNaN(d0.getTime())) {
    const y = d0.getFullYear()
    const nowY = new Date().getFullYear()
    if (y >= 2005 && y <= nowY + 1) return d0
  }

  // "22 de abr. de 2007" / "5 de mar. de 2010"
  const pt = s.match(
    /^(\d{1,2})\s+de\s+([a-zç]{3,9})\.?\s+de\s+(\d{4})$/i
  )
  if (pt) {
    const day = parseInt(pt[1], 10)
    const year = parseInt(pt[3], 10)
    const monKey = pt[2].toLowerCase().replace(/\.$/, '').slice(0, 3)
    const month = PT_MONTH_PREFIX[monKey]
    if (month != null && year >= 2005 && year <= new Date().getFullYear() + 1) {
      const t = new Date(year, month, day)
      if (!isNaN(t.getTime())) return t
    }
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
 * Data de referência para “idade do canal”:
 * 1) **data de criação no YouTube** (`dataCriacaoCanal` / join), quando existir;
 * 2) senão, a **publicação mais antiga** entre os vídeos guardados (amostra limitada
 *    — só usar quando o join não estiver disponível).
 */
export function resolverDataReferenciaIdadeCanal(
  videos: Array<{ dataPublicacao: Date | string | null | undefined }>,
  dataCriacaoCanal: Date | string | null | undefined
): Date | null {
  if (dataCriacaoCanal != null && dataCriacaoCanal !== '') {
    const join =
      dataCriacaoCanal instanceof Date
        ? dataCriacaoCanal
        : new Date(dataCriacaoCanal)
    if (!isNaN(join.getTime())) return join
  }
  let oldest: Date | null = null
  for (const v of videos) {
    const raw = v.dataPublicacao
    if (raw == null) continue
    const d = raw instanceof Date ? raw : new Date(raw)
    if (isNaN(d.getTime())) continue
    if (!oldest || d.getTime() < oldest.getTime()) oldest = d
  }
  return oldest
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
