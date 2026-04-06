const STORAGE_KEY = 'biblioteca:filtros-v1'

export type BibliotecaFiltrosSalvos = {
  statusFilter: string
  orderBy: string
  searchQuery: string
}

const DEFAULTS: BibliotecaFiltrosSalvos = {
  statusFilter: 'all',
  orderBy: 'criadoEm',
  searchQuery: '',
}

export function lerFiltrosBiblioteca(): BibliotecaFiltrosSalvos {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const p = JSON.parse(raw) as Partial<BibliotecaFiltrosSalvos>
    let orderBy =
      typeof p.orderBy === 'string' ? p.orderBy : DEFAULTS.orderBy
    if (orderBy === 'mpm') orderBy = 'criadoEm'
    return {
      statusFilter:
        typeof p.statusFilter === 'string' ? p.statusFilter : DEFAULTS.statusFilter,
      orderBy,
      searchQuery:
        typeof p.searchQuery === 'string' ? p.searchQuery : DEFAULTS.searchQuery,
    }
  } catch {
    return DEFAULTS
  }
}

export function salvarFiltrosBiblioteca(f: BibliotecaFiltrosSalvos) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f))
  } catch {
    // ignore
  }
}
