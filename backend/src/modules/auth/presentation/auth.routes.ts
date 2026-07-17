import { Router } from 'express';
import { LoginUseCase, RegisterUseCase, MeUseCase, UpdateThemeUseCase } from '../application/auth.usecases.js';
import {
  authMiddleware,
  setAuthCookie,
  clearAuthCookie,
  signToken,
  type AuthedRequest,
} from '../../../shared/auth.js';
import { isAppError } from '../../../shared/errors.js';

export const authRouter = Router();
const login = new LoginUseCase();
const register = new RegisterUseCase();
const me = new MeUseCase();
const updateTheme = new UpdateThemeUseCase();

authRouter.post('/login', async (req, res) => {
  try {
    const user = await login.execute(req.body);
    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ ok: true, user, token });
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Falha no login' });
  }
});

authRouter.post('/register', async (req, res) => {
  try {
    const result = await register.execute(req.body);
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Falha no cadastro' });
  }
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const user = await me.execute(req.user!.id);
    res.json({ user });
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 401;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Não autenticado' });
  }
});

authRouter.patch('/theme', authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const result = await updateTheme.execute(req.user!.companyId, req.body);
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro ao salvar tema' });
  }
});
