import { NextRequest, NextResponse } from 'next/server'
import { buscarCanal, atualizarCanal, removerCanal } from '@/lib/db/queries'
import { clearCanalAvatarFiles } from '@/lib/canal-avatar-cache'

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
  const body = await req.json()
  const canal = await atualizarCanal(id, body)
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
