import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { SessionUser } from '@pep/shared';
import { AppError } from './errors.js';

export type AuthedRequest = Request & { user?: SessionUser };

const COOKIE_NAME = 'bild_token';

export function signToken(user: SessionUser) {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function authMiddleware(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || req.cookies?.[COOKIE_NAME];
    if (!token) throw new AppError('Não autenticado', 401);
    const payload = jwt.verify(token, env.JWT_SECRET) as SessionUser;
    req.user = payload;
    next();
  } catch {
    next(new AppError('Não autenticado', 401));
  }
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || req.cookies?.[COOKIE_NAME];
    if (token) req.user = jwt.verify(token, env.JWT_SECRET) as SessionUser;
  } catch {
    /* ignore */
  }
  next();
}
