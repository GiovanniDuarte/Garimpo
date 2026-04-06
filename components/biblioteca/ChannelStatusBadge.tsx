import { cn } from '@/lib/utils'
import type { CanalStatus } from '@/types'

const meta: Record<
  CanalStatus,
  { label: string; className: string }
> = {
  novo: { label: 'Novo', className: 'bg-zinc-500/20 text-zinc-300' },
  analisando: {
    label: 'Analisando',
    className: 'bg-sky-500/20 text-sky-300',
  },
  promissor: {
    label: 'Promissor',
    className: 'bg-amber-500/20 text-amber-300',
  },
  pronto_raio_x: {
    label: 'Raio-X pronto',
    className: 'bg-[#ff0000]/20 text-red-200',
  },
  modelando: {
    label: 'Modelando',
    className: 'bg-emerald-500/20 text-emerald-300',
  },
  descartado: {
    label: 'Descartado',
    className: 'bg-red-500/15 text-red-300/90',
  },
}

export function ChannelStatusBadge({ status }: { status: CanalStatus }) {
  const m = meta[status] || meta.novo
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        m.className
      )}
    >
      {m.label}
    </span>
  )
}
