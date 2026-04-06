import { cn } from '@/lib/utils'

/** Cristal / diamante — só contorno e facetas (Lucide-style, cor via `currentColor`). */
export function GarimpoGemMark({
  className,
  size = 46,
}: {
  className?: string
  /** Largura/altura em px */
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      className={cn(
        'shrink-0 text-gp-gold antialiased',
        '[transform:translateZ(0)] [backface-visibility:hidden]',
        className
      )}
      aria-hidden
    >
      {/* Contorno da gema — traço um pouco mais cheio evita serrilhado em escalas ímpares */}
      <path
        d="M16 5.2L25.8 12.6L16 26.8L6.2 12.6L16 5.2z"
        stroke="currentColor"
        strokeWidth="1.22"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Coroa */}
      <path
        d="M16 5.2l5.4 5.8h-10.8L16 5.2z"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.92}
      />
      {/* Facetas */}
      <path
        d="M16 5.2v21.6M6.2 12.6h19.6M10.8 11.1L16 26.8l5.2-15.7M8.8 9.8l14.4 2.8M16 5.2l-6.2 5.8M16 5.2l6.2 5.8"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.78}
      />
    </svg>
  )
}
