import { readFile, unlink } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { buscarCanal, atualizarCanal } from '@/lib/db/queries'
import { getMochilaZipPath } from '@/lib/mochila/paths'
import { gerarMochilaZip } from '@/lib/mochila/build-zip'

export const runtime = 'nodejs'
/** Geração pode demorar (vários pedidos ao YouTube). */
export const maxDuration = 300

const ALLOWED = new Set([7, 15, 25])

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const canal = await buscarCanal(id)
  if (!canal) {
    return NextResponse.json({ error: 'Canal não encontrado' }, { status: 404 })
  }
  if (!canal.mochilaAt) {
    return NextResponse.json({ error: 'Ainda não há mochila gerada.' }, { status: 404 })
  }

  const zipPath = getMochilaZipPath(id)
  try {
    const buf = await readFile(zipPath)
    const safeName = canal.nome.replace(/[^\w\s-]/g, '').slice(0, 60) || 'canal'
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="mochila-${safeName}.zip"`,
        'Content-Length': String(buf.length),
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Ficheiro da mochila em falta. Gere novamente.' },
      { status: 404 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const canal = await buscarCanal(id)
  if (!canal) {
    return NextResponse.json({ error: 'Canal não encontrado' }, { status: 404 })
  }

  let body: { count?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const count = Number(body.count)
  if (!ALLOWED.has(count)) {
    return NextResponse.json(
      { error: 'Escolha 7, 15 ou 25 vídeos.' },
      { status: 400 }
    )
  }

  const sorted = [...canal.videos].sort(
    (a, b) => (b.views ?? 0) - (a.views ?? 0)
  )
  const slice = sorted.slice(0, Math.min(count, sorted.length))

  if (slice.length === 0) {
    return NextResponse.json(
      {
        error:
          'Não há vídeos na biblioteca. Atualize o canal para importar vídeos.',
      },
      { status: 400 }
    )
  }

  const zipPath = getMochilaZipPath(id)
  try {
    await gerarMochilaZip(zipPath, canal.nome, slice)
  } catch (e) {
    console.error('Mochila zip error:', e)
    await unlink(zipPath).catch(() => {})
    const hint =
      e instanceof Error ? e.message : 'Erro desconhecido ao criar o arquivo.'
    return NextResponse.json(
      {
        error: `Não foi possível gerar a mochila: ${hint}`,
      },
      { status: 502 }
    )
  }

  await atualizarCanal(id, {
    mochilaAt: new Date(),
    mochilaVideoCount: slice.length,
  })

  const full = await buscarCanal(id)
  return NextResponse.json({
    ok: true,
    canal: full,
    mochilaVideoCount: slice.length,
    pedido: count,
  })
}
