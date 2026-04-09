'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pickaxe,
  Loader2,
  Pause,
  Play,
  ExternalLink,
  Trash2,
  Library,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CacadaPassoProgress } from '@/lib/cacador/passo-progress-types'
import { resumoRegrasCapturaParaLog } from '@/lib/cacador/regras-captura'
import { urlPerfilCanalYoutube } from '@/lib/youtube-channel-url'

/** Pausa entre passos automáticos: aleatória dentro da faixa (evita cadência de bot). */
const AUTO_PASSO_MS_MIN = 10_000
const AUTO_PASSO_MS_MAX = 28_000

function proximaPausaEntrePassosMs(): number {
  return (
    AUTO_PASSO_MS_MIN +
    Math.floor(Math.random() * (AUTO_PASSO_MS_MAX - AUTO_PASSO_MS_MIN + 1))
  )
}

const AUTO_PASSO_LABEL_TXT = `${AUTO_PASSO_MS_MIN / 1000}–${AUTO_PASSO_MS_MAX / 1000} s`

type CanalMini = {
  id: string
  nome: string
  youtubeId: string
  url: string
  gemScore: number | null
  favorito: boolean | null
  tags: string | null
  thumbnailUrl: string | null
}

type Descoberta = {
  id: string
  gemScore: number
  videoOrigemId: string | null
  canal: CanalMini
}

type CacadaRow = {
  id: string
  videoReferenciaId: string
  minGem: number
  exigirGem?: boolean
  exigirFiltroMetricas?: boolean
  capturaMinViews?: number
  capturaMaxInscritos?: number | null
  capturaMinVideosCanal?: number
  capturaMaxVideosCanal?: number | null
  capturaCombinacao?: string
  status: string
  /** Acumulado de vídeos analisados (Gem) em todos os passos desta corrida. */
  videosAnalisadosTotal?: number
  ultimoLog: string | null
  criadoEm: string
  descobertas: Descoberta[]
}

function regrasResumoFromRow(c: CacadaRow): string {
  return resumoRegrasCapturaParaLog({
    exigirGem: c.exigirGem !== false,
    exigirFiltroMetricas: c.exigirFiltroMetricas === true,
    minGem: c.minGem,
    capturaMinViews: c.capturaMinViews ?? 0,
    capturaMaxInscritos: c.capturaMaxInscritos ?? null,
    capturaMinVideosCanal: c.capturaMinVideosCanal ?? 0,
    capturaMaxVideosCanal: c.capturaMaxVideosCanal ?? null,
    capturaCombinacao: c.capturaCombinacao ?? 'E',
  })
}

type UltimoPassoStats = {
  fimDaPrateleira: boolean
}

type PassoProgUi = {
  fase: 'idle' | 'relacionados' | 'enriquecimento' | 'gravacao' | 'concluido'
  detalhe: string
  /** Vídeos nesta resposta da prateleira YouTube (~paginação). */
  prateleiraTotal: number
  enrichDone: number
  enrichTotal: number
  gravInd: number
  gravTotal: number
  ultimoCanal: string
  ultimoVideoId: string
  linhasPorSegundo: number
  tempoSeg: number
}

const initialPassoProg: PassoProgUi = {
  fase: 'idle',
  detalhe: '',
  prateleiraTotal: 0,
  enrichDone: 0,
  enrichTotal: 0,
  gravInd: 0,
  gravTotal: 0,
  ultimoCanal: '',
  ultimoVideoId: '',
  linhasPorSegundo: 0,
  tempoSeg: 0,
}

function progressBarPct(p: PassoProgUi): number {
  if (p.fase === 'idle') return 0
  if (p.fase === 'concluido') return 100
  if (p.fase === 'relacionados') return 7
  if (p.fase === 'enriquecimento' && p.enrichTotal > 0) {
    return 10 + Math.round(72 * (p.enrichDone / p.enrichTotal))
  }
  if (p.fase === 'gravacao' && p.gravTotal > 0) {
    return 82 + Math.round(16 * (p.gravInd / p.gravTotal))
  }
  if (p.fase === 'gravacao') return 90
  return 40
}

function applyPassoProgress(
  prev: PassoProgUi,
  ev: CacadaPassoProgress,
  elapsedSeg: number
): PassoProgUi {
  if (ev.kind === 'fase') {
    return {
      ...prev,
      fase: ev.fase,
      detalhe: ev.detalhe ?? '',
    }
  }
  if (ev.kind === 'prateleira') {
    return { ...prev, prateleiraTotal: ev.total }
  }
  if (ev.kind === 'enriquecimento_total') {
    return { ...prev, enrichTotal: ev.total, enrichDone: 0 }
  }
  if (ev.kind === 'linha') {
    const vel = elapsedSeg > 0.05 ? ev.done / elapsedSeg : 0
    return {
      ...prev,
      fase: 'enriquecimento',
      enrichDone: ev.done,
      enrichTotal: ev.total,
      ultimoCanal: ev.canalNome,
      ultimoVideoId: ev.videoId,
      linhasPorSegundo: vel,
      tempoSeg: elapsedSeg,
    }
  }
  if (ev.kind === 'captura') {
    return {
      ...prev,
      fase: 'gravacao',
      gravInd: ev.indice,
      gravTotal: ev.total,
      ultimoCanal: ev.nome,
      tempoSeg: elapsedSeg,
    }
  }
  return prev
}

