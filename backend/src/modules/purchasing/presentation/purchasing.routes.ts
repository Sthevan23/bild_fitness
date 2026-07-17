import { Router } from 'express';
import {
  ConfirmDeliveryUseCase,
  CreateDeliveryUseCase,
  ListDeliveriesUseCase,
  ReorderSuggestionUseCase,
} from '../application/purchasing.usecases.js';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';
import { isAppError } from '../../../shared/errors.js';
import type { PurchaseDeliveryStatus } from '@prisma/client';

export const purchasingRouter = Router();
const list = new ListDeliveriesUseCase();
const create = new CreateDeliveryUseCase();
const confirm = new ConfirmDeliveryUseCase();
const suggestions = new ReorderSuggestionUseCase();

purchasingRouter.use(authMiddleware);

purchasingRouter.get('/deliveries', async (req: AuthedRequest, res) => {
  try {
    const rows = await list.execute(
      req.user!.companyId,
      req.cookies?.bild_active_account,
      (req.query.status as PurchaseDeliveryStatus | 'ALL') || 'ALL',
    );
    res.json({ deliveries: rows });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

purchasingRouter.post('/deliveries', async (req: AuthedRequest, res) => {
  try {
    const result = await create.execute(
      req.user!.companyId,
      req.cookies?.bild_active_account,
      req.body,
      req.user!.id,
    );
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

purchasingRouter.post('/deliveries/:id/confirm', async (req: AuthedRequest, res) => {
  try {
    const result = await confirm.execute(req.user!.companyId, String(req.params.id), req.user!.id);
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

purchasingRouter.get('/suggestions', async (req: AuthedRequest, res) => {
  try {
    const data = await suggestions.execute(
      req.user!.companyId,
      req.cookies?.bild_active_account,
      req.query.from ? String(req.query.from) : undefined,
      req.query.to ? String(req.query.to) : undefined,
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});
