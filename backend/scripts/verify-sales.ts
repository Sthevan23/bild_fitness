import { ListSalesUseCase } from '../src/modules/sales/application/sales.usecases.js';
import { prisma } from '../src/shared/prisma.js';

const companyId = '00000000-0000-0000-0000-000000000001';

async function main() {
  const uc = new ListSalesUseCase();
  const pcp = await uc.execute(companyId, 'PCP', { period: 'all' });
  console.log('PCP totals', pcp.totals);
  console.log(
    'sample',
    pcp.rows.slice(0, 3).map((r) => ({
      sku: r.sku,
      qtd: r.quantity,
      venda: r.grossRevenue,
      custo: r.productCost,
      lucro: Number(r.grossProfit.toFixed(2)),
      margem: Number(r.marginPercent.toFixed(2)),
    })),
  );
  const pp = await uc.execute(companyId, 'P&P', { period: 'all' });
  console.log('P&P count', pp.totals.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
