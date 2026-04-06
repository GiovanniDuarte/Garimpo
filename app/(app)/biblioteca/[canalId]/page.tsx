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
  Calendar,
  Users,
  Eye,
  Video,
  Clock,
  Edit3,
  Check,
  X,
  ArrowLeft,
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
            <Skeleton className="h-44 w-full rounded-2xl bg-[#272727]" />
            <Skeleton className="h-24 w-full rounded-xl bg-[#272727]" />
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
      if (parsed?.total != null && parsed?.breakdown && parsed?.classificacao) {
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

  const idadeCanal = dataRefIdade ? calcularIdadeCanal(dataRefIdade) : null
  const idadeHint =
    canal.videos.some(
      (v) =>
        v.dataPublicacao != null &&
        !isNaN(new Date(v.dataPublicacao).getTime())
    )
      ? 'Desde a data do vídeo mais antigo com data na biblioteca.'
      : 'Sem datas nos vídeos guardados; usa a data de criação do canal no YouTube.'

  return (
    <>
      <Header
        title={canal.nome}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canal.mochilaAt && (
              <a
                href={`/api/canais/${canalId}/mochila`}
                download
                className={cn(
                  buttonVariants({ variant: 'default', size: 'sm' }),
                  'rounded-full font-semibold shadow-sm'
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
              <SelectTrigger className="w-40 rounded-full border-[#303030] bg-[#212121] text-sm text-[#aaaaaa]">
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
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                confirmDelete 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'text-[#717171] hover:bg-red-500/15 hover:text-red-400'
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
        <div className="space-y-6">

          {/* Back link */}
          <Link
            href="/biblioteca"
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#aaaaaa] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Biblioteca
          </Link>

          {/* ── Channel hero (compacto: faixa fina em vez de banner alto vazio) ── */}
          <section className="overflow-hidden rounded-2xl border border-[#272727] bg-[#181818]">
            <div
              className="h-1 bg-gradient-to-r from-[#272727] via-primary/40 to-[#272727]"
              aria-hidden
            />

            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:py-5">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#272727] bg-[#272727] sm:size-[4.5rem] sm:border-[3px]">
                {canal.thumbnailUrl ? (
                  <img
                    src={`/api/canais/${canalId}/avatar`}
                    alt={canal.nome}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-[#aaaaaa] sm:text-3xl">
                    {canal.nome.charAt(0)}
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{canal.nome}</h2>
                  <ChannelStatusBadge status={canal.status as CanalStatus} />
                  {gemScore && <GemScoreBadge score={gemScore} size="md" />}
                </div>
                <a
                  href={canal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex cursor-pointer items-center gap-1 text-xs text-[#aaaaaa] hover:text-primary"
                >
                  {canal.url.replace('https://www.youtube.com/', 'youtube.com/')}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {canal.descricao && (
                  <p className="mt-1 line-clamp-2 text-xs text-[#717171]">
                    {canal.descricao}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── Stats grid ── */}
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard icon={Users} label="Inscritos" value={canal.inscritos ? formatNum(canal.inscritos) : '—'} />
            <MetricCard icon={Eye} label="Views totais" value={canal.totalViews != null && canal.totalViews > 0 ? formatNum(canal.totalViews) : '—'} />
            <MetricCard icon={Video} label="Vídeos" value={canal.videosPublicados ? formatNum(canal.videosPublicados) : '—'} />
            <MetricCard
              icon={Calendar}
              label="Idade"
              value={idadeCanal || '—'}
              title={idadeHint}
            />
            <MetricCard icon={Clock} label="Frequência" value={canal.frequenciaPostagem || '—'} />
          </section>

          {canal.status === 'pronto_raio_x' && !canal.mochilaAt && (
            <div
              role="status"
              className="flex gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-amber-50">
                  Status «Mochila pronta» sem ZIP no servidor
                </p>
                <p className="text-amber-100/90">
                  O estado do canal indica que a mochila está pronta, mas ainda não foi
                  gerado o arquivo .zip (ou foi apagado). Gere a mochila na secção{' '}
                  <a
                    href="#mochila"
                    className="font-semibold text-white underline decoration-amber-400/80 underline-offset-2 hover:text-amber-50"
                  >
                    Mochila
                  </a>{' '}
                  abaixo para poder salvar no computador.
                </p>
                {canal.videos.length === 0 && (
                  <p className="text-amber-100/80">
                    Este canal ainda não tem vídeos na biblioteca — usa «Atualizar» na
                    lista da biblioteca para sincronizar antes de gerar.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Nicho ── */}
          <section className="rounded-xl border border-[#272727] bg-[#181818] p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#717171]">Nicho</p>
            <div className="flex items-center gap-2">
              {editingNicho ? (
                <>
                  <Input
                    value={nichoInput}
                    onChange={(e) => setNichoInput(e.target.value)}
                    className="max-w-sm border-[#303030] bg-[#212121] text-sm text-white focus-visible:ring-primary"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNicho()}
                  />
                  <button
                    onClick={handleSaveNicho}
                    className="rounded-full p-1.5 text-[#aaaaaa] transition-colors hover:bg-[#272727] hover:text-white"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingNicho(false)
                      setNichoInput(canal.nichoInferido || '')
                    }}
                    className="rounded-full p-1.5 text-[#aaaaaa] transition-colors hover:bg-[#272727] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-white">
                    {canal.nichoInferido || 'Não identificado'}
                  </span>
                  <button
                    onClick={() => setEditingNicho(true)}
                    className="rounded-full p-1.5 text-[#717171] transition-colors hover:bg-[#272727] hover:text-white"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </section>

          {/* ── Mochila (ZIP) ── */}
          <section
            id="mochila"
            className="scroll-mt-24 rounded-xl border border-[#272727] bg-[#181818] p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-white">Mochila</h3>
            </div>
            <p className="mb-4 text-sm text-[#aaaaaa]">
              Gera um <strong className="text-white">.zip</strong> com os teus
              vídeos mais vistos na biblioteca. Cada pasta chama-se{' '}
              <strong className="text-white">título do vídeo — id</strong>, com{' '}
              <code className="text-[#e8e8e8]">ficha.txt</code>,{' '}
              <code className="text-[#e8e8e8]">roteiro.txt</code>,{' '}
              <code className="text-[#e8e8e8]">comentarios_top16.txt</code> (16
              comentários com mais curtidas) e{' '}
              <code className="text-[#e8e8e8]">thumbnail</code>. Dados via
              InnerTube. Ao gerar de novo, o ZIP anterior é substituído.
            </p>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#717171]">Quantidade:</span>
                {([7, 15, 25] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMochilaN(n)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      mochilaN === n
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-[#303030] bg-[#212121] text-[#aaaaaa] hover:bg-[#272727]'
                    }`}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  disabled={mochilaBusy || canal.videos.length === 0}
                  onClick={() => void handleGerarMochila()}
                >
                  {mochilaBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Package className="mr-2 h-4 w-4" />
                  )}
                  {canal.mochilaAt ? 'Gerar mochila de novo' : 'Gerar mochila'}
                </Button>
                {canal.mochilaAt && (
                  <a
                    href={`/api/canais/${canalId}/mochila`}
                    download
                    className={cn(
                      buttonVariants({ variant: 'secondary', size: 'sm' }),
                      'rounded-full font-semibold'
                    )}
                  >
                    <Download className="size-3.5" />
                    Salvar ZIP
                  </a>
                )}
              </div>
            </div>
            {canal.mochilaAt && (
              <p className="mt-3 text-xs text-[#717171]">
                Última mochila:{' '}
                {new Date(canal.mochilaAt).toLocaleString('pt-BR')} —{' '}
                {canal.mochilaVideoCount ?? '—'} vídeo(s) no arquivo
              </p>
            )}
          </section>

          {/* ── Gem Score Panel ── */}
          {gemScore && (
            <GemScorePanel score={gemScore} totalViewsCanal={canal.totalViews} />
          )}

          {/* ── Top Vídeos ── */}
          {topVideos.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-[#272727] bg-[#181818]">
              <div className="border-b border-[#272727] px-5 py-4">
                <h3 className="text-sm font-semibold text-white">
                  Top Vídeos
                  <span className="ml-2 text-xs font-normal text-[#717171]">
                    por views
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-[#272727]">
                {topVideos.map((v, i) => (
                  <div
                    key={v.id}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#212121]"
                  >
                    <span className="w-5 shrink-0 text-center text-xs text-[#717171]">
                      {i + 1}
                    </span>
                    {v.thumbnailUrl && (
                      <img
                        src={v.thumbnailUrl}
                        alt=""
                        className="h-10 w-[72px] shrink-0 rounded-md object-cover"
                      />
                    )}
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 cursor-pointer truncate text-sm text-white hover:text-primary"
                    >
                      {v.titulo}
                    </a>
                    <span className="shrink-0 text-xs tabular-nums text-[#717171]">
                      {v.views != null ? formatNum(v.views) : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteVideo(v.id, e)}
                      className={`shrink-0 rounded-full px-2 py-1 text-xs transition-all flex items-center gap-1 ${
                        confirmVideoId === v.id
                          ? 'bg-red-600 text-white opacity-100'
                          : 'text-[#717171] opacity-0 group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-400'
                      }`}
                    >
                      {confirmVideoId === v.id ? (
                        <>
                          <Check className="h-3 w-3" />
                          Confirmar?
                        </>
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </PageWrapper>
    </>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  title?: string
}) {
  return (
    <div
      className="rounded-xl border border-[#272727] bg-[#181818] p-4"
      title={title}
    >
      <div className="mb-2 flex items-center gap-1.5 text-[#717171]">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums text-white">{value}</p>
    </div>
  )
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}
