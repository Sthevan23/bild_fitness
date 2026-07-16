import { Router } from 'express';
import { GetDashboardUseCase } from '../application/dashboard.usecases.js';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';

export const dashboardRouter = Router();
const getDashboard = new GetDashboardUseCase();

dashboardRouter.use(authMiddleware);

dashboardRouter.get('/', async (req: AuthedRequest, res) => {
  try {
    const data = await getDashboard.execute(req.user!.companyId, req.cookies?.bild_active_account);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro' });
  }
});
