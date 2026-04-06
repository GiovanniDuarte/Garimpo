import type { CSSProperties } from 'react'

/**
 * Cor da barra de views totais (0–100% do máximo da listagem):
 * baixo → azul/violeta, médio → ciano, alto → âmbar/verde (intuitivo: “mais quente” = mais views).
 */
export function viewsTotaisBarInnerStyle(percent: number): CSSProperties {
  const p = Math.min(100, Math.max(0, percent))
  const t = p / 100
  const hStart = 258 - t * 155
  const hEnd = 228 - t * 125
  const l = 38 + t * 10
  const s = 62 + t * 14
  return {
    width: `${p}%`,
    background: `linear-gradient(90deg, hsl(${hStart} ${s}% ${l}%), hsl(${hEnd} ${Math.min(88, s + 8)}% ${l + 8}%))`,
  }
}
