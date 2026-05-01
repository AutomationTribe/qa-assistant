import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

async function connectPrisma(): Promise<void> {
  await prisma.$connect()
  console.log('Prisma connected')
}

connectPrisma().catch((err) => {
  console.error('Failed to connect Prisma:', err)
})
