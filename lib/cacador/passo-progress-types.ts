/** Eventos emitidos durante `executarPassoCacada` (UI / NDJSON). */

export type CacadaPassoProgress =
  | {
      kind: 'fase'
      fase: 'relacionados' | 'enriquecimento' | 'gravacao'
      detalhe?: string
    }
  /** Quantos vídeos vieram nesta página da prateleira (antes do pré-filtro). */
  | { kind: 'prateleira'; total: number }
  | { kind: 'enriquecimento_total'; total: number }
  | {
      kind: 'linha'
      done: number
      total: number
      canalNome: string
      videoId: string
    }
  | { kind: 'captura'; indice: number; total: number; nome: string }
