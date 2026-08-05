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

function candidateConfigs(): DbTry[] {
  const base = {
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    connectionLimit: 8,
    connectTimeout: 4000,
  };

  const host = env.DB_HOST;
  return [
    { label: `${host}:tcp`, config: { ...base, host, port: env.DB_PORT } },
    { label: '127.0.0.1:tcp', config: { ...base, host: '127.0.0.1', port: env.DB_PORT } },
  ];
}

async function probe(config: mariadb.PoolConfig) {
  const pool = mariadb.createPool(config);
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1 AS ok');
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
    for (const code of ['P&P', 'RC', 'PCP'] as const) {
      await client.salesAccount.upsert({
        where: { companyId_code: { companyId: existing.companyId, code } },
        create: { companyId: existing.companyId, code, name: code, active: true },
        update: { active: true, name: code },
      });
    }
    if (!existing.active || existing.role !== 'ADMIN') {
      await client.user.update({
        where: { id: existing.id },
        data: { active: true, role: 'ADMIN' },
      });
    }
    // Catálogo: só preenche se ainda estiver vazio (Hostinger já existente)
    const productCount = await client.product.count({ where: { companyId: existing.companyId } });
    if (productCount < 20) {
      const { upsertCatalogProducts } = await import('../modules/products/application/catalog.js');
      const n = await upsertCatalogProducts(client, existing.companyId);
      console.log(`[db] catálogo upserted (${n} produtos)`);
    }
    return;
  }

  const { upsertCatalogProducts } = await import('../modules/products/application/catalog.js');
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
  await upsertCatalogProducts(client, company.id);
  console.log('[db] admin bootstrap OK — admin@bildfitness.local / admin123');
}

export async function initPrisma() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (globalForPrisma.prismaReady) return globalForPrisma.prismaReady;

  globalForPrisma.prismaReady = (async () => {
    const errors: string[] = [];
    for (const candidate of candidateConfigs()) {
      try {
        console.log(`[db] trying ${candidate.label}…`);
        const pool = await probe(candidate.config);
        await pool.end().catch(() => undefined);
        const adapter = new PrismaMariaDb(candidate.config as ConstructorParameters<typeof PrismaMariaDb>[0]);
        const client = new PrismaClient({
          adapter,
          log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        });
        await client.$connect();
        await ensureAdmin(client);
        console.log(`[db] connected via ${candidate.label}`);
        globalForPrisma.prisma = client;
        return client;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[db] ${candidate.label} failed: ${msg}`);
        errors.push(`${candidate.label}: ${msg}`);
      }
    }
    globalForPrisma.prismaReady = undefined;
    throw new Error(`MySQL indisponível. Tentativas: ${errors.join(' | ')}`);
  })();

  return globalForPrisma.prismaReady;
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
