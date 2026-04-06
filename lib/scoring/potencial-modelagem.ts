export interface PotencialModelagem {
  mvv: number | null
  icv: number | null
  icvPercent: number | null
  vg: number | null
  ageMonths: number | null
  mpmBruto: number | null
  mpmMultiplicativo: number | null
  /** Medida de Potencial de Modelagem — índice 0–100 (tipo “gema”). */
  mpmIndice: number | null
  frequenciaOk: boolean | null
  icvAlto: boolean | null
  canalJovem: boolean | null
  sinais: string[]
}

function parseDataCriacao(
  value: Date | string | null | undefined
): Date | null {
  if (value == null) return null
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

function idadeCanalEmMeses(dataCriacao: Date): number {
  const now = new Date()
  let months =
    (now.getFullYear() - dataCriacao.getFullYear()) * 12 +
    (now.getMonth() - dataCriacao.getMonth())
  if (now.getDate() < dataCriacao.getDate()) months -= 1
  return Math.max(1, months)
}

function videosParaMvv(
  videosPublicados: number | null | undefined,
  videosSalvosCount?: number
): number | null {
  const pub = videosPublicados ?? 0
  const saved = videosSalvosCount ?? 0
  if (pub > 0) return pub
  if (saved > 0) return saved
  return null
}

export function frequenciaSatisfazModelagem(
  frequenciaPostagem: string | null | undefined
): boolean | null {
  if (!frequenciaPostagem || frequenciaPostagem === 'Dados insuficientes') {
    return null
  }
  const f = frequenciaPostagem.toLowerCase()
  if (f.includes('vídeo/dia') || f.includes('video/dia')) return true
  if (f.includes('/semana')) return true
  if (f.includes('2 vídeos/mês') || f.includes('2 videos/mes')) return true
  if (f.includes('~1 vídeo/mês') || f.includes('1 video/mes')) return false
  const m = f.match(/a cada\s*(\d+)\s*dias/)
  if (m) return Number(m[1]) <= 15
  return null
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function normLog(x: number, logMax: number): number {
  if (x <= 0) return 0
  return clamp((Math.log10(x + 1) / logMax) * 100, 0, 100)
}

function buildSinais(p: {
  mvv: number | null
  icvPercent: number | null
  vg: number | null
  ageMonths: number | null
  inscritos: number
  subsOk: boolean
}): string[] {
  const out: string[] = []
  const { mvv, icvPercent, vg, ageMonths, inscritos, subsOk } = p

  if (
    subsOk &&
    mvv != null &&
    mvv > 20_000 &&
    inscritos > 0 &&
    inscritos < 100_000
  ) {
    out.push('MVV alta com base ainda pequena — possível canal em descoberta.')
  }
  if (
    icvPercent != null &&
    icvPercent >= 2 &&
    ageMonths != null &&
    ageMonths <= 24
  ) {
    out.push('ICV alto e canal jovem — nicho com audiência fiel (bom para modelar).')
  }
  if (vg != null && ageMonths != null && vg > 50_000 && ageMonths <= 18) {
    out.push('VG alta em pouco tempo — tração orgânica forte.')
  }
  if (mvv != null && icvPercent != null && mvv > 30_000 && icvPercent < 1) {
    out.push('MVV alta com ICV baixo — alcance amplo, pouca conversão em inscritos.')
  }
  return out
}

export function calcularPotencialModelagem(input: {
  inscritos: number | null | undefined
  totalViews: number | null | undefined
  videosPublicados?: number | null | undefined
  dataCriacaoCanal?: Date | string | null | undefined
  frequenciaPostagem?: string | null | undefined
  videosSalvosCount?: number
}): PotencialModelagem {
  const subs = Math.max(0, input.inscritos ?? 0)
  const tv = Math.max(0, input.totalViews ?? 0)
  const nVideos = videosParaMvv(input.videosPublicados, input.videosSalvosCount)
  const created = parseDataCriacao(input.dataCriacaoCanal ?? null)

  const mvv = tv > 0 && nVideos != null && nVideos > 0 ? tv / nVideos : null
  const icv = tv > 0 && subs > 0 ? subs / tv : null
  const icvPercent = icv != null ? icv * 100 : null
  const ageMonths = created ? idadeCanalEmMeses(created) : null
  const vg = tv > 0 && ageMonths != null ? tv / ageMonths : null

  let mpmBruto: number | null = null
  if (mvv != null && icvPercent != null && vg != null) {
    mpmBruto = mvv * 0.5 + icvPercent * 1000 + vg * 0.3
  }

  let mpmMultiplicativo: number | null = null
  if (mvv != null && icv != null && ageMonths != null && icv > 0) {
    mpmMultiplicativo = (mvv * icv * 100) / Math.sqrt(ageMonths)
  }

  let mpmIndice: number | null = null
  if (mvv != null && icvPercent != null && vg != null) {
    const sMvv = normLog(mvv, 6)
    const sIcv = clamp((icvPercent / 6) * 100, 0, 100)
    const sVg = normLog(vg, 6.5)
    mpmIndice = Math.round(sMvv * 0.35 + sIcv * 0.35 + sVg * 0.3)
  }

  const frequenciaOk = frequenciaSatisfazModelagem(
    input.frequenciaPostagem ?? null
  )
  const icvAlto = icvPercent != null ? icvPercent >= 2 : null
  const canalJovem = ageMonths != null ? ageMonths < 24 : null

  const sinais = buildSinais({
    mvv,
    icvPercent,
    vg,
    ageMonths,
    inscritos: subs,
    subsOk: subs > 0,
  })

  return {
    mvv,
    icv,
    icvPercent,
    vg,
    ageMonths,
    mpmBruto,
    mpmMultiplicativo,
    mpmIndice,
    frequenciaOk,
    icvAlto,
    canalJovem,
    sinais,
  }
}
