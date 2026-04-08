import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { parseYouTubeUrl, getVideoDetails } from '@/lib/scraper/youtube'

export async function GET() {
  const rows = await prisma.cacada.findMany({
    orderBy: { atualizadoEm: 'desc' },
    take: 25,
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
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawUrl =
      typeof body.videoUrl === 'string'
        ? body.videoUrl.trim()
        : typeof body.url === 'string'
          ? body.url.trim()
          : ''
    const minGem = Math.min(
      100,
      Math.max(40, Number(body.minGem) || 70)
    )
    const exigirGem = body.exigirGem !== false
    const exigirFiltroMetricas = body.exigirFiltroMetricas === true
    if (!exigirGem && !exigirFiltroMetricas) {
      return NextResponse.json(
        {
          error:
            'Ativa pelo menos uma regra: Gem mínimo ou filtro de métricas (views / inscritos).',
        },
        { status: 400 }
      )
    }
    const capturaMinViews = Math.max(
      0,
      Math.floor(Number(body.capturaMinViews) || 0)
    )
    let capturaMaxInscritos: number | null = null
    const rawMax = body.capturaMaxInscritos
    if (rawMax != null && rawMax !== '') {
      const m = Math.floor(Number(rawMax))
      if (Number.isFinite(m) && m > 0) capturaMaxInscritos = m
    }
    const capturaCombinacao = body.capturaCombinacao === 'OU' ? 'OU' : 'E'

    if (!rawUrl) {
      return NextResponse.json(
        { error: 'Envie a URL ou o ID do vídeo de referência no YouTube.' },
        { status: 400 }
      )
    }

    let videoId: string | null = null
    if (/^[\w-]{11}$/.test(rawUrl)) {
      videoId = rawUrl
    } else {
      const p = parseYouTubeUrl(rawUrl)
      if (p.type === 'video' && p.id) videoId = p.id
    }

    if (!videoId) {
      return NextResponse.json(
        {
          error:
            'Só é suportado vídeo de referência (URL watch, shorts ou youtu.be).',
        },
        { status: 400 }
      )
    }

    let canalRef: string | null = null
    try {
      const vd = await getVideoDetails(videoId)
      if (vd.channelId) canalRef = vd.channelId
    } catch {
      return NextResponse.json(
        { error: 'Não foi possível ler este vídeo no YouTube.' },
        { status: 400 }
      )
    }

    const cacada = await prisma.cacada.create({
      data: {
        videoReferenciaId: videoId,
        canalReferenciaYtId: canalRef,
        minGem,
        exigirGem,
        exigirFiltroMetricas,
        capturaMinViews,
        capturaMaxInscritos,
        capturaCombinacao,
        status: 'ativa',
      },
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
        },
      },
    })

    return NextResponse.json(cacada, { status: 201 })
  } catch (e) {
    console.error(e)
    if (
      e instanceof Prisma.PrismaClientValidationError &&
      e.message.includes('Unknown argument')
    ) {
      return NextResponse.json(
        {
          error:
            'Cliente Prisma desatualizado. Para no servidor, corre na raiz do projeto: npx prisma generate (e npx prisma db push se mudaste o schema), depois volta a iniciar npm run dev.',
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar caçada.' },
      { status: 500 }
    )
  }
}
