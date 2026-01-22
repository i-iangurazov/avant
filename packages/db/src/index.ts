import { Prisma, PrismaClient, Locale, UserRole, OrderStatus } from '@prisma/client';

export const prisma = new PrismaClient();
export { Prisma, PrismaClient, Locale, UserRole, OrderStatus };
export type * from '@prisma/client';
