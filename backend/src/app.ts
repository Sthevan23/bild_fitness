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
import { spreadsheetImportRouter } from './modules/spreadsheet-import/presentation/spreadsheet-import.routes.js';
import { salesRouter } from './modules/sales/presentation/sales.routes.js';
import { purchasingRouter } from './modules/purchasing/presentation/purchasing.routes.js';
import { customersRouter } from './modules/customers/presentation/customers.routes.js';

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

  app.get('/health/db', async (_req, res) => {
    const started = Date.now();
    const mariadb = await import('mariadb');
    const attempts: Array<Record<string, unknown>> = [];

    const bases = [
      { label: 'tcp-127.0.0.1', host: '127.0.0.1', port: env.DB_PORT },
      { label: `tcp-${env.DB_HOST}`, host: env.DB_HOST, port: env.DB_PORT },
      { label: 'socket-mysqld', socketPath: '/var/run/mysqld/mysqld.sock' },
      { label: 'socket-tmp', socketPath: '/tmp/mysql.sock' },
    ];

    for (const attempt of bases) {
      const t0 = Date.now();
      const pool = mariadb.createPool({
        user: env.DB_USER,
        password: env.DB_PASS,
        database: env.DB_NAME,
        connectionLimit: 1,
        connectTimeout: 2500,
        ...attempt,
      });
      try {
        const conn = await pool.getConnection();
        const rows = await conn.query('SELECT 1 AS ok');
        conn.release();
        await pool.end().catch(() => undefined);
        res.json({
          ok: true,
          db: true,
          via: attempt.label,
          ms: Date.now() - started,
          host: env.DB_HOST,
          name: env.DB_NAME,
          user: env.DB_USER,
          rows,
          attempts,
        });
        return;
      } catch (e) {
        attempts.push({
          via: attempt.label,
          ms: Date.now() - t0,
          error: e instanceof Error ? e.message : String(e),
        });
        await pool.end().catch(() => undefined);
      }
    }

    res.status(500).json({
      ok: false,
      db: false,
      ms: Date.now() - started,
      host: env.DB_HOST,
      name: env.DB_NAME,
      user: env.DB_USER,
      hint: 'No hPanel → Bancos de dados, copie o hostname real. Se for remoto, ative Remote MySQL (%). Defina DB_HOST=127.0.0.1 ou o host mostrado no painel.',
      attempts,
    });
  });

  app.use('/auth', authRouter);
  app.use('/accounts', accountsRouter);
  app.use('/orders', ordersRouter);
  app.use('/products', productsRouter);
  app.use('/dashboard', dashboardRouter);
  app.use('/finance', financeRouter);
  app.use('/imports', spreadsheetImportRouter);
  app.use('/sales', salesRouter);
  app.use('/purchasing', purchasingRouter);
  app.use('/customers', customersRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = isAppError(err) ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'Erro interno';
    res.status(status).json({ error: message });
  });

  return app;
}
