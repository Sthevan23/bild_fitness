'use server';

import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/session';
import { customerSchema, supplierSchema, userCreateSchema, userUpdateSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

export async function listCustomers() {
  const session = await requireModule('clientes');
  return prisma.customer.findMany({
    where: { companyId: session.user.companyId },
    include: { orders: true },
    orderBy: { name: 'asc' },
  });
}

export async function createCustomer(data: {
  name: string;
  phone?: string;
  document?: string;
  email?: string;
  address?: string;
  city?: string;
}) {
  const session = await requireModule('clientes');
  const parsed = customerSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  await prisma.customer.create({ data: { ...parsed.data, companyId: session.user.companyId } });
  revalidatePath('/clientes');
  return { ok: true };
}

export async function deleteCustomer(id: string) {
  const session = await requireModule('clientes');
  const customer = await prisma.customer.findFirst({
    where: { id, companyId: session.user.companyId },
    include: { _count: { select: { orders: true } } },
  });
  if (!customer) return { error: 'Cliente não encontrado' };

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { customerId: id, companyId: session.user.companyId },
      data: { customerId: null },
    });
    await tx.customer.delete({ where: { id } });
  });

  revalidatePath('/clientes');
  revalidatePath('/pedidos');
  return { ok: true };
}

export async function listSuppliers() {
  const session = await requireModule('fornecedores');
  return prisma.supplier.findMany({
    where: { companyId: session.user.companyId },
    include: { products: true },
    orderBy: { name: 'asc' },
  });
}

export async function createSupplier(data: {
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  cnpj?: string;
}) {
  const session = await requireModule('fornecedores');
  const parsed = supplierSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  await prisma.supplier.create({ data: { ...parsed.data, companyId: session.user.companyId } });
  revalidatePath('/fornecedores');
  return { ok: true };
}

export async function listUsers() {
  const session = await requireModule('usuarios');
  return prisma.user.findMany({
    where: { companyId: session.user.companyId },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'FINANCEIRO' | 'EXPEDICAO' | 'ESTOQUE';
}) {
  const session = await requireModule('usuarios');
  const parsed = userCreateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const bcrypt = await import('bcryptjs');
  const password = await bcrypt.hash(parsed.data.password, 10);
  try {
    await prisma.user.create({
      data: {
        companyId: session.user.companyId,
        name: parsed.data.name,
        email: parsed.data.email,
        password,
        role: parsed.data.role,
        active: true,
      },
    });
    revalidatePath('/usuarios');
    return { ok: true };
  } catch {
    return { error: 'E-mail já existe' };
  }
}

export async function updateUser(
  id: string,
  data: {
    name: string;
    email: string;
    password?: string;
    role: 'ADMIN' | 'FINANCEIRO' | 'EXPEDICAO' | 'ESTOQUE';
  },
) {
  const session = await requireModule('usuarios');
  const parsed = userUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const existing = await prisma.user.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!existing) return { error: 'Usuário não encontrado' };

  const bcrypt = await import('bcryptjs');
  try {
    await prisma.user.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        ...(parsed.data.password ? { password: await bcrypt.hash(parsed.data.password, 10) } : {}),
      },
    });
    revalidatePath('/usuarios');
    return { ok: true };
  } catch {
    return { error: 'E-mail já existe' };
  }
}

export async function setUserActive(id: string, active: boolean) {
  const session = await requireModule('usuarios');
  if (id === session.user.id && !active) {
    return { error: 'Você não pode desativar sua própria conta' };
  }
  const existing = await prisma.user.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!existing) return { error: 'Usuário não encontrado' };

  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath('/usuarios');
  return { ok: true };
}

export async function updateCompany(data: { name: string; theme?: string }) {
  const session = await requireModule('configuracoes');
  await prisma.company.update({
    where: { id: session.user.companyId },
    data: { name: data.name, theme: data.theme },
  });
  revalidatePath('/configuracoes');
  return { ok: true };
}

export async function getCompany() {
  const session = await requireModule('configuracoes');
  return prisma.company.findUnique({ where: { id: session.user.companyId } });
}
