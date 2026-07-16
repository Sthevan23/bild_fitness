import { Router } from 'express';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';

export const nfeRouter = Router();
nfeRouter.use(authMiddleware);

nfeRouter.get('/imports', async (_req: AuthedRequest, res) => {
  res.json({ imports: [], message: 'NF-e module endpoint ready — port parsers from legacy services' });
});

nfeRouter.post('/import', async (_req: AuthedRequest, res) => {
  res.status(501).json({ error: 'Use o fluxo legado temporariamente; parser NF-e será portado na próxima iteração' });
});
