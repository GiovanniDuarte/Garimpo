'use client'

import { useId } from 'react'

/** Diamante facetado com gradiente (vermelho YouTube). */
export function RedDiamondIcon({
  className,
  size = 24,
}: {
  className?: string
  size?: number
}) {
  const uid = useId().replace(/:/g, '')
  const gid = `rdg-${uid}`
  const gid2 = `rdg2-${uid}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff5c5c" />
          <stop offset="45%" stopColor="#ff0000" />
          <stop offset="100%" stopColor="#b80000" />
        </linearGradient>
        <linearGradient id={gid2} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Corpo principal */}
      <path
        fill={`url(#${gid})`}
        d="M24 3 L45 18 L38 39 L24 45 L10 39 L3 18 Z"
      />
      {/* Mesa superior (faceta clara) */}
      <path
        fill="#ff8a8a"
        fillOpacity="0.45"
        d="M24 3 L35 12 L24 14 L13 12 Z"
      />
      {/* Linhas de corte */}
      <path
        fill="none"
        stroke="#7a0000"
        strokeOpacity="0.35"
        strokeWidth="0.6"
        d="M24 14 L24 45 M13 12 L10 39 M35 12 L38 39 M3 18 L45 18"
      />
      {/* Brilho */}
      <path
        fill={`url(#${gid2})`}
        d="M24 3 L45 18 L38 39 L24 45 L10 39 L3 18 Z"
      />
      {/* Borda */}
      <path
        fill="none"
        stroke="#5c0000"
        strokeOpacity="0.5"
        strokeWidth="0.75"
        d="M24 3 L45 18 L38 39 L24 45 L10 39 L3 18 Z"
      />
    </svg>
  )
}
