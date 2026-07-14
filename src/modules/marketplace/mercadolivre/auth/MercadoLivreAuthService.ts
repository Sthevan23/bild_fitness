import { prisma } from '@/lib/prisma';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { getMlConfig, mlFetch, ML_AUTH_BASE } from '../client';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id?: number;
  scope?: string;
};

export class MercadoLivreAuthService {
  static isConfigured() {
    return getMlConfig().configured;
  }

  static buildAuthUrl(state: string) {
    const { clientId, redirectUri, configured } = getMlConfig();
    if (!configured) throw new Error('Configure ML_CLIENT_ID e ML_CLIENT_SECRET no .env');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `${ML_AUTH_BASE}/authorization?${params.toString()}`;
  }

  static async exchangeCode(code: string) {
    const { clientId, clientSecret, redirectUri } = getMlConfig();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });
    return mlFetch<TokenResponse>('/oauth/token', { method: 'POST', body });
  }

  static async refresh(refreshToken: string) {
    const { clientId, clientSecret } = getMlConfig();
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
    return mlFetch<TokenResponse>('/oauth/token', { method: 'POST', body });
  }

  static async getUser(accessToken: string) {
    return mlFetch<{ id: number; nickname: string; first_name?: string; last_name?: string }>(
      '/users/me',
      { accessToken },
    );
  }

  /** Returns a valid access token, refreshing if needed. Never exposes tokens to callers outside services. */
  static async getValidAccessToken(connectionId: string): Promise<string> {
    const conn = await prisma.marketplaceConnection.findUnique({ where: { id: connectionId } });
    if (!conn || conn.status === 'DISCONNECTED') {
      throw new Error('Sua conta do Mercado Livre precisa ser reconectada.');
    }

    const bufferMs = 2 * 60 * 1000;
    if (conn.expiresAt.getTime() - Date.now() > bufferMs) {
      return decryptSecret(conn.accessTokenEnc);
    }

    try {
      const refreshToken = decryptSecret(conn.refreshTokenEnc);
      const tokens = await this.refresh(refreshToken);
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      await prisma.marketplaceConnection.update({
        where: { id: connectionId },
        data: {
          accessTokenEnc: encryptSecret(tokens.access_token),
          refreshTokenEnc: encryptSecret(tokens.refresh_token || refreshToken),
          expiresAt,
          status: 'CONNECTED',
          lastSyncError: null,
        },
      });
      return tokens.access_token;
    } catch {
      await prisma.marketplaceConnection.update({
        where: { id: connectionId },
        data: {
          status: 'EXPIRED',
          lastSyncError: 'Sua conta do Mercado Livre precisa ser reconectada.',
        },
      });
      throw new Error('Sua conta do Mercado Livre precisa ser reconectada.');
    }
  }

  static async saveConnection(params: {
    companyId: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    sellerId: string;
    nickname: string;
    accountName?: string;
    scope?: string;
  }) {
    const expiresAt = new Date(Date.now() + params.expiresIn * 1000);
    return prisma.marketplaceConnection.upsert({
      where: {
        companyId_marketplace: {
          companyId: params.companyId,
          marketplace: 'MERCADO_LIVRE',
        },
      },
      create: {
        companyId: params.companyId,
        marketplace: 'MERCADO_LIVRE',
        sellerId: params.sellerId,
        nickname: params.nickname,
        accountName: params.accountName,
        accessTokenEnc: encryptSecret(params.accessToken),
        refreshTokenEnc: encryptSecret(params.refreshToken),
        expiresAt,
        status: 'CONNECTED',
        scope: params.scope,
        lastSyncError: null,
      },
      update: {
        sellerId: params.sellerId,
        nickname: params.nickname,
        accountName: params.accountName,
        accessTokenEnc: encryptSecret(params.accessToken),
        refreshTokenEnc: encryptSecret(params.refreshToken),
        expiresAt,
        status: 'CONNECTED',
        scope: params.scope,
        lastSyncError: null,
      },
    });
  }

  static async disconnect(companyId: string) {
    const conn = await prisma.marketplaceConnection.findUnique({
      where: {
        companyId_marketplace: { companyId, marketplace: 'MERCADO_LIVRE' },
      },
    });
    if (!conn) return;
    await prisma.marketplaceConnection.update({
      where: { id: conn.id },
      data: {
        status: 'DISCONNECTED',
        accessTokenEnc: encryptSecret('revoked'),
        refreshTokenEnc: encryptSecret('revoked'),
        expiresAt: new Date(0),
        lastSyncError: null,
      },
    });
  }
}
