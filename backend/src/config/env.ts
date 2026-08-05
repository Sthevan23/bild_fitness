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

const DB_HOST_RAW = process.env.DB_HOST || '127.0.0.1';
/** Hostinger Node: "localhost" tenta socket Unix e falha; use TCP IPv4. */
const DB_HOST = DB_HOST_RAW === 'localhost' || DB_HOST_RAW === '::1' ? '127.0.0.1' : DB_HOST_RAW;
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || process.env.DB_USERNAME || 'root';
const DB_PASS = process.env.DB_PASS || process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || process.env.DB_DATABASE || 'pep_vendas';

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return `mysql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().min(1),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  ALLOW_REGISTER: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
});

process.env.DATABASE_URL = buildDatabaseUrl();

const isProd = (process.env.NODE_ENV || 'development') === 'production';
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-jwt-secret-change-me')) {
  throw new Error('JWT_SECRET obrigatório em produção (defina no hPanel).');
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-jwt-secret-change-me-local';
}
if (!process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN = 'http://localhost:3000';
}

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
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASS,
  DB_NAME,
  cookieSecure: parsed.data.COOKIE_SECURE ?? parsed.data.NODE_ENV === 'production',
  /** Só libera POST /auth/register se ALLOW_REGISTER=true no hPanel */
  allowRegister: parsed.data.ALLOW_REGISTER === true,
};
