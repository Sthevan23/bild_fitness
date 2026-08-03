import { Router } from 'express';
import {
  GetAccountsHubUseCase,
  ListAccountsUseCase,
  SetActiveAccountUseCase,
  UpdateAccountUseCase,
  GetMarginSettingsUseCase,
  UpdateMarginSettingsUseCase,
} from '../application/accounts.usecases.js';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';
import { isAppError } from '../../../shared/errors.js';
import { env } from '../../../config/env.js';

export const accountsRouter = Router();
const list = new ListAccountsUseCase();
const hub = new GetAccountsHubUseCase();
const update = new UpdateAccountUseCase();
const setActive = new SetActiveAccountUseCase();
const getMargin = new GetMarginSettingsUseCase();
const updateMargin = new UpdateMarginSettingsUseCase();

const ACTIVE_COOKIE = 'bild_active_account';

accountsRouter.use(authMiddleware);

accountsRouter.get('/', async (req: AuthedRequest, res) => {
  try {
    const accounts = await list.execute(req.user!.companyId);
    res.json({ accounts });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

accountsRouter.get('/hub', async (req: AuthedRequest, res) => {
  try {
    const active = req.cookies?.[ACTIVE_COOKIE] || req.query.code;
    const data = await hub.execute(req.user!.companyId, String(active || 'P&P'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

accountsRouter.get('/active', async (req: AuthedRequest, res) => {
  const code = req.cookies?.[ACTIVE_COOKIE] || 'P&P';
  res.json({ code });
});

accountsRouter.post('/active', async (req: AuthedRequest, res) => {
  try {
    const result = await setActive.execute(req.user!.companyId, req.body);
    res.cookie(ACTIVE_COOKIE, result.code, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: env.cookieSecure ? 'none' : 'lax',
      secure: env.cookieSecure,
    });
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

accountsRouter.get('/margin-settings', async (req: AuthedRequest, res) => {
  try {
    const data = await getMargin.execute(req.user!.companyId, req.cookies?.[ACTIVE_COOKIE]);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

accountsRouter.patch('/margin-settings', async (req: AuthedRequest, res) => {
  try {
    const result = await updateMargin.execute(
      req.user!.companyId,
      req.cookies?.[ACTIVE_COOKIE],
      req.body,
    );
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

accountsRouter.patch('/:code', async (req: AuthedRequest, res) => {
  try {
    const result = await update.execute(req.user!.companyId, {
      code: decodeURIComponent(String(req.params.code)),
      ...req.body,
    });
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});
