import { NextRequest, NextResponse } from 'next/server'
import { mapYoutubeIdsParaIds } from '@/lib/db/queries'

/** POST { youtubeIds: string[] } → { map: Record<youtubeId, canalDbId> } */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ids = body?.youtubeIds as string[] | undefined
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: 'youtubeIds inválido' }, { status: 400 })
    }
    const map = await mapYoutubeIdsParaIds(ids)
    return NextResponse.json({ map })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Falha ao verificar canais' }, { status: 500 })
  }
}
