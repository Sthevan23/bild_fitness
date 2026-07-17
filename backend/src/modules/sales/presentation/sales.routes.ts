import { Router } from 'express';
import { ListSalesUseCase } from '../application/sales.usecases.js';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';

export const salesRouter = Router();
const list = new ListSalesUseCase();

salesRouter.use(authMiddleware);

salesRouter.get('/', async (req: AuthedRequest, res) => {
  try {
    const active = req.cookies?.bild_active_account;
    const data = await list.execute(req.user!.companyId, active, {
      period: req.query.period ? String(req.query.period) : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});
