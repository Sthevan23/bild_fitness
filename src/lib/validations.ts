import { z } from 'zod';

const optionalEmail = z
  .string()
  .trim()
  .email('E-mail inválido')
  .or(z.literal(''))
  .optional()
  .transform((v) => v || undefined);

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)
  .refine((v) => !v || v.replace(/\D/g, '').length >= 8, 'Telefone inválido (mín. 8 dígitos)');

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: optionalPhone,
  document: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || [11, 14].includes(v.replace(/\D/g, '').length), 'CPF/CNPJ inválido'),
  email: optionalEmail,
  address: z.string().trim().optional().transform((v) => v || undefined),
  city: z.string().trim().optional().transform((v) => v || undefined),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cnpj: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || v.replace(/\D/g, '').length === 14, 'CNPJ deve ter 14 dígitos'),
  phone: optionalPhone,
  email: optionalEmail,
  city: z.string().trim().optional().transform((v) => v || undefined),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['ADMIN', 'FINANCEIRO', 'EXPEDICAO', 'ESTOQUE']),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().trim().email('E-mail inválido'),
  password: z
    .string()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || v.length >= 6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['ADMIN', 'FINANCEIRO', 'EXPEDICAO', 'ESTOQUE']),
});

export const financeSchema = z.object({
  type: z.enum(['ENTRADA', 'SAIDA']),
  description: z.string().trim().min(2, 'Descrição deve ter pelo menos 2 caracteres'),
  amount: z.coerce.number().positive('Valor deve ser maior que zero'),
  category: z.string().trim().optional().transform((v) => v || undefined),
  status: z.enum(['PENDENTE', 'PAGO', 'RECEBIDO', 'CANCELADO']).optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  sku: z.string().trim().min(1, 'SKU é obrigatório'),
  barcode: z.string().trim().optional().transform((v) => v || undefined),
  category: z.string().trim().optional().transform((v) => v || undefined),
  unit: z.string().trim().min(1, 'Unidade é obrigatória').default('UN'),
  stock: z.coerce.number().min(0, 'Estoque não pode ser negativo'),
  minStock: z.coerce.number().min(0, 'Estoque mínimo inválido'),
  costPrice: z.coerce.number().min(0, 'Custo inválido'),
  salePrice: z.coerce.number().min(0, 'Preço de venda inválido'),
  brand: z.string().trim().optional().transform((v) => v || undefined),
});

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
