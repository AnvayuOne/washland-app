import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

/**
 * Reuse the Prisma singleton across dev hot-reloads and
 * serverless invocations where the module can be recreated.
 *
 * This helps prevent unnecessary database connections.
 */
const prismaClientSingleton = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],

    ...(process.env.DATABASE_URL
      ? {
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      }
      : {}),
  })

export const prisma: PrismaClient =
  globalThis.prisma ?? prismaClientSingleton()

// Persist the client so both development hot-reloads and
// production module reuse share the same PrismaClient.
globalThis.prisma = prisma