import { ReorderSuggestionUseCase } from '../src/modules/purchasing/application/purchasing.usecases.js';
import { ListCostAllocationsUseCase } from '../src/modules/finance/application/allocations.usecases.js';
import { StockOverviewUseCase } from '../src/modules/products/application/products.usecases.js';
import { prisma } from '../src/shared/prisma.js';

const companyId = '00000000-0000-0000-0000-000000000001';

async function main() {
  const reorder = new ReorderSuggestionUseCase();
  const pcp = await reorder.execute(companyId, 'PCP', '2026-05-01', '2026-05-31');
  console.log(
    'reposicao PCP sample',
    pcp.rows.slice(0, 3).map((r) => ({
      desc: r.description.slice(0, 30),
      vendido: r.soldInPeriod,
      estoque: r.accountStock,
      sugestao: r.suggestionLabel,
    })),
  );

  const fin = new ListCostAllocationsUseCase();
  const alloc = await fin.execute(companyId, 'RC', 'JULHO');
  console.log('finance RC JULHO', alloc.totals, 'rows', alloc.rows.length);

  const stock = new StockOverviewUseCase();
  const ov = await stock.execute(companyId);
  console.log('estoque overview', ov.length, 'sample', ov.slice(0, 3));

  console.log({
    deliveries: await prisma.purchaseDelivery.count(),
    costAllocations: await prisma.costAllocation.count(),
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
