import type { LucideIcon } from 'lucide-react'
import {
  TrendingUp,
  Cpu,
  Globe2,
  Briefcase,
  HeartPulse,
  GraduationCap,
  Tv,
  Gamepad2,
  Car,
  Home,
  Hammer,
  Trophy,
  Skull,
  LayoutGrid,
} from 'lucide-react'
import { NICHOS } from '@/lib/nichos'

/** Ordem fixa dos nichos-pai na UI (Favoritos, filtros). */
export const ORDEM_NICHOS_PAI = NICHOS.map((n) => n.nome)

const SEM_NICHO_LABEL = 'Sem nicho'

/** Ícone do nicho pai (taxonomia em `lib/nichos.ts`). */
const ICONE_POR_NICHO_PAI: Record<string, LucideIcon> = {
  'Finanças & Investimentos': TrendingUp,
  Tecnologia: Cpu,
  'Notícias & Geopolítica': Globe2,
  'Negócios & Empreendedorismo': Briefcase,
  'Saúde & Bem-estar': HeartPulse,
  Educação: GraduationCap,
  Entretenimento: Tv,
  Gaming: Gamepad2,
  Automotivo: Car,
  'Lifestyle & Família': Home,
  'DIY & Ofícios': Hammer,
  Esportes: Trophy,
  'True crime & Mistério': Skull,
}

export function iconeNichoPai(nomePai: string): LucideIcon {
  return ICONE_POR_NICHO_PAI[nomePai] ?? LayoutGrid
}

/** Faixa de RPM (USD/1k) agregada dos sub-nichos do pai. */
export function rpmFaixaNichoPai(nomePai: string): { min: number; max: number } | null {
  const parent = NICHOS.find((n) => n.nome === nomePai)
  if (!parent?.subNichos.length) return null
  let min = Infinity
  let max = -Infinity
  for (const s of parent.subNichos) {
    min = Math.min(min, s.rpmEstimado.min)
    max = Math.max(max, s.rpmEstimado.max)
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  return { min, max }
}

export function formatarRpmFaixa(f: { min: number; max: number }): string {
  if (f.min === f.max) return `~US$ ${f.min}`
  return `US$ ${f.min}–${f.max}`
}

/** Extrai o nome do nicho pai do rótulo `"Pai > Sub"`. */
export function nichoPaiDoRotulo(rotulo: string | null | undefined): string | null {
  if (!rotulo?.trim()) return null
  const idx = rotulo.indexOf('>')
  if (idx === -1) return rotulo.trim()
  return rotulo.slice(0, idx).trim() || null
}

/** Rótulo de agrupamento (sempre string; canais sem nicho → “Sem nicho”). */
export function categoriaFavoritoDoCanal(
  nichoInferido: string | null | undefined
): string {
  return nichoPaiDoRotulo(nichoInferido) ?? SEM_NICHO_LABEL
}

export function slugGrupoFavorito(nomeCategoria: string): string {
  const s = nomeCategoria.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  return s.replace(/^-|-$/g, '') || 'outros'
}

export function compararCategoriasFavorito(a: string, b: string): number {
  if (a === SEM_NICHO_LABEL && b !== SEM_NICHO_LABEL) return 1
  if (b === SEM_NICHO_LABEL && a !== SEM_NICHO_LABEL) return -1
  const ia = ORDEM_NICHOS_PAI.indexOf(a)
  const ib = ORDEM_NICHOS_PAI.indexOf(b)
  const va = ia === -1 ? 500 : ia
  const vb = ib === -1 ? 500 : ib
  if (va !== vb) return va - vb
  return a.localeCompare(b, 'pt')
}
