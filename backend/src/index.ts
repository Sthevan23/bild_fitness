import { createApp } from './app.js';
import { env } from './config/env.js';
import { initPrisma } from './shared/prisma.js';

async function main() {
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`PEP Vendas API listening on :${env.PORT}`);
  });

  initPrisma()
    .then(() => console.log('[db] ready'))
    .catch((e) => console.error('[db] init failed:', e));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
