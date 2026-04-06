import { NextResponse } from 'next/server'
import { buscarCanal } from '@/lib/db/queries'
import { channelAvatarDisplayUrl } from '@/lib/utils'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const canal = await buscarCanal(id)
  if (!canal?.thumbnailUrl) {
    return new NextResponse(null, { status: 404 })
  }
  const url = channelAvatarDisplayUrl(canal.thumbnailUrl)
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })
    if (!r.ok) return new NextResponse(null, { status: 502 })
    const buf = await r.arrayBuffer()
    return new NextResponse(buf, {
      headers: {
        'Content-Type': r.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
