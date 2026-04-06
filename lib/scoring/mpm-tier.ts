/** Faixas alinhadas às “gemas” do Gem Score (visual consistente na biblioteca). */
export type MpmTier = 'pepita' | 'promissor' | 'mediano' | 'fraco'

export function mpmTierFromIndice(mpm: number | null | undefined): MpmTier | null {
  if (mpm == null || Number.isNaN(mpm)) return null
  if (mpm >= 75) return 'pepita'
  if (mpm >= 50) return 'promissor'
  if (mpm >= 25) return 'mediano'
  return 'fraco'
}

export const MPM_TIER_LABEL: Record<MpmTier, string> = {
  pepita: 'Pepita',
  promissor: 'Promissor',
  mediano: 'Mediano',
  fraco: 'Fraco',
}
