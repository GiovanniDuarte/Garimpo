'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GemScoreBadge } from '@/components/garimpo/GemScore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, BookmarkPlus, Loader2, Crosshair } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [results, setResults] = useState<VideoGarimpo[]>([])
  const [continuation, setContinuation] = useState<string | null>(null)
  const [seedVideoId, setSeedVideoId] = useState<string | null>(null)
  const [referenceChannelId, setReferenceChannelId] = useState<string | null>(
    null
  )
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    const saved = lerFiltrosGarimpo()
    if (saved) {
      setMinViews(
        clamp(saved.minViews, MIN_VIEWS_SLIDER, MAX_MIN_VIEWS_SLIDER)
      )
      setMaxInscritos(
        clamp(saved.maxInscritos, MIN_INSCRITOS_SLIDER, MAX_INSCRITOS_SLIDER)
      )
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
      if (data.referenceChannelId != null) {
        setReferenceChannelId(data.referenceChannelId)
      }
      if (items.length === 0) {
        toast.message('Nenhum resultado novo com esses filtros.')
      }
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
        description="Filtros no estilo da sua pesquisa. Por URL de vídeo, a lista mostra só sugestões de outros canais — nada do canal da referência."
      />
      <PageWrapper>
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card p-6 shadow-2xl sm:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
            <div className="relative z-10 mx-auto max-w-3xl space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Encontre sua próxima ideia
                </h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Palavras-chave ou URL de vídeo/canal — os filtros abaixo valem
                  para toda consulta.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:rounded-xl sm:border sm:border-white/10 sm:bg-background/50 sm:p-2 sm:shadow-inner sm:backdrop-blur-md sm:focus-within:ring-1 sm:focus-within:ring-primary/50">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-background/50 p-2 shadow-inner backdrop-blur-md sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
                  <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground sm:ml-3" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Ex: faceless finance ou cole a URL do vídeo…"
                    className="border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
                  />
                </div>
                <Button
                  size="lg"
                  className="w-full shrink-0 rounded-lg shadow-lg sm:w-auto"
                  onClick={handleSearch}
                  disabled={loading || loadingMore}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Garimpar'
                  )}
                </Button>
              </div>

              <div className="border-t border-white/10 pt-6">
                <p className="mb-4 text-sm font-semibold text-foreground">
                  Filtros da consulta
                </p>
                <div className="grid gap-10 sm:grid-cols-3">
                  <div className="min-h-[4.5rem] py-1">
                    <p className="mb-3 text-xs text-muted-foreground">
                      Mín. views no vídeo:{' '}
                      {minViews.toLocaleString('pt-BR')}
                    </p>
                    <Slider
                      value={[minViews]}
                      onValueChange={(v) =>
                        setMinViews(Array.isArray(v) ? v[0]! : v)
                      }
                      min={MIN_VIEWS_SLIDER}
                      max={MAX_MIN_VIEWS_SLIDER}
                      step={STEP_MIN_VIEWS}
                    />
                  </div>
                  <div className="min-h-[4.5rem] py-1">
                    <p className="mb-3 text-xs text-muted-foreground">
                      Máx. inscritos do canal:{' '}
                      {formatCompact(maxInscritos)}
                    </p>
                    <Slider
                      value={[maxInscritos]}
                      onValueChange={(v) =>
                        setMaxInscritos(Array.isArray(v) ? v[0]! : v)
                      }
                      min={MIN_INSCRITOS_SLIDER}
                      max={MAX_INSCRITOS_SLIDER}
                      step={STEP_INSCRITOS}
                    />
                  </div>
                  <div className="min-h-[4.5rem] py-1">
                    <p className="mb-3 text-xs text-muted-foreground">
                      Recência (busca por texto): últimos{' '}
                      <span className="font-medium text-foreground">
                        {dias}
                      </span>{' '}
                      dias
                    </p>
                    <Slider
                      value={[dias]}
                      onValueChange={(v) =>
                        setDias(Array.isArray(v) ? v[0]! : v)
                      }
                      min={DIAS_MIN}
                      max={DIAS_MAX}
                      step={DIAS_STEP}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold">Resultados</h3>

          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded-2xl border border-white/5 bg-card/40 p-4"
                >
                  <Skeleton className="h-28 w-48 shrink-0 rounded-xl" />
                  <div className="flex flex-1 flex-col justify-center space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((video) => {
                const busy = savingId === video.youtubeId
                return (
                  <div
                    key={video.youtubeId}
                    className="group flex flex-col gap-4 rounded-2xl border border-white/5 bg-card/60 p-4 shadow-sm backdrop-blur-md transition-all hover:border-primary/20 hover:bg-card hover:shadow-md sm:flex-row"
                  >
                    <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-56">
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-2 text-lg font-semibold tracking-tight transition-colors hover:text-primary"
                      >
                        {video.titulo}
                      </a>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                        {video.canal.nome}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground/80">
                        <span className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-2.5 py-0.5 font-medium text-foreground">
                          {formatCompact(video.views)} views
                        </span>
                        <span className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-2.5 py-0.5 font-medium text-foreground">
                          {formatCompact(video.canal.inscritos)} inscritos
                        </span>
                        {video.canal.totalViews != null &&
                          video.canal.totalViews > 0 && (
                            <span className="text-xs">
                              {formatCompact(video.canal.totalViews)} views
                              totais
                            </span>
                          )}
                      </div>
                    </div>
                    <div className="flex flex-col flex-wrap shrink-0 justify-center items-stretch gap-3 sm:items-end">
                      <GemScoreBadge score={video.gemScore} size="lg" />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-primary/25 hover:bg-primary/10 sm:w-auto"
                        onClick={() => setAsReference(video)}
                      >
                        <Crosshair className="h-4 w-4" />
                        <span className="ml-2 font-medium">Referência</span>
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => handleSave(video)}
                        className="mt-auto w-full sm:w-auto"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BookmarkPlus className="h-4 w-4" />
                        )}
                        <span className="ml-2 font-medium">Salvar canal</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
              {continuation ? (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="rounded-xl"
                    disabled={loadingMore}
                    onClick={handleLoadMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Carregando…
                      </>
                    ) : (
                      'Carregar mais'
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}

function formatCompact(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toLocaleString('pt-BR')
}
