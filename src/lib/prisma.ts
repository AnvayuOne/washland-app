import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

/**
 * Always reuse the singleton across dev hot-reloads AND in production
 * serverless environments (Vercel / Edge functions).
 *
 * Without this, each cold-start creates a new PrismaClient which opens
 * fresh DB connections and quickly exhausts PgBouncer's session-mode
 * connection limit ("Max clients reached").
 */
const prismaClientSingleton = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

export const prisma: PrismaClient =
  globalThis.prisma ?? prismaClientSingleton()

// Always persist so both dev hot-reload AND production module cache reuse it
globalThis.prisma = prisma