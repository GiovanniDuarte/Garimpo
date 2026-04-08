/** Etiquetas de origem mineirador (normaliza e evita duplicados). */
const TAGS_MINEIRO = new Set(['mineirador', 'caçada'])

export function mergeTagMineirador(tagsExistentes: string | null | undefined): string {
  const raw = tagsExistentes?.trim()
  const partes = raw
    ? raw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => !TAGS_MINEIRO.has(s.toLowerCase()))
    : []
  return [...partes, 'mineirador'].join(', ')
}

/** @deprecated usar mergeTagMineirador — mantido para imports legados. */
export const mergeTagCacada = mergeTagMineirador
