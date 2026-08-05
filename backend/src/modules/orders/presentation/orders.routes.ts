import { Router } from 'express';
import { ListOrdersUseCase, UpdateOrderStatusUseCase } from '../application/orders.usecases.js';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';
import { isAppError } from '../../../shared/errors.js';
import type { OrderStatus, Platform } from '@prisma/client';

export const ordersRouter = Router();
const list = new ListOrdersUseCase();
const updateStatus = new UpdateOrderStatusUseCase();

ordersRouter.use(authMiddleware);

ordersRouter.get('/', async (req: AuthedRequest, res) => {
  try {
    const active = req.cookies?.bild_active_account;
    const orders = await list.execute(req.user!.companyId, active, {
      period: String(req.query.period || '730'),
      platform: (req.query.platform as Platform | 'ALL') || 'ALL',
      status: (req.query.status as OrderStatus | 'ALL') || 'ALL',
      search: req.query.search ? String(req.query.search) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ orders, limit: orders.length });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

ordersRouter.patch('/:id/status', async (req: AuthedRequest, res) => {
  try {
    const active = req.cookies?.bild_active_account;
    const result = await updateStatus.execute(
      req.user!.companyId,
      req.user!.id,
      String(req.params.id),
      req.body.status as OrderStatus,
      req.body.trackingCode,
      active,
    );
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});
