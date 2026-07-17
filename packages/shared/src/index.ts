import { z } from 'zod';

export const ACCOUNT_CODES = ['P&P', 'RC', 'PCP'] as const;
export type AccountCode = (typeof ACCOUNT_CODES)[number];

/** Aceita legado PEP e variantes da planilha (P&P ML → P&P). */
export function normalizeAccountCode(value?: string | null): AccountCode {
  let code = (value || 'P&P').trim().toUpperCase();
  if (code === 'PEP' || code === 'PAP' || code === 'P E P') code = 'P&P';
  if (code.endsWith(' ML') || code.endsWith(' SH')) code = code.slice(0, -3).trim();
  return (ACCOUNT_CODES as readonly string[]).includes(code) ? (code as AccountCode) : 'P&P';
}

export const ACCOUNT_DISPLAY: Record<AccountCode, string> = {
  'P&P': 'P&P',
  RC: 'RC',
  PCP: 'PCP',
};

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  companyName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const updateAccountSchema = z.object({
  code: z.enum(ACCOUNT_CODES),
  name: z.string().min(1).optional(),
  cnpj: z.string().optional().nullable(),
});

export const setActiveAccountSchema = z.object({
  code: z.enum(ACCOUNT_CODES),
});

export const updateMarginSettingsSchema = z.object({
  /** Alíquota % usada no cálculo do lucro (como na planilha) */
  ratePercent: z.number().min(0).max(100),
  /** Meta de margem de lucro desejada (%) */
  targetMarginPercent: z.number().min(0).max(100),
  recalculate: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'FINANCEIRO' | 'EXPEDICAO' | 'ESTOQUE';
  companyId: string;
  companyName: string;
  theme: string;
};

export const updateThemeSchema = z.object({
  theme: z.string().min(1).max(40),
});

export type ApiErrorBody = { error: string };
export type ApiOkBody<T = Record<string, unknown>> = { ok: true } & T;
