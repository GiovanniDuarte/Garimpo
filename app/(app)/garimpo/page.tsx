'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GemScoreBadge } from '@/components/garimpo/GemScore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  BookmarkPlus,
  Loader2,
  Crosshair,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Eye,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import type { VideoGarimpo } from '@/types'
import {
  lerFiltrosGarimpo,
  salvarFiltrosGarimpo,
} from '@/lib/garimpo-filtros-storage'

const MIN_VIEWS_SLIDER = 10_000
const MAX_MIN_VIEWS_SLIDER = 20_000_000
const STEP_MIN_VIEWS = 5_000

const MIN_INSCRITOS_SLIDER = 1_000
const MAX_INSCRITOS_SLIDER = 100_000
const STEP_INSCRITOS = 1_000

const DIAS_MIN = 1
const DIAS_MAX = 90
const DIAS_STEP = 1

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export default function GarimpoPage() {
  const [query, setQuery] = useState('')
  const [minViews, setMinViews] = useState(15_000)
  const [maxInscritos, setMaxInscritos] = useState(1_000)
  const [dias, setDias] = useState(15)
  const [filtrosHydrated, setFiltrosHydrated] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [results, setResults] = useState<VideoGarimpo[]>([])
  const [continuation, setContinuation] = useState<string | null>(null)
  const [seedVideoId, setSeedVideoId] = useState<string | null>(null)
  const [referenceChannelId, setReferenceChannelId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    const saved = lerFiltrosGarimpo()
    if (saved) {
      setMinViews(clamp(saved.minViews, MIN_VIEWS_SLIDER, MAX_MIN_VIEWS_SLIDER))
      setMaxInscritos(clamp(saved.maxInscritos, MIN_INSCRITOS_SLIDER, MAX_INSCRITOS_SLIDER))
      setDias(clamp(saved.dias, DIAS_MIN, DIAS_MAX))
    }
    setFiltrosHydrated(true)
  }, [])

  useEffect(() => {
    if (!filtrosHydrated) return
    salvarFiltrosGarimpo({ minViews, maxInscritos, dias })
  }, [filtrosHydrated, minViews, maxInscritos, dias])

  function sortByGem(videos: VideoGarimpo[]) {
    return [...videos].sort((a, b) => b.gemScore.total - a.gemScore.total)
  }

  async function handleSearch() {
    if (!query.trim()) {
      toast.error('Digite um termo ou URL do YouTube.')
      return
    }
    setLoading(true)
    setContinuation(null)
    setSeedVideoId(null)
    setReferenceChannelId(null)
    try {
      const res = await fetch('/api/garimpo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          minViews,
          maxInscritos,
          diasPublicacao: dias,
          continuation: null,
          seedVideoId: null,
          seenVideoIds: [],
          referenceChannelId: null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro na busca')
        setResults([])
      } else {
        const items = (data.items || []) as VideoGarimpo[]
        setResults(sortByGem(items))
        setContinuation(data.continuation ?? null)
        setSeedVideoId(data.seedVideoId ?? null)
        setReferenceChannelId(data.referenceChannelId ?? null)
        if (items.length === 0) {
          toast.message('Nenhum resultado com esses filtros nesta página.')
        }
      }
    } catch {
      toast.error('Falha de rede.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadMore() {
    if (!continuation || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch('/api/garimpo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          minViews,
          maxInscritos,
          diasPublicacao: dias,
          continuation,
          seedVideoId,
          seenVideoIds: results.map((r) => r.youtubeId),
          referenceChannelId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro ao carregar mais')
        return
      }
      const items = (data.items || []) as VideoGarimpo[]
      setResults((prev) => sortByGem([...prev, ...items]))
      setContinuation(data.continuation ?? null)
      if (data.seedVideoId != null) setSeedVideoId(data.seedVideoId)
      if (data.referenceChannelId != null) setReferenceChannelId(data.referenceChannelId)
      if (items.length === 0) toast.message('Nenhum resultado novo com esses filtros.')
    } catch {
      toast.error('Falha de rede.')
    } finally {
      setLoadingMore(false)
    }
  }

  function setAsReference(video: VideoGarimpo) {
    setQuery(video.url)
    setResults([])
    setContinuation(null)
    setSeedVideoId(null)
    setReferenceChannelId(null)
    toast.message('Referência atualizada. Clique em Garimpar para buscar a partir deste vídeo.')
  }

  async function handleSave(video: VideoGarimpo) {
    setSavingId(video.youtubeId)
    try {
      const res = await fetch('/api/canais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: video.canal.nome,
          url: video.canal.url,
          youtubeId: video.canal.youtubeId,
          inscritos: video.canal.inscritos,
          thumbnailUrl: video.canal.thumbnailUrl,
          videoId: video.youtubeId,
          gemScore: video.gemScore.total,
          gemScoreDetalhado: JSON.stringify(video.gemScore),
        }),
      })
      const data = await res.json()
      if (data.error) toast.error(data.error)
      else toast.success(`Canal "${data.nome}" salvo na biblioteca.`)
    } catch {
      toast.error('Erro ao salvar.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <Header
        title="Garimpo"
        description="Descubra vídeos com alto potencial de alcance e modelagem"
      />
      <PageWrapper>
        <div className="space-y-6">

          {/* ── Search bar ── */}
          <div className="space-y-3">
            <div className="flex gap-2">
              {/* Search input */}
              <div className="flex flex-1 items-center gap-2 rounded-full border border-[#303030] bg-[#121212] px-4 py-2.5 shadow-inner transition-colors focus-within:border-[#717171]">
                <Search className="h-4 w-4 shrink-0 text-[#aaaaaa]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Palavras-chave ou URL do vídeo…"
                  className="border-0 bg-transparent p-0 text-sm text-white placeholder:text-[#717171] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Search button */}
              <Button
                size="default"
                className="rounded-full px-5 font-semibold shadow-sm"
                onClick={handleSearch}
                disabled={loading || loadingMore}
                id="btn-garimpar"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Garimpar'
                )}
              </Button>

              {/* Filters toggle */}
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-[#303030] bg-[#212121] px-4 py-2.5 text-sm font-medium text-[#aaaaaa] transition-colors hover:border-[#717171] hover:text-white"
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
                {filtersOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Collapsible filters panel */}
            {filtersOpen && (
              <div className="rounded-2xl border border-[#272727] bg-[#181818] p-5 shadow-lg">
                <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-[#717171]">
                  Filtros da consulta
                </p>
                <div className="grid gap-6 sm:grid-cols-3">
                  {/* Min views */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-[#aaaaaa]">
                        <Eye className="h-3.5 w-3.5" />
                        Mín. views
                      </label>
                      <span className="rounded-md bg-[#212121] px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                        {formatCompact(minViews)}
                      </span>
                    </div>
                    <Slider
                      value={[minViews]}
                      onValueChange={(v) => setMinViews(Array.isArray(v) ? v[0]! : v)}
                      min={MIN_VIEWS_SLIDER}
                      max={MAX_MIN_VIEWS_SLIDER}
                      step={STEP_MIN_VIEWS}
                    />
                  </div>

                  {/* Max inscritos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-[#aaaaaa]">
                        <Users className="h-3.5 w-3.5" />
                        Máx. inscritos
                      </label>
                      <span className="rounded-md bg-[#212121] px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                        {formatCompact(maxInscritos)}
                      </span>
                    </div>
                    <Slider
                      value={[maxInscritos]}
                      onValueChange={(v) => setMaxInscritos(Array.isArray(v) ? v[0]! : v)}
                      min={MIN_INSCRITOS_SLIDER}
                      max={MAX_INSCRITOS_SLIDER}
                      step={STEP_INSCRITOS}
                    />
                  </div>

                  {/* Recência */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-[#aaaaaa]">
                        Recência (dias)
                      </label>
                      <span className="rounded-md bg-[#212121] px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                        {dias}d
                      </span>
                    </div>
                    <Slider
                      value={[dias]}
                      onValueChange={(v) => setDias(Array.isArray(v) ? v[0]! : v)}
                      min={DIAS_MIN}
                      max={DIAS_MAX}
                      step={DIAS_STEP}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Results ── */}
          {loading ? (
            <VideoSkeletons />
          ) : results.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-[#aaaaaa]">
                <span className="font-semibold text-white">{results.length}</span> vídeos encontrados
              </p>
              <div className="space-y-3">
                {results.map((video) => {
                  const busy = savingId === video.youtubeId
                  return (
                    <VideoCard
                      key={video.youtubeId}
                      video={video}
                      busy={busy}
                      onSave={handleSave}
                      onSetReference={setAsReference}
                    />
                  )
                })}
              </div>

              {continuation && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="secondary"
                    className="rounded-full px-6 font-medium"
                    disabled={loadingMore}
                    onClick={handleLoadMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Carregando…
                      </>
                    ) : (
                      'Carregar mais resultados'
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </PageWrapper>
    </>
  )
}

/* ── Sub-components ────────────────────────────────── */

function VideoCard({
  video,
  busy,
  onSave,
  onSetReference,
}: {
  video: VideoGarimpo
  busy: boolean
  onSave: (v: VideoGarimpo) => void
  onSetReference: (v: VideoGarimpo) => void
}) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-[#272727] bg-[#181818] p-3 transition-colors hover:border-[#3f3f3f] hover:bg-[#212121] sm:flex-row sm:gap-4 sm:p-4">
      {/* Thumbnail */}
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg sm:w-52"
      >
        <img
          src={video.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Duration badge placeholder – shown as overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </a>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-sm font-semibold leading-snug text-white hover:text-primary sm:text-base"
        >
          {video.titulo}
        </a>

        <p className="text-xs font-medium text-[#aaaaaa]">{video.canal.nome}</p>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[#717171]">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatCompact(video.views)} views
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {formatCompact(video.canal.inscritos)} inscritos
          </span>
          {video.canal.totalViews != null && video.canal.totalViews > 0 && (
            <>
              <span>•</span>
              <span>{formatCompact(video.canal.totalViews)} views totais</span>
            </>
          )}
        </div>
      </div>

      {/* Actions + GemScore */}
      <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:justify-between">
        <GemScoreBadge score={video.gemScore} size="lg" />
        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          <button
            onClick={() => onSetReference(video)}
            title="Usar como referência"
            className="flex items-center gap-1.5 rounded-full border border-[#303030] bg-transparent px-3 py-1.5 text-xs font-medium text-[#aaaaaa] transition-colors hover:border-[#717171] hover:text-white"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Referência
          </button>
          <button
            onClick={() => onSave(video)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BookmarkPlus className="h-3.5 w-3.5" />
            )}
            Salvar canal
          </button>
        </div>
      </div>
    </div>
  )
}

function VideoSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 rounded-xl border border-[#272727] bg-[#181818] p-4"
        >
          <Skeleton className="h-28 w-48 shrink-0 rounded-lg bg-[#272727]" />
          <div className="flex flex-1 flex-col justify-center space-y-3">
            <Skeleton className="h-4 w-3/4 rounded bg-[#272727]" />
            <Skeleton className="h-3 w-1/3 rounded bg-[#272727]" />
            <Skeleton className="h-3 w-1/2 rounded bg-[#272727]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#272727] bg-[#181818] py-24 text-center">
      <Search className="mb-4 h-12 w-12 text-[#3f3f3f]" />
      <p className="text-base font-semibold text-white">Nenhum resultado ainda</p>
      <p className="mt-1 text-sm text-[#717171]">
        Digite um termo ou cole a URL de um vídeo e clique em Garimpar.
      </p>
    </div>
  )
}

function formatCompact(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toLocaleString('pt-BR')
}
