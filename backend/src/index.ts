import { createApp } from './app.js';
import { env } from './config/env.js';
import { initPrisma } from './shared/prisma.js';

async function main() {
  try {
    await initPrisma();
  } catch (e) {
    console.error('Falha ao conectar no MySQL:', e);
    // Keep process alive so /health still answers; login will fail with clear error.
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`PEP Vendas API listening on :${env.PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
