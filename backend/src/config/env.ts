import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
for (const p of [resolve(root, '.env'), resolve(root, '../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || process.env.DB_USERNAME || 'root';
  const pass = process.env.DB_PASS || process.env.DB_PASSWORD || '';
  const name = process.env.DB_NAME || process.env.DB_DATABASE || 'pep_vendas';
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${name}`;
}

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8).default('dev-jwt-secret-change-me'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
});

process.env.DATABASE_URL = buildDatabaseUrl();

const parsed = envSchema.safeParse({
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL,
});

if (!parsed.success) {
  console.error('Invalid env', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = {
  ...parsed.data,
  cookieSecure: parsed.data.COOKIE_SECURE ?? parsed.data.NODE_ENV === 'production',
};
