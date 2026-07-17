/**
 * Importa a planilha CONTROLE DE VENDAS V2 para a empresa seed (Bild Fitness).
 *
 * Uso:
 *   npx tsx scripts/import-planilha.ts "C:\Users\...\PLANILHA - CONTROLE DE VENDAS - V2.xlsx"
 */
import path from 'node:path';
import { ImportControleVendasUseCase } from '../src/modules/spreadsheet-import/application/import-planilha.usecase.js';
import { prisma } from '../src/shared/prisma.js';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  const filePath =
    process.argv[2] ||
    path.join(
      process.env.USERPROFILE || '',
      'Desktop',
      'PLANILHA - CONTROLE DE VENDAS - V2.xlsx',
    );

  console.log('Importando:', filePath);
  const usecase = new ImportControleVendasUseCase();
  const result = await usecase.executeFromPath(COMPANY_ID, filePath, path.basename(filePath));
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
