import { createApp } from './app.js';
import { env } from './config/env.js';
import { initPrisma } from './shared/prisma.js';

async function main() {
  // Conecta DB antes de aceitar tráfego — evita login em promise “presa”
  try {
    await initPrisma();
  } catch (e) {
    console.error('[db] boot connect failed (API sobe mesmo assim):', e);
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
