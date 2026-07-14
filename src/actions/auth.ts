'use server';

import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function registerCompany(input: {
  companyName: string;
  name: string;
  email: string;
  password: string;
}) {
  try {
    if (!input.companyName || !input.name || !input.email || input.password.length < 6) {
      return { error: 'Preencha todos os campos corretamente' };
    }
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) return { error: 'E-mail já cadastrado' };

    const password = await bcrypt.hash(input.password, 10);
    await prisma.company.create({
      data: {
        name: input.companyName,
        users: {
          create: {
            name: input.name,
            email: input.email,
            password,
            role: 'ADMIN',
          },
        },
      },
    });
    return { ok: true };
  } catch {
    return { error: 'Falha ao criar conta' };
  }
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { message: 'Se o e-mail existir, enviaremos o link de recuperação.' };
  }
  const token = randomBytes(24).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetExpires: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
  // Em produção enviaria e-mail. Em dev, logamos o token.
  console.log(`[DEV] Reset token for ${email}: ${token}`);
  return {
    message: 'Se o e-mail existir, enviaremos o link de recuperação. (Em dev, veja o terminal)',
  };
}
