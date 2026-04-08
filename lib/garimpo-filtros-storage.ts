import { normalizarDiasRecenciaSalvo } from '@/lib/garimpo-recencia-label'
import {
  type GarimpoVideosCanalFaixaId,
  normalizarFaixaVideosCanalSalva,
  faixaPorMaxVideosCanalLegacy,
} from '@/lib/garimpo-videos-canal-faixas'

const STORAGE_KEY = 'garimpo:filtros-v2'
const STORAGE_KEY_LEGACY = 'garimpo:filtros-v1'

export type GarimpoFiltrosSalvos = {
  minViews: number
  maxInscritos: number
  /** Faixa de tamanho do canal (vídeos públicos). */
  videosCanalFaixa: GarimpoVideosCanalFaixaId
  dias: number
  /** Painel de filtros aberto ou fechado */
  filtersOpen?: boolean
  /** Campo de pesquisa */
  query?: string
}

function parseSalvos(raw: string | null): GarimpoFiltrosSalvos | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<GarimpoFiltrosSalvos> & {
      maxVideosCanal?: number
    }
    if (
      typeof p.minViews !== 'number' ||
      typeof p.maxInscritos !== 'number' ||
      typeof p.dias !== 'number'
    ) {
      return null
    }
    const faixaFromField = normalizarFaixaVideosCanalSalva(p.videosCanalFaixa)
    const videosCanalFaixa =
      faixaFromField !== 'qualquer'
        ? faixaFromField
        : faixaPorMaxVideosCanalLegacy(p.maxVideosCanal)
    return {
      minViews: p.minViews,
      maxInscritos: p.maxInscritos,
      videosCanalFaixa,
      dias: normalizarDiasRecenciaSalvo(p.dias),
      filtersOpen: typeof p.filtersOpen === 'boolean' ? p.filtersOpen : undefined,
      query: typeof p.query === 'string' ? p.query : undefined,
    }
  } catch {
    return null
  }
}

export function lerFiltrosGarimpo(): GarimpoFiltrosSalvos | null {
  if (typeof window === 'undefined') return null
  const v2 = parseSalvos(localStorage.getItem(STORAGE_KEY))
  if (v2) return v2
  const legacy = parseSalvos(localStorage.getItem(STORAGE_KEY_LEGACY))
  if (legacy) {
    try {
      localStorage.removeItem(STORAGE_KEY_LEGACY)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    } catch {
      // ignore
    }
    return legacy
  }
  return null
}

export function salvarFiltrosGarimpo(f: GarimpoFiltrosSalvos) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f))
  } catch {
    // ignore quota / private mode
  }
}