type PresetMineiro = 'perola' | 'garimpo' | 'sniper' | 'micro'

function aplicarPresetMineiro(
  id: PresetMineiro,
  setters: {
    setMinGem: (v: string) => void
    setExigirGem: (v: boolean) => void
    setExigirFiltro: (v: boolean) => void
    setCapturaMinViewsStr: (v: string) => void
    setCapturaMaxInscritosStr: (v: string) => void
    setCapturaMinVideosCanalStr: (v: string) => void
    setCapturaMaxVideosCanalStr: (v: string) => void
    setCapturaCombinacao: (v: 'E' | 'OU') => void
  }
) {
  switch (id) {
    case 'perola':
      setters.setMinGem('75')
      setters.setExigirGem(true)
      setters.setExigirFiltro(true)
      setters.setCapturaMinViewsStr('10000')
      setters.setCapturaMaxInscritosStr('5000')
      setters.setCapturaMinVideosCanalStr('')
      setters.setCapturaMaxVideosCanalStr('')
      setters.setCapturaCombinacao('E')
      break
    case 'garimpo':
      setters.setMinGem('70')
      setters.setExigirGem(true)
      setters.setExigirFiltro(true)
      setters.setCapturaMinViewsStr('15000')
      setters.setCapturaMaxInscritosStr('1000')
      setters.setCapturaMinVideosCanalStr('')
      setters.setCapturaMaxVideosCanalStr('')
      setters.setCapturaCombinacao('E')
      break
    case 'sniper':
      setters.setMinGem('82')
      setters.setExigirGem(true)
      setters.setExigirFiltro(false)
      setters.setCapturaMinViewsStr('')
      setters.setCapturaMaxInscritosStr('')
      setters.setCapturaMinVideosCanalStr('')
      setters.setCapturaMaxVideosCanalStr('')
      setters.setCapturaCombinacao('E')
      break
    case 'micro':
      setters.setMinGem('68')
      setters.setExigirGem(true)
      setters.setExigirFiltro(true)
      setters.setCapturaMinViewsStr('5000')
      setters.setCapturaMaxInscritosStr('3000')
      setters.setCapturaMinVideosCanalStr('')
      setters.setCapturaMaxVideosCanalStr('800')
      setters.setCapturaCombinacao('E')
      break
    default:
      break
  }
}

