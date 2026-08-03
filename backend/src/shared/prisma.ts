import * as mariadb from 'mariadb';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
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
    connectionLimit: 1,
    connectTimeout: 4000,
  };

  const host = env.DB_HOST;
  return [
    { label: `${host}:tcp`, config: { ...base, host, port: env.DB_PORT } },
    { label: '127.0.0.1:tcp', config: { ...base, host: '127.0.0.1', port: env.DB_PORT } },
    { label: 'localhost:tcp4', config: { ...base, host: 'localhost', port: env.DB_PORT } },
    { label: 'socket:/var/run/mysqld/mysqld.sock', config: { ...base, socketPath: '/var/run/mysqld/mysqld.sock' } },
    { label: 'socket:/tmp/mysql.sock', config: { ...base, socketPath: '/tmp/mysql.sock' } },
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
        console.log(`[db] connected via ${candidate.label}`);
        globalForPrisma.prisma = client;
        return client;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[db] ${candidate.label} failed: ${msg}`);
        errors.push(`${candidate.label}: ${msg}`);
      }
    }
    throw new Error(`MySQL indisponível. Tentativas: ${errors.join(' | ')}`);
  })();

  return globalForPrisma.prismaReady;
}

/** Lazy proxy so existing imports keep working after initPrisma(). */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = globalForPrisma.prisma;
    if (!client) {
      throw new Error('Prisma ainda não inicializado. Chame initPrisma() no boot.');
    }
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
