import { Prisma, PrismaClient, Locale, UserRole, OrderStatus } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { Prisma, PrismaClient, Locale, UserRole, OrderStatus };
export type * from '@prisma/client';
