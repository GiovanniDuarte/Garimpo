import archiver from 'archiver'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
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

/** Nome da pasta: «título do vídeo - id» (caracteres de path removidos). */
export function nomePastaMochila(titulo: string, youtubeId: string): string {
  let base = (titulo || 'video').trim()
  base = base
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  if (!base) base = 'video'
  return `${base} - ${youtubeId}`
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
  }
}

/**
 * ZIP com pastas por vídeo: ficha.txt, roteiro.txt, thumbnail.
 * Dados do vídeo via InnerTube (mesma stack do app); roteiro via youtube-transcript.
 */
export async function gerarMochilaZip(
  outPath: string,
  canalNome: string,
  videos: VideoMochilaInput[]
): Promise<void> {
  await mkdir(path.dirname(outPath), { recursive: true })

  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    output.on('close', () => finish(() => resolve()))
    output.on('error', (err) => finish(() => reject(err)))
    archive.on('error', (err) => {
      output.destroy()
      finish(() => reject(err))
    })
    archive.on('warning', (err) => {
      console.warn('[mochila] archiver warning:', err)
    })

    archive.pipe(output)

    archive.append(
      [
        `Mochila — ${canalNome}`,
        `Vídeos: ${videos.length} (top por views na biblioteca)`,
        '',
        'Em cada pasta (nome: «título do vídeo - id»):',
        '  • ficha.txt — título, URL, descrição e tags (YouTube)',
        '  • roteiro.txt — transcrição pública completa (quando existir)',
        '  • comentarios_top16.txt — 16 comentários com mais curtidas (Top)',
        '  • thumbnail — imagem de capa',
        '',
      ].join('\n'),
      { name: 'LEIA-ME.txt' }
    )

    void (async () => {
      try {
        for (let i = 0; i < videos.length; i++) {
          const v = videos[i]

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
          const folder = nomePastaMochila(title || v.titulo, v.youtubeId)
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

          archive.append(ficha, { name: `${folder}/ficha.txt` })
          archive.append(roteiro, { name: `${folder}/roteiro.txt` })

          try {
            const comentarios = await buscarComentariosTopCurtidas(
              v.youtubeId,
              16
            )
            const blocoComentarios = formatarArquivoComentarios(
              v.youtubeId,
              title,
              comentarios
            )
            archive.append(blocoComentarios, {
              name: `${folder}/comentarios_top16.txt`,
            })
          } catch {
            archive.append(
              '(Comentários indisponíveis neste pedido.)',
              { name: `${folder}/comentarios_top16.txt` }
            )
          }

          const thumbUrl = details.thumbnailUrl
          if (thumbUrl) {
            try {
              const imgRes = await fetch(thumbUrl)
              if (imgRes.ok) {
                const buf = Buffer.from(await imgRes.arrayBuffer())
                const ext = /\.webp(\?|$)/i.test(thumbUrl) ? 'webp' : 'jpg'
                archive.append(buf, { name: `${folder}/thumbnail.${ext}` })
              }
            } catch {
              // ignora thumbnail
            }
          }
        }

        await archive.finalize()
      } catch (e) {
        output.destroy()
        finish(() => reject(e))
      }
    })()
  })
}
