'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GemScoreBadge } from '@/components/garimpo/GemScore'
import { ChannelStatusBadge } from '@/components/biblioteca/ChannelStatusBadge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Library, RefreshCw, Loader2, Trash2, Search, Users, Eye } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { CanalStatus, GemScoreDetalhado, PotencialModelagem } from '@/types'
import {
  lerFiltrosBiblioteca,
  salvarFiltrosBiblioteca,
} from '@/lib/biblioteca-filtros-storage'

const BIB_SEARCH_MAX = 200

const BIB_STATUS_LABEL: Record<string, string> = {
  all: 'Todos os status',
  novo: 'Novo',
  analisando: 'Analisando',
  promissor: 'Promissor',
  pronto_raio_x: 'Mochila pronta',
  modelando: 'Modelando',
  descartado: 'Descartado',
}

const BIB_ORDER_LABEL: Record<string, string> = {
  criadoEm: 'Data adicionado',
  gemScore: 'Gem Score',
  inscritos: 'Inscritos',
  nome: 'Nome',
  totalViews: 'Views totais',
}

interface CanalListItem {
  id: string
  nome: string
  url: string
  youtubeId: string
  inscritos: number | null
  totalViews: number | null
  videosPublicados: number | null
  thumbnailUrl: string | null
  gemScore: number | null
  gemScoreDetalhado: string | null
  status: string
  nichoInferido: string | null
  criadoEm: string
  _count: { videos: number; projetos: number }
  potencialModelagem?: PotencialModelagem
}

