/**
 * Valores enviados à API (`diasPublicacao`) — alinhados a `searchParamsForDias`
 * em `lib/scraper/youtube.ts`.
 */
export const RECENCIA_PUBLICACAO_OPCOES = [
  {
    dias: 0,
    titulo: 'Sem limite',
    subtitulo: 'Qualquer data de publicação',
  },
  {
    dias: 7,
    titulo: '7 dias',
    subtitulo: 'Vídeos da última semana',
  },
  {
    dias: 30,
    titulo: '30 dias',
    subtitulo: 'Cerca de 1 mês',
  },
  {
    dias: 365,
    titulo: '12 meses',
    subtitulo: 'Cerca de 1 ano',
  },
] as const

export type RecenciaDias = (typeof RECENCIA_PUBLICACAO_OPCOES)[number]['dias']

export function normalizarDiasRecenciaSalvo(d: number): RecenciaDias {
  if (d <= 0) return 0
  if (d <= 7) return 7
  if (d <= 30) return 30
  return 365
}
