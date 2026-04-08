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
          'old money',
          'wealth',
          'net worth',
          'ultra rich',
          'wealth building',
          'wealth explained',
          'financial markets',
          'finance',
          'financial',
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
          'wall street',
          'ponzi',
          'money laundering',
          'launder',
          'billionaire',
          'corrupt',
          'crypto fraud',
          'markets',
          'financial system',
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
          'special ops',
          'special operations',
          'special forces',
          'forças especiais',
          'forcas especiais',
          'navy seals',
          'navy seal',
          'green berets',
          'green beret',
          'commando',
          'delta force',
          'paratrooper',
          'airborne',
          'sergeant',
          'soldier',
          'veteran',
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
          'salud mental',
          'mental health',
          'psicologia',
          'psychology',
          'psicoterapia',
          'psychotherapy',
          'terapia cognitiva',
          'behavioral psychology',
          'comportamento humano',
          'comportamiento humano',
          'human behavior',
          'inteligência emocional',
          'inteligencia emocional',
          'emotional intelligence',
          'relacionamentos',
          'relaciones',
          'relationships',
          'desenvolvimento pessoal',
          'desarrollo personal',
          'autodesarrollo',
          'ansiedade',
          'ansiedad',
          'anxiety',
          'meditação',
          'meditación',
          'mindfulness',
          'terapia',
          'autoestima',
          'autoconfiança',
          'patrones mentales',
          'padrões mentais',
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
          'tsunami',
          'terremoto',
          'earthquake',
          'desastre natural',
          'catastrofe',
          'catastrophe',
          'chernobyl',
          'titanic',
          'torres gemeas',
          'great fire',
          'incendio de londres',
          'colapso',
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
          'vs',
          'battle',
          'showdown',
          'monster',
          'beast',
          'predator',
          'king kong',
          'megalodon',
          'giant shark',
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
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/**
 * Fallback quando só há a categoria oficial do vídeo no YouTube (player API).
 * Rótulos em inglês (ID ou texto).
 */
export function nichoAPartirCategoriaYoutube(
  categoria: string | null | undefined
): { nicho: string; subNicho: string } | null {
  const c = normalizarParaMatch(categoria || '').trim()
  if (c.length < 2) return null

  if (c.includes('news') && (c.includes('polit') || c.includes('politic'))) {
    return {
      nicho: 'Notícias & Geopolítica',
      subNicho: 'Notícias gerais & análise',
    }
  }
  if (c.includes('gaming')) {
    return { nicho: 'Gaming', subNicho: 'Gameplay & Let’s play' }
  }
  if (c.includes('education')) {
    return { nicho: 'Educação', subNicho: 'Ciência & exatas' }
  }
  if (c.includes('entertainment')) {
    return { nicho: 'Entretenimento', subNicho: 'Cultura pop & react' }
  }
  if (c.includes('science') && c.includes('technology')) {
    return { nicho: 'Tecnologia', subNicho: 'IA & software' }
  }
  if (c.includes('howto') || c.includes('style')) {
    return { nicho: 'Lifestyle & Família', subNicho: 'Vlog & rotina' }
  }
  if (c.includes('sports') || c === 'sport') {
    return { nicho: 'Esportes', subNicho: 'Outros esportes' }
  }
  if (c.includes('autos') || c.includes('vehicles')) {
    return { nicho: 'Automotivo', subNicho: 'Carros & reviews' }
  }
  if (c.includes('comedy')) {
    return { nicho: 'Entretenimento', subNicho: 'Comédia & sketches' }
  }
  if (c.includes('music')) {
    return { nicho: 'Entretenimento', subNicho: 'Cultura pop & react' }
  }
  if (c.includes('film') || c.includes('animation')) {
    return { nicho: 'Entretenimento', subNicho: 'Cultura pop & react' }
  }
  if (c.includes('pets') || c.includes('animals')) {
    return { nicho: 'Lifestyle & Família', subNicho: 'Vlog & rotina' }
  }
  if (c.includes('travel')) {
    return { nicho: 'Lifestyle & Família', subNicho: 'Vlog & rotina' }
  }
  if (c.includes('tech') && !c.includes('science')) {
    return { nicho: 'Tecnologia', subNicho: 'Reviews de gadgets' }
  }

  return null
}

function tokenizarNormalizado(s: string): Set<string> {
  const tokens = s
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
  return new Set(tokens)
}

function keywordBateNoTexto(
  textoNormalizado: string,
  tokensTexto: Set<string>,
  keywordNormalizada: string
): boolean {
  if (!keywordNormalizada) return false
  // Evita falsos positivos como "ev" dentro de "every".
  if (!keywordNormalizada.includes(' ') && keywordNormalizada.length <= 3) {
    return tokensTexto.has(keywordNormalizada)
  }
  return textoNormalizado.includes(keywordNormalizada)
}

