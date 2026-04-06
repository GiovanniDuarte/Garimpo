export type CanalStatus =
  | 'novo'
  | 'analisando'
  | 'promissor'
  | 'pronto_raio_x'
  | 'modelando'
  | 'descartado'

export type ProjetoStatus = 'ativo' | 'pausado' | 'arquivado'

export interface GemScoreDetalhado {
  total: number
  breakdown: {
    viewsPorInscrito: number
    velocidade: number
    consistencia: number
    tamanhoCanal: number
    alcanceCanal: number
  }
  classificacao: 'pepita' | 'promissor' | 'mediano' | 'fraco'
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
  dataCriacaoCanal?: string
  gemScore?: GemScoreDetalhado
}
