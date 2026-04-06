'use client'

import { cn } from '@/lib/utils'
import type { GemScoreDetalhado } from '@/types'
import { Gauge, Rocket, Layers, Scale, Globe2, Sparkles } from 'lucide-react'

const MAX = {
  viewsPorInscrito: 32,
  velocidade: 28,
  consistencia: 18,
  tamanhoCanal: 12,
  alcanceCanal: 10,
} as const

function normalizeBreakdown(
  b: GemScoreDetalhado['breakdown'] | undefined
): GemScoreDetalhado['breakdown'] {
  return {
    viewsPorInscrito: b?.viewsPorInscrito ?? 0,
    velocidade: b?.velocidade ?? 0,
    consistencia: b?.consistencia ?? 0,
    tamanhoCanal: b?.tamanhoCanal ?? 0,
    alcanceCanal: b?.alcanceCanal ?? 0,
  }
}

const tierMeta: Record<
  GemScoreDetalhado['classificacao'],
  {
    bg: string
    text: string
    label: string
    shortLabel: string
    hint: string
    ring: string
    bar: string
  }
> = {
  pepita: {
    bg: 'bg-gem-pepita-bg',
    text: 'text-gem-pepita-text',
    label: 'Pepita',
    shortLabel: 'Pep',
    hint: 'Desempenho excepcional em relação ao tamanho do canal e ao alcance.',
    ring: 'stroke-emerald-400',
    bar: 'bg-emerald-500',
  },
  promissor: {
    bg: 'bg-gem-promissor-bg',
    text: 'text-gem-promissor-text',
    label: 'Promissor',
    shortLabel: 'Pro',
    hint: 'Boa tração, velocidade ou consistência — vale acompanhar de perto.',
    ring: 'stroke-amber-400',
    bar: 'bg-amber-500',
  },
  mediano: {
    bg: 'bg-gem-mediano-bg',
    text: 'text-gem-mediano-text',
    label: 'Mediano',
    shortLabel: 'Med',
    hint: 'Dentro do esperado para o perfil.',
    ring: 'stroke-red-400/70',
    bar: 'bg-sky-500',
  },
  fraco: {
    bg: 'bg-gem-fraco-bg',
    text: 'text-gem-fraco-text',
    label: 'Fraco',
    shortLabel: 'Fr',
    hint: 'Pouco destaque frente ao tamanho do canal ou ao histórico de views.',
    ring: 'stroke-red-400/80',
    bar: 'bg-zinc-500',
  },
}

/** Cor da barra de progresso (lista Garimpo) alinhada à classificação. */
export function gemScoreBarClass(
  classificacao: GemScoreDetalhado['classificacao']
): string {
  return tierMeta[classificacao]?.bar ?? tierMeta.fraco.bar
}

interface GemScoreProps {
  score: GemScoreDetalhado
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showBreakdown?: boolean
  /** Rótulo curto (ex.: Pep) para listagens compactas. */
  compact?: boolean
  /** Estica a pílula à largura do contentor (ex.: coluna Garimpo). */
  fullWidth?: boolean
}

export function GemScoreBadge({
  score,
  size = 'md',
  showBreakdown = false,
  compact = false,
  fullWidth = false,
}: GemScoreProps) {
  const tier = tierMeta[score.classificacao] || tierMeta.fraco
  const tierLabel = compact ? tier.shortLabel : tier.label

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium shadow-sm ring-1 ring-inset ring-white/10',
        fullWidth && 'w-full justify-center',
        tier.bg,
        tier.text,
        size === 'xs' &&
          'max-w-full gap-1 px-2.5 py-1.5 text-[11px] leading-snug',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm'
      )}
    >
      <span className="tabular-nums font-bold">{score.total}</span>
      <span className="opacity-90">{tierLabel}</span>
    </span>
  )

  if (showBreakdown) {
    return <GemScorePanel score={score} />
  }

  return (
    <span
      className={cn('inline-flex', fullWidth && 'w-full')}
      aria-label={`Gem Score ${score.total}, ${tier.label}`}
    >
      {badge}
    </span>
  )
}

