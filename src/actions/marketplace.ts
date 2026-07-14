'use server';

import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/session';
import { MercadoLivreAuthService, MercadoLivreSyncService } from '@/modules/marketplace/mercadolivre';
import { revalidatePath } from 'next/cache';

const oauthStateStore = (globalThis as unknown as {
  mlOAuthStates?: Map<string, { companyId: string; expires: number }>;
}).mlOAuthStates ?? new Map<string, { companyId: string; expires: number }>();

(globalThis as unknown as { mlOAuthStates: typeof oauthStateStore }).mlOAuthStates = oauthStateStore;

export async function getMercadoLivreConnection() {
  const session = await requireModule('integracoes');
  const conn = await prisma.marketplaceConnection.findUnique({
    where: {
      companyId_marketplace: {
        companyId: session.user.companyId,
        marketplace: 'MERCADO_LIVRE',
      },
    },
    select: {
      id: true,
      marketplace: true,
      sellerId: true,
      nickname: true,
      accountName: true,
      status: true,
      expiresAt: true,
      lastSyncAt: true,
      lastSyncError: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    configured: MercadoLivreAuthService.isConfigured(),
    connection: conn,
  };
}

export async function startMercadoLivreConnect() {
  const session = await requireModule('integracoes');
  if (!MercadoLivreAuthService.isConfigured()) {
    return {
      error:
        'Configure ML_CLIENT_ID, ML_CLIENT_SECRET e ML_REDIRECT_URI no .env (app em developers.mercadolivre.com.br)',
    };
  }
  const state = randomBytes(24).toString('hex');
  oauthStateStore.set(state, {
    companyId: session.user.companyId,
    expires: Date.now() + 15 * 60 * 1000,
  });
  const url = MercadoLivreAuthService.buildAuthUrl(state);
  return { url };
}

export async function consumeMercadoLivreOAuthState(state: string) {
  const entry = oauthStateStore.get(state);
  oauthStateStore.delete(state);
  if (!entry || entry.expires < Date.now()) return null;
  return entry.companyId;
}

export async function disconnectMercadoLivre() {
  const session = await requireModule('integracoes');
  await MercadoLivreAuthService.disconnect(session.user.companyId);
  revalidatePath('/integracoes');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function syncMercadoLivreNow() {
  const session = await requireModule('integracoes');
  try {
    const result = await MercadoLivreSyncService.syncCompany(session.user.companyId);
    revalidatePath('/integracoes');
    revalidatePath('/dashboard');
    revalidatePath('/pedidos');
    revalidatePath('/expedicao');
    revalidatePath('/estoque');
    revalidatePath('/financeiro');
    revalidatePath('/clientes');
    return { ok: true as const, result };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Falha na sincronização',
    };
  }
}
