import bcrypt from 'bcryptjs';
import { prisma, Locale, UserRole, Prisma } from '@plumbing/db';
import { createSession } from '@/lib/auth/session';

export const assertTestDatabase = () => {
  const testUrl = process.env.DATABASE_URL_TEST;
  const databaseUrl = process.env.DATABASE_URL;
  if (!testUrl) {
    throw new Error('DATABASE_URL_TEST is required for DB tests.');
  }
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for DB tests.');
  }
  if (databaseUrl !== testUrl) {
    throw new Error('DATABASE_URL must match DATABASE_URL_TEST for DB tests.');
  }
  const parsed = new URL(databaseUrl);
  const dbName = parsed.pathname.replace('/', '');
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run DB tests against non-test database: ${dbName}`);
  }
};

export const resetDb = async () => {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(928374928)');

    const relations = await tx.$queryRaw<Array<{ relname: string }>>`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname <> '_prisma_migrations'
      ORDER BY c.relname
    `;

    if (!relations.length) return;
    const joined = relations.map((relation) => `"${relation.relname}"`).join(', ');
    await tx.$executeRawUnsafe(`TRUNCATE TABLE ${joined} RESTART IDENTITY CASCADE`);
  });
};

export const createUser = async (params?: {
  phone?: string;
  role?: UserRole;
  password?: string;
  name?: string | null;
  address?: string | null;
}) => {
  const phone = params?.phone ?? '+996700000001';
  const role = params?.role ?? UserRole.USER;
  const password = params?.password ?? 'Password123';
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      phone,
      role,
      name: params?.name ?? 'Test User',
      address: params?.address ?? null,
      passwordHash,
      isActive: true,
    },
  });
};

export const createAdminSession = async (params?: { phone?: string; password?: string }) => {
  const user = await createUser({
    phone: params?.phone ?? '+996700000099',
    password: params?.password ?? 'Password123',
    role: UserRole.ADMIN,
  });
  const { token } = await createSession(user.id);
  return { user, token };
};

export const createClientsManagerSession = async (params?: { phone?: string; password?: string }) => {
  const user = await createUser({
    phone: params?.phone ?? '+996700000199',
    password: params?.password ?? 'Password123',
    role: UserRole.CLIENTS_MANAGER,
  });
  const { token } = await createSession(user.id);
  return { user, token };
};

export const createCategory = async (params: { name: string; sortOrder?: number }) => {
  return prisma.category.create({
    data: {
      sortOrder: params.sortOrder ?? 0,
      isActive: true,
      translations: { create: [{ locale: Locale.ru, name: params.name }] },
    },
    include: { translations: true },
  });
};

export const createSubcategory = async (params: { categoryId: string; name: string; sortOrder?: number }) => {
  return prisma.subcategory.create({
    data: {
      categoryId: params.categoryId,
      sortOrder: params.sortOrder ?? 0,
      isActive: true,
      slug: null,
      translations: { create: [{ locale: Locale.ru, name: params.name }] },
    },
    include: { translations: true },
  });
};

export const createProduct = async (params: {
  categoryId: string;
  subcategoryId?: string | null;
  name: string;
  sortOrder?: number;
}) => {
  return prisma.product.create({
    data: {
      categoryId: params.categoryId,
      subcategoryId: params.subcategoryId ?? null,
      sortOrder: params.sortOrder ?? 0,
      isActive: true,
      translations: { create: [{ locale: Locale.ru, name: params.name }] },
    },
    include: { translations: true, variants: { include: { translations: true } } },
  });
};

export const createVariant = async (params: {
  productId: string;
  sku?: string | null;
  label: string;
  price: number;
  attributes?: Prisma.InputJsonValue;
}) => {
  return prisma.variant.create({
    data: {
      productId: params.productId,
      sku: params.sku ?? null,
      price: params.price,
      priceRetail: params.price,
      isActive: true,
      attributes: params.attributes ?? {},
      translations: { create: [{ locale: Locale.ru, label: params.label }] },
    },
    include: { translations: true },
  });
};
