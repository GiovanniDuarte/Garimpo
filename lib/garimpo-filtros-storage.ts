const STORAGE_KEY = 'garimpo:filtros-v1'

export type GarimpoFiltrosSalvos = {
  minViews: number
  maxInscritos: number
  dias: number
}

export function lerFiltrosGarimpo(): GarimpoFiltrosSalvos | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<GarimpoFiltrosSalvos>
    if (
      typeof p.minViews !== 'number' ||
      typeof p.maxInscritos !== 'number' ||
      typeof p.dias !== 'number'
    ) {
      return null
    }
    return {
      minViews: p.minViews,
      maxInscritos: p.maxInscritos,
      dias: p.dias,
    }
  } catch {
    return null
  }
}

export function salvarFiltrosGarimpo(f: GarimpoFiltrosSalvos) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f))
  } catch {
    // ignore quota / private mode
  }
}
