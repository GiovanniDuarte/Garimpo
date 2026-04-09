'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, StarOff, Users, Eye, Video, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { PotencialModelagem } from '@/types'
import {
  categoriaFavoritoDoCanal,
  compararCategoriasFavorito,
  formatarRpmFaixa,
  iconeNichoPai,
  rpmFaixaNichoPai,
  slugGrupoFavorito,
} from '@/lib/nicho-presentacao'

interface CanalFav {
  id: string
  nome: string
  url: string
  youtubeId: string
  inscritos: number | null
  totalViews: number | null
  videosPublicados: number | null
  thumbnailUrl: string | null
  gemScore: number | null
  nichoInferido: string | null
  favorito: boolean
  _count: { videos: number; projetos: number }
  receitaMediaPorVideo?: number | null
  potencialModelagem?: PotencialModelagem
}

export default function FavoritosPage() {
  const [canais, setCanais] = useState<CanalFav[]>([])
  const [loading, setLoading] = useState(true)
  const [orderBy, setOrderBy] = useState<string>('gemScore')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  /** `null` = mostrar todos os nichos; senão só essa categoria. */
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null)

  const fetchFavoritos = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('favorito', 'true')
    params.set('orderBy', orderBy)
    params.set('orderDir', 'desc')
    const res = await fetch(`/api/canais?${params}`)
    const data = await res.json()
    setCanais(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [orderBy])

  useEffect(() => {
    void fetchFavoritos()
  }, [fetchFavoritos])

  const grupos = useMemo(() => {
    const map = new Map<string, CanalFav[]>()
    for (const c of canais) {
      const cat = categoriaFavoritoDoCanal(c.nichoInferido)
      const list = map.get(cat) ?? []
      list.push(c)
      map.set(cat, list)
    }
    const keys = [...map.keys()].sort(compararCategoriasFavorito)
    return keys.map((k) => ({
      categoria: k,
      slug: slugGrupoFavorito(k),
      canais: map.get(k) ?? [],
    }))
  }, [canais])

  const gruposVisiveis = useMemo(
    () =>
      filtroCategoria
        ? grupos.filter((g) => g.categoria === filtroCategoria)
        : grupos,
    [grupos, filtroCategoria]
  )

  async function toggleFavorito(canal: CanalFav) {
    setTogglingId(canal.id)
    try {
      const res = await fetch(`/api/canais/${canal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorito: false }),
      })
      if (!res.ok) {
        toast.error('Não foi possível atualizar.')
        return
      }
      setCanais((prev) => prev.filter((c) => c.id !== canal.id))
      toast.success(`«${canal.nome}» saiu dos favoritos`)
    } catch {
      toast.error('Erro de rede.')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <>
      <Header
        title="Favoritos"
        description="Pérolas da biblioteca — por nicho e RPM de referência"
      />
      <PageWrapper>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Select value={orderBy} onValueChange={(v) => v && setOrderBy(v)}>
              <SelectTrigger className="h-10 min-h-10 w-full rounded-full border-[#303030] bg-[#212121] py-0 text-sm text-[#aaaaaa] sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemScore">Ordenar: Gem Score</SelectItem>
                <SelectItem value="criadoEm">Ordenar: Data adicionado</SelectItem>
                <SelectItem value="receitaMediaPorVideo">Ordenar: Receita / vídeo</SelectItem>
                <SelectItem value="inscritos">Ordenar: Inscritos</SelectItem>
                <SelectItem value="totalViews">Ordenar: Views totais</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <FavoritosSkeleton />
          ) : canais.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#272727] bg-[#181818] py-24 text-center">
              <Star className="mb-4 h-12 w-12 text-[#3f3f3f]" />
              <p className="text-base font-semibold text-white">
                Nenhum favorito ainda
              </p>
              <p className="mt-1 max-w-sm text-sm text-[#717171]">
                Na Biblioteca, clique na estrela ao lado do canal para guardar as
                pérolas aqui. Elas aparecem agrupadas por nicho com a faixa típica
                de RPM.
              </p>
              <Link
                href="/biblioteca"
                className="mt-6 text-sm font-semibold text-gp-gold hover:underline"
              >
                Ir para a Biblioteca
              </Link>
            </div>
          ) : (
            <>
              <nav
                aria-label="Categorias de nicho"
                className="rounded-xl border border-[#272727] bg-[#181818] p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#717171]">
                    Nichos nesta coleção
                  </p>
                  {filtroCategoria && (
                    <button
                      type="button"
                      onClick={() => setFiltroCategoria(null)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#303030] bg-[#121212] px-2.5 py-1 text-[11px] text-[#aaaaaa] transition-colors hover:border-gp-gold/35 hover:text-gp-gold"
                    >
                      <X className="size-3" aria-hidden />
                      Ver todos
                    </button>
                  )}
                </div>
                <p className="mb-2 text-[11px] text-[#717171]">
                  Filtrar por nicho — clique outra vez no chip ou «Ver todos» para
                  voltar à visão completa.
                </p>
                <div className="flex flex-wrap gap-2">
                  {grupos.map(({ categoria, slug, canais: lista }) => {
                    const Icon = iconeNichoPai(categoria)
                    const faixa = rpmFaixaNichoPai(categoria)
                    const ativo = filtroCategoria === categoria
                    return (
                      <button
                        key={slug}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() =>
                          setFiltroCategoria((prev) =>
                            prev === categoria ? null : categoria
                          )
                        }
                        className={
                          ativo
                            ? 'inline-flex items-center gap-2 rounded-full border border-gp-gold/45 bg-gp-gold/10 px-3 py-1.5 text-left text-xs text-gp-gold shadow-sm ring-1 ring-inset ring-gp-gold/20'
                            : 'inline-flex items-center gap-2 rounded-full border border-[#303030] bg-[#121212] px-3 py-1.5 text-left text-xs text-[#e6e6e6] transition-colors hover:border-gp-gold/35 hover:text-gp-gold'
                        }
                      >
                        <Icon
                          className={
                            ativo
                              ? 'size-4 shrink-0 text-gp-gold'
                              : 'size-4 shrink-0 text-gp-gold/90'
                          }
                          aria-hidden
                        />
                        <span className="font-medium">{categoria}</span>
                        <span className={ativo ? 'text-gp-gold/60' : 'text-[#717171]'}>
                          ·
                        </span>
                        <span
                          className={
                            ativo
                              ? 'tabular-nums text-gp-gold/90'
                              : 'tabular-nums text-[#aaaaaa]'
                          }
                        >
                          {lista.length}{' '}
                          {lista.length === 1 ? 'canal' : 'canais'}
                        </span>
                        {faixa && (
                          <>
                            <span className={ativo ? 'text-gp-gold/60' : 'text-[#717171]'}>
                              ·
                            </span>
                            <span
                              className={
                                ativo
                                  ? 'tabular-nums text-gp-gold'
                                  : 'tabular-nums text-gp-gold/90'
                              }
                              title="Faixa típica de RPM (USD por 1 mil views) nos sub-nichos desta categoria"
                            >
                              RPM {formatarRpmFaixa(faixa)}
                            </span>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              </nav>

              <div className="space-y-8">
                {gruposVisiveis.map(({ categoria, slug, canais: lista }) => {
                  const Icon = iconeNichoPai(categoria)
                  const faixa = rpmFaixaNichoPai(categoria)
                  return (
                    <section
                      key={slug}
                      id={`fav-grupo-${slug}`}
                      className="scroll-mt-6"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[#272727] pb-2">
                        <Icon className="size-5 text-gp-gold" aria-hidden />
                        <h2 className="text-base font-semibold text-white">
                          {categoria}
                        </h2>
                        {faixa && (
                          <span
                            className="rounded-full bg-gp-gold/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-gp-gold"
                            title="RPM de referência do nicho (faixa nos sub-nichos)"
                          >
                            RPM {formatarRpmFaixa(faixa)}
                          </span>
                        )}
                      </div>
                      <ul className="flex flex-col gap-2">
                        {lista.map((canal) => (
                          <CanalFavoritoRow
                            key={canal.id}
                            canal={canal}
                            onRemove={() => void toggleFavorito(canal)}
                            removing={togglingId === canal.id}
                          />
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </PageWrapper>
    </>
  )
}

function CanalFavoritoRow({
  canal,
  onRemove,
  removing,
}: {
  canal: CanalFav
  onRemove: () => void
  removing: boolean
}) {
  return (
    <li className="group flex min-w-0 items-center gap-3 rounded-xl border border-[#272727] bg-[#181818] p-3 transition-colors hover:border-[#3f3f3f] sm:gap-4 sm:p-4">
      <Link
        href={`/biblioteca/${canal.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#272727] ring-2 ring-[#0f0f0f] sm:h-14 sm:w-14">
          {canal.thumbnailUrl ? (
            <img
              src={`/api/canais/${canal.id}/avatar`}
              alt={canal.nome}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-[#aaaaaa]">
              {canal.nome.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="truncate text-sm font-semibold text-white group-hover:text-primary">
            {canal.nome}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-none text-[#717171]">
            {canal.receitaMediaPorVideo != null &&
              canal.receitaMediaPorVideo > 0 && (
                <span
                  className="whitespace-nowrap rounded bg-gp-green/15 px-1.5 py-0.5 tabular-nums text-gp-green"
                  title="Estimativa de receita média por vídeo do canal (USD)"
                >
                  {formatUsdShort(canal.receitaMediaPorVideo)}/vídeo
                </span>
              )}
            {canal.inscritos != null && canal.inscritos > 0 && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
                <Users
                  className="size-[11px] shrink-0 stroke-[2.25]"
                  aria-hidden
                />
                {formatNum(canal.inscritos)}
              </span>
            )}
            {canal.totalViews != null && canal.totalViews > 0 && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
                <Eye
                  className="size-[11px] shrink-0 stroke-[2.25]"
                  aria-hidden
                />
                {formatNum(canal.totalViews)}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums"
              title="Vídeos públicos no canal (YouTube), quando disponível na base"
            >
              <Video
                className="size-[11px] shrink-0 stroke-[2.25]"
                aria-hidden
              />
              {canal.videosPublicados != null && canal.videosPublicados > 0
                ? formatNum(canal.videosPublicados)
                : 'sem dados'}
            </span>
          </div>
        </div>
      </Link>
      <div className="flex shrink-0 flex-col items-stretch gap-1 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onRemove()
          }}
          disabled={removing}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#303030] bg-[#121212] px-3 py-1.5 text-[11px] font-medium text-[#aaaaaa] transition-colors hover:border-red-500/35 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
          title="Remover dos favoritos"
        >
          {removing ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin" />
          ) : (
            <StarOff className="size-3.5 shrink-0" aria-hidden />
          )}
          <span className="hidden sm:inline">Remover dos favoritos</span>
          <span className="sm:hidden">Remover</span>
        </button>
      </div>
    </li>
  )
}

function FavoritosSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-xl bg-[#272727]" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-xl bg-[#272727]" />
        ))}
      </div>
    </div>
  )
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatUsdShort(n: number): string {
  if (n >= 1_000_000) return `US$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (n >= 1_000) return `US$ ${(n / 1_000).toFixed(1).replace('.', ',')} mil`
  return `US$ ${Math.round(n).toLocaleString('pt-BR')}`
}
