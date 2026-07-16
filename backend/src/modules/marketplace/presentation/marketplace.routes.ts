import { Router } from 'express';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';
import { prisma } from '../../../shared/prisma.js';
import { resolveActiveAccount } from '../../accounts/infrastructure/accounts.repo.js';
import { env } from '../../../config/env.js';
import { randomBytes } from 'crypto';
import { MercadoLivreAuthService } from '../infrastructure/MercadoLivreAuthService.js';
import { SyncMercadoLivreUseCase } from '../application/sync.usecase.js';
import { isAppError } from '../../../shared/errors.js';
import { encryptSecret } from '../../../shared/crypto.js';

export const marketplaceRouter = Router();
const syncUc = new SyncMercadoLivreUseCase();

const oauthStates = new Map<
  string,
  { companyId: string; accountId: string; accountCode: string; expires: number }
>();

marketplaceRouter.use(authMiddleware);

marketplaceRouter.get('/mercadolivre/status', async (req: AuthedRequest, res) => {
  try {
    const account = await resolveActiveAccount(req.user!.companyId, req.cookies?.bild_active_account);
    const connection = await prisma.marketplaceConnection.findFirst({
      where: {
        companyId: req.user!.companyId,
        marketplace: 'MERCADO_LIVRE',
        accountId: account.id,
      },
      select: {
        id: true,
        status: true,
        nickname: true,
        sellerId: true,
        lastSyncAt: true,
        lastSyncError: true,
        accountName: true,
      },
    });
    res.json({
      configured: MercadoLivreAuthService.isConfigured(),
      account: { id: account.id, code: account.code, name: account.name, cnpj: account.cnpj },
      connection,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

marketplaceRouter.post('/mercadolivre/connect', async (req: AuthedRequest, res) => {
  try {
    if (!MercadoLivreAuthService.isConfigured()) {
      res.status(400).json({ error: 'Configure ML_CLIENT_ID, ML_CLIENT_SECRET e ML_REDIRECT_URI' });
      return;
    }
    const code = req.body?.accountCode || req.cookies?.bild_active_account;
    const account = await resolveActiveAccount(req.user!.companyId, code);
    const state = randomBytes(24).toString('hex');
    oauthStates.set(state, {
      companyId: req.user!.companyId,
      accountId: account.id,
      accountCode: account.code,
      expires: Date.now() + 15 * 60 * 1000,
    });
    res.json({ url: MercadoLivreAuthService.buildAuthUrl(state) });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

marketplaceRouter.post('/mercadolivre/disconnect', async (req: AuthedRequest, res) => {
  try {
    const account = await resolveActiveAccount(
      req.user!.companyId,
      req.body?.accountCode || req.cookies?.bild_active_account,
    );
    await prisma.marketplaceConnection.updateMany({
      where: {
        companyId: req.user!.companyId,
        marketplace: 'MERCADO_LIVRE',
        accountId: account.id,
      },
      data: {
        status: 'DISCONNECTED',
        accessTokenEnc: encryptSecret('revoked'),
        refreshTokenEnc: encryptSecret('revoked'),
        expiresAt: new Date(0),
      },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

marketplaceRouter.post('/mercadolivre/sync', async (req: AuthedRequest, res) => {
  try {
    const result = await syncUc.execute(
      req.user!.companyId,
      req.body?.accountCode || req.cookies?.bild_active_account,
    );
    res.json({ ok: true, result });
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

export async function mercadolivreCallbackHandler(
  req: import('express').Request,
  res: import('express').Response,
) {
  const base = env.CORS_ORIGIN || 'http://localhost:3000';
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;
  if (error) {
    res.redirect(`${base}/contas/?error=${encodeURIComponent('Autorização cancelada')}`);
    return;
  }
  if (!code || !state) {
    res.redirect(`${base}/contas/?error=${encodeURIComponent('OAuth inválido')}`);
    return;
  }
  const entry = oauthStates.get(state);
  oauthStates.delete(state);
  if (!entry || entry.expires < Date.now()) {
    res.redirect(`${base}/contas/?error=${encodeURIComponent('Sessão OAuth expirada')}`);
    return;
  }
  try {
    const tokens = await MercadoLivreAuthService.exchangeCode(code);
    const user = await MercadoLivreAuthService.getUser(tokens.access_token);
    await MercadoLivreAuthService.saveConnection({
      companyId: entry.companyId,
      accountId: entry.accountId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      sellerId: String(user.id),
      nickname: user.nickname,
      accountName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.nickname,
      scope: tokens.scope,
    });
    void syncUc.execute(entry.companyId, entry.accountCode).catch(() => undefined);
    res.redirect(`${base}/contas/?connected=1&account=${entry.accountCode}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao conectar ML';
    res.redirect(`${base}/contas/?error=${encodeURIComponent(message)}`);
  }
}
