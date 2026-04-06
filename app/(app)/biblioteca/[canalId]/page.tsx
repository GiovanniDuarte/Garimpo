'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GemScoreBadge, GemScorePanel } from '@/components/garimpo/GemScore'
import { ChannelStatusBadge } from '@/components/biblioteca/ChannelStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Trash2,
  ExternalLink,
  Edit3,
  Check,
  X,
  Loader2,
  Package,
  Download,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import type { CanalStatus, GemScoreDetalhado } from '@/types'
import {
  calcularIdadeCanal,
  resolverDataReferenciaIdadeCanal,
} from '@/lib/scraper/channel-info'

interface CanalData {
  id: string
  nome: string
  url: string
  youtubeId: string
  inscritos: number | null
  totalViews: number | null
  videosPublicados: number | null
  dataCriacaoCanal: string | null
  ultimaAtividade: string | null
  frequenciaPostagem: string | null
  nichoInferido: string | null
  idiomaPrincipal: string | null
  descricao: string | null
  gemScore: number | null
  gemScoreDetalhado: string | null
  status: string
  thumbnailUrl: string | null
  pais: string | null
  videos: Array<{
    id: string
    youtubeId: string
    titulo: string
    url: string
    views: number | null
    thumbnailUrl: string | null
    dataPublicacao: string | null
    duracaoSegundos: number | null
  }>
  mochilaAt: string | null
  mochilaVideoCount: number | null
}

