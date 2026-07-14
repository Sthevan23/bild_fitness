import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccess } from '@/lib/permissions';
import type { Role } from '@prisma/client';

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Não autenticado');
  }
  return session;
}

export async function requireModule(module: string) {
  const session = await requireSession();
  if (!canAccess(session.user.role as Role, module)) {
    throw new Error('Sem permissão');
  }
  return session;
}
