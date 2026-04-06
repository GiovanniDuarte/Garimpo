import { prisma } from './prisma'
import type { CanalStatus } from '@/types'
import { removerArquivoMochila } from '@/lib/mochila/paths'

export async function listarCanais(filtros?: {
  status?: CanalStatus
  categoria?: string
  tag?: string
  orderBy?: 'criadoEm' | 'gemScore' | 'inscritos' | 'nome' | 'totalViews'
  orderDir?: 'asc' | 'desc'
}) {
  const where: Record<string, unknown> = {}
  if (filtros?.status) where.status = filtros.status
  if (filtros?.categoria) {
    where.categorias = { contains: filtros.categoria }
  }
  if (filtros?.tag) {
    where.tags = { contains: filtros.tag }
  }

  const orderBy: Record<string, string> = {}
  const field = filtros?.orderBy || 'criadoEm'
  orderBy[field] = filtros?.orderDir || 'desc'

  return prisma.canal.findMany({
    where,
    orderBy,
    include: {
      _count: { select: { videos: true, projetos: true } },
      videos: {
        where: { dataPublicacao: { not: null } },
        orderBy: { dataPublicacao: 'asc' },
        take: 1,
        select: { dataPublicacao: true },
      },
    },
  })
}

/** Mapa youtubeId → id interno (canais já na biblioteca). */
export async function mapYoutubeIdsParaIds(
  youtubeIds: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(youtubeIds.filter(Boolean))]
  if (unique.length === 0) return {}
  const rows = await prisma.canal.findMany({
    where: { youtubeId: { in: unique } },
    select: { id: true, youtubeId: true },
  })
  const out: Record<string, string> = {}
  for (const r of rows) {
    if (r.youtubeId) out[r.youtubeId] = r.id
  }
  return out
}

export async function buscarCanal(id: string) {
  return prisma.canal.findUnique({
    where: { id },
    include: {
      videos: { orderBy: { views: 'desc' } },
    },
  })
}

export async function criarCanal(data: {
  nome: string
  url: string
  youtubeId: string
  inscritos?: number
  totalViews?: number
  videosPublicados?: number
  dataCriacaoCanal?: Date
  ultimaAtividade?: Date
  frequenciaPostagem?: string
  nichoInferido?: string
  idiomaPrincipal?: string
  descricao?: string
  gemScore?: number
  gemScoreDetalhado?: string
  thumbnailUrl?: string
  avatarLocal?: string
  pais?: string
}) {
  return prisma.canal.create({ data })
}

export async function atualizarCanal(
  id: string,
  data: Partial<{
    nome: string
    inscritos: number
    totalViews: number
    videosPublicados: number
    dataCriacaoCanal: Date
    ultimaAtividade: Date
    frequenciaPostagem: string
    nichoInferido: string
    idiomaPrincipal: string
    descricao: string
    gemScore: number
    gemScoreDetalhado: string
    status: string
    categorias: string
    tags: string
    notas: string
    thumbnailUrl: string
    avatarLocal: string | null
    pais: string
    mochilaAt: Date
    mochilaVideoCount: number
  }>
) {
  return prisma.canal.update({ where: { id }, data })
}

export async function removerCanal(id: string) {
  await removerArquivoMochila(id)
  return prisma.canal.delete({ where: { id } })
}

export async function criarVideo(data: {
  youtubeId: string
  canalId: string
  titulo: string
  url: string
  descricao?: string
  thumbnailUrl?: string
  thumbnailLocal?: string
  tags?: string
  views?: number
  likes?: number
  comentarios?: number
  dataPublicacao?: Date
  duracaoSegundos?: number
  viewsPorDia?: number
  viewsPorInscrito?: number
  transcript?: string
  hookTranscript?: string
  usadoNoRaioX?: boolean
  ordemNoRaioX?: number
}) {
  return prisma.video.upsert({
    where: { youtubeId: data.youtubeId },
    update: data,
    create: data,
  })
}

export async function listarVideosDoCanal(canalId: string) {
  return prisma.video.findMany({
    where: { canalId },
    orderBy: { views: 'desc' },
  })
}

export async function removerVideo(id: string) {
  return prisma.video.delete({ where: { id } })
}

export async function listarProjetos() {
  return prisma.projeto.findMany({
    orderBy: { criadoEm: 'desc' },
    include: { canalBase: true },
  })
}
