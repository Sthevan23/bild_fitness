import * as mariadb from 'mariadb';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaReady?: Promise<PrismaClient>;
};

type DbTry = {
  label: string;
  config: mariadb.PoolConfig;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function candidateConfigs(): DbTry[] {
  const base = {
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    connectionLimit: 5,
    connectTimeout: 3000,
    acquireTimeout: 3000,
  };

  const host = env.DB_HOST;
  const list: DbTry[] = [{ label: '127.0.0.1:tcp', config: { ...base, host: '127.0.0.1', port: env.DB_PORT } }];
  if (host && host !== '127.0.0.1' && host !== 'localhost') {
    list.push({ label: `${host}:tcp`, config: { ...base, host, port: env.DB_PORT } });
  }
  return list;
}

async function probe(config: mariadb.PoolConfig) {
  const pool = mariadb.createPool(config);
  try {
    const conn = await withTimeout(pool.getConnection(), 3500, 'mysql-getConnection');
    await withTimeout(conn.query('SELECT 1 AS ok'), 3500, 'mysql-query');
    conn.release();
    return pool;
  } catch (e) {
    await pool.end().catch(() => undefined);
    throw e;
  }
}

async function ensureAdmin(client: PrismaClient) {
  const email = 'admin@bildfitness.local';
  const existing = await client.user.findUnique({ where: { email } });

  if (existing) {
    const accountCount = await client.salesAccount.count({ where: { companyId: existing.companyId } });
    if (accountCount < 3) {
      for (const code of ['P&P', 'RC', 'PCP'] as const) {
        await client.salesAccount.upsert({
          where: { companyId_code: { companyId: existing.companyId, code } },
          create: { companyId: existing.companyId, code, name: code, active: true },
          update: { active: true, name: code },
        });
      }
    }
    if (!existing.active || existing.role !== 'ADMIN') {
      await client.user.update({
        where: { id: existing.id },
        data: { active: true, role: 'ADMIN' },
      });
    }
    void seedCatalogIfNeeded(client, existing.companyId);
    return;
  }

  const password = await bcrypt.hash('admin123', 10);
  const company = await client.company.create({
    data: {
      name: 'Bild Fitness',
      theme: 'planilha',
      users: {
        create: {
          name: 'Administrador',
          email,
          password,
          role: 'ADMIN',
          active: true,
        },
      },
    },
  });

  for (const code of ['P&P', 'RC', 'PCP'] as const) {
    await client.salesAccount.upsert({
      where: { companyId_code: { companyId: company.id, code } },
      create: { companyId: company.id, code, name: code, active: true },
      update: { active: true, name: code },
    });
  }
  void seedCatalogIfNeeded(client, company.id);
  console.log('[db] admin bootstrap OK — admin@bildfitness.local / admin123');
}

async function seedCatalogIfNeeded(client: PrismaClient, companyId: string) {
  try {
    const productCount = await client.product.count({ where: { companyId } });
    if (productCount >= 20) return;
    const { upsertCatalogProducts } = await import('../modules/products/application/catalog.js');
    const n = await upsertCatalogProducts(client, companyId);
    console.log(`[db] catálogo upserted (${n} produtos)`);
  } catch (e) {
    console.error('[db] catálogo background failed:', e instanceof Error ? e.message : e);
  }
}

async function connectOnce(candidate: DbTry): Promise<PrismaClient> {
  console.log(`[db] trying ${candidate.label}…`);
  const pool = await probe(candidate.config);
  await pool.end().catch(() => undefined);

  const adapter = new PrismaMariaDb(candidate.config as ConstructorParameters<typeof PrismaMariaDb>[0]);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  await withTimeout(client.$connect(), 5000, 'prisma-connect');
  // Libera o client ANTES do bootstrap pesado — login não espera ensureAdmin
  globalForPrisma.prisma = client;
  console.log(`[db] connected via ${candidate.label}`);
  void ensureAdmin(client).catch((e) =>
    console.error('[db] ensureAdmin failed:', e instanceof Error ? e.message : e),
  );
  return client;
}

export async function initPrisma() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  // Se a promise anterior travou, descarta e tenta de novo
  if (globalForPrisma.prismaReady) {
    try {
      return await withTimeout(globalForPrisma.prismaReady, 8000, 'prisma-ready-wait');
    } catch {
      console.warn('[db] prismaReady stuck — resetting');
      globalForPrisma.prismaReady = undefined;
    }
  }

  globalForPrisma.prismaReady = (async () => {
    const errors: string[] = [];
    for (const candidate of candidateConfigs()) {
      try {
        return await withTimeout(connectOnce(candidate), 10_000, candidate.label);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[db] ${candidate.label} failed: ${msg}`);
        errors.push(`${candidate.label}: ${msg}`);
      }
    }
    globalForPrisma.prismaReady = undefined;
    throw new Error(`MySQL indisponível. Tentativas: ${errors.join(' | ')}`);
  })();

  try {
    return await globalForPrisma.prismaReady;
  } catch (e) {
    globalForPrisma.prismaReady = undefined;
    throw e;
  }
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = globalForPrisma.prisma;
    if (!client) {
      throw new Error('Prisma ainda não inicializado. Aguarde o boot do banco ou chame /health/db.');
    }
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
