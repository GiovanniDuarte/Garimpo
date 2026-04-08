import { prisma } from '@/lib/db/prisma'
import { atualizarCanal, criarVideo } from '@/lib/db/queries'
import { enrichChannelData } from '@/lib/canais/enrich-channel-data'
import { getChannelVideos, parsePublishedDate } from '@/lib/scraper/youtube'
import { clearCanalAvatarFiles, getCanalAvatarCached } from '@/lib/canal-avatar-cache'

/**
 * Atualiza nome, inscritos, views, Gem, nicho, vídeos em lista, etc. a partir do YouTube.
 * Mesma lógica que `PUT /api/canais`.
 */
export async function refreshPerfilYoutubeCanal(canalId: string) {
  const existing = await prisma.canal.findUnique({ where: { id: canalId } })
  if (!existing) {
    throw new Error('Canal não encontrado.')
  }
  if (!existing.youtubeId) {
    throw new Error('Canal sem youtubeId. Não é possível atualizar.')
  }

  const refVideo = await prisma.video.findFirst({
    where: { canalId },
    orderBy: { views: 'desc' },
    select: { youtubeId: true },
  })

  const videosFallback = await prisma.video.findMany({
    where: { canalId },
    orderBy: { views: 'desc' },
    take: 5,
    select: { titulo: true, tags: true },
  })

  const enrichedData = await enrichChannelData(
    {
      youtubeId: existing.youtubeId,
      nome: existing.nome,
      url: existing.url,
      inscritos: existing.inscritos ?? undefined,
      thumbnailUrl: existing.thumbnailUrl ?? undefined,
      videoId: refVideo?.youtubeId,
    },
    {
      dataCriacaoCanal: existing.dataCriacaoCanal,
      nichoInferido: existing.nichoInferido,
      videosFallback,
    }
  )

  const thumbChanged =
    (enrichedData.thumbnailUrl || '') !== (existing.thumbnailUrl || '')
  if (thumbChanged) {
    await clearCanalAvatarFiles(canalId)
  }

  const updatePayload: Record<string, unknown> = {
    nome: enrichedData.nome,
    inscritos: enrichedData.inscritos,
    totalViews: enrichedData.totalViews,
    videosPublicados: enrichedData.videosPublicados,
    descricao: enrichedData.descricao,
    thumbnailUrl: enrichedData.thumbnailUrl,
    pais: enrichedData.pais,
    idiomaPrincipal: enrichedData.idiomaPrincipal,
    frequenciaPostagem: enrichedData.frequenciaPostagem,
    ultimaAtividade: enrichedData.ultimaAtividade,
    url: enrichedData.url,
  }
  if (thumbChanged) {
    updatePayload.avatarLocal = null
  }
  if (enrichedData.dataCriacaoCanal != null) {
    updatePayload.dataCriacaoCanal = enrichedData.dataCriacaoCanal
  }
  if (enrichedData.gemScore != null) {
    updatePayload.gemScore = enrichedData.gemScore
  }
  if (enrichedData.gemScoreDetalhado) {
    updatePayload.gemScoreDetalhado = enrichedData.gemScoreDetalhado
  }
  updatePayload.nichoInferido = enrichedData.nichoInferido ?? null

  const updated = await atualizarCanal(
    canalId,
    updatePayload as Parameters<typeof atualizarCanal>[1]
  )

  if (updated.thumbnailUrl) {
    void getCanalAvatarCached(canalId).catch(() => {})
  }

  try {
    const videos = await getChannelVideos(existing.youtubeId, 20)
    for (const v of videos) {
      const pubDate = parsePublishedDate(v.publishedText)
      try {
        await criarVideo({
          youtubeId: v.videoId,
          canalId,
          titulo: v.title,
          url: v.url,
          views: v.views,
          thumbnailUrl: v.thumbnailUrl,
          duracaoSegundos: v.duration,
          dataPublicacao: pubDate ?? null,
        })
      } catch {
        // duplicate
      }
    }
  } catch (e) {
    console.error('Failed to refresh channel videos:', e)
  }

  return updated
}