export default function CanalDetailPage({
  params,
}: {
  params: Promise<{ canalId: string }>
}) {
  const { canalId } = use(params)
  const router = useRouter()
  const [canal, setCanal] = useState<CanalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingNicho, setEditingNicho] = useState(false)
  const [nichoInput, setNichoInput] = useState('')

  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmVideoId, setConfirmVideoId] = useState<string | null>(null)
  const [mochilaN, setMochilaN] = useState<7 | 15 | 25>(7)
  const [mochilaBusy, setMochilaBusy] = useState(false)

  useEffect(() => {
    if (confirmDelete) {
      const timer = setTimeout(() => setConfirmDelete(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [confirmDelete])

  useEffect(() => {
    if (confirmVideoId) {
      const timer = setTimeout(() => setConfirmVideoId(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [confirmVideoId])

  useEffect(() => {
    fetchCanal()
  }, [canalId])

  async function fetchCanal() {
    const res = await fetch(`/api/canais/${canalId}`)
    if (!res.ok) {
      toast.error('Canal não encontrado')
      return
    }
    const data = await res.json()
    setCanal(data)
    setNichoInput(data.nichoInferido || '')
    setLoading(false)
  }

  async function handleStatusChange(status: string | null) {
    if (!status) return
    await fetch(`/api/canais/${canalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setCanal((c) => (c ? { ...c, status } : c))
    toast.success('Status atualizado')
  }

  async function handleSaveNicho() {
    await fetch(`/api/canais/${canalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nichoInferido: nichoInput }),
    })
    setCanal((c) => (c ? { ...c, nichoInferido: nichoInput } : c))
    setEditingNicho(false)
    toast.success('Nicho atualizado')
  }

  async function handleDeleteCanal(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/canais/${canalId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Canal removido')
        router.push('/biblioteca')
      } else {
        toast.error('Erro ao remover canal')
        setIsDeleting(false)
        setConfirmDelete(false)
      }
    } catch {
      toast.error('Erro ao remover canal')
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function handleGerarMochila() {
    if (!canal || canal.videos.length === 0) {
      toast.error('Salve vídeos no canal antes de gerar a mochila.')
      return
    }
    setMochilaBusy(true)
    try {
      const res = await fetch(`/api/canais/${canalId}/mochila`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: mochilaN }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro ao gerar mochila.')
        return
      }
      if (data.canal) {
        setCanal(data.canal)
        toast.success(
          `Mochila gerada com ${data.mochilaVideoCount} vídeo(s). Podes descarregar o ZIP abaixo.`
        )
      }
    } catch {
      toast.error('Erro de rede ao gerar mochila.')
    } finally {
      setMochilaBusy(false)
    }
  }

  async function handleDeleteVideo(videoId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (confirmVideoId !== videoId) {
      setConfirmVideoId(videoId)
      return
    }

    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' })
      if (res.ok) {
        setCanal((c) =>
          c ? { ...c, videos: c.videos.filter((v) => v.id !== videoId) } : c
        )
        toast.success('Vídeo removido')
      }
    } catch {
      toast.error('Erro ao remover vídeo')
    } finally {
      setConfirmVideoId(null)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Carregando…" />
        <PageWrapper>
          <div className="space-y-4">
            <Skeleton className="h-4 w-48 rounded bg-gp-bg4" />
            <Skeleton className="h-64 w-full rounded-xl bg-gp-bg4" />
            <Skeleton className="h-14 w-full rounded-lg bg-gp-bg4" />
          </div>
        </PageWrapper>
      </>
    )
  }

  if (!canal) return null

  let gemScore: GemScoreDetalhado | null = null
  if (canal.gemScoreDetalhado) {
    try {
      const parsed = JSON.parse(canal.gemScoreDetalhado)
      if (
        parsed?.total != null &&
        parsed?.classificacao &&
        (parsed?.breakdown || parsed?.sinais)
      ) {
        gemScore = parsed
      }
    } catch {
      // invalid
    }
  }

  const dataRefIdade = resolverDataReferenciaIdadeCanal(
    canal.videos,
    canal.dataCriacaoCanal
  )

  const topVideos = [...canal.videos]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10)

  const maxTopViews = topVideos[0]?.views ?? 0

  const idadeCanal = dataRefIdade ? calcularIdadeCanal(dataRefIdade) : null
  const idadeHint =
    canal.videos.some(
      (v) =>
        v.dataPublicacao != null &&
        !isNaN(new Date(v.dataPublicacao).getTime())
    )
      ? 'Desde a data do vídeo mais antigo com data na biblioteca.'
      : 'Sem datas nos vídeos guardados; usa a data de criação do canal no YouTube.'

  const nichoCrumbs =
    canal.nichoInferido
      ?.split('>')
      .map((s) => s.trim())
      .filter(Boolean) ?? []

  return (
    <>
      <Header
        actionsOnly
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canal.mochilaAt && (
              <a
                href={`/api/canais/${canalId}/mochila`}
                download
                className={cn(
                  buttonVariants({ variant: 'default', size: 'sm' }),
                  'rounded-lg font-semibold'
                )}
                title="Guardar o ficheiro .zip no computador"
              >
                <Download className="size-3.5" />
                Salvar mochila (ZIP)
              </a>
            )}
            <Select
              value={canal.status}
              onValueChange={(v) => v && handleStatusChange(v)}
            >
              <SelectTrigger className="w-40 rounded-lg border-white/[0.12] bg-gp-bg3 text-sm text-gp-text2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="analisando">Analisando</SelectItem>
                <SelectItem value="promissor">Promissor</SelectItem>
                <SelectItem value="pronto_raio_x">Mochila pronta</SelectItem>
                <SelectItem value="modelando">Modelando</SelectItem>
                <SelectItem value="descartado">Descartado</SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={handleDeleteCanal}
              disabled={isDeleting}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                confirmDelete
                  ? 'bg-gp-red text-white hover:opacity-90'
                  : 'text-gp-text3 hover:bg-gp-red/10 hover:text-gp-red'
              }`}
              title="Remover canal"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : confirmDelete ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Confirmar Exclusão?
                </>
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        }
      />

      <PageWrapper>
        <div className="space-y-4">
          <nav
            className="mb-7 flex items-center gap-1.5 text-xs text-gp-text3"
            aria-label="Trilho"
          >
            <Link
              href="/biblioteca"
              className="text-gp-text2 transition-colors hover:text-gp-text"
            >
              ← Biblioteca
            </Link>
            <span className="text-[10px]">›</span>
            <span className="truncate text-gp-text3">{canal.nome}</span>
          </nav>

          <section className="gp-card overflow-hidden p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex size-[60px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/[0.12] bg-gp-bg4 font-heading text-[22px] font-bold text-gp-gold">
                {canal.thumbnailUrl ? (
                  <img
                    src={`/api/canais/${canalId}/avatar`}
                    alt={canal.nome}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  canal.nome.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="font-heading text-xl font-bold leading-tight tracking-wide text-gp-text">
                    {canal.nome}
                  </h1>
                  <ChannelStatusBadge status={canal.status as CanalStatus} />
                  {gemScore && <GemScoreBadge score={gemScore} size="md" />}
                </div>
                <a
                  href={canal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gp-mono-nums mb-2 flex cursor-pointer items-center gap-1 text-xs text-gp-text3 hover:text-gp-gold"
                >
                  {canal.url.replace('https://www.youtube.com/', 'youtube.com/')}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {canal.descricao && (
                  <p
                    className="line-clamp-2 max-w-[540px] text-[13px] leading-relaxed text-gp-text2"
                    title={canal.descricao}
                  >
                    {canal.descricao}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.07] sm:grid-cols-5">
              <StatStripCell
                label="Inscritos"
                value={canal.inscritos ? formatNum(canal.inscritos) : '—'}
              />
              <StatStripCell
                label="Views totais"
                value={
                  canal.totalViews != null && canal.totalViews > 0
                    ? formatNum(canal.totalViews)
                    : '—'
                }
              />
              <StatStripCell
                label="Vídeos"
                value={
                  canal.videosPublicados
                    ? formatNum(canal.videosPublicados)
                    : '—'
                }
              />
              <StatStripCell
                label="Idade"
                value={idadeCanal || '—'}
                title={idadeHint}
              />
              <StatStripCell
                label="Frequência"
                value={canal.frequenciaPostagem || '—'}
                valueTitle={canal.frequenciaPostagem || undefined}
                plainValue
                className="col-span-2 min-w-0 sm:col-span-1"
              />
            </div>
          </section>

          {canal.status === 'pronto_raio_x' && !canal.mochilaAt && (
            <div
              role="status"
              className="flex gap-3 rounded-xl border border-gp-gold/30 bg-gp-gold/10 px-4 py-3 text-sm text-gp-text"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-gp-gold" />
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-gp-text">
                  Status «Mochila pronta» sem ZIP no servidor
                </p>
                <p className="text-gp-text2">
                  O estado do canal indica que a mochila está pronta, mas ainda não foi
                  gerado o arquivo .zip (ou foi apagado). Gere a mochila na secção{' '}
                  <a
                    href="#mochila"
                    className="font-semibold text-gp-gold underline decoration-gp-gold/50 underline-offset-2 hover:text-gp-text"
                  >
                    Mochila
                  </a>{' '}
                  abaixo para poder salvar no computador.
                </p>
                {canal.videos.length === 0 && (
                  <p className="text-gp-text3">
                    Este canal ainda não tem vídeos na biblioteca — usa «Atualizar» na
                    lista da biblioteca para sincronizar antes de gerar.
                  </p>
                )}
              </div>
            </div>
          )}

          <section className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white/[0.07] bg-gp-bg2 px-4 py-3">
            <span className="font-heading shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gp-text3">
              Nicho
            </span>
            {editingNicho ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Input
                  value={nichoInput}
                  onChange={(e) => setNichoInput(e.target.value)}
                  className="max-w-md border-white/[0.12] bg-gp-bg3 text-sm text-gp-text focus-visible:ring-gp-gold"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNicho()}
                />
                <button
                  type="button"
                  onClick={handleSaveNicho}
                  className="rounded-md p-1.5 text-gp-text2 transition-colors hover:bg-gp-bg3 hover:text-gp-text"
                  aria-label="Guardar nicho"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingNicho(false)
                    setNichoInput(canal.nichoInferido || '')
                  }}
                  className="rounded-md p-1.5 text-gp-text2 transition-colors hover:bg-gp-bg3 hover:text-gp-text"
                  aria-label="Cancelar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-[13px] text-gp-text2">
                  {nichoCrumbs.length > 0 ? (
                    nichoCrumbs.map((part, idx) => (
                      <span key={`${part}-${idx}`} className="contents">
                        {idx > 0 && (
                          <span className="text-[11px] text-gp-text3">›</span>
                        )}
                        {idx === nichoCrumbs.length - 1 ? (
                          <strong className="font-medium text-gp-text">
                            {part}
                          </strong>
                        ) : (
                          <span>{part}</span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span>Não identificado</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingNicho(true)}
                  className="ml-auto rounded p-1 text-[13px] text-gp-text3 transition-colors hover:text-gp-text2"
                  aria-label="Editar nicho"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </section>

          {gemScore && (
            <GemScorePanel
              score={gemScore}
              totalViewsCanal={canal.totalViews}
              contextoCanal={{
                videosNoCanal: canal.videosPublicados ?? null,
                idadeMeses: dataRefIdade
                  ? Math.max(
                      1,
                      Math.round(
                        (Date.now() - dataRefIdade.getTime()) /
                          (30 * 86400000)
                      )
                    )
                  : 1,
                inscritos: canal.inscritos ?? 0,
                totalViews: canal.totalViews ?? 0,
              }}
            />
          )}

          <section
            id="mochila"
            className="gp-card scroll-mt-24 flex flex-col gap-4 p-5 sm:flex-row sm:items-start"
          >
            <div className="flex size-[38px] shrink-0 items-center justify-center rounded-lg border border-[rgba(232,169,58,0.35)] bg-gp-gold/10 text-lg text-gp-gold">
              <Package className="size-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading mb-1 text-sm font-bold text-gp-text">
                Mochila
              </h3>
              <p className="mb-3 text-xs leading-relaxed text-gp-text2">
                Gera um{' '}
                <code className="gp-mono-nums rounded bg-gp-bg4 px-1 py-0.5 text-[11px] text-gp-gold">
                  .zip
                </code>{' '}
                com os teus vídeos mais vistos na biblioteca. Cada pasta chama-se{' '}
                <strong className="text-gp-text">título do vídeo — id</strong>, com{' '}
                <code className="gp-mono-nums rounded bg-gp-bg4 px-1 py-0.5 text-[11px] text-gp-gold">
                  ficha.txt
                </code>
                ,{' '}
                <code className="gp-mono-nums rounded bg-gp-bg4 px-1 py-0.5 text-[11px] text-gp-gold">
                  roteiro.txt
                </code>
                ,{' '}
                <code className="gp-mono-nums rounded bg-gp-bg4 px-1 py-0.5 text-[11px] text-gp-gold">
                  comentarios_top16.txt
                </code>{' '}
                (16 comentários com mais curtidas) e{' '}
                <code className="gp-mono-nums rounded bg-gp-bg4 px-1 py-0.5 text-[11px] text-gp-gold">
                  thumbnail
                </code>
                . Dados via InnerTube. Ao gerar de novo, o ZIP anterior é substituído.
              </p>
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-gp-text3">
                  Quantidade:
                </span>
                {([7, 15, 25] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMochilaN(n)}
                    className={cn(
                      'rounded-lg border px-3 py-1 text-[11px] font-semibold font-heading transition-colors',
                      mochilaN === n
                        ? 'border-[rgba(232,169,58,0.35)] bg-gp-gold/15 text-gp-gold'
                        : 'border-white/[0.12] bg-transparent text-gp-text2 hover:bg-gp-bg3 hover:text-gp-text'
                    )}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
              {canal.mochilaAt && (
                <p className="mt-2 text-[11px] text-gp-text3">
                  Última mochila:{' '}
                  {new Date(canal.mochilaAt).toLocaleString('pt-BR')} —{' '}
                  {canal.mochilaVideoCount ?? '—'} vídeo(s) no arquivo
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:pt-1">
              <Button
                type="button"
                size="sm"
                className="rounded-lg border-0 bg-gp-gold font-semibold text-[#1a1000] hover:bg-[#f0b740]"
                disabled={mochilaBusy || canal.videos.length === 0}
                onClick={() => void handleGerarMochila()}
              >
                {mochilaBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Package className="mr-2 h-4 w-4" />
                )}
                {canal.mochilaAt ? 'Gerar de novo' : 'Gerar mochila'}
              </Button>
              {canal.mochilaAt && (
                <a
                  href={`/api/canais/${canalId}/mochila`}
                  download
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'rounded-lg border-white/[0.12] bg-transparent font-medium text-gp-text2 hover:bg-gp-bg3 hover:text-gp-text'
                  )}
                >
                  <Download className="mr-2 size-3.5" />
                  Salvar ZIP
                </a>
              )}
            </div>
          </section>

          {topVideos.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-heading text-[13px] font-bold uppercase tracking-widest text-gp-text2">
                  Top Vídeos
                </h3>
                <span className="text-xs text-gp-text3">por views</span>
              </div>
              <div className="gp-card overflow-hidden p-0">
                {topVideos.map((v, i) => {
                  const pct =
                    maxTopViews > 0 && v.views != null
                      ? Math.max(1, Math.round((v.views / maxTopViews) * 100))
                      : 0
                  return (
                    <div
                      key={v.id}
                      className="group grid grid-cols-[32px_52px_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-white/[0.07] px-[18px] py-3.5 last:border-b-0 transition-colors hover:bg-gp-bg3"
                    >
                      <span className="gp-mono-nums text-center text-[13px] font-medium text-gp-text3">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="relative h-[34px] w-[52px] shrink-0 overflow-hidden rounded-[5px] bg-gp-bg4">
                        {v.thumbnailUrl ? (
                          <img
                            src={v.thumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gp-bg4 to-gp-bg3 text-base opacity-60">
                            ▶
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-[13px] font-medium text-gp-text hover:text-gp-gold"
                        >
                          {v.titulo}
                        </a>
                        <p className="mt-0.5 text-[11px] text-gp-text3">
                          {v.dataPublicacao
                            ? formatRelativePt(v.dataPublicacao)
                            : '—'}
                        </p>
                        <div className="mt-1.5 h-0.5 overflow-hidden rounded-sm bg-gp-bg4">
                          <div
                            className="h-full rounded-sm bg-gp-gold/50"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="gp-mono-nums whitespace-nowrap text-right text-[13px] font-medium text-gp-text2">
                          {v.views != null ? formatNum(v.views) : '—'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteVideo(v.id, e)}
                          className={cn(
                            'rounded-md px-2 py-1 text-xs transition-all flex items-center gap-1',
                            confirmVideoId === v.id
                              ? 'bg-gp-red text-white opacity-100'
                              : 'text-gp-text3 opacity-0 group-hover:opacity-100 hover:bg-gp-red/10 hover:text-gp-red'
                          )}
                        >
                          {confirmVideoId === v.id ? (
                            <>
                              <Check className="h-3 w-3" />
                              OK?
                            </>
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}

function StatStripCell({
  label,
  value,
  title,
  className,
  plainValue,
  valueTitle,
}: {
  label: string
  value: string
  title?: string
  className?: string
  /** Texto corrido (ex. frequência): uma linha, reticências, sem números mono */
  plainValue?: boolean
  /** Tooltip no valor (útil quando truncado) */
  valueTitle?: string
}) {
  return (
    <div className={cn('min-w-0 bg-gp-bg3 px-4 py-3.5', className)} title={title}>
      <div className="font-heading mb-1 text-[10px] font-semibold uppercase tracking-widest text-gp-text3">
        {label}
      </div>
      <div
        className={cn(
          'min-w-0 font-medium leading-snug text-gp-text',
          plainValue
            ? 'truncate whitespace-nowrap font-sans text-[13px]'
            : 'gp-mono-nums text-lg leading-none'
        )}
        title={valueTitle}
      >
        {value}
      </div>
    </div>
  )
}

function formatRelativePt(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  const deltaSec = Math.round((d.getTime() - Date.now()) / 1000)
  const abs = Math.abs(deltaSec)
  const pick: [number, Intl.RelativeTimeFormatUnit, number][] = [
    [60, 'second', 1],
    [3600, 'minute', 60],
    [86400, 'hour', 3600],
    [86400 * 7, 'day', 86400],
    [86400 * 30, 'week', 86400 * 7],
    [86400 * 365, 'month', 86400 * 30],
    [Infinity, 'year', 86400 * 365],
  ]
  for (const [max, unit, div] of pick) {
    if (abs < max) {
      const n = Math.round(deltaSec / div)
      return `Publicado ${rtf.format(n, unit)}`
    }
  }
  return '—'
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}
