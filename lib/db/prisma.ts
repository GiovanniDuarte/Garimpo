import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaCacadaSchemaKey?: string
}

/** Fingerprint dos campos do model Cacada (deteta `prisma generate` sem reinício). */
function cacadaModelFieldKey(): string {
  const m = Prisma.dmmf.datamodel.models.find((x) => x.name === 'Cacada')
  if (!m) return ''
  return m.fields.map((f) => f.name).sort().join('\0')
}

function createPrisma(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })
}

/** Em dev, descarta singleton se o model Cacada mudou ou faltava no client antigo. */
function clientIsStale(client: PrismaClient, schemaKey: string): boolean {
  if (typeof (client as unknown as { cacada?: unknown }).cacada === 'undefined') {
    return true
  }
  return (
    globalForPrisma.prismaCacadaSchemaKey !== undefined &&
    globalForPrisma.prismaCacadaSchemaKey !== schemaKey
  )
}

function pickClient(): PrismaClient {
  if (process.env.NODE_ENV !== 'production') {
    const schemaKey = cacadaModelFieldKey()
    const g = globalForPrisma.prisma
    if (g && clientIsStale(g, schemaKey)) {
      void g.$disconnect().catch(() => {})
      globalForPrisma.prisma = undefined
    }
    globalForPrisma.prismaCacadaSchemaKey = schemaKey
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrisma()
  }

  return globalForPrisma.prisma
}

/**
 * Proxy garante que, após `prisma generate`, o próximo acesso use um client novo
 * sem precisar reiniciar o `next dev` (o singleton em globalThis era o problema).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const real = pickClient()
    const value = Reflect.get(real, prop, real)
    if (typeof value === 'function') {
      return value.bind(real)
    }
    return value
  },
})