function pontuarSubnicho(blob: string, sub: SubNicho): number {
  const tokensBlob = tokenizarNormalizado(blob)
  let score = 0
  for (const kw of sub.palavrasChave) {
    const k = normalizarParaMatch(kw)
    if (k.length < 2) continue
    if (!keywordBateNoTexto(blob, tokensBlob, k)) continue
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
    const tituloTokens = tokenizarNormalizado(titulo)
    const tagsNorm = (v.tags || [])
      .map((t) => normalizarParaMatch(t))
      .filter(Boolean)
    for (const kw of kws) {
      const base = pesoKeyword(kw)
      const hitTitulo = keywordBateNoTexto(titulo, tituloTokens, kw)
      const hitTag = tagsNorm.some((t) =>
        keywordBateNoTexto(t, tokenizarNormalizado(t), kw)
      )
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
 * Classifica por títulos + tags dos top vídeos, descrição e nome do canal.
 * Incluir nome reduz falhas quando a marca já diz o tema (“La Psicología…”).
 */
export function detectarNichoTopVideos(
  videos: AmostraNichoVideo[],
  descricaoCanal?: string,
  nomeCanal?: string
): { nicho: string; subNicho: string } | null {
  const nomeNorm = normalizarParaMatch(nomeCanal || '')
  if (!videos.length && !descricaoCanal?.trim() && nomeNorm.length < 3) return null
  const top = videos.slice(0, 5)
  const descricaoNorm = normalizarParaMatch(descricaoCanal || '')
  const topBlob = normalizarParaMatch(top.map((v) => v.titulo).join(' '))
  const contexto = `${topBlob} ${descricaoNorm} ${nomeNorm}`.trim()
  const contextoTokens = tokenizarNormalizado(contexto)
  const temSinalBattleEntertainment =
    keywordBateNoTexto(contexto, contextoTokens, 'battle') ||
    keywordBateNoTexto(contexto, contextoTokens, 'showdown') ||
    keywordBateNoTexto(contexto, contextoTokens, 'vs') ||
    keywordBateNoTexto(contexto, contextoTokens, 'monster') ||
    keywordBateNoTexto(contexto, contextoTokens, 'beast') ||
    keywordBateNoTexto(contexto, contextoTokens, 'predator') ||
    keywordBateNoTexto(contexto, contextoTokens, 'king kong') ||
    keywordBateNoTexto(contexto, contextoTokens, 'megalodon')
  const temSinalHistoriaDesastres =
    keywordBateNoTexto(contexto, contextoTokens, 'tsunami') ||
    keywordBateNoTexto(contexto, contextoTokens, 'terremoto') ||
    keywordBateNoTexto(contexto, contextoTokens, 'earthquake') ||
    keywordBateNoTexto(contexto, contextoTokens, 'desastre natural') ||
    keywordBateNoTexto(contexto, contextoTokens, 'catastrofe') ||
    keywordBateNoTexto(contexto, contextoTokens, 'catastrophe') ||
    keywordBateNoTexto(contexto, contextoTokens, 'chernobyl') ||
    keywordBateNoTexto(contexto, contextoTokens, 'titanic') ||
    keywordBateNoTexto(contexto, contextoTokens, 'torres gemeas')
  const temSinalHistoriaDidatica =
    keywordBateNoTexto(contexto, contextoTokens, 'history') ||
    keywordBateNoTexto(contexto, contextoTokens, 'documentary') ||
    keywordBateNoTexto(contexto, contextoTokens, 'documentario') ||
    keywordBateNoTexto(contexto, contextoTokens, 'explained') ||
    keywordBateNoTexto(contexto, contextoTokens, 'timeline')
  let melhor: { nicho: string; subNicho: string; score: number } | null = null

  for (const n of NICHOS) {
    for (const s of n.subNichos) {
      const scoreTop = pontuarSubnichoPorTopVideos(top, s)
      // Descrição ajuda a desambiguar quando títulos/tags do top5 são genéricos.
      const scoreDescricao =
        descricaoNorm.length >= 8 ? pontuarSubnicho(descricaoNorm, s) : 0
      // Nome do canal costuma ser marca + tema (“La Psicología…”, “Finance Insider”).
      const scoreNome =
        nomeNorm.length >= 4 ? pontuarSubnicho(nomeNorm, s) * 2 : 0
      let score = scoreTop + scoreDescricao * 1.5 + scoreNome

      // Conteúdo "batalha de monstros" tende a ser entretenimento, não história.
      if (temSinalBattleEntertainment && n.nome === 'Entretenimento') {
        score += 12
      }
      if (
        temSinalBattleEntertainment &&
        n.nome === 'Educação' &&
        s.nome === 'História & humanidades' &&
        !temSinalHistoriaDidatica
      ) {
        score -= 10
      }
      // "Reconstrução com IA" não deve virar nicho de software quando o tema
      // principal são desastres/eventos históricos.
      if (
        temSinalHistoriaDesastres &&
        n.nome === 'Tecnologia' &&
        s.nome === 'IA & software'
      ) {
        score -= 14
      }
      if (
        temSinalHistoriaDesastres &&
        n.nome === 'Educação' &&
        s.nome === 'História & humanidades'
      ) {
        score += 10
      }
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
