'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
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
  Globe2,
  Link2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { viewsTotaisBarInnerStyle } from '@/lib/views-totais-bar'
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
  /** youtubeId do canal → id na biblioteca (quando já salvo) */
  const [savedChannelMap, setSavedChannelMap] = useState<Record<string, string>>({})

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

  useEffect(() => {
    if (results.length === 0) return
    const ids = [
      ...new Set(results.map((r) => r.canal.youtubeId).filter(Boolean)),
    ]
    let cancelled = false
    void fetch('/api/canais/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeIds: ids }),
    })
      .then((r) => r.json())
      .then((data: { map?: Record<string, string> }) => {
        if (cancelled || !data.map) return
        setSavedChannelMap((prev) => ({ ...prev, ...data.map }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [results])

  function sortByGem(videos: VideoGarimpo[]) {
    return [...videos].sort((a, b) => b.gemScore.total - a.gemScore.total)
  }

  const maxCanalViewsInList = useMemo(() => {
    if (results.length === 0) return 0
    return Math.max(0, ...results.map((r) => r.canal.totalViews ?? 0))
  }, [results])

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
      else {
        if (data.id && video.canal.youtubeId) {
          setSavedChannelMap((prev) => ({
            ...prev,
            [video.canal.youtubeId]: data.id as string,
          }))
        }
        toast.success(`Canal "${data.nome}" salvo na biblioteca.`)
      }
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
            <div className="flex items-stretch gap-2">
              {/* Search input */}
              <div className="flex h-10 min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#303030] bg-[#121212] px-4 shadow-inner transition-colors focus-within:border-[#717171]">
                <Search className="h-4 w-4 shrink-0 text-[#aaaaaa]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Palavras-chave ou URL do vídeo…"
                  className="h-9 min-h-0 border-0 bg-transparent p-0 text-sm text-white placeholder:text-[#717171] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Search button */}
              <Button
                size="default"
                className="h-10 min-h-10 shrink-0 rounded-full px-5 font-semibold shadow-sm"
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
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="flex h-10 min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#303030] bg-[#212121] px-4 text-sm font-medium text-[#aaaaaa] transition-colors hover:border-[#717171] hover:text-white"
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
                  const canalYt = video.canal.youtubeId
                  const bibliotecaId = canalYt
                    ? savedChannelMap[canalYt]
                    : undefined
                  return (
                    <VideoCard
                      key={video.youtubeId}
                      video={video}
                      busy={busy}
                      saved={Boolean(bibliotecaId)}
                      bibliotecaId={bibliotecaId}
                      maxCanalViewsInList={maxCanalViewsInList}
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

/** Botões Referência / Salvar / Perfil — mais baixos que a pílula Gem. */
const garimpoActionBtn =
  'flex h-7 w-full min-w-0 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-semibold leading-none transition-colors'

/** Altura da linha no desktop = thumbnail 16:9 em w-44 (11rem). */
const garimpoRowSmH = 'sm:h-[calc(11rem*9/16)]'

function VideoCard({
  video,
  busy,
  saved,
  bibliotecaId,
  maxCanalViewsInList,
  onSave,
  onSetReference,
}: {
  video: VideoGarimpo
  busy: boolean
  saved: boolean
  bibliotecaId?: string
  maxCanalViewsInList: number
  onSave: (v: VideoGarimpo) => void
  onSetReference: (v: VideoGarimpo) => void
}) {
  const totalCanalViews = video.canal.totalViews ?? 0
  const viewsBarPct =
    maxCanalViewsInList > 0
      ? Math.min(
          100,
          Math.round((totalCanalViews / maxCanalViewsInList) * 1000) / 10
        )
      : 0
  const viewsBarTitle =
    maxCanalViewsInList > 0
      ? `Views totais do canal: ${formatCompact(totalCanalViews)} (${viewsBarPct.toFixed(0)}% do maior desta listagem: ${formatCompact(maxCanalViewsInList)})`
      : totalCanalViews > 0
        ? `Views totais do canal: ${formatCompact(totalCanalViews)}`
        : 'Views totais do canal não disponíveis para comparar nesta listagem'

  return (
    <div
      className={cn(
        'group rounded-xl border bg-[#181818] p-2 transition-colors sm:p-2',
        saved
          ? 'border-emerald-500/25 hover:border-emerald-500/35'
          : 'border-[#272727] hover:border-[#3f3f3f] hover:bg-[#1c1c1c]'
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3',
          garimpoRowSmH
        )}
      >
        {/* Thumbnail — no desktop define a altura da linha */}
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative aspect-video w-full shrink-0 overflow-hidden rounded-md sm:aspect-auto sm:h-full sm:w-44 sm:min-h-0"
        >
          <img
            src={video.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </a>

        {/* Centro: compacto para caber na altura da thumbnail */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden sm:py-0">
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-2 text-xs font-semibold leading-tight text-white hover:text-primary sm:line-clamp-1 sm:text-[13px]"
          >
            {video.titulo}
          </a>

          <a
            href={video.canal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-1 w-fit text-[11px] font-medium text-[#aaaaaa] hover:text-white"
          >
            {video.canal.nome}
          </a>

          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0 text-[10px] text-[#717171] sm:text-[11px]">
            <span className="inline-flex items-center gap-0.5 tabular-nums">
              <Eye className="h-3 w-3 shrink-0 opacity-80" />
              {formatCompact(video.views)} views
            </span>
            <span className="inline-flex items-center gap-0.5 tabular-nums">
              <Users className="h-3 w-3 shrink-0 opacity-80" />
              {formatCompact(video.canal.inscritos)} inscritos
            </span>
            {video.canal.totalViews != null && video.canal.totalViews > 0 && (
              <span className="inline-flex min-w-0 items-center gap-0.5 truncate tabular-nums">
                <Globe2 className="h-3 w-3 shrink-0 opacity-80" />
                {formatCompact(video.canal.totalViews)} views totais
              </span>
            )}
          </div>

          <div className="mt-0.5 h-1 w-full max-w-md overflow-hidden rounded-full bg-[#272727]">
            <div
              className="h-full min-w-0 rounded-full transition-[width] duration-300"
              style={viewsTotaisBarInnerStyle(viewsBarPct)}
              title={viewsBarTitle}
            />
          </div>
        </div>

        {/* Direita: pílula Gem baixa + ações (link no lugar de «Salvo») */}
        <div className="flex w-full shrink-0 flex-col justify-center gap-1.5 border-t border-[#272727]/80 pt-2 sm:w-[10.25rem] sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
          <div
            className="w-full min-w-0"
            title="Gem Score (a barra ao lado = views totais do canal, cor conforme o volume)"
          >
            <GemScoreBadge
              score={video.gemScore}
              size="xs"
              fullWidth
            />
          </div>

          <div className="flex w-full flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onSetReference(video)}
              title="Usar como referência na próxima busca"
              className={cn(
                garimpoActionBtn,
                'cursor-pointer border-[#303030] bg-[#212121] text-[#cccccc] hover:border-[#717171] hover:text-white'
              )}
            >
              <Crosshair className="h-3 w-3 shrink-0" />
              Referência
            </button>

            {saved && bibliotecaId ? (
              <Link
                href={`/biblioteca/${bibliotecaId}`}
                className={cn(
                  garimpoActionBtn,
                  'cursor-pointer border-[#303030] bg-[#212121] text-[#cccccc] hover:border-[#717171] hover:text-white'
                )}
                title="Abrir ficha do canal na biblioteca"
              >
                <Link2 className="h-3 w-3 shrink-0" />
                Perfil Canal
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => onSave(video)}
                disabled={busy}
                className={cn(
                  garimpoActionBtn,
                  'cursor-pointer border-transparent bg-primary text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {busy ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                ) : (
                  <BookmarkPlus className="h-3 w-3 shrink-0" />
                )}
                Salvar canal
              </button>
            )}
          </div>
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
          className="rounded-xl border border-[#272727] bg-[#181818] p-2"
        >
          <div className="flex flex-col gap-2 sm:h-[calc(11rem*9/16)] sm:flex-row sm:items-stretch sm:gap-3">
            <Skeleton className="aspect-video w-full shrink-0 rounded-md sm:aspect-auto sm:h-full sm:w-44 bg-[#272727]" />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1 sm:overflow-hidden">
              <Skeleton className="h-3.5 w-full max-w-xl rounded bg-[#272727]" />
              <Skeleton className="h-3 w-40 rounded bg-[#272727]" />
              <Skeleton className="h-3 w-56 rounded bg-[#272727]" />
              <Skeleton className="mt-0.5 h-1 w-full max-w-md rounded-full bg-[#272727]" />
            </div>
            <div className="flex w-full shrink-0 flex-col justify-center gap-1.5 border-t border-[#272727]/80 pt-2 sm:w-[10.25rem] sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
              <Skeleton className="h-9 w-full rounded-full bg-[#272727]" />
              <Skeleton className="h-7 w-full rounded-full bg-[#272727]" />
              <Skeleton className="h-7 w-full rounded-full bg-[#272727]" />
            </div>
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
