import { NextRequest } from 'next/server'
import { executarPassoCacada } from '@/lib/cacador/executar-passo-cacada'
import type { CacadaPassoProgress } from '@/lib/cacador/passo-progress-types'

/** Valor médio (cliente usa pausa aleatória ~10–28 s entre passos). */
const INTERVALO_SUGERIDO_MS = 19_000

type NdjsonLine =
  | { type: 'progress'; ev: CacadaPassoProgress }
  | {
      type: 'done'
      result: Record<string, unknown> & { intervaloSugeridoMs: number }
    }
  | { type: 'fail'; error: string; intervaloSugeridoMs: number }

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: NdjsonLine) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
      }

      try {
        const resultado = await executarPassoCacada(id, (ev) =>
          send({ type: 'progress', ev })
        )

        if (!resultado.ok) {
          send({
            type: 'fail',
            error: resultado.error,
            intervaloSugeridoMs: INTERVALO_SUGERIDO_MS,
          })
          controller.close()
          return
        }

        send({
          type: 'done',
          result: {
            ...resultado,
            intervaloSugeridoMs: INTERVALO_SUGERIDO_MS,
          },
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro no passo'
        send({
          type: 'fail',
          error: msg,
          intervaloSugeridoMs: INTERVALO_SUGERIDO_MS,
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