export default function BibliotecaPage() {
  const [canais, setCanais] = useState<CanalListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [orderBy, setOrderBy] = useState<string>('criadoEm')
  const [searchQuery, setSearchQuery] = useState('')
  const [filtrosHydrated, setFiltrosHydrated] = useState(false)

  useEffect(() => {
    const s = lerFiltrosBiblioteca()
    setStatusFilter(s.statusFilter)
    setOrderBy(s.orderBy)
    setSearchQuery(s.searchQuery.slice(0, BIB_SEARCH_MAX))
    setFiltrosHydrated(true)
  }, [])

  useEffect(() => {
    if (!filtrosHydrated) return
    salvarFiltrosBiblioteca({
      statusFilter,
      orderBy,
      searchQuery: searchQuery.slice(0, BIB_SEARCH_MAX),
    })
  }, [filtrosHydrated, statusFilter, orderBy, searchQuery])

  const fetchCanais = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    params.set('orderBy', orderBy)
    params.set('orderDir', 'desc')

    const res = await fetch(`/api/canais?${params}`)
    const data = await res.json()
    setCanais(data)
    setLoading(false)
  }, [statusFilter, orderBy])

  useEffect(() => {
    if (!filtrosHydrated) return
    void fetchCanais()
  }, [filtrosHydrated, fetchCanais])

  async function handleDeleteChannel(id: string, nome: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Remover "${nome}" da biblioteca?`)) return
    try {
      const res = await fetch(`/api/canais/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`"${nome}" removido.`)
        setCanais((prev) => prev.filter((c) => c.id !== id))
      } else {
        toast.error('Erro ao remover canal.')
      }
    } catch {
      toast.error('Erro ao remover canal.')
    }
  }

  async function handleRefreshChannel(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setRefreshingId(id)
    try {
      const res = await fetch('/api/canais', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (data.error) toast.error(data.error)
      else {
        toast.success(`"${data.nome}" atualizado!`)
        fetchCanais()
      }
    } catch {
      toast.error('Erro ao atualizar canal.')
    } finally {
      setRefreshingId(null)
    }
  }

  const filteredCanais = canais.filter((canal) =>
    canal.nome.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const maxTotalViewsList = useMemo(() => {
    if (filteredCanais.length === 0) return 0
    return Math.max(0, ...filteredCanais.map((c) => c.totalViews ?? 0))
  }, [filteredCanais])

  return (
    <>
      <Header
        title="Biblioteca"
        description="Canais salvos e organizados para análise"
      />
      <PageWrapper>
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-10 min-h-10 flex-1 items-center gap-2 rounded-full border border-[#303030] bg-[#121212] px-4 transition-colors focus-within:border-[#717171]">
              <Search className="h-4 w-4 shrink-0 text-[#aaaaaa]" />
              <Input
                placeholder="Buscar canal…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 border-0 bg-transparent p-0 text-sm text-white placeholder:text-[#717171] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="h-10 min-h-10 w-full rounded-full border-[#303030] bg-[#212121] py-0 text-sm text-[#aaaaaa] sm:w-44">
                <SelectValue>
                  {(value) =>
                    BIB_STATUS_LABEL[String(value ?? '')] || String(value ?? '')
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="analisando">Analisando</SelectItem>
                <SelectItem value="promissor">Promissor</SelectItem>
                <SelectItem value="pronto_raio_x">Mochila pronta</SelectItem>
                <SelectItem value="modelando">Modelando</SelectItem>
                <SelectItem value="descartado">Descartado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={orderBy} onValueChange={(v) => v && setOrderBy(v)}>
              <SelectTrigger className="h-10 min-h-10 w-full rounded-full border-[#303030] bg-[#212121] py-0 text-sm text-[#aaaaaa] sm:w-44">
                <SelectValue>
                  {(value) =>
                    BIB_ORDER_LABEL[String(value ?? '')] || String(value ?? '')
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="criadoEm">Data adicionado</SelectItem>
                <SelectItem value="gemScore">Gem Score</SelectItem>
                <SelectItem value="totalViews">Views totais</SelectItem>
                <SelectItem value="inscritos">Inscritos</SelectItem>
                <SelectItem value="nome">Nome</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!loading && canais.length > 0 && (
            <p className="text-sm text-[#aaaaaa]">
              <span className="font-semibold text-white">{filteredCanais.length}</span>{' '}
              {filteredCanais.length === 1 ? 'canal' : 'canais'}
            </p>
          )}

          {loading ? (
            <ChannelSkeletons />
          ) : canais.length === 0 ? (
            <EmptyLibrary />
          ) : filteredCanais.length === 0 ? (
            <EmptySearch />
          ) : (
            <div className="space-y-2">
              {filteredCanais.map((canal) => {
                let gemScoreData: GemScoreDetalhado | null = null
                if (canal.gemScoreDetalhado) {
                  try {
                    const parsed = JSON.parse(canal.gemScoreDetalhado)
                    if (
                      parsed?.total != null &&
                      parsed?.classificacao &&
                      (parsed?.breakdown || parsed?.sinais)
                    ) {
                      gemScoreData = parsed
                    }
                  } catch {
                    // invalid
                  }
                }
                const isRefreshing = refreshingId === canal.id
                const totalV = canal.totalViews ?? 0
                const viewsBarPct =
                  maxTotalViewsList > 0
                    ? Math.min(
                        100,
                        Math.round((totalV / maxTotalViewsList) * 1000) / 10
                      )
                    : 0
                const viewsBarTitle =
                  maxTotalViewsList > 0
                    ? `Views totais do canal: ${formatNum(totalV)} (${viewsBarPct.toFixed(0)}% face ao maior desta listagem: ${formatNum(maxTotalViewsList)})`
                    : totalV > 0
                      ? `Views totais: ${formatNum(totalV)}`
                      : 'Views totais não disponíveis'

                return (
                  <div
                    key={canal.id}
                    className="group flex items-center gap-4 rounded-xl border border-[#272727] bg-[#181818] p-4 transition-colors hover:border-[#3f3f3f] hover:bg-[#212121]"
                  >
                    <Link
                      href={`/biblioteca/${canal.id}`}
                      className="flex min-w-0 flex-1 items-center gap-4"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#272727] ring-2 ring-[#0f0f0f]">
                        {canal.thumbnailUrl ? (
                          <img
                            src={`/api/canais/${canal.id}/avatar`}
                            alt={canal.nome}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-bold text-[#aaaaaa]">
                            {canal.nome.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-white group-hover:text-primary">
                            {canal.nome}
                          </h3>
                          <ChannelStatusBadge status={canal.status as CanalStatus} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#717171]">
                          {canal.inscritos != null && canal.inscritos > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {formatNum(canal.inscritos)}
                            </span>
                          )}
                          {canal.totalViews != null && canal.totalViews > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {formatNum(canal.totalViews)} views
                            </span>
                          )}
                          {canal.videosPublicados != null &&
                            canal.videosPublicados > 0 && (
                              <span>
                                {formatNum(canal.videosPublicados)} vídeos no
                                canal
                              </span>
                            )}
                        </div>
                        <div
                          className="h-0.5 w-full overflow-hidden rounded-sm bg-gp-bg4"
                          title={viewsBarTitle}
                        >
                          <div
                            className="h-full min-w-0 rounded-sm bg-gp-gold/50 transition-[width] duration-300"
                            style={{ width: `${viewsBarPct}%` }}
                          />
                        </div>
                      </div>
                    </Link>

                    <div className="flex shrink-0 items-center gap-3">
                      {gemScoreData && <GemScoreBadge score={gemScoreData} size="md" />}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleRefreshChannel(canal.id, e)}
                          disabled={isRefreshing}
                          className="rounded-full p-2 text-[#717171] transition-colors hover:bg-[#272727] hover:text-white disabled:opacity-40"
                          title="Atualizar dados"
                        >
                          {isRefreshing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) => handleDeleteChannel(canal.id, canal.nome, e)}
                          className="rounded-full p-2 text-[#717171] transition-colors hover:bg-red-500/15 hover:text-red-400"
                          title="Remover canal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}

function ChannelSkeletons() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-[#272727] bg-[#181818] p-4">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full bg-[#272727]" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3 rounded bg-[#272727]" />
            <Skeleton className="h-3 w-1/2 rounded bg-[#272727]" />
            <Skeleton className="h-1 w-full rounded-full bg-[#272727]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#272727] bg-[#181818] py-24 text-center">
      <Library className="mb-4 h-12 w-12 text-[#3f3f3f]" />
      <p className="text-base font-semibold text-white">Sua Biblioteca está vazia</p>
      <p className="mt-1 text-sm text-[#717171]">
        Use o Garimpo para encontrar e salvar canais promissores.
      </p>
    </div>
  )
}

function EmptySearch() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#272727] bg-[#181818] py-24 text-center">
      <Search className="mb-4 h-12 w-12 text-[#3f3f3f]" />
      <p className="text-base font-semibold text-white">Nenhum canal encontrado</p>
      <p className="mt-1 text-sm text-[#717171]">Tente buscar por outro termo.</p>
    </div>
  )
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}
