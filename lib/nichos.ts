/**
 * Taxonomia de nichos para classificação de canais e **estimativa indicativa de RPM**
 * (USD por 1k monetizações; valores de referência de mercado, não garantia).
 */

export interface SubNicho {
  nome: string
  /** Faixa típica de RPM monetizado (YouTube Ads + contexto do nicho). */
  rpmEstimado: { min: number; max: number }
  /** 1–10: potencial de viralização orgânica no nicho. */
  viralidade: number
  /** PT/EN (minúsculas); matching usa texto sem acentos. */
  palavrasChave: string[]
}

export interface Nicho {
  nome: string
  subNichos: SubNicho[]
}

export const NICHOS: Nicho[] = [
  {
    nome: 'Finanças & Investimentos',
    subNichos: [
      {
        nome: 'Day trade',
        rpmEstimado: { min: 18, max: 42 },
        viralidade: 6,
        palavrasChave: [
          'day trade',
          'daytrade',
          'swing trade',
          'b3',
          'ibovespa',
          'nasdaq',
          'forex',
          'opções',
          'options',
          'stock market',
          'ações',
          'dividendos',
          'dividends',
        ],
      },
      {
        nome: 'Renda passiva',
        rpmEstimado: { min: 14, max: 32 },
        viralidade: 5,
        palavrasChave: [
          'renda passiva',
          'passive income',
          'fire',
          'aposentadoria',
          'independência financeira',
          'financial freedom',
          'etf',
          'fundos imobiliários',
          'fiis',
        ],
      },
      {
        nome: 'Cripto',
        rpmEstimado: { min: 16, max: 38 },
        viralidade: 8,
        palavrasChave: [
          'bitcoin',
          'btc',
          'ethereum',
          'eth',
          'crypto',
          'cripto',
          'defi',
          'nft',
          'blockchain',
          'web3',
          'altcoin',
          'binance',
        ],
      },
      {
        nome: 'Economia & política monetária',
        rpmEstimado: { min: 12, max: 28 },
        viralidade: 7,
        palavrasChave: [
          'economia',
          'economy',
          'fed',
          'bce',
          'inflação',
          'inflation',
          'juros',
          'interest rate',
          'recessão',
          'gdp',
          'pib',
        ],
      },
    ],
  },
  {
    nome: 'Tecnologia',
    subNichos: [
      {
        nome: 'Reviews de gadgets',
        rpmEstimado: { min: 9, max: 24 },
        viralidade: 7,
        palavrasChave: [
          'review',
          'unboxing',
          'iphone',
          'samsung',
          'smartphone',
          'laptop',
          'gpu',
          'nvidia',
          'amd',
          'gadget',
          'smartwatch',
        ],
      },
      {
        nome: 'Programação',
        rpmEstimado: { min: 11, max: 26 },
        viralidade: 5,
        palavrasChave: [
          'programação',
          'programming',
          'coding',
          'developer',
          'javascript',
          'typescript',
          'python',
          'react',
          'next.js',
          'api',
          'github',
          'tutorial código',
        ],
      },
      {
        nome: 'IA & software',
        rpmEstimado: { min: 14, max: 30 },
        viralidade: 8,
        palavrasChave: [
          'inteligência artificial',
          'artificial intelligence',
          'chatgpt',
          'openai',
          'machine learning',
          'llm',
          'automation',
          'saas',
          'startup tech',
        ],
      },
    ],
  },
  {
    nome: 'Notícias & Geopolítica',
    subNichos: [
      {
        nome: 'Geopolítica & conflitos',
        rpmEstimado: { min: 3, max: 12 },
        viralidade: 9,
        palavrasChave: [
          'geopolítica',
          'geopolitics',
          'china',
          'taiwan',
          'ucrânia',
          'ukraine',
          'russia',
          'rússia',
          'nato',
          'pentagon',
          'military',
          'exército',
          'war',
          'guerra',
          'middle east',
          'oriente médio',
          'iran',
          'israel',
          'strait',
          'hormuz',
          'submarine',
          'fleet',
        ],
      },
      {
        nome: 'Notícias gerais & análise',
        rpmEstimado: { min: 2, max: 10 },
        viralidade: 8,
        palavrasChave: [
          'breaking',
          'notícias',
          'news',
          'headlines',
          'jornal',
          'atualidades',
          'world news',
          'política internacional',
          'election',
          'eleição',
        ],
      },
    ],
  },
  {
    nome: 'Negócios & Empreendedorismo',
    subNichos: [
      {
        nome: 'Empreendedorismo & cases',
        rpmEstimado: { min: 10, max: 28 },
        viralidade: 6,
        palavrasChave: [
          'empreendedor',
          'entrepreneur',
          'startup',
          'negócio',
          'business',
          'scale',
          'escalar',
          'ceo',
          'founder',
        ],
      },
      {
        nome: 'Marketing digital & growth',
        rpmEstimado: { min: 12, max: 30 },
        viralidade: 7,
        palavrasChave: [
          'marketing digital',
          'growth',
          'seo',
          'ads',
          'facebook ads',
          'google ads',
          'funil',
          'copywriting',
          'tráfego pago',
        ],
      },
    ],
  },
  {
    nome: 'Saúde & Bem-estar',
    subNichos: [
      {
        nome: 'Fitness',
        rpmEstimado: { min: 5, max: 16 },
        viralidade: 8,
        palavrasChave: [
          'fitness',
          'musculação',
          'academia',
          'gym',
          'workout',
          'treino',
          'hipertrofia',
          'crossfit',
        ],
      },
      {
        nome: 'Nutrição & dieta',
        rpmEstimado: { min: 6, max: 18 },
        viralidade: 7,
        palavrasChave: [
          'nutrição',
          'nutrition',
          'dieta',
          'diet',
          'emagrecer',
          'receita fit',
          'low carb',
          'keto',
        ],
      },
      {
        nome: 'Saúde mental & lifestyle',
        rpmEstimado: { min: 5, max: 14 },
        viralidade: 6,
        palavrasChave: [
          'saúde mental',
          'mental health',
          'ansiedade',
          'meditação',
          'mindfulness',
          'terapia',
          'produtividade',
        ],
      },
    ],
  },
  {
    nome: 'Educação',
    subNichos: [
      {
        nome: 'Ciência & exatas',
        rpmEstimado: { min: 8, max: 20 },
        viralidade: 5,
        palavrasChave: [
          'ciência',
          'science',
          'física',
          'physics',
          'química',
          'matemática',
          'engineering',
          'engenharia',
          'space',
          'espacial',
        ],
      },
      {
        nome: 'História & humanidades',
        rpmEstimado: { min: 4, max: 14 },
        viralidade: 6,
        palavrasChave: [
          'história',
          'history',
          'documentário',
          'documentary',
          'guerra mundial',
          'world war',
          'império',
          'ancient',
        ],
      },
      {
        nome: 'Idiomas',
        rpmEstimado: { min: 7, max: 18 },
        viralidade: 5,
        palavrasChave: [
          'inglês',
          'english',
          'espanhol',
          'spanish',
          'fluência',
          'learn language',
          'pronúncia',
        ],
      },
    ],
  },
  {
    nome: 'Entretenimento',
    subNichos: [
      {
        nome: 'Cultura pop & react',
        rpmEstimado: { min: 3, max: 12 },
        viralidade: 9,
        palavrasChave: [
          'react',
          'reação',
          'trailer',
          'filme',
          'movie',
          'série',
          'netflix',
          'celebridade',
          'pop culture',
        ],
      },
      {
        nome: 'Comédia & sketches',
        rpmEstimado: { min: 2, max: 9 },
        viralidade: 9,
        palavrasChave: [
          'comédia',
          'comedy',
          'humor',
          'stand up',
          'parody',
          'paródia',
        ],
      },
    ],
  },
  {
    nome: 'Gaming',
    subNichos: [
      {
        nome: 'Gameplay & Let’s play',
        rpmEstimado: { min: 2, max: 8 },
        viralidade: 8,
        palavrasChave: [
          'gameplay',
          'let’s play',
          'lets play',
          'walkthrough',
          'minecraft',
          'fortnite',
          'roblox',
          'gta',
        ],
      },
      {
        nome: 'Reviews & notícias de jogos',
        rpmEstimado: { min: 4, max: 14 },
        viralidade: 7,
        palavrasChave: [
          'game review',
          'review jogo',
          'steam',
          'playstation',
          'xbox',
          'nintendo',
          'esports',
          'e-sports',
        ],
      },
    ],
  },
  {
    nome: 'Automotivo',
    subNichos: [
      {
        nome: 'Carros & reviews',
        rpmEstimado: { min: 8, max: 22 },
        viralidade: 6,
        palavrasChave: [
          'carro',
          'car review',
          'automóvel',
          'suv',
          'ev',
          'elétrico',
          'tesla',
          'motor',
          'drift',
        ],
      },
    ],
  },
  {
    nome: 'Lifestyle & Família',
    subNichos: [
      {
        nome: 'Vlog & rotina',
        rpmEstimado: { min: 3, max: 11 },
        viralidade: 7,
        palavrasChave: [
          'vlog',
          'rotina',
          'morning routine',
          'dia na vida',
          'day in my life',
          'família',
          'family vlog',
        ],
      },
      {
        nome: 'Casa & organização',
        rpmEstimado: { min: 5, max: 15 },
        viralidade: 6,
        palavrasChave: [
          'organização',
          'minimalismo',
          'home decor',
          'decoração',
          'limpeza',
          'clean with me',
        ],
      },
    ],
  },
  {
    nome: 'DIY & Ofícios',
    subNichos: [
      {
        nome: 'Marcenaria & oficina',
        rpmEstimado: { min: 7, max: 18 },
        viralidade: 6,
        palavrasChave: [
          'diy',
          'woodworking',
          'marcenaria',
          'ferramenta',
          'workshop',
          'maker',
          '3d print',
        ],
      },
    ],
  },
  {
    nome: 'Esportes',
    subNichos: [
      {
        nome: 'Futebol & análise',
        rpmEstimado: { min: 3, max: 12 },
        viralidade: 8,
        palavrasChave: [
          'futebol',
          'football',
          'soccer',
          'champions',
          'brasileirão',
          'premier league',
          'gol',
          'highlights',
        ],
      },
      {
        nome: 'Outros esportes',
        rpmEstimado: { min: 3, max: 11 },
        viralidade: 7,
        palavrasChave: [
          'nba',
          'nfl',
          'ufc',
          'mma',
          'formula 1',
          'f1',
          'motogp',
          'olympics',
          'olimpíadas',
        ],
      },
    ],
  },
  {
    nome: 'True crime & Mistério',
    subNichos: [
      {
        nome: 'True crime',
        rpmEstimado: { min: 5, max: 16 },
        viralidade: 8,
        palavrasChave: [
          'true crime',
          'crime real',
          'investigação',
          'serial killer',
          'caso não resolvido',
          'unsolved',
          'homicídio',
        ],
      },
    ],
  },
]

