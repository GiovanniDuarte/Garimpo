import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { buscarCanal, atualizarCanal, removerCanal } from '@/lib/db/queries'
import { clearCanalAvatarFiles } from '@/lib/canal-avatar-cache'
import { refreshPerfilYoutubeCanal } from '@/lib/canais/refresh-perfil-youtube'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const canal = await buscarCanal(id)
  if (!canal) {
    return NextResponse.json({ error: 'Canal não encontrado' }, { status: 404 })
  }
  return NextResponse.json(canal)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = (await req.json()) as Record<string, unknown>

  const prefs =
    typeof body.favorito === 'boolean'
      ? await prisma.canal.findUnique({
          where: { id },
          select: { favorito: true },
        })
      : null

  const canal = await atualizarCanal(
    id,
    body as Parameters<typeof atualizarCanal>[1]
  )

  const favoritoAcabouDeLigar =
    body.favorito === true && prefs && prefs.favorito !== true

  if (favoritoAcabouDeLigar) {
    try {
      const refreshed = await refreshPerfilYoutubeCanal(id)
      return NextResponse.json(refreshed)
    } catch (e) {
      console.warn('Favorito: refresh perfil falhou (canal já marcado):', e)
    }
  }

  return NextResponse.json(canal)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await clearCanalAvatarFiles(id)
  await removerCanal(id)
  return NextResponse.json({ ok: true })
}
