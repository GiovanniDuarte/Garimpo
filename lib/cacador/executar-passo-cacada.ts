import { prisma } from '@/lib/db/prisma'
import { criarCanal, criarVideo, atualizarCanal } from '@/lib/db/queries'
import { getRelatedVideosPage } from '@/lib/scraper/youtube'
import { mergeTagMineirador } from '@/lib/cacador/merge-tag-mineirador'
import { ordenarLoteParaCaptura } from '@/lib/cacador/ordenar-lote-perolas'
import {
  enrichSearchResults,
  CACADA_PRATELEIRA_ENRICH,
} from '@/lib/garimpo/enrich-search-results'
import type { CacadaPassoProgress } from '@/lib/cacador/passo-progress-types'
import {
  linhaPassaCaptura,
  resumoRegrasCapturaParaLog,
  type CacadaRegrasCaptura,
} from '@/lib/cacador/regras-captura'
import { urlPerfilCanalYoutube } from '@/lib/youtube-channel-url'
import type { VideoGarimpo } from '@/types'

function parseJsonArray(raw: string): string[] {
  try {
    const j = JSON.parse(raw) as unknown
    return Array.isArray(j) ? j.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export type ResultadoPassoCacada =
  | {
      ok: true
      mensagem: string
      /** Vídeos devolvidos na página de relacionados (antes do Garimpo). */
      naPrateleira: number
      /** Linhas que passaram pela pipeline Garimpo (com Gem calculado). */
      linhasGarimpo: number
      /** Canais distintos nesse lote (cada linha = um vídeo; mesmo canal pode repetir). */
      canaisUnicosAvaliados: number
      capturadosNestePasso: number
      /** Soma acumulada na corrida após este passo (vídeos com Gem calculado). */
      videosAnalisadosTotal: number
      fimDaPrateleira: boolean
    }
  | { ok: false; error: string }

const DELAY_ANTES_RELACIONADOS_MS = 400

/**
 * Um passo = enriquecer cada vídeo da prateleira só o necessário para calcular Gem
 * (sem filtros de listagem do Garimpo). Sem segunda consulta ao canal (lista, raio-x).
 * Só o vídeo da linha é gravado nas capturas; perfil completo na biblioteca.
 */
export async function executarPassoCacada(
  cacadaId: string,
  onProgress?: (ev: CacadaPassoProgress) => void
): Promise<ResultadoPassoCacada> {
  const cacada = await prisma.cacada.findUnique({
    where: { id: cacadaId },
  })
  if (!cacada) return { ok: false, error: 'Caçada não encontrada.' }
  if (cacada.status !== 'ativa') {
    return {
      ok: false,
      error: 'Caçada pausada. Reative na interface antes de continuar.',
    }
  }

  const vistos = new Set(parseJsonArray(cacada.videoIdsVistosJson))
  let canaisVistos = new Set(parseJsonArray(cacada.canalYoutubeVistosJson))

  onProgress?.({ kind: 'fase', fase: 'relacionados', detalhe: 'A buscar página de relacionados…' })
  await new Promise((r) => setTimeout(r, DELAY_ANTES_RELACIONADOS_MS))
  let page: Awaited<ReturnType<typeof getRelatedVideosPage>>
  try {
    page = await getRelatedVideosPage(
      cacada.videoReferenciaId,
      cacada.cursorRelated || null,
      vistos
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar relacionados'
    await prisma.cacada.update({
      where: { id: cacadaId },
      data: { ultimoLog: msg },
    })
    return { ok: false, error: msg }
  }

  const videoIdsSerializado = JSON.stringify([...vistos])
  await prisma.cacada.update({
    where: { id: cacadaId },
    data: {
      cursorRelated: page.continuation,
      videoIdsVistosJson: videoIdsSerializado,
    },
  })

  const refChannel = cacada.canalReferenciaYtId?.trim() || null
  const channelTotalViews = new Map<string, number>()

  onProgress?.({ kind: 'prateleira', total: page.results.length })
  onProgress?.({ kind: 'fase', fase: 'enriquecimento', detalhe: 'A calcular Gem…' })

  let batch: VideoGarimpo[]
  try {
    batch = await enrichSearchResults(
      page.results,
      {
        ...CACADA_PRATELEIRA_ENRICH,
        seenVideoIds: new Set<string>(),
        excludeChannelId: refChannel,
      },
      channelTotalViews,
      {
        onBatchStart: (total) => {
          onProgress?.({ kind: 'enriquecimento_total', total })
        },
        onRowDone: (p) => {
          onProgress?.({ kind: 'linha', ...p })
        },
      }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao enriquecer lote (Gem)'
    await prisma.cacada.update({
      where: { id: cacadaId },
      data: { ultimoLog: msg },
    })
    return { ok: false, error: msg }
  }

  batch = ordenarLoteParaCaptura(batch)

  const naPrateleira = page.results.length
  const canaisUnicosAvaliados = new Set(
    batch.map((r) => r.canal.youtubeId).filter((id): id is string => Boolean(id))
  ).size

  const canaisMarcados = new Set(canaisVistos)
  for (const r of batch) {
    const yid = r.canal.youtubeId
    if (yid && (!refChannel || yid !== refChannel)) {
      canaisMarcados.add(yid)
    }
  }
  canaisVistos = canaisMarcados

  const minG = cacada.minGem
  const exigirGem = cacada.exigirGem !== false
  const exigirFiltroMetricas = cacada.exigirFiltroMetricas === true
  const capturaMinViews = cacada.capturaMinViews ?? 0
  const capturaMaxInscritos = cacada.capturaMaxInscritos ?? null
  const capturaCombinacaoStr = cacada.capturaCombinacao ?? 'E'
  const regras: CacadaRegrasCaptura = {
    exigirGem,
    exigirFiltroMetricas,
    minGem: minG,
    capturaMinViews,
    capturaMaxInscritos,
    capturaCombinacao: capturaCombinacaoStr === 'OU' ? 'OU' : 'E',
    refChannelId: refChannel,
  }
  const regrasLog = resumoRegrasCapturaParaLog({
    exigirGem,
    exigirFiltroMetricas,
    minGem: minG,
    capturaMinViews,
    capturaMaxInscritos,
    capturaCombinacao: capturaCombinacaoStr,
  })

  const capturados: VideoGarimpo[] = []
  const seenCh = new Set<string>()
  for (const r of batch) {
    const yid = r.canal.youtubeId
    if (!yid || (refChannel && yid === refChannel)) continue
    if (!linhaPassaCaptura(r, regras)) continue
    if (seenCh.has(yid)) continue
    seenCh.add(yid)
    capturados.push(r)
  }

  let capturadosNestePasso = 0

  const nCap = capturados.length
  if (nCap > 0) {
    onProgress?.({ kind: 'fase', fase: 'gravacao', detalhe: `A gravar ${nCap} captura(s)…` })
  }

  for (let ci = 0; ci < capturados.length; ci++) {
    const row = capturados[ci]!
    onProgress?.({
      kind: 'captura',
      indice: ci + 1,
      total: nCap,
      nome: row.canal.nome,
    })
    const ytId = row.canal.youtubeId
    const g = row.gemScore.total
    const gemDet = JSON.stringify(row.gemScore)
    const perfilUrl = urlPerfilCanalYoutube(ytId, row.canal.url)

    const existente = await prisma.canal.findUnique({
      where: { youtubeId: ytId },
    })

    let canalId: string
    if (existente) {
      canalId = existente.id
      await atualizarCanal(canalId, {
        nome: row.canal.nome,
        url: perfilUrl,
        inscritos: row.canal.inscritos,
        totalViews: row.canal.totalViews,
        videosPublicados: row.canal.videosPublicados,
        gemScore: g,
        gemScoreDetalhado: gemDet,
        thumbnailUrl: row.canal.thumbnailUrl,
        favorito: true,
        tags: mergeTagMineirador(existente.tags),
      })
    } else {
      const canal = await criarCanal({
        nome: row.canal.nome,
        url: perfilUrl,
        youtubeId: ytId,
        inscritos: row.canal.inscritos,
        totalViews: row.canal.totalViews,
        videosPublicados: row.canal.videosPublicados,
        gemScore: g,
        gemScoreDetalhado: gemDet,
        thumbnailUrl: row.canal.thumbnailUrl,
        favorito: true,
        tags: mergeTagMineirador(null),
        status: 'novo',
      })
      canalId = canal.id

      try {
        const pubData = new Date(row.dataPublicacao)
        await criarVideo({
          youtubeId: row.youtubeId,
          canalId,
          titulo: row.titulo,
          url: row.url,
          views: row.views,
          thumbnailUrl: row.thumbnailUrl,
          duracaoSegundos: row.duracaoSegundos,
          dataPublicacao: Number.isNaN(pubData.getTime()) ? null : pubData,
        })
      } catch {
        // duplicate / inválido
      }
    }

    await prisma.cacadaDescoberta.upsert({
      where: {
        cacadaId_canalId: { cacadaId, canalId },
      },
      create: {
        cacadaId,
        canalId,
        gemScore: g,
        videoOrigemId: row.youtubeId,
      },
      update: {
        gemScore: g,
        videoOrigemId: row.youtubeId,
      },
    })
    capturadosNestePasso += 1
  }

  const fimDaPrateleira = !page.continuation || page.results.length === 0

  const ultimoLog =
    capturadosNestePasso > 0
      ? `Passo · prateleira ${naPrateleira} vídeos · ${batch.length} linhas com Gem · ${canaisUnicosAvaliados} canais · ${capturadosNestePasso} capturados (${regrasLog}).`
      : batch.length === 0
        ? `Prateleira ${naPrateleira} vídeos · nenhuma linha com Gem nesta página.`
        : `Prateleira ${naPrateleira} · ${batch.length} linhas com Gem · ${canaisUnicosAvaliados} canais · nenhum capturado (${regrasLog}).`

  const updated = await prisma.cacada.update({
    where: { id: cacadaId },
    data: {
      canalYoutubeVistosJson: JSON.stringify([...canaisVistos]),
      ultimoLog,
      videosAnalisadosTotal: { increment: batch.length },
    },
    select: { videosAnalisadosTotal: true },
  })

  return {
    ok: true,
    mensagem: ultimoLog,
    naPrateleira,
    linhasGarimpo: batch.length,
    canaisUnicosAvaliados,
    capturadosNestePasso,
    videosAnalisadosTotal: updated.videosAnalisadosTotal,
    fimDaPrateleira,
  }
}