/** Remove acentos para matching estável (PT/EN). */
export function normalizarParaMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function pontuarSubnicho(blob: string, sub: SubNicho): number {
  let score = 0
  for (const kw of sub.palavrasChave) {
    const k = normalizarParaMatch(kw)
    if (k.length < 2) continue
    if (!blob.includes(k)) continue
    const w = k.length >= 10 ? 4 : k.length >= 6 ? 3 : k.length >= 4 ? 2 : 1
    score += w
  }
  return score
}

const SCORE_MINIMO_DETECCAO = 2

export type AmostraNichoVideo = {
  titulo: string
  tags?: string[]
}

function pesoKeyword(kwNorm: string): number {
  if (kwNorm.length >= 12) return 5
  if (kwNorm.length >= 8) return 4
  if (kwNorm.length >= 5) return 3
  return 2
}

function pontuarSubnichoPorTopVideos(
  videos: AmostraNichoVideo[],
  sub: SubNicho
): number {
  if (videos.length === 0) return 0
  const kws = sub.palavrasChave
    .map((kw) => normalizarParaMatch(kw).trim())
    .filter((kw) => kw.length >= 2)
  if (kws.length === 0) return 0

  let score = 0
  for (const v of videos) {
    const titulo = normalizarParaMatch(v.titulo || '')
    const tagsNorm = (v.tags || [])
      .map((t) => normalizarParaMatch(t))
      .filter(Boolean)
    for (const kw of kws) {
      const base = pesoKeyword(kw)
      const hitTitulo = titulo.includes(kw)
      const hitTag = tagsNorm.some((t) => t === kw || t.includes(kw) || kw.includes(t))
      if (hitTitulo) score += base * 2
      if (hitTag) score += base * 3
    }
  }
  return score
}