export function GemScorePanel({
  score,
  totalViewsCanal,
}: {
  score: GemScoreDetalhado
  totalViewsCanal?: number | null
}) {
  const tier = tierMeta[score.classificacao] || tierMeta.fraco
  const breakdown = normalizeBreakdown(score.breakdown)
  const nb = score.nichoBonus

  return (
    <div className="overflow-hidden rounded-xl border border-[#272727] bg-[#181818] shadow-sm">
      <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <ScoreRing value={score.total} strokeClass={tier.ring} />
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight">Gem Score</h3>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm ring-1 ring-inset ring-white/10',
                tier.bg,
                tier.text
              )}
            >
              {tier.label}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tier.hint}
          </p>
          {totalViewsCanal != null && totalViewsCanal > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span>
                Canal com{' '}
                <strong className="font-medium text-foreground">
                  {formatCompact(totalViewsCanal)}
                </strong>{' '}
                views totais (Alcance).
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 border-t border-[#272727] bg-[#212121]/60 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Critérios (máx. 100 pts)
        </p>
        <ScoreRow
          icon={Gauge}
          label="Views por inscrito"
          hint="Quanto o vídeo supera o tamanho da base"
          value={breakdown.viewsPorInscrito}
          max={MAX.viewsPorInscrito}
          barClass="bg-sky-500"
        />
        <ScoreRow
          icon={Rocket}
          label="Velocidade"
          hint="Views por dia desde a publicação"
          value={breakdown.velocidade}
          max={MAX.velocidade}
          barClass="bg-[#ff0000]"
        />
        <ScoreRow
          icon={Layers}
          label="Consistência"
          hint="Vídeos fortes em relação aos inscritos"
          value={breakdown.consistencia}
          max={MAX.consistencia}
          barClass="bg-amber-500"
        />
        <ScoreRow
          icon={Scale}
          label="Tamanho do canal"
          hint="Bônus para canais menores"
          value={breakdown.tamanhoCanal}
          max={MAX.tamanhoCanal}
          barClass="bg-emerald-500"
        />
        <ScoreRow
          icon={Globe2}
          label="Alcance do canal"
          hint="Volume histórico de views do canal"
          value={breakdown.alcanceCanal}
          max={MAX.alcanceCanal}
          barClass="bg-cyan-500"
        />
      </div>

      {score.mpmBonus && (
        <div className="border-t border-[#272727] bg-muted/30 px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Bónus MPM (modelagem)
          </p>
          <p className="text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">
              +{score.mpmBonus.pontos} pontos
            </strong>{' '}
            com base no índice de potencial de modelagem{' '}
            <span className="tabular-nums font-medium text-foreground">
              {score.mpmBonus.mpmIndice}
            </span>
            . Este valor entra no total do Gem acima.
          </p>
        </div>
      )}

      {nb && (
        <div className="border-t border-[#272727] bg-primary/5 px-5 py-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Potencial do nicho (referência)
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-[#272727] py-2">
              <p className="text-[10px] text-muted-foreground">RPM médio</p>
              <p className="text-sm font-bold text-green-400">${nb.rpmMedio}</p>
            </div>
            <div className="rounded-lg bg-background/60 py-2">
              <p className="text-[10px] text-muted-foreground">Viralidade</p>
              <p className="text-sm font-bold text-orange-400">
                {nb.viralidade}/10
              </p>
            </div>
            <div className="rounded-lg bg-background/60 py-2">
              <p className="text-[10px] text-muted-foreground">Equilíbrio</p>
              <p className="text-sm font-bold text-primary">
                {nb.potencialOuro}/10
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreRing({ value, strokeClass }: { value: number; strokeClass: string }) {
  const pct = Math.min(100, Math.max(0, value))
  const r = 42
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c

  return (
    <div className="relative mx-auto size-[100px] shrink-0 sm:mx-0">
      <svg
        viewBox="0 0 100 100"
        className="size-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          className="stroke-muted/40"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          className={cn('transition-all duration-500', strokeClass)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums leading-none tracking-tight">
          {value}
        </span>
        <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
          de 100
        </span>
      </div>
    </div>
  )
}

function ScoreRow({
  icon: Icon,
  label,
  hint,
  value,
  max,
  barClass,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint: string
  value: number
  max: number
  barClass: string
}) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-medium">{label}</span>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {value}/{max}
        </span>
      </div>
      <p className="mb-1.5 text-[10px] text-muted-foreground">{hint}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toLocaleString('pt-BR')
}
