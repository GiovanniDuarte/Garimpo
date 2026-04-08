import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const row = await prisma.cacada.findUnique({
    where: { id },
    include: {
      descobertas: {
        include: {
          canal: {
            select: {
              id: true,
              nome: true,
              youtubeId: true,
              url: true,
              gemScore: true,
              favorito: true,
              tags: true,
              thumbnailUrl: true,
            },
          },
        },
        orderBy: { criadoEm: 'desc' },
      },
    },
  })
  if (!row) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }
  return NextResponse.json(row)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const status =
    typeof body.status === 'string' && ['ativa', 'pausada'].includes(body.status)
      ? body.status
      : null
  if (!status) {
    return NextResponse.json(
      { error: 'status deve ser "ativa" ou "pausada".' },
      { status: 400 }
    )
  }
  const row = await prisma.cacada.update({
    where: { id },
    data: { status },
  })
  return NextResponse.json(row)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const deleted = await prisma.cacada.deleteMany({ where: { id } })
  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Caçada não encontrada.' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
