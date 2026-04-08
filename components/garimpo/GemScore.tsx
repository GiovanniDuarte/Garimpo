'use client'

import { cn } from '@/lib/utils'
import type { GemScoreDetalhado, GemScoreSinaisV3 } from '@/types'
import {
  Gauge,
  Rocket,
  Layers,
  Scale,
  Globe2,
  Sparkles,
  PlusCircle,
  TrendingUp,
  BarChart3,
  Clock,
  AlertTriangle,
} from 'lucide-react'

const MAX_V2 = {
  viewsPorInscrito: 32,
  velocidade: 28,
  consistencia: 18,
  tamanhoCanal: 12,
  alcanceCanal: 10,
} as const

function normalizeBreakdownV2(
  b: GemScoreDetalhado['breakdown'] | undefined
): NonNullable<GemScoreDetalhado['breakdown']> {
  return {
    viewsPorInscrito: b?.viewsPorInscrito ?? 0,
    velocidade: b?.velocidade ?? 0,
    consistencia: b?.consistencia ?? 0,
    tamanhoCanal: b?.tamanhoCanal ?? 0,
    alcanceCanal: b?.alcanceCanal ?? 0,
  }
}

function isGemV3(score: GemScoreDetalhado): score is GemScoreDetalhado & {
  versao: 3
  sinais: GemScoreSinaisV3
} {
  return score.versao === 3 && score.sinais != null
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
    ring: 'stroke-[#4abe8a]',
    bar: 'bg-[#4abe8a]',
  },
  promissor: {
    bg: 'bg-gem-promissor-bg',
    text: 'text-gem-promissor-text',
    label: 'Promissor',
    shortLabel: 'Pro',
    hint: 'Boa tração, velocidade ou consistência — vale acompanhar de perto.',
    ring: 'stroke-[#5a9be0]',
    bar: 'bg-[#5a9be0]',
  },
  mediano: {
    bg: 'bg-gem-mediano-bg',
    text: 'text-gem-mediano-text',
    label: 'Mediano',
    shortLabel: 'Med',
    hint: 'Dentro do esperado para o perfil.',
    ring: 'stroke-[#e8a93a]',
    bar: 'bg-[#e8a93a]',
  },
  fraco: {
    bg: 'bg-gem-fraco-bg',
    text: 'text-gem-fraco-text',
    label: 'Fraco',
    shortLabel: 'Fr',
    hint: 'Pouco destaque frente ao tamanho do canal ou ao histórico de views.',
    ring: 'stroke-[#6b6a66]',
    bar: 'bg-[#5e5d5a]',
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

export type GemScoreContextoCanal = {
  /** Total público de vídeos do canal (YouTube); omitir pílula se null. */
  videosNoCanal: number | null
  idadeMeses: number
  inscritos: number
  totalViews: number
}

export function GemScorePanel({
  score,
  totalViewsCanal,
  contextoCanal,
}: {
  score: GemScoreDetalhado
  totalViewsCanal?: number | null
  /** Pílulas do cabeçalho (v3): vídeos no canal, idade, views, inscritos. */
  contextoCanal?: GemScoreContextoCanal | null
}) {
  if (isGemV3(score)) {
    return (
      <GemScorePanelV3
        score={score}
        contextoCanal={contextoCanal}
      />
    )
  }

  return (
    <GemScorePanelV2 score={score} totalViewsCanal={totalViewsCanal} />
  )
}

function GemScorePanelV3({
  score,
  contextoCanal,
}: {
  score: GemScoreDetalhado & { versao: 3; sinais: GemScoreSinaisV3 }
  contextoCanal?: GemScoreContextoCanal | null
}) {
  const tier = tierMeta[score.classificacao] || tierMeta.fraco
  const { sinais } = score

  const sinalRows: {
    key: string
    titulo: string
    sinal: GemScoreSinaisV3[keyof GemScoreSinaisV3]
    icon: React.ComponentType<{ className?: string }>
    iconWrap: string
    barClass: string
  }[] = [
    {
      key: 'autonomia',
      titulo: 'Índice de Autonomia',
      sinal: sinais.autonomia,
      icon: PlusCircle,
      iconWrap: 'bg-sky-500/20 text-sky-400',
      barClass: 'bg-sky-500',
    },
    {
      key: 'aceleracao',
      titulo: 'Coeficiente de Aceleração',
      sinal: sinais.aceleracao,
      icon: TrendingUp,
      iconWrap: 'bg-emerald-500/20 text-emerald-400',
      barClass: 'bg-emerald-500',
    },
    {
      key: 'densidade',
      titulo: 'Densidade de hits & dispersão',
      sinal: sinais.densidadeHits,
      icon: BarChart3,
      iconWrap: 'bg-gp-gold/10 text-gp-gold',
      barClass: 'bg-gp-gold',
    },
    {
      key: 'pressao',
      titulo: 'Pressão por Unidade',
      sinal: sinais.pressaoUnidade,
      icon: Clock,
      iconWrap: 'bg-gp-red/10 text-gp-red',
      barClass: 'bg-gp-red',
    },
  ]

  const rodapeDefault = [
    `${sinais.autonomia.ratioMultiplo}×`,
    `${sinais.aceleracao.multiplo}×`,
    `${sinais.densidadeHits.pct}%`,
    formatCompact(sinais.pressaoUnidade.viewsPorDiaPorVideo),
  ]
  const rodapeRaw = score.resumoRodape ?? rodapeDefault
  const rodape = rodapeRaw.slice(0, 4)

  const rodapeHints = [
    'autonomia da base',
    'aceleração',
    'hits ≥100k + dispersão de views',
    'views/dia/vídeo',
  ]
  const receitaEstimada =
    contextoCanal?.totalViews &&
    contextoCanal.totalViews > 0 &&
    score.nichoBonus?.rpmMedio != null
      ? (contextoCanal.totalViews / 1000) * score.nichoBonus.rpmMedio
      : null
  const receitaMediaPorVideo =
    receitaEstimada != null &&
    contextoCanal?.videosNoCanal != null &&
    contextoCanal.videosNoCanal > 0
      ? receitaEstimada / contextoCanal.videosNoCanal
      : null

  return (
    <div className="gp-card overflow-hidden shadow-sm">
      <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-start">
        <ScoreRing value={score.total} strokeClass={tier.ring} centerClassName={tier.text} />
        <div className="min-w-0 space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-bold tracking-wide text-gp-text">
              Gem Score
            </h3>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded border border-white/[0.12] px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-[0.06em]',
                tier.bg,
                tier.text
              )}
            >
              {tier.label}
            </span>
          </div>
          <p className="max-w-[480px] text-[13px] leading-relaxed text-gp-text2">
            Quatro sinais que eliminam ruído e revelam canais com tração real,
            independente de inscritos ou histórico longo.
          </p>
          {contextoCanal && (
            <div className="flex flex-wrap gap-1.5">
              {contextoCanal.videosNoCanal != null &&
                contextoCanal.videosNoCanal > 0 && (
                  <span className="gp-mono-nums rounded-full border border-white/[0.12] bg-gp-bg4 px-2.5 py-1 text-[11px] text-gp-text2">
                    {contextoCanal.videosNoCanal} vídeos no canal
                  </span>
                )}
              <span className="gp-mono-nums rounded-full border border-white/[0.12] bg-gp-bg4 px-2.5 py-1 text-[11px] text-gp-text2">
                {contextoCanal.idadeMeses}{' '}
                {contextoCanal.idadeMeses === 1 ? 'mês' : 'meses'}
              </span>
              <span className="gp-mono-nums rounded-full border border-white/[0.12] bg-gp-bg4 px-2.5 py-1 text-[11px] text-gp-text2">
                {formatCompact(contextoCanal.totalViews)} views totais
              </span>
              <span className="gp-mono-nums rounded-full border border-white/[0.12] bg-gp-bg4 px-2.5 py-1 text-[11px] text-gp-text2">
                {formatCompact(contextoCanal.inscritos)} inscritos
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-0.5 border-t border-white/[0.07] bg-gp-bg2/80 px-4 py-4 sm:px-6">
        <p className="mb-3 font-heading text-[10px] font-semibold uppercase tracking-[0.08em] text-gp-text3">
          4 sinais · máx. 100 pts
        </p>
        <div className="flex flex-col gap-0.5">
          {sinalRows.map((row) => (
            <SinalRowV3
              key={row.key}
              titulo={row.titulo}
              sinal={row.sinal}
              icon={row.icon}
              iconWrap={row.iconWrap}
              barClass={row.barClass}
            />
          ))}
        </div>
      </div>

      {score.insight && (
        <div className="flex gap-3 border-t border-gp-gold/25 bg-gp-gold/10 px-5 py-3 text-sm text-gp-text">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gp-gold" />
          <p className="leading-snug text-gp-text2">{score.insight}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-white/[0.07] bg-gp-bg3 px-3 py-4 sm:grid-cols-4 sm:px-5">
        {rodape.map((v, i) => (
          <div
            key={i}
            className="rounded-lg bg-gp-bg3 px-3 py-3 text-center sm:bg-gp-bg2"
          >
            <p className="gp-mono-nums truncate text-lg font-medium text-gp-gold sm:text-xl">
              {v}
            </p>
            <p className="mt-1 truncate text-[11px] leading-snug text-gp-text3">
              {rodapeHints[i] ?? ''}
            </p>
          </div>
        ))}
      </div>

      {score.mpmBonus && (
        <div className="border-t border-white/[0.07] bg-gp-bg3/50 px-5 py-4">
          <p className="mb-2 font-heading text-[10px] font-semibold uppercase tracking-[0.08em] text-gp-text3">
            Bónus MPM (modelagem)
          </p>
          <p className="text-sm text-gp-text2">
            <strong className="font-medium text-gp-text">
              +{score.mpmBonus.pontos} pontos
            </strong>{' '}
            com base no índice de potencial de modelagem{' '}
            <span className="gp-mono-nums font-medium text-gp-text">
              {score.mpmBonus.mpmIndice}
            </span>
            . Este valor entra no total do Gem acima.
          </p>
        </div>
      )}

      {score.nichoBonus && (
        <div className="border-t border-white/[0.07] bg-gp-gold/5 px-5 py-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-gp-gold">
            <Sparkles className="h-3.5 w-3.5" />
            Potencial do nicho (referência)
          </p>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
            <div className="rounded-lg bg-gp-bg4 py-2">
              <p className="text-[10px] text-gp-text3">RPM médio</p>
              <p className="gp-mono-nums text-sm font-medium text-gp-green">
                ${score.nichoBonus.rpmMedio}
              </p>
            </div>
            <div className="rounded-lg bg-gp-bg3 py-2">
              <p className="text-[10px] text-gp-text3">Viralidade</p>
              <p className="gp-mono-nums text-sm font-medium text-gp-gold">
                {score.nichoBonus.viralidade}/10
              </p>
            </div>
            <div className="rounded-lg bg-gp-bg3 py-2">
              <p className="text-[10px] text-gp-text3">Equilíbrio</p>
              <p className="gp-mono-nums text-sm font-medium text-gp-gold">
                {score.nichoBonus.potencialOuro}/10
              </p>
            </div>
            <div className="rounded-lg bg-gp-bg3 py-2">
              <p className="text-[10px] text-gp-text3">Receita estimada</p>
              <p className="gp-mono-nums text-sm font-medium text-gp-green">
                {receitaEstimada != null ? formatUsdCompact(receitaEstimada) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-gp-bg3 py-2">
              <p className="text-[10px] text-gp-text3">Média por vídeo</p>
              <p className="gp-mono-nums text-sm font-medium text-gp-green">
                {receitaMediaPorVideo != null
                  ? formatUsdCompact(receitaMediaPorVideo)
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SinalRowV3({
  titulo,
  sinal,
  icon: Icon,
  iconWrap,
  barClass,
}: {
  titulo: string
  sinal: GemScoreSinaisV3[keyof GemScoreSinaisV3]
  icon: React.ComponentType<{ className?: string }>
  iconWrap: string
  barClass: string
}) {
  const pct = Math.min(
    100,
    Math.round((sinal.pontos / Math.max(1, sinal.max)) * 100)
  )
  return (
    <div className="gp-signal-row">
      <span
        className={cn(
          'mx-auto flex size-7 shrink-0 items-center justify-center rounded-md sm:mx-0',
          iconWrap
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gp-text">{titulo}</p>
        <p className="mb-2 mt-0.5 text-[11px] leading-snug text-gp-text3">
          {sinal.formula}
        </p>
        <div className="mb-1 h-1 overflow-hidden rounded-sm bg-gp-bg4">
          <div
            className={cn('h-full rounded-sm transition-all', barClass)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="gp-mono-nums text-[11px] text-gp-text2">
          {sinal.resultado}
        </p>
      </div>
      <div className="text-right sm:pt-0">
        <p className="gp-mono-nums text-xs font-medium text-gp-text">
          {sinal.pontos}
          <span className="font-normal text-gp-text3">/{sinal.max}</span>
        </p>
        <p className="gp-mono-nums mt-0.5 text-[11px] text-gp-text3">
          {pct}%
        </p>
      </div>
    </div>
  )
}

function GemScorePanelV2({
  score,
  totalViewsCanal,
}: {
  score: GemScoreDetalhado
  totalViewsCanal?: number | null
}) {
  const tier = tierMeta[score.classificacao] || tierMeta.fraco
  const breakdown = normalizeBreakdownV2(score.breakdown)
  const nb = score.nichoBonus

  return (
    <div className="overflow-hidden rounded-xl border border-[#272727] bg-[#181818] shadow-sm">
      <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <ScoreRing
          value={score.total}
          strokeClass={tier.ring}
          centerClassName={tier.text}
        />
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
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              modelo anterior
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
          Critérios legados (máx. 100 pts)
        </p>
        <ScoreRowV2
          icon={Gauge}
          label="Views por inscrito"
          hint="Quanto o vídeo supera o tamanho da base"
          value={breakdown.viewsPorInscrito}
          max={MAX_V2.viewsPorInscrito}
          barClass="bg-sky-500"
        />
        <ScoreRowV2
          icon={Rocket}
          label="Velocidade"
          hint="Views por dia desde a publicação"
          value={breakdown.velocidade}
          max={MAX_V2.velocidade}
          barClass="bg-[#ff0000]"
        />
        <ScoreRowV2
          icon={Layers}
          label="Consistência"
          hint="Vídeos fortes em relação aos inscritos"
          value={breakdown.consistencia}
          max={MAX_V2.consistencia}
          barClass="bg-amber-500"
        />
        <ScoreRowV2
          icon={Scale}
          label="Tamanho do canal"
          hint="Bônus para canais menores"
          value={breakdown.tamanhoCanal}
          max={MAX_V2.tamanhoCanal}
          barClass="bg-emerald-500"
        />
        <ScoreRowV2
          icon={Globe2}
          label="Alcance do canal"
          hint="Volume histórico de views do canal"
          value={breakdown.alcanceCanal}
          max={MAX_V2.alcanceCanal}
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

function ScoreRing({
  value,
  strokeClass,
  centerClassName,
}: {
  value: number
  strokeClass: string
  /** Cor do número central (tier Gem) */
  centerClassName?: string
}) {
  const pct = Math.min(100, Math.max(0, value))
  const r = 40
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c

  return (
    <div className="relative mx-auto size-24 shrink-0 sm:mx-0">
      <svg
        viewBox="0 0 96 96"
        className="size-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          className="stroke-gp-bg4"
          strokeWidth="7"
        />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          className={cn('transition-all duration-500', strokeClass)}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'gp-mono-nums text-[28px] font-medium leading-none',
            centerClassName ?? 'text-gp-text'
          )}
        >
          {value}
        </span>
        <span className="gp-mono-nums mt-0.5 text-[10px] text-gp-text3">
          de 100
        </span>
      </div>
    </div>
  )
}

function ScoreRowV2({
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
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString('pt-BR')
}

function formatUsdCompact(n: number): string {
  if (n >= 1_000_000) {
    return `US$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`
  }
  if (n >= 1_000) {
    return `US$ ${(n / 1_000).toFixed(1).replace('.', ',')} mil`
  }
  return `US$ ${Math.round(n).toLocaleString('pt-BR')}`
}