export default function MineiradorPage() {
  const [sessions, setSessions] = useState<CacadaRow[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [videoUrl, setVideoUrl] = useState('')
  const [minGem, setMinGem] = useState('70')
  const [exigirGem, setExigirGem] = useState(true)
  const [exigirFiltro, setExigirFiltro] = useState(false)
  const [capturaMinViewsStr, setCapturaMinViewsStr] = useState('')
  const [capturaMaxInscritosStr, setCapturaMaxInscritosStr] = useState('')
  const [capturaMinVideosCanalStr, setCapturaMinVideosCanalStr] = useState('')
  const [capturaMaxVideosCanalStr, setCapturaMaxVideosCanalStr] = useState('')
  const [capturaCombinacao, setCapturaCombinacao] = useState<'E' | 'OU'>('E')
  const [mainTab, setMainTab] = useState<'minerao' | 'historico'>('minerao')
  const [creating, setCreating] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<CacadaRow | null>(null)
  const [runAuto, setRunAuto] = useState(false)
  const [stepBusy, setStepBusy] = useState(false)
  const [ultimoPassoStats, setUltimoPassoStats] = useState<UltimoPassoStats | null>(
    null
  )
  const [passoProg, setPassoProg] = useState<PassoProgUi>(initialPassoProg)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const passoT0Ref = useRef<number>(0)
  const [, setPassoTick] = useState(0)

  const loadList = useCallback(async () => {
    try {
      const res = await fetch('/api/cacador')
      const text = await res.text()
      let data: unknown = []
      if (text) {
        try {
          data = JSON.parse(text) as unknown
        } catch {
          data = []
        }
      }
      setSessions(Array.isArray(data) ? data : [])
      if (!res.ok) {
        toast.error('Não foi possível carregar as minerações. Reinicie o servidor após rodar prisma generate.')
      }
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    setUltimoPassoStats(null)
    setPassoProg(initialPassoProg)
  }, [activeId])

  useEffect(() => {
    if (!stepBusy) return
    const id = setInterval(() => setPassoTick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [stepBusy])

  const loadOne = useCallback(async (id: string) => {
    const res = await fetch(`/api/cacador/${id}`)
    if (!res.ok) return
    const row = (await res.json()) as CacadaRow
    setActiveSession(row)
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...row, descobertas: row.descobertas } : s))
    )
  }, [])

  async function createSession() {
    const url = videoUrl.trim()
    if (!url) {
      toast.error('Cole o URL do vídeo de referência.')
      return
    }
    if (!exigirGem && !exigirFiltro) {
      toast.error('Ativa Gem mínimo ou filtro de métricas (ou os dois).')
      return
    }
    const minV =
      capturaMinViewsStr.trim() === ''
        ? 0
        : Math.max(0, Math.floor(Number(capturaMinViewsStr) || 0))
    let maxS: number | null = null
    if (capturaMaxInscritosStr.trim() !== '') {
      const n = Math.floor(Number(capturaMaxInscritosStr) || 0)
      if (n > 0) maxS = n
    }
    const minVid =
      capturaMinVideosCanalStr.trim() === ''
        ? 0
        : Math.max(0, Math.floor(Number(capturaMinVideosCanalStr) || 0))
    let maxVid: number | null = null
    if (capturaMaxVideosCanalStr.trim() !== '') {
      const nv = Math.floor(Number(capturaMaxVideosCanalStr) || 0)
      if (nv > 0) maxVid = nv
    }
    setCreating(true)
    try {
      const res = await fetch('/api/cacador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: url,
          minGem: Number(minGem) || 70,
          exigirGem,
          exigirFiltroMetricas: exigirFiltro,
          capturaMinViews: minV,
          capturaMaxInscritos: maxS,
          capturaMinVideosCanal: minVid,
          capturaMaxVideosCanal: maxVid,
          capturaCombinacao,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro ao criar.')
        return
      }
      toast.success(
        'Corrida criada. Usa Auto (pausa aleatória entre passos) ou «Um passo» — o lote prioriza Gem alto e canais com menos inscritos.'
      )
      setVideoUrl('')
      setActiveId(data.id)
      setActiveSession(data as CacadaRow)
      await loadList()
    } catch {
      toast.error('Erro de rede.')
    } finally {
      setCreating(false)
    }
  }

  async function setStatus(id: string, status: 'ativa' | 'pausada') {
    if (status === 'pausada') setRunAuto(false)
    await fetch(`/api/cacador/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await loadOne(id)
    await loadList()
  }

  const deleteCacada = useCallback(
    async (id: string, label?: string) => {
      const hint = label ?? id
      if (
        !window.confirm(
          `Eliminar esta corrida (${hint})?\n\nOs canais na biblioteca não são apagados — só o registo desta mineração e as ligações às descobertas.`
        )
      ) {
        return
      }
      setDeletingId(id)
      try {
        const res = await fetch(`/api/cacador/${id}`, { method: 'DELETE' })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          toast.error(
            typeof data.error === 'string' ? data.error : 'Não foi possível eliminar.'
          )
          return
        }
        toast.success('Corrida eliminada.')
        if (activeId === id) {
          setActiveId(null)
          setActiveSession(null)
          setRunAuto(false)
          setUltimoPassoStats(null)
          setPassoProg(initialPassoProg)
        }
        setSessions((prev) => prev.filter((s) => s.id !== id))
      } catch {
        toast.error('Erro de rede.')
      } finally {
        setDeletingId(null)
      }
    },
    [activeId]
  )

  const runStep = useCallback(
    async (id: string) => {
      let passoCompletou = false
      setStepBusy(true)
      setPassoProg({
        ...initialPassoProg,
        fase: 'relacionados',
        detalhe: 'A ligar ao passo…',
      })
      passoT0Ref.current = Date.now()
      const t0 = passoT0Ref.current
      try {
        const res = await fetch(`/api/cacador/${id}/step`, { method: 'POST' })
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => '')
          toast.error(
            text ? `Passo falhou (${res.status}).` : `Passo falhou (${res.status}).`
          )
          setRunAuto(false)
          return
        }
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        let finalPayload: Record<string, unknown> | null = null
        let failError: string | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.trim()) continue
            let msg: {
              type?: string
              ev?: CacadaPassoProgress
              result?: Record<string, unknown>
              error?: string
            }
            try {
              msg = JSON.parse(line) as typeof msg
            } catch {
              continue
            }
            const elapsedSeg = (Date.now() - t0) / 1000
            if (msg.type === 'progress' && msg.ev) {
              setPassoProg((prev) => applyPassoProgress(prev, msg.ev!, elapsedSeg))
            } else if (msg.type === 'done' && msg.result) {
              finalPayload = msg.result
            } else if (msg.type === 'fail') {
              failError =
                typeof msg.error === 'string' ? msg.error : 'Passo falhou.'
            }
          }
        }

        if (failError) {
          toast.error(failError)
          setRunAuto(false)
          return
        }
        if (finalPayload) {
          const data = finalPayload
          passoCompletou = true
          if (typeof data.fimDaPrateleira !== 'undefined') {
            setUltimoPassoStats({
              fimDaPrateleira: Boolean(data.fimDaPrateleira),
            })
          }
          if (typeof data.mensagem === 'string') {
            toast.message(data.mensagem)
          }
        }
        await loadOne(id)
        await loadList()
      } catch {
        toast.error('Erro de rede no passo.')
        setRunAuto(false)
      } finally {
        setStepBusy(false)
        if (passoCompletou) {
          setPassoProg((prev) => ({
            ...prev,
            fase: 'concluido',
            detalhe: runAuto
              ? `Aguardando próximo passo (pausa aleatória ~${AUTO_PASSO_LABEL_TXT}).`
              : 'Passo concluído. Podes correr outro quando quiseres.',
          }))
        } else {
          setPassoProg(initialPassoProg)
        }
      }
    },
    [loadOne, loadList, runAuto]
  )

  useEffect(() => {
    if (!activeId || !runAuto) {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    let cancelled = false

    const agendaProximo = (delayMs: number) => {
      if (cancelled || !activeId || !runAuto) return
      timerRef.current = setTimeout(() => {
        if (cancelled) return
        void (async () => {
          if (cancelled) return
          await runStep(activeId)
          if (cancelled) return
          agendaProximo(proximaPausaEntrePassosMs())
        })()
      }, delayMs)
    }

    agendaProximo(proximaPausaEntrePassosMs())

    return () => {
      cancelled = true
      if (timerRef.current != null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [activeId, runAuto, runStep])

  useEffect(() => {
    if (activeId) void loadOne(activeId)
  }, [activeId, loadOne])

  const sess = activeSession

  return (
    <>
      <Header
        title="Mineração"
        description="Relacionados do vídeo de referência → Gem honesto por linha → biblioteca com tag mineirador. No automático, pausa aleatória entre passos (~10–28 s) para parecer navegação humana e reduzir risco de bloqueio."
      />
      <PageWrapper>
        <Tabs
          value={mainTab}
          onValueChange={(v) => {
            if (v === 'minerao' || v === 'historico') setMainTab(v)
          }}
          className="space-y-4"
        >
          <TabsList
            variant="line"
            className="h-10 w-full max-w-xl justify-start gap-1 rounded-lg border border-[#272727] bg-[#181818] p-1"
          >
            <TabsTrigger
              value="minerao"
              className="gap-1.5 rounded-md px-3 py-1.5 text-[#aaaaaa] data-active:bg-[#272727] data-active:text-white"
            >
              <Pickaxe className="size-3.5" />
              Mineração
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="gap-1.5 rounded-md px-3 py-1.5 text-[#aaaaaa] data-active:bg-[#272727] data-active:text-white"
            >
              <History className="size-3.5" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="minerao" className="space-y-6 outline-none">
            <p className="text-sm leading-relaxed text-[#aaaaaa]">
              Cada passo varre uma página de sugestões e calcula Gem com dados reais do vídeo + canal.
              Combina <span className="text-white">limiar de Gem</span> com{' '}
              <span className="text-white">
                filtros de views, inscritos e vídeos no canal
              </span>{' '}
              (E ou OU). O nº de vídeos vem do mesmo dado já usado no Gem — sem pedido extra. Os lotes são
              ordenados a favor de <span className="text-white">Gem alto</span> e{' '}
              <span className="text-white">canal mais pequeno</span> no empate — onde costuma estar o
              upside. Capturas na{' '}
              <Link href="/biblioteca" className="text-gp-gold hover:underline">
                biblioteca
              </Link>{' '}
              com perfil YouTube estável e tag <span className="text-gp-gold">mineirador</span>.
            </p>

            <div className="rounded-xl border border-[#303030] bg-[#141414] p-3">
              <p className="mb-2 text-xs font-medium text-[#aaaaaa]">
                Presets para pérolas (ajusta depois à mão)
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'perola' as const, label: 'Pérola', hint: 'Gem 75+ · 10k views · ≤5k subs' },
                    { id: 'garimpo' as const, label: 'Como Garimpo', hint: '70+ · 15k views · ≤1k subs' },
                    { id: 'sniper' as const, label: 'Sniper Gem', hint: '82+ · só Gem' },
                    {
                      id: 'micro' as const,
                      label: 'Micro-nicho',
                      hint: '68+ · 5k views · ≤3k subs · ≤800 vídeos no canal',
                    },
                  ] as const
                ).map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    title={p.hint}
                    className="border-[#3f3f3f] bg-[#121212] text-xs text-[#e0e0e0] hover:bg-[#1f1f1f]"
                    onClick={() => {
                      aplicarPresetMineiro(p.id, {
                        setMinGem,
                        setExigirGem,
                        setExigirFiltro,
                        setCapturaMinViewsStr,
                        setCapturaMaxInscritosStr,
                        setCapturaMinVideosCanalStr,
                        setCapturaMaxVideosCanalStr,
                        setCapturaCombinacao,
                      })
                      toast.message(`${p.label}: regras aplicadas. Confere antes de iniciar.`)
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#272727] bg-[#181818] p-4">
              <h2 className="mb-4 text-sm font-semibold text-white">Nova corrida</h2>
              <div className="space-y-4">
                <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-3">
                  <Label
                    className="shrink-0 whitespace-nowrap text-[11px] font-normal text-[#717171]"
                    title="Vídeo de referência (URL do YouTube ou ID de 11 caracteres)"
                  >
                    Vídeo (URL ou ID)
                  </Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=…"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="min-h-9 min-w-0 flex-1 border-[#303030] bg-[#121212] text-white"
                  />
                </div>

                <div className="w-full rounded-lg border border-[#303030] bg-[#121212] p-3">
                    <p className="mb-2.5 text-xs font-medium text-[#aaaaaa]">
                      Ao capturar um canal
                    </p>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm text-white sm:shrink-0">
                          <Checkbox
                            checked={exigirGem}
                            onCheckedChange={(v) => setExigirGem(v === true)}
                            className="shrink-0"
                          />
                          <span className="font-medium leading-tight">
                            Gem mín.
                            <span className="mt-0.5 hidden font-normal text-[#717171] sm:block sm:text-[10px]">
                              Limite por linha
                            </span>
                          </span>
                        </label>
                        {exigirGem ? (
                          <div className="flex min-w-0 flex-1 items-center gap-2 sm:justify-end">
                            <Label className="sr-only">Valor Gem</Label>
                            <Select value={minGem} onValueChange={(v) => v && setMinGem(v)}>
                              <SelectTrigger className="h-9 w-full border-[#303030] bg-[#181818] text-white sm:max-w-[7.5rem]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="60">≥ 60</SelectItem>
                                <SelectItem value="65">≥ 65</SelectItem>
                                <SelectItem value="70">≥ 70</SelectItem>
                                <SelectItem value="75">≥ 75</SelectItem>
                                <SelectItem value="80">≥ 80</SelectItem>
                                <SelectItem value="85">≥ 85</SelectItem>
                                <SelectItem value="90">≥ 90</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                      </div>

                      <div className="border-t border-[#272727] pt-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                          <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm text-white sm:pt-1 sm:shrink-0">
                            <Checkbox
                              checked={exigirFiltro}
                              onCheckedChange={(v) => setExigirFiltro(v === true)}
                              className="shrink-0"
                            />
                            <span className="font-medium leading-tight">
                              Métricas
                              <span className="mt-0.5 hidden font-normal text-[#717171] sm:block sm:text-[10px]">
                                Views · inscritos · vídeos no canal
                              </span>
                            </span>
                          </label>
                          {exigirFiltro ? (
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-[#717171]">
                                    Views mín.
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={capturaMinViewsStr}
                                    onChange={(e) =>
                                      setCapturaMinViewsStr(e.target.value)
                                    }
                                    className="h-9 border-[#303030] bg-[#181818] px-2 text-sm text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-[#717171]">
                                    Insc. máx.
                                  </Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    inputMode="numeric"
                                    placeholder="∞"
                                    value={capturaMaxInscritosStr}
                                    onChange={(e) =>
                                      setCapturaMaxInscritosStr(e.target.value)
                                    }
                                    className="h-9 border-[#303030] bg-[#181818] px-2 text-sm text-white"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-[#717171]">
                                    Víd. mín. (canal)
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    placeholder="0"
                                    title="Mínimo de vídeos públicos no canal (já obtido no passo Gem)"
                                    value={capturaMinVideosCanalStr}
                                    onChange={(e) =>
                                      setCapturaMinVideosCanalStr(e.target.value)
                                    }
                                    className="h-9 border-[#303030] bg-[#181818] px-2 text-sm text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-[#717171]">
                                    Víd. máx. (canal)
                                  </Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    inputMode="numeric"
                                    placeholder="∞"
                                    title="Teto de vídeos públicos no canal (micro-canais)"
                                    value={capturaMaxVideosCanalStr}
                                    onChange={(e) =>
                                      setCapturaMaxVideosCanalStr(e.target.value)
                                    }
                                    className="h-9 border-[#303030] bg-[#181818] px-2 text-sm text-white"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {exigirGem && exigirFiltro ? (
                        <div className="space-y-1 border-t border-[#272727] pt-3">
                          <Label className="text-[10px] text-[#717171]">
                            Combinar regras (Gem + métricas)
                          </Label>
                          <Select
                            value={capturaCombinacao}
                            onValueChange={(v) =>
                              v && setCapturaCombinacao(v as 'E' | 'OU')
                            }
                          >
                            <SelectTrigger className="h-9 border-[#303030] bg-[#181818] text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="E">
                                Ambas (E) — mais restritivo
                              </SelectItem>
                              <SelectItem value="OU">Qualquer uma (OU)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </div>
                </div>

                <Button
                  type="button"
                  onClick={() => void createSession()}
                  disabled={creating}
                  className="w-full sm:w-auto"
                >
                  {creating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Pickaxe className="mr-2 size-4" />
                      Iniciar corrida
                    </>
                  )}
                </Button>
              </div>
            </div>

            {sess ? (
            <div className="rounded-xl border border-gp-gold/25 bg-[#181818] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Corrida ativa</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#303030]"
                    disabled={stepBusy}
                    onClick={() => void runStep(sess.id)}
                  >
                    {stepBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      'Um passo agora'
                    )}
                  </Button>
                  {sess.status === 'ativa' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      title={`Pausa aleatória entre passos (~${AUTO_PASSO_LABEL_TXT}) após cada passo concluir.`}
                      onClick={() => {
                        setRunAuto((r) => !r)
                        if (runAuto) toast.message('Automático pausado.')
                        else
                          toast.message(
                            `Automático: após cada passo, espera aleatória ~${AUTO_PASSO_LABEL_TXT} antes do próximo.`
                          )
                      }}
                    >
                      {runAuto ? (
                        <>
                          <Pause className="mr-1 size-4" /> Parar auto
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 size-4" /> Auto
                        </>
                      )}
                    </Button>
                  ) : null}
                  {sess.status === 'ativa' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void setStatus(sess.id, 'pausada')}
                    >
                      Pausar corrida
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void setStatus(sess.id, 'ativa')}
                    >
                      Retomar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={stepBusy || deletingId === sess.id}
                    onClick={() => void deleteCacada(sess.id, sess.videoReferenciaId)}
                  >
                    {deletingId === sess.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="mr-1 size-3.5" />
                        Eliminar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {stepBusy || passoProg.fase !== 'idle' ? (
                <div className="mb-4 rounded-lg border border-[#272727] bg-[#121212] p-4">
                  {(() => {
                    const liveSeg =
                      stepBusy && passoT0Ref.current > 0
                        ? (Date.now() - passoT0Ref.current) / 1000
                        : passoProg.tempoSeg
                    const { enrichDone: evDone, enrichTotal: evTotal } = passoProg
                    const prat = passoProg.prateleiraTotal
                    const excluidosPrePipeline =
                      prat > 0 && evTotal > 0 && prat > evTotal ? prat - evTotal : 0
                    const pctAval =
                      evTotal > 0
                        ? Math.min(100, Math.round((evDone / evTotal) * 100))
                        : null
                    const vel =
                      liveSeg > 0.05 && evTotal > 0
                        ? evDone / liveSeg
                        : passoProg.linhasPorSegundo
                    const faseLabel =
                      passoProg.fase === 'relacionados'
                        ? 'Relacionados'
                        : passoProg.fase === 'enriquecimento'
                          ? 'Gem'
                          : passoProg.fase === 'gravacao'
                            ? 'Gravação'
                            : passoProg.fase === 'concluido'
                              ? 'Concluído'
                              : '…'
                    const loteGemCompleto =
                      passoProg.fase === 'concluido' ||
                      (evTotal > 0 &&
                        evDone >= evTotal &&
                        passoProg.fase !== 'idle')

                    return (
                      <>
                        <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-[#717171]">
                              Vídeos avaliados neste passo
                            </p>
                            {prat > 0 ? (
                              <p className="mt-0.5 text-[11px] tabular-nums text-[#9a9a9a]">
                                Página do YouTube (relacionados):{' '}
                                <span className="font-medium text-[#cccccc]">{prat}</span>
                                {excluidosPrePipeline > 0 ? (
                                  <span className="text-[#717171]">
                                    {' '}
                                    · {excluidosPrePipeline} fora da pipeline (ex.: canal de
                                    referência)
                                  </span>
                                ) : null}
                              </p>
                            ) : null}
                            <div className="mt-1 flex flex-wrap items-baseline gap-2">
                              <span className="text-3xl font-bold tabular-nums tracking-tight text-gp-gold">
                                {evTotal > 0 || passoProg.fase !== 'relacionados'
                                  ? evDone
                                  : '0'}
                              </span>
                              <span className="text-xl tabular-nums text-[#717171]">
                                {evTotal > 0 ? (
                                  <>
                                    <span className="text-[#505050]">/</span> {evTotal}
                                  </>
                                ) : passoProg.fase === 'relacionados' ? (
                                  <span className="text-base font-normal text-[#505050]">
                                    / …
                                  </span>
                                ) : (
                                  <span className="text-base font-normal text-[#505050]">
                                    / 0
                                  </span>
                                )}
                              </span>
                              {loteGemCompleto ? (
                                <span className="text-xs font-medium text-emerald-500/90">
                                  {passoProg.fase === 'concluido'
                                    ? 'passo concluído'
                                    : 'cálculo Gem concluído'}
                                </span>
                              ) : null}
                              {evTotal > 0 && evDone < evTotal ? (
                                <span className="text-xs text-[#717171]">
                                  faltam {evTotal - evDone}
                                </span>
                              ) : null}
                            </div>
                            {pctAval != null ? (
                              <p className="mt-1 text-[11px] tabular-nums text-[#717171]">
                                {passoProg.fase === 'concluido'
                                  ? `${pctAval}% com Gem calculado neste passo`
                                  : `${pctAval}% com Gem calculado`}
                                {passoProg.fase === 'gravacao' && loteGemCompleto
                                  ? ' · a gravar capturas na biblioteca'
                                  : ''}
                              </p>
                            ) : (
                              <p className="mt-1 text-[11px] text-[#717171]">
                                {passoProg.fase === 'relacionados'
                                  ? prat > 0
                                    ? 'A preparar cálculo Gem para esta página…'
                                    : 'A definir quantos vídeos vêm na prateleira…'
                                  : '—'}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right text-[11px] leading-relaxed text-[#717171]">
                            <p className="font-medium text-[#aaaaaa]">{faseLabel}</p>
                            {passoProg.detalhe ? (
                              <p className="max-w-[14rem] truncate">{passoProg.detalhe}</p>
                            ) : null}
                            {passoProg.fase === 'concluido' ? (
                              <p className="tabular-nums text-[#aaaaaa]">
                                {passoProg.tempoSeg > 0.05
                                  ? `~${passoProg.tempoSeg.toFixed(1)} s neste passo`
                                  : '\u00a0'}
                              </p>
                            ) : evTotal > 0 &&
                              (passoProg.fase === 'enriquecimento' ||
                                (passoProg.fase === 'gravacao' && evDone > 0)) ? (
                              <p className="tabular-nums">
                                {vel.toFixed(2)} vídeos/s · {liveSeg.toFixed(1)} s
                              </p>
                            ) : (
                              <p className="tabular-nums">
                                {liveSeg > 0.05 ? `${liveSeg.toFixed(1)} s` : '\u00a0'}
                              </p>
                            )}
                            {passoProg.fase === 'gravacao' &&
                            passoProg.gravTotal > 0 ? (
                              <p className="tabular-nums text-[#aaaaaa]">
                                Capturas {passoProg.gravInd}/{passoProg.gravTotal}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <Progress
                          value={progressBarPct(passoProg)}
                          className="flex-col gap-1"
                        >
                          <ProgressTrack className="h-2.5 w-full overflow-hidden rounded-full bg-[#272727]">
                            <ProgressIndicator className="h-full rounded-full bg-gp-gold transition-[width] duration-300 ease-out" />
                          </ProgressTrack>
                        </Progress>
                        {(passoProg.ultimoCanal || passoProg.ultimoVideoId) &&
                        passoProg.fase !== 'concluido' ? (
                          <p className="mt-3 truncate text-[11px] text-[#717171]">
                            <span className="text-[#aaaaaa]">
                              {passoProg.fase === 'gravacao'
                                ? 'Última captura:'
                                : 'A avaliar agora:'}
                            </span>{' '}
                            <span className="text-white">
                              {passoProg.ultimoCanal || '—'}
                            </span>
                            {passoProg.ultimoVideoId ? (
                              <span className="font-mono text-[#717171]">
                                {' '}
                                · {passoProg.ultimoVideoId}
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                      </>
                    )
                  })()}
                </div>
              ) : null}

              <div className="mb-2 space-y-1 text-xs text-[#717171]">
                <p>
                  Vídeo ref:{' '}
                  <a
                    href={`https://www.youtube.com/watch?v=${sess.videoReferenciaId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gp-gold hover:underline"
                  >
                    {sess.videoReferenciaId}
                  </a>
                  {' · '}
                  Estado:{' '}
                  <span className="text-white">
                    {sess.status === 'ativa' ? 'ativa' : 'pausada'}
                  </span>
                </p>
                <p className="text-[11px] leading-snug text-[#9a9a9a]">
                  Regras de captura:{' '}
                  <span className="text-[#cccccc]">{regrasResumoFromRow(sess)}</span>
                </p>
              </div>
              {sess.ultimoLog && (
                <p className="mb-3 text-xs text-[#aaaaaa]">Último: {sess.ultimoLog}</p>
              )}
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[#272727] bg-[#121212] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-[#717171]">
                    Análises
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-white">
                    {sess.videosAnalisadosTotal ?? 0}
                  </p>
                  <p className="text-[10px] text-[#717171]">
                    nesta corrida (vídeos com Gem)
                  </p>
                </div>
                <div className="rounded-lg border border-[#272727] bg-[#121212] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-[#717171]">
                    Capturados
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-gp-gold">
                    {sess.descobertas.length}
                  </p>
                  <p className="text-[10px] text-[#717171]">nesta corrida (biblioteca)</p>
                </div>
              </div>
              {ultimoPassoStats?.fimDaPrateleira ? (
                <p className="mb-4 text-[11px] text-[#717171]">
                  Fim da prateleira de relacionados (ou página vazia).
                </p>
              ) : null}
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#717171]">
                Capturados nesta corrida
              </h3>
              {sess.descobertas.length === 0 ? (
                <p className="text-sm text-[#717171]">
                  Ainda nenhuma captura com as regras desta corrida.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sess.descobertas.map((d) => {
                    const perfilHref = urlPerfilCanalYoutube(
                      d.canal.youtubeId,
                      d.canal.url
                    )
                    return (
                      <li
                        key={d.id}
                        className="rounded-lg border border-[#272727] bg-[#121212] px-3 py-2"
                      >
                        <div className="flex gap-3">
                          <Pickaxe
                            className="mt-0.5 size-4 shrink-0 text-gp-gold"
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/biblioteca/${d.canal.id}`}
                                className="truncate font-medium text-gp-gold hover:underline"
                              >
                                {d.canal.nome}
                              </Link>
                              <span
                                className="shrink-0 rounded border border-gp-gold/30 bg-gp-gold/10 px-1.5 py-px text-[10px] font-medium text-gp-gold"
                                title="Guardado na biblioteca pelo mineirador"
                              >
                                mineirador
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-[#717171]">
                              Gem {d.gemScore.toFixed(0)}
                              {d.videoOrigemId
                                ? ` · vídeo ${d.videoOrigemId}`
                                : null}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                              <Link
                                href={`/biblioteca/${d.canal.id}`}
                                className="inline-flex items-center gap-1 text-[#aaaaaa] hover:text-white"
                              >
                                <Library className="size-3" />
                                Biblioteca
                              </Link>
                              <a
                                href={perfilHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#aaaaaa] hover:text-white"
                              >
                                Perfil YouTube
                                <ExternalLink className="size-3" />
                              </a>
                              {d.videoOrigemId ? (
                                <a
                                  href={`https://www.youtube.com/watch?v=${d.videoOrigemId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[#717171] hover:text-white"
                                >
                                  Vídeo de origem
                                  <ExternalLink className="size-3" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            ) : null}
          </TabsContent>

          <TabsContent value="historico" className="space-y-4 outline-none">
            <p className="text-sm text-[#717171]">
              Abre uma corrida para ver progresso e capturas no separador Mineração.
            </p>
            <div className="rounded-xl border border-[#272727] bg-[#181818] p-4">
              <h2 className="mb-3 text-sm font-semibold text-white">Corridas anteriores</h2>
              {loadingList ? (
                <p className="text-sm text-[#717171]">A carregar…</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-[#717171]">Nenhuma corrida ainda.</p>
              ) : (
                <ul className="max-h-[min(60vh,32rem)] space-y-2 overflow-y-auto pr-1">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMainTab('minerao')
                          setActiveId(s.id)
                          setActiveSession(s)
                          void loadOne(s.id)
                        }}
                        className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          activeId === s.id
                            ? 'border-gp-gold/40 bg-gp-gold/10 text-white'
                            : 'border-[#272727] bg-[#121212] text-[#aaaaaa] hover:border-[#3f3f3f]'
                        }`}
                      >
                        <span className="font-mono text-xs text-[#717171]">
                          {s.videoReferenciaId}
                        </span>
                        <span className="mt-1 block truncate text-[10px] text-[#717171]">
                          {regrasResumoFromRow(s)}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[#9a9a9a]">
                          {s.descobertas?.length ?? 0} capturado
                          {(s.descobertas?.length ?? 0) === 1 ? '' : 's'} · {s.status}
                        </span>
                      </button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="destructive"
                        className="shrink-0 self-stretch rounded-lg"
                        title="Eliminar corrida"
                        disabled={
                          deletingId === s.id || (activeId === s.id && stepBusy)
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          void deleteCacada(s.id, s.videoReferenciaId)
                        }}
                      >
                        {deletingId === s.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </PageWrapper>
    </>
  )
}
