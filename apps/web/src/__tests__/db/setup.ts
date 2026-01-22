import fs from 'node:fs';
import path from 'path';
import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PrismaClient, prisma } from '@plumbing/db';
import { assertTestDatabase, resetDb } from './helpers';

const resolveRepoRoot = () => path.resolve(__dirname, '../../../../..');

const resolvePrismaBin = () => {
  const repoRoot = resolveRepoRoot();
  const binName = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
  const packageBin = path.join(repoRoot, 'packages', 'db', 'node_modules', '.bin', binName);
  if (fs.existsSync(packageBin)) return packageBin;
  return path.join(repoRoot, 'node_modules', '.bin', binName);
};

const applyMigrations = () => {
  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) return;
  const repoRoot = resolveRepoRoot();
  const prismaBin = resolvePrismaBin();
  const dbDir = path.join(repoRoot, 'packages', 'db');

  try {
    execFileSync(prismaBin, ['migrate', 'deploy'], {
      cwd: dbDir,
      env: {
        ...process.env,
        DATABASE_URL: testUrl,
      },
      stdio: 'pipe',
      encoding: 'utf8',
    });
  } catch (error) {
    const hasOutput =
      typeof error === 'object' && error !== null && ('stdout' in error || 'stderr' in error);
    const stdout = hasOutput && typeof (error as { stdout?: unknown }).stdout === 'string'
      ? (error as { stdout?: string }).stdout
      : '';
    const stderr = hasOutput && typeof (error as { stderr?: unknown }).stderr === 'string'
      ? (error as { stderr?: string }).stderr
      : '';
    const details = [stderr, stdout].filter(Boolean).join('\n') || (error instanceof Error ? error.message : '');
    throw new Error(`Failed to apply migrations for test database.${details ? ` ${details}` : ''}`);
  }
};

const buildDatabaseUrl = (baseUrl: string, database: string) => {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${database}`;
  return parsed.toString();
};

const ensureTestDatabase = async () => {
  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) return;
  const parsed = new URL(testUrl);
  const dbName = parsed.pathname.replace('/', '');
  if (!dbName) return;

  const adminDatabases = ['postgres', 'template1'];
  const escapedName = dbName.replace(/"/g, '""');
  let lastError: unknown = null;

  for (const adminDb of adminDatabases) {
    const admin = new PrismaClient({
      datasources: { db: { url: buildDatabaseUrl(testUrl, adminDb) } },
    });
    try {
      await admin.$connect();
      const exists =
        await admin.$queryRaw<Array<{ datname: string }>>`SELECT datname FROM pg_database WHERE datname = ${dbName}`;
      if (exists.length === 0) {
        await admin.$executeRawUnsafe(`CREATE DATABASE "${escapedName}"`);
      }
      return;
    } catch (error) {
      lastError = error;
    } finally {
      await admin.$disconnect();
    }
  }

  const details = lastError instanceof Error ? lastError.message : 'Unknown error';
  throw new Error(`Unable to create test database "${dbName}". ${details}`);
};

beforeAll(async () => {
  assertTestDatabase();
  await ensureTestDatabase();
  applyMigrations();
  await prisma.$connect();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});
