'use client'

import type { PotencialModelagem } from '@/types'
import { cn } from '@/lib/utils'
import {
  Calculator,
  BarChart3,
  Percent,
  TrendingUp,
  ListChecks,
  Lightbulb,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  MPM_TIER_LABEL,
  mpmTierFromIndice,
  type MpmTier,
} from '@/lib/scoring/mpm-tier'

function fmtCompact(n: number): string {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toLocaleString('pt-BR')
}

function fmtPct(p: number): string {
  return `${p.toFixed(2)}%`
}

function Flag({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) {
    return (
      <span className="rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
        {label}: —
      </span>
    )
  }
  return (
    <span
      className={cn(
        'rounded-md px-2 py-1 text-[11px] font-medium',
        ok
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-muted/60 text-muted-foreground'
      )}
    >
      {label}: {ok ? 'Sim' : 'Não'}
    </span>
  )
}

const mpmTierBadgeClass: Record<MpmTier, string> = {
  pepita:
    'border-emerald-500/30 bg-gem-pepita-bg text-gem-pepita-text ring-1 ring-white/10',
  promissor:
    'border-amber-500/30 bg-gem-promissor-bg text-gem-promissor-text ring-1 ring-white/10',
  mediano:
    'border-red-400/25 bg-gem-mediano-bg text-gem-mediano-text ring-1 ring-white/10',
  fraco:
    'border-red-500/30 bg-gem-fraco-bg text-gem-fraco-text ring-1 ring-white/10',
}

export function PotencialModelagemPanel({
  potencial,
}: {
  potencial: PotencialModelagem
}) {
  const hasAny =
    potencial.mvv != null ||
    potencial.icvPercent != null ||
    potencial.vg != null

  if (!hasAny) {
    return (
      <section className="rounded-xl border border-[#272727] bg-[#181818] p-5 text-sm text-[#717171]">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Calculator className="h-4 w-4" />
          MPM — Medida de Potencial de Modelagem
        </p>
        <p className="mt-2">
          Atualize o canal na biblioteca para trazer views totais, inscritos e
          quantidade de vídeos do YouTube. Com isso calculamos o índice MPM
          (0–100), no mesmo estilo visual das gemas do Gem Score.
        </p>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[#272727] bg-[#181818] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#272727] bg-[#212121]/60 px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Calculator className="h-5 w-5 text-primary" />
            MPM — Medida de Potencial de Modelagem
          </h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Indica o quanto o canal parece &quot;desmontável&quot; para criar
            variações: <strong className="text-foreground">MVV</strong> (média
            de views por vídeo), <strong className="text-foreground">ICV</strong>{' '}
            (inscritos ÷ views, em %) e{' '}
            <strong className="text-foreground">VG</strong> (views por mês de
            idade do canal). O número grande é o{' '}
            <strong className="text-foreground">MPM 0–100</strong>, normalizado
            como as gemas (Pepita → Fraco).
          </p>
        </div>
        {potencial.mpmIndice != null && (
          <div className="flex flex-col items-end rounded-lg border border-[#272727] bg-[#272727] px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              MPM
            </span>
            <span className="text-3xl font-bold tabular-nums text-primary">
              {potencial.mpmIndice}
            </span>
            <span className="text-[10px] text-muted-foreground">de 100</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <div className="rounded-lg border border-[#272727] bg-[#272727]/40 p-3">
          <div className="flex items-center gap-2 text-primary">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-semibold">MVV</span>
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums">
            {potencial.mvv != null ? fmtCompact(Math.round(potencial.mvv)) : '—'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Views por vídeo (média)
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/10 p-3">
          <div className="flex items-center gap-2 text-primary">
            <Percent className="h-4 w-4" />
            <span className="text-sm font-semibold">ICV</span>
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums">
            {potencial.icvPercent != null ? fmtPct(potencial.icvPercent) : '—'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Inscritos em relação às views
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/10 p-3">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-semibold">VG</span>
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums">
            {potencial.vg != null
              ? `${fmtCompact(Math.round(potencial.vg))}/mês`
              : '—'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tração por mês de idade do canal
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
        <Flag ok={potencial.icvAlto} label="ICV ≥ 2%" />
        <Flag ok={potencial.canalJovem} label="Canal &lt; 24 meses" />
        <Flag ok={potencial.frequenciaOk} label="Frequência (~2+ vídeos/mês)" />
      </div>

      {potencial.sinais.length > 0 && (
        <div className="border-t border-[#272727] bg-amber-500/5 px-5 py-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200/90">
            <Lightbulb className="h-3.5 w-3.5" />
            Leituras rápidas
          </p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {potencial.sinais.map((s, i) => (
              <li key={i} className="flex gap-2">
                <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export function MpmBadge({ potencial }: { potencial: PotencialModelagem }) {
  const mpm = potencial.mpmIndice
  if (mpm == null) return null
  const tier = mpmTierFromIndice(mpm)
  if (!tier) return null
  const label = MPM_TIER_LABEL[tier]
  const hint = `MPM ${mpm} — ${label}. Medida de Potencial de Modelagem (0–100), mesmas faixas de cor das gemas.`

  const badge = (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-sm',
        mpmTierBadgeClass[tier]
      )}
    >
      <span className="opacity-90">{label}</span>
      <span className="font-bold">{mpm}</span>
    </span>
  )

  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex border-0 bg-transparent p-0">
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  )
}