/**
 * Classifica o canal pela descrição + títulos (amostra), com pontuação por keywords.
 */
export function detectarNicho(
  descricao: string,
  titulosVideos: string[]
): { nicho: string; subNicho: string } | null {
  const blob = normalizarParaMatch(`${descricao} ${titulosVideos.join(' ')}`)
  if (blob.length < 8) return null

  let melhor: { nicho: string; subNicho: string; score: number } | null = null

  for (const n of NICHOS) {
    for (const s of n.subNichos) {
      const score = pontuarSubnicho(blob, s)
      if (score < SCORE_MINIMO_DETECCAO) continue
      if (!melhor || score > melhor.score) {
        melhor = { nicho: n.nome, subNicho: s.nome, score }
      }
    }
  }

  return melhor ? { nicho: melhor.nicho, subNicho: melhor.subNicho } : null
}

/**
 * Classifica por títulos + tags dos vídeos mais vistos (ideal: top 5).
 * A descrição do canal é deliberadamente ignorada para reduzir ruído.
 */
export function detectarNichoTopVideos(
  videos: AmostraNichoVideo[]
): { nicho: string; subNicho: string } | null {
  if (!videos.length) return null
  const top = videos.slice(0, 5)
  let melhor: { nicho: string; subNicho: string; score: number } | null = null

  for (const n of NICHOS) {
    for (const s of n.subNichos) {
      const score = pontuarSubnichoPorTopVideos(top, s)
      if (score < SCORE_MINIMO_DETECCAO) continue
      if (!melhor || score > melhor.score) {
        melhor = { nicho: n.nome, subNicho: s.nome, score }
      }
    }
  }

  return melhor ? { nicho: melhor.nicho, subNicho: melhor.subNicho } : null
}

