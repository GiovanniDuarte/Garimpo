import archiver from 'archiver'
import { createWriteStream } from 'fs'
import { mkdir, rename, rm } from 'fs/promises'
import path from 'path'
import { finished } from 'stream/promises'
import { YoutubeTranscript } from 'youtube-transcript'
import { getVideoDetails, type VideoDetails } from '@/lib/scraper/youtube'
import {
  buscarComentariosTopCurtidas,
  formatarArquivoComentarios,
} from '@/lib/scraper/youtube-comments'

export type VideoMochilaInput = {
  youtubeId: string
  titulo: string
  views: number | null
}

/**
 * Nome do .txt no ZIP (um só segmento — sem `/` nem variantes Unicode, senão o SO mostra “pastas”).
 */
export function nomePastaMochila(titulo: string, youtubeId: string): string {
  const id = String(youtubeId || '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 15)
  const idSafe = id || 'id'
  let raw = (titulo || 'video').trim() || 'video'
  raw = raw
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[/\\]/g, ' ')
    .replace(/[\uFF0F\uFF3C\u2215\u29F8\u2044]/g, ' ')
    .replace(/[\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
  if (!raw) raw = 'video'
  return `${raw} - ${idSafe}`
}

function nomeEntradaTxtUnico(
  titulo: string,
  youtubeId: string,
  usados: Set<string>
): string {
  let base = nomePastaMochila(titulo, youtubeId)
  let nome = `${base}.txt`
  let n = 2
  while (usados.has(nome)) {
    nome = `${base} (${n}).txt`
    n += 1
  }
  usados.add(nome)
  return nome
}

function fallbackDetails(v: VideoMochilaInput): VideoDetails {
  return {
    videoId: v.youtubeId,
    title: v.titulo,
    description: '',
    channelId: '',
    channelName: '',
    views: 0,
    lengthSeconds: 0,
    keywords: [],
    thumbnailUrl: '',
    publishDate: '',
    uploadDate: '',
    category: '',
  }
}

const SEP_MAJOR =
  '================================================================================'
const SEP_MINOR =
  '--------------------------------------------------------------------------------'

/**
 * ZIP na raiz: um .txt por vídeo (nome «título - id.txt») + thumbnail baixada.
 * Dados via InnerTube; roteiro via youtube-transcript. Sem subpastas.
 */
export async function gerarMochilaZip(
  outPath: string,
  canalNome: string,
  videos: VideoMochilaInput[]
): Promise<void> {
  await mkdir(path.dirname(outPath), { recursive: true })
  const tmpPath = `${outPath}.tmp`
  await rm(tmpPath, { force: true }).catch(() => {})

  const output = createWriteStream(tmpPath, { flags: 'w' })
  const archive = archiver('zip', { zlib: { level: 9 } })

  archive.on('warning', (err) => {
    console.warn('[mochila] archiver warning:', err)
  })

  archive.pipe(output)

  try {
    archive.append(
      [
        `Mochila — ${canalNome}`,
        `Vídeos: ${videos.length} (top por views na biblioteca)`,
        '',
        'Na raiz: um ficheiro .txt por vídeo («título do vídeo - id.txt»), sem pastas.',
        'Dentro de cada .txt há secções:',
        '  • FICHA — título, URL, views (biblioteca), descrição, tags',
        '  • ROTEIRO — transcrição pública (quando existir)',
        '  • COMENTÁRIOS — 16 comentários com mais curtidas',
        '  • THUMBNAIL — URL da imagem e nome do ficheiro de thumbnail no ZIP',
        '',
        'Além do .txt, cada vídeo tenta incluir também:',
        '  • …__thumbnail.jpg ou …__thumbnail.webp',
        '',
      ].join('\n'),
      { name: 'LEIA-ME.txt' }
    )

    const nomesTxtUsados = new Set<string>()
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i]!

      let details: VideoDetails
      try {
        details = await getVideoDetails(v.youtubeId)
      } catch {
        details = fallbackDetails(v)
      }

      if (i < videos.length - 1) {
        await new Promise((r) => setTimeout(r, 120))
      }

      const title = (details.title || v.titulo || '').trim()
      const nomeEntrada = nomeEntradaTxtUnico(
        title || v.titulo,
        v.youtubeId,
        nomesTxtUsados
      )
      const desc = details.description || ''
      const tags = Array.isArray(details.keywords)
        ? details.keywords.join(', ')
        : ''

      let roteiro = ''
      try {
        const chunks = await YoutubeTranscript.fetchTranscript(v.youtubeId)
        roteiro = chunks
          .map((c) => c.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      } catch {
        roteiro =
          '(Transcrição não disponível publicamente para este vídeo no YouTube.)'
      }
      if (!roteiro) {
        roteiro = '(Transcrição vazia.)'
      }

      const ficha = [
        'TÍTULO',
        '-----',
        title,
        '',
        'URL',
        '---',
        `https://www.youtube.com/watch?v=${v.youtubeId}`,
        '',
        'VIEWS (registo na biblioteca)',
        '--------------------------------',
        String(v.views ?? '—'),
        '',
        'DESCRIÇÃO',
        '----------',
        desc || '—',
        '',
        'TAGS',
        '----',
        tags || '—',
      ].join('\n')

      let blocoComentarios = ''
      try {
        const comentarios = await buscarComentariosTopCurtidas(
          v.youtubeId,
          16
        )
        blocoComentarios = formatarArquivoComentarios(
          v.youtubeId,
          title,
          comentarios
        )
      } catch {
        blocoComentarios =
          '(Comentários indisponíveis neste pedido.)'
      }

      const thumbUrl = (details.thumbnailUrl || '').trim()
      let thumbNomeZip = ''
      if (thumbUrl) {
        try {
          const imgRes = await fetch(thumbUrl)
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer())
            const ext = /\.webp(\?|$)/i.test(thumbUrl) ? 'webp' : 'jpg'
            thumbNomeZip = nomeEntrada.replace(/\.txt$/i, `__thumbnail.${ext}`)
            archive.append(buf, { name: thumbNomeZip })
          }
        } catch {
          thumbNomeZip = ''
        }
      }
      const blocoThumb = [
        `URL: ${thumbUrl || '—'}`,
        `ARQUIVO NO ZIP: ${thumbNomeZip || '—'}`,
      ].join('\n')

      const corpo = [
        SEP_MAJOR,
        'MOCHILA — VÍDEO',
        SEP_MAJOR,
        `${title}`,
        `ID: ${v.youtubeId}`,
        '',
        SEP_MINOR,
        'FICHA',
        SEP_MINOR,
        ficha,
        '',
        SEP_MINOR,
        'ROTEIRO (transcrição pública)',
        SEP_MINOR,
        roteiro,
        '',
        SEP_MINOR,
        'COMENTÁRIOS (top 16 por curtidas)',
        SEP_MINOR,
        blocoComentarios,
        '',
        SEP_MINOR,
        'THUMBNAIL',
        SEP_MINOR,
        blocoThumb,
        '',
      ].join('\n')

      archive.append(corpo, { name: nomeEntrada })
    }

    await archive.finalize()
    await finished(output)
    await rm(outPath, { force: true })
    await rename(tmpPath, outPath)
  } catch (e) {
    archive.destroy()
    output.destroy()
    await rm(tmpPath, { force: true }).catch(() => {})
    throw e
  }
}
