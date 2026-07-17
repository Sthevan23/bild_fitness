import { Router } from 'express';
import {
  CreateFinanceUseCase,
  FinanceSummaryUseCase,
  ListFinanceUseCase,
} from '../application/finance.usecases.js';
import { ListCostAllocationsUseCase } from '../application/allocations.usecases.js';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';
import { isAppError } from '../../../shared/errors.js';
import type { FinanceType } from '@prisma/client';

export const financeRouter = Router();
const list = new ListFinanceUseCase();
const create = new CreateFinanceUseCase();
const summary = new FinanceSummaryUseCase();
const allocations = new ListCostAllocationsUseCase();

financeRouter.use(authMiddleware);

financeRouter.get('/', async (req: AuthedRequest, res) => {
  try {
    const entries = await list.execute(
      req.user!.companyId,
      req.cookies?.bild_active_account,
      (req.query.type as FinanceType | 'ALL') || 'ALL',
    );
    res.json({ entries });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

financeRouter.get('/summary', async (req: AuthedRequest, res) => {
  try {
    const data = await summary.execute(req.user!.companyId, req.cookies?.bild_active_account);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

financeRouter.get('/allocations', async (req: AuthedRequest, res) => {
  try {
    const data = await allocations.execute(
      req.user!.companyId,
      req.cookies?.bild_active_account,
      req.query.month ? String(req.query.month) : undefined,
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

financeRouter.post('/', async (req: AuthedRequest, res) => {
  try {
    const result = await create.execute(req.user!.companyId, req.body, req.cookies?.bild_active_account);
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});
