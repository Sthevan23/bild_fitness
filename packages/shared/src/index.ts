import { z } from 'zod';

export const ACCOUNT_CODES = ['PEP', 'RC', 'PCP'] as const;
export type AccountCode = (typeof ACCOUNT_CODES)[number];

export function normalizeAccountCode(value?: string | null): AccountCode {
  const code = (value || 'PEP').toUpperCase();
  return (ACCOUNT_CODES as readonly string[]).includes(code) ? (code as AccountCode) : 'PEP';
}

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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'FINANCEIRO' | 'EXPEDICAO' | 'ESTOQUE';
  companyId: string;
  companyName: string;
};

export type ApiErrorBody = { error: string };
export type ApiOkBody<T = Record<string, unknown>> = { ok: true } & T;
