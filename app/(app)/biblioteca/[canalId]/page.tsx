'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GemScoreBadge, GemScorePanel } from '@/components/garimpo/GemScore'
import { ChannelStatusBadge } from '@/components/biblioteca/ChannelStatusBadge'
import { PotencialModelagemPanel } from '@/components/biblioteca/PotencialModelagemPanel'
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
} from 'lucide-react'
import { toast } from 'sonner'
import type { CanalStatus, GemScoreDetalhado } from '@/types'
import { calcularIdadeCanal } from '@/lib/scraper/channel-info'
import { calcularPotencialModelagem } from '@/lib/scoring/potencial-modelagem'

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

  async function handleDeleteCanal() {
    if (!confirm('Remover este canal da biblioteca?')) return
    await fetch(`/api/canais/${canalId}`, { method: 'DELETE' })
    toast.success('Canal removido')
    router.push('/biblioteca')
  }

  async function handleDeleteVideo(videoId: string) {
    if (!confirm('Remover este vídeo?')) return
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
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Carregando..." />
        <PageWrapper>
          <Skeleton className="h-32 w-full" />
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

  const potencialModelagem = calcularPotencialModelagem({
    inscritos: canal.inscritos,
    totalViews: canal.totalViews,
    videosPublicados: canal.videosPublicados,
    dataCriacaoCanal: canal.dataCriacaoCanal,
    frequenciaPostagem: canal.frequenciaPostagem,
    videosSalvosCount: canal.videos.length,
  })

  const topVideos = [...canal.videos]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10)

  const idadeCanal =
    canal.dataCriacaoCanal &&
    !isNaN(new Date(canal.dataCriacaoCanal).getTime())
      ? calcularIdadeCanal(new Date(canal.dataCriacaoCanal))
      : null

  return (
    <>
      <Header
        title={canal.nome}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={canal.status}
              onValueChange={(v) => v && handleStatusChange(v)}
            >
              <SelectTrigger className="w-44 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="analisando">Analisando</SelectItem>
                <SelectItem value="promissor">Promissor</SelectItem>
                <SelectItem value="pronto_raio_x">Raio-X Pronto</SelectItem>
                <SelectItem value="modelando">Modelando</SelectItem>
                <SelectItem value="descartado">Descartado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="destructive" size="sm" onClick={handleDeleteCanal}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <PageWrapper>
        <div className="space-y-8">
          <section className="flex items-start gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
              {canal.thumbnailUrl ? (
                <img
                  src={`/api/canais/${canalId}/avatar`}
                  alt={canal.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {canal.nome.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold">{canal.nome}</h2>
                <ChannelStatusBadge status={canal.status as CanalStatus} />
                {gemScore && <GemScoreBadge score={gemScore} size="md" />}
              </div>
              <a
                href={canal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                {canal.url.replace('https://www.youtube.com/', '')}
                <ExternalLink className="h-3 w-3" />
              </a>
              {canal.descricao && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {canal.descricao}
                </p>
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard
              icon={Users}
              label="Inscritos"
              value={
                canal.inscritos ? formatNum(canal.inscritos) : '—'
              }
            />
            <MetricCard
              icon={Eye}
              label="Views totais"
              value={
                canal.totalViews != null && canal.totalViews > 0
                  ? formatNum(canal.totalViews)
                  : '—'
              }
            />
            <MetricCard
              icon={Video}
              label="Vídeos"
              value={
                canal.videosPublicados
                  ? formatNum(canal.videosPublicados)
                  : '—'
              }
            />
            <MetricCard
              icon={Calendar}
              label="Idade"
              value={idadeCanal || '—'}
            />
            <MetricCard
              icon={Clock}
              label="Frequência"
              value={canal.frequenciaPostagem || '—'}
            />
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Nicho
            </h3>
            <div className="flex items-center gap-3">
              {editingNicho ? (
                <>
                  <Input
                    value={nichoInput}
                    onChange={(e) => setNichoInput(e.target.value)}
                    className="max-w-md bg-background"
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveNicho}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingNicho(false)
                      setNichoInput(canal.nichoInferido || '')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    {canal.nichoInferido || 'Não identificado'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingNicho(true)}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </section>

          {gemScore && (
            <GemScorePanel
              score={gemScore}
              totalViewsCanal={canal.totalViews}
            />
          )}

          <PotencialModelagemPanel potencial={potencialModelagem} />

          {topVideos.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Top vídeos
              </h3>
              <div className="space-y-1">
                {topVideos.map((v, i) => (
                  <div
                    key={v.id}
                    className="group flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-secondary"
                  >
                    <span className="w-6 text-center text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate hover:text-primary"
                    >
                      {v.titulo}
                    </a>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {v.views != null ? formatNum(v.views) : '—'}
                    </span>
                    <button
                      onClick={() => handleDeleteVideo(v.id)}
                      className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <Icon className="mb-1 h-4 w-4 text-muted-foreground" />
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}
