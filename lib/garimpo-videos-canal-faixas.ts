/**
 * Faixas de tamanho do canal (total de vídeos públicos no YouTube) — Garimpo.
 * Valores aplicados quando o scraper devolve o total de vídeos do canal.
 */

export type GarimpoVideosCanalFaixaId =
  | 'qualquer'
  | 'ate10'
  | 'ate20'
  | 'ate40'
  | 'ate80'
  | 'mais100'

const IDS = new Set<GarimpoVideosCanalFaixaId>([
  'qualquer',
  'ate10',
  'ate20',
  'ate40',
  'ate80',
  'mais100',
])

export type GarimpoVideosCanalFaixaOpcao = {
  id: GarimpoVideosCanalFaixaId
  titulo: string
  /** Uma linha curta para o cartão */
  subtitulo: string
}

export const GARIMPO_VIDEOS_CANAL_FAIXAS: GarimpoVideosCanalFaixaOpcao[] = [
  {
    id: 'qualquer',
    titulo: 'Qualquer tamanho',
    subtitulo: 'Não restringe pelo total de vídeos do canal.',
  },
  {
    id: 'ate10',
    titulo: 'Até 10 vídeos',
    subtitulo: 'Canal bem pequeno — no máximo 10 publicações contadas.',
  },
  {
    id: 'ate20',
    titulo: 'Até 20 vídeos',
    subtitulo: 'Pouco arquivo — foco em quem ainda está a construir catálogo.',
  },
  {
    id: 'ate40',
    titulo: 'Até 40 vídeos',
    subtitulo: 'Volume moderado, histórico ainda razoável de rever.',
  },
  {
    id: 'ate80',
    titulo: 'Até 80 vídeos',
    subtitulo: 'Já há trajeto; longe de canal com milhares de vídeos.',
  },
  {
    id: 'mais100',
    titulo: 'Mais de 100 vídeos',
    subtitulo: 'Só canais com biblioteca grande (101+ vídeos públicos).',
  },
]

export function normalizarFaixaVideosCanalSalva(
  raw: unknown
): GarimpoVideosCanalFaixaId {
  if (typeof raw === 'string' && IDS.has(raw as GarimpoVideosCanalFaixaId)) {
    return raw as GarimpoVideosCanalFaixaId
  }
  return 'qualquer'
}

/** Migração: valor numérico antigo (maxVideosCanal) → id de faixa. */
export function faixaPorMaxVideosCanalLegacy(maxVideos: unknown): GarimpoVideosCanalFaixaId {
  if (typeof maxVideos !== 'number' || !Number.isFinite(maxVideos) || maxVideos <= 0) {
    return 'qualquer'
  }
  if (maxVideos <= 10) return 'ate10'
  if (maxVideos <= 20) return 'ate20'
  if (maxVideos <= 40) return 'ate40'
  if (maxVideos <= 80) return 'ate80'
  return 'qualquer'
}

export type GarimpoVideosCanalApi = {
  maxVideosCanal: number
  minVideosCanal: number
}

export function faixaVideosCanalParaApi(id: GarimpoVideosCanalFaixaId): GarimpoVideosCanalApi {
  switch (id) {
    case 'ate10':
      return { maxVideosCanal: 10, minVideosCanal: 0 }
    case 'ate20':
      return { maxVideosCanal: 20, minVideosCanal: 0 }
    case 'ate40':
      return { maxVideosCanal: 40, minVideosCanal: 0 }
    case 'ate80':
      return { maxVideosCanal: 80, minVideosCanal: 0 }
    case 'mais100':
      return { maxVideosCanal: 0, minVideosCanal: 101 }
    default:
      return { maxVideosCanal: 0, minVideosCanal: 0 }
  }
}
