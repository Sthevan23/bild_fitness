import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { isAppError } from './shared/errors.js';
import { authRouter } from './modules/auth/presentation/auth.routes.js';
import { accountsRouter } from './modules/accounts/presentation/accounts.routes.js';
import { ordersRouter } from './modules/orders/presentation/orders.routes.js';
import { productsRouter } from './modules/products/presentation/products.routes.js';
import { dashboardRouter } from './modules/dashboard/presentation/dashboard.routes.js';
import { financeRouter } from './modules/finance/presentation/finance.routes.js';
import {
  marketplaceRouter,
  mercadolivreCallbackHandler,
} from './modules/marketplace/presentation/marketplace.routes.js';
import { nfeRouter } from './modules/nfe/presentation/nfe.routes.js';
import { spreadsheetImportRouter } from './modules/spreadsheet-import/presentation/spreadsheet-import.routes.js';
import { salesRouter } from './modules/sales/presentation/sales.routes.js';
import { purchasingRouter } from './modules/purchasing/presentation/purchasing.routes.js';

export function createApp() {
  const app = express();

  const origins = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(
    cors({
      origin: origins.length ? origins : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'pep-vendas-api', ts: new Date().toISOString() });
  });

  app.use('/auth', authRouter);
  app.use('/accounts', accountsRouter);
  app.use('/orders', ordersRouter);
  app.use('/products', productsRouter);
  app.use('/dashboard', dashboardRouter);
  app.use('/finance', financeRouter);
  app.use('/marketplace', marketplaceRouter);
  app.use('/nfe', nfeRouter);
  app.use('/imports', spreadsheetImportRouter);
  app.use('/sales', salesRouter);
  app.use('/purchasing', purchasingRouter);

  app.get('/marketplace/mercadolivre/callback', mercadolivreCallbackHandler);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = isAppError(err) ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'Erro interno';
    res.status(status).json({ error: message });
  });

  return app;
}
