import { Router } from 'express';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';
import { ListCustomersUseCase } from '../application/customers.usecases.js';

export const customersRouter = Router();
const list = new ListCustomersUseCase();

customersRouter.use(authMiddleware);

customersRouter.get('/', async (req: AuthedRequest, res) => {
  try {
    const result = await list.execute(req.user!.companyId, {
      search: req.query.search ? String(req.query.search) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});
