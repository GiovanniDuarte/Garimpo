/** True se o canal tem tag mineirador (ou legado caçada). */
export function tagsIncluemMineirador(tags: string | null | undefined): boolean {
  if (!tags?.trim()) return false
  return tags.split(/[,;]/).some((t) => {
    const x = t.trim().toLowerCase()
    return x === 'mineirador' || x === 'caçada' || x === 'cacada'
  })
}
