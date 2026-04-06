'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GemScoreBadge } from '@/components/garimpo/GemScore'
import { ChannelStatusBadge } from '@/components/biblioteca/ChannelStatusBadge'
import { IpmBadge } from '@/components/biblioteca/PotencialModelagemPanel'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Library, RefreshCw, Loader2, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { CanalStatus, GemScoreDetalhado, PotencialModelagem } from '@/types'

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
  frequenciaPostagem: string | null
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

  useEffect(() => {
    fetchCanais()
  }, [statusFilter, orderBy])

  async function fetchCanais() {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    params.set('orderBy', orderBy)
    params.set('orderDir', 'desc')

    const res = await fetch(`/api/canais?${params}`)
    const data = await res.json()
    setCanais(data)
    setLoading(false)
  }

  async function handleDeleteChannel(
    id: string,
    nome: string,
    e: React.MouseEvent
  ) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Remover "${nome}" da biblioteca?`)) return
    try {
      await fetch(`/api/canais/${id}`, { method: 'DELETE' })
      toast.success(`"${nome}" removido.`)
      setCanais((prev) => prev.filter((c) => c.id !== id))
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

  const filteredCanais = canais.filter(canal => 
    canal.nome.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <Header
        title="Biblioteca"
        description="Canais salvos e organizados para análise"
      />
      <PageWrapper>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-end gap-4 bg-card/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
            
            <div className="space-y-1.5 flex-1 min-w-[200px] w-full">
              <label className="text-xs font-medium text-muted-foreground ml-1">Buscar na Biblioteca</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Nome do canal..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full bg-card/60 backdrop-blur-sm border-white/5 shadow-sm rounded-xl h-10" 
                />
              </div>
            </div>

            <div className="space-y-1.5 flex-1 sm:max-w-[220px] min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground ml-1">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(v) => v && setStatusFilter(v)}
              >
                <SelectTrigger className="w-full bg-card/60 backdrop-blur-sm border-white/5 shadow-sm rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="analisando">Analisando</SelectItem>
                  <SelectItem value="promissor">Promissor</SelectItem>
                  <SelectItem value="pronto_raio_x">Raio-X Pronto</SelectItem>
                  <SelectItem value="modelando">Modelando</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex-1 sm:max-w-[220px] min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground ml-1">
                Ordenar por
              </label>
              <Select
                value={orderBy}
                onValueChange={(v) => v && setOrderBy(v)}
              >
                <SelectTrigger className="w-full bg-card/60 backdrop-blur-sm border-white/5 shadow-sm rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="criadoEm">Data adicionado</SelectItem>
                  <SelectItem value="gemScore">Gem Score</SelectItem>
                  <SelectItem value="inscritos">Inscritos</SelectItem>
                  <SelectItem value="nome">Nome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl bg-card/40 border border-white/5" />
              ))}
            </div>
          ) : canais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 rounded-3xl border border-white/5">
              <Library className="mb-4 h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">Sua Biblioteca está vazia</p>
              <p className="text-sm">Use o Garimpo para encontrar e salvar canais promissores.</p>
            </div>
          ) : filteredCanais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 rounded-3xl border border-white/5">
              <Search className="mb-4 h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">Nenhum canal encontrado</p>
              <p className="text-sm">Tente buscar por outro termo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCanais.map((canal) => {
                let gemScoreData: GemScoreDetalhado | null = null
                if (canal.gemScoreDetalhado) {
                  try {
                    const parsed = JSON.parse(canal.gemScoreDetalhado)
                    if (
                      parsed?.total != null &&
                      parsed?.breakdown &&
                      parsed?.classificacao
                    ) {
                      gemScoreData = parsed
                    }
                  } catch {
                    // invalid
                  }
                }
                const isRefreshing = refreshingId === canal.id

                return (
                  <Link
                    key={canal.id}
                    href={`/biblioteca/${canal.id}`}
                    className="group flex flex-col sm:flex-row items-start sm:items-center gap-5 rounded-2xl border border-white/5 bg-card/60 p-5 transition-all duration-300 hover:bg-card hover:shadow-lg hover:border-primary/30 hover:scale-[1.01]"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary/80 ring-2 ring-background group-hover:ring-primary/20 transition-all shadow-inner">
                      {canal.thumbnailUrl ? (
                        <img
                          src={`/api/canais/${canal.id}/avatar`}
                          alt={canal.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-muted-foreground">
                          {canal.nome.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="truncate text-lg font-bold tracking-tight group-hover:text-primary transition-colors">{canal.nome}</h3>
                        <ChannelStatusBadge
                          status={canal.status as CanalStatus}
                        />
                        {canal.potencialModelagem && (
                          <IpmBadge potencial={canal.potencialModelagem} />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-muted-foreground/80">
                        {canal.inscritos != null && canal.inscritos > 0 && (
                          <span className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-2.5 py-0.5 text-foreground/90">
                            {formatNum(canal.inscritos)} inscritos
                          </span>
                        )}
                        {canal.totalViews != null && canal.totalViews > 0 && (
                          <span
                            className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-2.5 py-0.5 text-foreground/90"
                            title="Views totais do canal"
                          >
                            {formatNum(canal.totalViews)} views (canal)
                          </span>
                        )}
                        {canal.frequenciaPostagem && (
                          <span className="text-xs uppercase tracking-wider">{canal.frequenciaPostagem}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:ml-4">
                      {gemScoreData && (
                        <GemScoreBadge score={gemScoreData} size="md" />
                      )}
                      <div className="flex gap-1 ml-auto sm:ml-0">
                        <button
                          onClick={(e) => handleRefreshChannel(canal.id, e)}
                          disabled={isRefreshing}
                          className="rounded-xl p-2 text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-primary disabled:opacity-50"
                          title="Atualizar dados"
                        >
                          {isRefreshing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={(e) =>
                            handleDeleteChannel(canal.id, canal.nome, e)
                          }
                          className="rounded-xl p-2 text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                          title="Remover canal"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}