/**
 * Parse `"Nicho pai > Subnicho"` (formato guardado em `nichoInferido`) → RPM/viralidade.
 */
export function rpmENichoDoRotulo(
  rotulo: string | null | undefined
): { rpmMedio: number; viralidade: number } | null {
  if (!rotulo?.trim()) return null
  const idx = rotulo.indexOf('>')
  if (idx === -1) return null
  const parentNome = rotulo.slice(0, idx).trim()
  const subNome = rotulo.slice(idx + 1).trim()
  if (!parentNome || !subNome) return null

  const parent = NICHOS.find((n) => n.nome === parentNome)
  const sub = parent?.subNichos.find((s) => s.nome === subNome)
  if (!sub) return null

  return {
    rpmMedio: (sub.rpmEstimado.min + sub.rpmEstimado.max) / 2,
    viralidade: sub.viralidade,
  }
}

export function infoNichoDoRotulo(
  rotulo: string | null | undefined
): {
  rpmMin: number
  rpmMax: number
  rpmMedio: number
  viralidade: number
} | null {
  if (!rotulo?.trim()) return null
  const idx = rotulo.indexOf('>')
  if (idx === -1) return null
  const parentNome = rotulo.slice(0, idx).trim()
  const subNome = rotulo.slice(idx + 1).trim()
  if (!parentNome || !subNome) return null

  const parent = NICHOS.find((n) => n.nome === parentNome)
  const sub = parent?.subNichos.find((s) => s.nome === subNome)
  if (!sub) return null

  const rpmMin = sub.rpmEstimado.min
  const rpmMax = sub.rpmEstimado.max
  return {
    rpmMin,
    rpmMax,
    rpmMedio: (rpmMin + rpmMax) / 2,
    viralidade: sub.viralidade,
  }
}
