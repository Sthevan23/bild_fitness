import { prisma } from '../../../shared/prisma.js';
import { env } from '../../../config/env.js';
import { decryptSecret, encryptSecret } from '../../../shared/crypto.js';
import { AppError } from '../../../shared/errors.js';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
};

const ML_API = 'https://api.mercadolibre.com';
const ML_AUTH = 'https://auth.mercadolivre.com.br';

export class MercadoLivreAuthService {
  static isConfigured() {
    return !!(env.ML_CLIENT_ID && env.ML_CLIENT_SECRET && env.ML_REDIRECT_URI);
  }

  static buildAuthUrl(state: string) {
    if (!this.isConfigured()) throw new AppError('ML não configurado');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.ML_CLIENT_ID!,
      redirect_uri: env.ML_REDIRECT_URI!,
      state,
    });
    return `${ML_AUTH}/authorization?${params}`;
  }

  static async exchangeCode(code: string) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.ML_CLIENT_ID!,
      client_secret: env.ML_CLIENT_SECRET!,
      code,
      redirect_uri: env.ML_REDIRECT_URI!,
    });
    const res = await fetch(`${ML_API}/oauth/token`, { method: 'POST', body });
    if (!res.ok) throw new AppError('Falha ao trocar código OAuth ML');
    return (await res.json()) as TokenResponse;
  }

  static async getUser(accessToken: string) {
    const res = await fetch(`${ML_API}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new AppError('Falha ao obter usuário ML');
    return (await res.json()) as { id: number; nickname: string; first_name?: string; last_name?: string };
  }

  static async saveConnection(params: {
    companyId: string;
    accountId: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    sellerId: string;
    nickname: string;
    accountName?: string;
    scope?: string;
  }) {
    const data = {
      sellerId: params.sellerId,
      nickname: params.nickname,
      accountName: params.accountName,
      accessTokenEnc: encryptSecret(params.accessToken),
      refreshTokenEnc: encryptSecret(params.refreshToken),
      expiresAt: new Date(Date.now() + params.expiresIn * 1000),
      status: 'CONNECTED' as const,
      scope: params.scope,
      lastSyncError: null,
      accountId: params.accountId,
    };
    const existing = await prisma.marketplaceConnection.findFirst({
      where: {
        companyId: params.companyId,
        marketplace: 'MERCADO_LIVRE',
        accountId: params.accountId,
      },
    });
    if (existing) {
      return prisma.marketplaceConnection.update({ where: { id: existing.id }, data });
    }
    return prisma.marketplaceConnection.create({
      data: { companyId: params.companyId, marketplace: 'MERCADO_LIVRE', ...data },
    });
  }

  static async getValidAccessToken(connectionId: string) {
    const conn = await prisma.marketplaceConnection.findUnique({ where: { id: connectionId } });
    if (!conn || conn.status === 'DISCONNECTED') {
      throw new AppError('Sua conta do Mercado Livre precisa ser reconectada.');
    }
    if (conn.expiresAt.getTime() - Date.now() > 2 * 60 * 1000) {
      return decryptSecret(conn.accessTokenEnc);
    }
    const refreshToken = decryptSecret(conn.refreshTokenEnc);
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.ML_CLIENT_ID!,
      client_secret: env.ML_CLIENT_SECRET!,
      refresh_token: refreshToken,
    });
    const res = await fetch(`${ML_API}/oauth/token`, { method: 'POST', body });
    if (!res.ok) {
      await prisma.marketplaceConnection.update({
        where: { id: connectionId },
        data: { status: 'EXPIRED', lastSyncError: 'Reconecte a conta ML' },
      });
      throw new AppError('Sua conta do Mercado Livre precisa ser reconectada.');
    }
    const tokens = (await res.json()) as TokenResponse;
    await prisma.marketplaceConnection.update({
      where: { id: connectionId },
      data: {
        accessTokenEnc: encryptSecret(tokens.access_token),
        refreshTokenEnc: encryptSecret(tokens.refresh_token || refreshToken),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        status: 'CONNECTED',
        lastSyncError: null,
      },
    });
    return tokens.access_token;
  }
}
