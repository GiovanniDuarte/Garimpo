export interface SubNicho {
  nome: string
  rpmEstimado: { min: number; max: number }
  viralidade: number
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
        nome: 'Renda passiva',
        rpmEstimado: { min: 15, max: 35 },
        viralidade: 6,
      },
      {
        nome: 'Cripto',
        rpmEstimado: { min: 20, max: 45 },
        viralidade: 8,
      },
    ],
  },
  {
    nome: 'Tecnologia',
    subNichos: [
      {
        nome: 'Reviews de gadgets',
        rpmEstimado: { min: 8, max: 22 },
        viralidade: 7,
      },
      {
        nome: 'Programação',
        rpmEstimado: { min: 12, max: 28 },
        viralidade: 5,
      },
    ],
  },
  {
    nome: 'Saúde & Bem-estar',
    subNichos: [
      {
        nome: 'Fitness',
        rpmEstimado: { min: 6, max: 18 },
        viralidade: 8,
      },
    ],
  },
]

export function detectarNicho(
  descricao: string,
  titulosVideos: string[]
): { nicho: string; subNicho: string } | null {
  const blob = `${descricao} ${titulosVideos.join(' ')}`.toLowerCase()
  for (const n of NICHOS) {
    const nKey = n.nome.split('&')[0]?.trim().toLowerCase() || ''
    if (nKey && blob.includes(nKey.slice(0, 5))) {
      const sub = n.subNichos[0]
      return { nicho: n.nome, subNicho: sub.nome }
    }
  }
  for (const n of NICHOS) {
    for (const s of n.subNichos) {
      if (blob.includes(s.nome.toLowerCase().slice(0, 6))) {
        return { nicho: n.nome, subNicho: s.nome }
      }
    }
  }
  return null
}
