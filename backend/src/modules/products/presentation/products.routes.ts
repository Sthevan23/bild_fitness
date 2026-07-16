import { Router } from 'express';
import {
  AdjustStockUseCase,
  CreateProductUseCase,
  DeleteProductUseCase,
  ListProductsUseCase,
} from '../application/products.usecases.js';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';
import { isAppError } from '../../../shared/errors.js';

export const productsRouter = Router();
const list = new ListProductsUseCase();
const create = new CreateProductUseCase();
const adjust = new AdjustStockUseCase();
const del = new DeleteProductUseCase();

productsRouter.use(authMiddleware);

productsRouter.get('/', async (req: AuthedRequest, res) => {
  try {
    const products = await list.execute(
      req.user!.companyId,
      req.cookies?.bild_active_account,
      req.query.search ? String(req.query.search) : undefined,
    );
    res.json({ products });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

productsRouter.post('/', async (req: AuthedRequest, res) => {
  try {
    const result = await create.execute(
      req.user!.companyId,
      req.body,
      req.cookies?.bild_active_account,
    );
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

productsRouter.post('/:id/stock', async (req: AuthedRequest, res) => {
  try {
    const result = await adjust.execute(
      req.user!.companyId,
      req.user!.id,
      String(req.params.id),
      req.body.type as 'ENTRADA' | 'SAIDA',
      Number(req.body.quantity),
      req.cookies?.bild_active_account,
    );
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});

productsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  try {
    const result = await del.execute(req.user!.companyId, String(req.params.id));
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});
