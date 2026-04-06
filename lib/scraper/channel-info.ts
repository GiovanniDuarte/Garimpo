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
