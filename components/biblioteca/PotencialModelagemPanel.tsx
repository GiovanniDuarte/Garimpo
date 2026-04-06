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
          Potencial de modelagem (IPM)
        </p>
        <p className="mt-2">
          Atualize o canal para trazer views totais, inscritos e contagem de
          vídeos do YouTube.
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
            Potencial de modelagem
          </h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            MVV (média de views por vídeo), ICV (inscritos/views) e VG
            (views/mês de idade). IPM é um índice 0–100 normalizado.
          </p>
        </div>
        {potencial.ipmIndice != null && (
          <div className="flex flex-col items-end rounded-lg border border-[#272727] bg-[#272727] px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              IPM
            </span>
            <span className="text-3xl font-bold tabular-nums text-primary">
              {potencial.ipmIndice}
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
        </div>
        <div className="rounded-lg border border-border bg-muted/10 p-3">
          <div className="flex items-center gap-2 text-primary">
            <Percent className="h-4 w-4" />
            <span className="text-sm font-semibold">ICV</span>
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums">
            {potencial.icvPercent != null ? fmtPct(potencial.icvPercent) : '—'}
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
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
        <Flag ok={potencial.icvAlto} label="ICV ≥ 2%" />
        <Flag ok={potencial.canalJovem} label="Menos de 24 meses" />
        <Flag ok={potencial.frequenciaOk} label="Frequência (~2+ vídeos/mês)" />
      </div>

      {potencial.sinais.length > 0 && (
        <div className="border-t border-[#272727] bg-amber-500/5 px-5 py-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200/90">
            <Lightbulb className="h-3.5 w-3.5" />
            Leituras
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

export function IpmBadge({ potencial }: { potencial: PotencialModelagem }) {
  if (potencial.ipmIndice == null) return null
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary"
      title="Índice de Potencial de Modelagem (0–100)"
    >
      IPM {potencial.ipmIndice}
    </span>
  )
}
