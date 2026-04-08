export type CanalStatus =
  | 'novo'
  | 'analisando'
  | 'promissor'
  | 'pronto_raio_x'
  | 'modelando'
  | 'descartado'

export type ProjetoStatus = 'ativo' | 'pausado' | 'arquivado'

/** Critério individual do Gem Score v3 (painel). */
export interface GemScoreSinalV3 {
  pontos: number
  max: number
  formula: string
  resultado: string
}

export interface GemScoreSinaisV3 {
  autonomia: GemScoreSinalV3 & { ratioMultiplo: number }
  aceleracao: GemScoreSinalV3 & {
    multiplo: number
    insuficiente?: boolean
  }
  densidadeHits: GemScoreSinalV3 & {
    hits: number
    totalVideos: number
    pct: number
    /** % das views da amostra no vídeo mais visto (métrica de “one-hit”). */
    concentracaoTopVideoPct?: number
    /** Aplicado aos pontos de densidade após o critério ≥100k (0–1). */
    multiplicadorDistribuicao?: number
  }
  pressaoUnidade: GemScoreSinalV3 & { viewsPorDiaPorVideo: number }
}

export interface GemScoreDetalhado {
  total: number
  classificacao: 'pepita' | 'promissor' | 'mediano' | 'fraco'
  /** v3 — omitido em snapshots antigos (v2). */
  versao?: 2 | 3
  /** v2 — legado. */
  breakdown?: {
    viewsPorInscrito: number
    velocidade: number
    consistencia: number
    tamanhoCanal: number
    alcanceCanal: number
  }
  /** v3 — quatro sinais (máx. 100 pts antes do MPM). */
  sinais?: GemScoreSinaisV3
  /** Valores do rodapé do painel v3 (atalho visual). */
  resumoRodape?: string[]
  /** Aviso contextual (ex.: aceleração baixa). */
  insight?: string
  nichoBonus?: {
    rpmMedio: number
    viralidade: number
    potencialOuro: number
  }
  /** Bónus do índice MPM (potencial de modelagem) aplicado ao total. */
  mpmBonus?: {
    mpmIndice: number
    pontos: number
  }
}

export type { PotencialModelagem } from '@/lib/scoring/potencial-modelagem'

export interface FiltrosGarimpo {
  minViews: number
  maxInscritos: number
  diasPublicacao: number
  duracaoMin?: number
  duracaoMax?: number
}

export interface VideoGarimpo {
  youtubeId: string
  titulo: string
  url: string
  thumbnailUrl: string
  views: number
  dataPublicacao: string
  duracaoSegundos: number
  viewsPorDia: number
  canal: CanalResumo
  gemScore: GemScoreDetalhado
}

export interface CanalResumo {
  youtubeId: string
  nome: string
  url: string
  inscritos: number
  thumbnailUrl: string
  totalViews?: number
  /** Total público no YouTube (quando o scraper devolve). */
  videosPublicados?: number
  dataCriacaoCanal?: string
  gemScore?: GemScoreDetalhado
}
