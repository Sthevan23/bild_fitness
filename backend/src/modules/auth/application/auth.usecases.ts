import { updateThemeSchema, loginSchema, registerSchema, type SessionUser } from '@pep/shared';
import { prisma } from '../../../shared/prisma.js';
import { AppError } from '../../../shared/errors.js';
import { ensureSalesAccountRows } from '../../accounts/infrastructure/accounts.repo.js';
import bcrypt from 'bcryptjs';

export class LoginUseCase {
  async execute(input: unknown): Promise<SessionUser> {
    const data = loginSchema.parse(input);
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { company: true },
    });
    if (!user || !user.active) throw new AppError('E-mail ou senha inválidos', 401);
    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) throw new AppError('E-mail ou senha inválidos', 401);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
      theme: user.company.theme || 'planilha',
    };
  }
}

export class RegisterUseCase {
  async execute(input: unknown) {
    const data = registerSchema.parse(input);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new AppError('E-mail já cadastrado');
    const password = await bcrypt.hash(data.password, 10);
    const company = await prisma.company.create({
      data: {
        name: data.companyName,
        theme: 'planilha',
        users: {
          create: {
            name: data.name,
            email: data.email,
            password,
            role: 'ADMIN',
          },
        },
      },
    });
    await ensureSalesAccountRows(company.id);
    return { ok: true as const };
  }
}

export class MeUseCase {
  async execute(userId: string): Promise<SessionUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
    if (!user || !user.active) throw new AppError('Não autenticado', 401);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
      theme: user.company.theme || 'planilha',
    };
  }
}

export class UpdateThemeUseCase {
  async execute(companyId: string, input: unknown) {
    const data = updateThemeSchema.parse(input);
    await prisma.company.update({
      where: { id: companyId },
      data: { theme: data.theme },
    });
    return { ok: true as const, theme: data.theme };
  }
}
