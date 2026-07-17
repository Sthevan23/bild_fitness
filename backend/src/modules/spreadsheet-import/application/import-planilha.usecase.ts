import { prisma } from '../../../shared/prisma.js';
import { ensureSalesAccountRows, syncProductTotalStock } from '../../accounts/infrastructure/accounts.repo.js';
import { applyDeliveryStockEntry } from '../../purchasing/application/delivery-stock.service.js';
import {
  calcSaleEconomics,
  parseControleVendasFile,
  parseControleVendasWorkbook,
  type ParsedSpreadsheet,
} from './planilha-parser.js';

function normalizeDesc(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export type ImportPlanilhaResult = {
  ok: true;
  importId: string;
  productsUpserted: number;
  kitsUpserted: number;
  taxRatesUpserted: number;
  salesImported: number;
  salesSkipped: number;
  stockUpdated: number;
  deliveriesImported: number;
  financeImported: number;
};

export class ImportControleVendasUseCase {
  async executeFromPath(companyId: string, filePath: string, fileName?: string): Promise<ImportPlanilhaResult> {
    const parsed = parseControleVendasFile(filePath);
    return this.persist(companyId, parsed, fileName || filePath);
  }

  async executeFromBuffer(companyId: string, buffer: Buffer, fileName: string): Promise<ImportPlanilhaResult> {
    const parsed = parseControleVendasWorkbook(buffer);
    return this.persist(companyId, parsed, fileName);
  }

  private async persist(
    companyId: string,
    parsed: ParsedSpreadsheet,
    fileName: string,
  ): Promise<ImportPlanilhaResult> {
    const accounts = await ensureSalesAccountRows(companyId);
    const accountByCode = new Map(accounts.map((a) => [a.code, a]));

    const batch = await prisma.spreadsheetImport.create({
      data: {
        companyId,
        fileName,
        status: 'PENDING',
      },
    });

    let productsUpserted = 0;
    let kitsUpserted = 0;
    let taxRatesUpserted = 0;
    let salesImported = 0;
    let salesSkipped = 0;
    let stockUpdated = 0;
    let deliveriesImported = 0;
    let financeImported = 0;

    try {
      // Model costs
      for (const mc of parsed.catalog.modelCosts) {
        await prisma.modelCost.upsert({
          where: { companyId_modelCode: { companyId, modelCode: mc.modelCode } },
          create: {
            companyId,
            modelCode: mc.modelCode,
            costPerKg: mc.costPerKg,
            supplier: mc.supplier,
          },
          update: { costPerKg: mc.costPerKg, supplier: mc.supplier },
        });
      }

      // Tax rates
      for (const tax of parsed.catalog.taxRates) {
        const account = accountByCode.get(tax.accountCode);
        if (!account) continue;
        await prisma.accountTaxRate.upsert({
          where: { accountId_channel: { accountId: account.id, channel: 'ML' } },
          create: {
            companyId,
            accountId: account.id,
            channel: 'ML',
            ratePercent: tax.ratePercent,
          },
          update: { ratePercent: tax.ratePercent },
        });
        taxRatesUpserted += 1;
      }

      // Products
      const productIdBySku = new Map<string, string>();
      for (const p of parsed.catalog.products) {
        const linked = p.linkedSkus.length ? p.linkedSkus.join(';') : null;
        const row = await prisma.product.upsert({
          where: { companyId_sku: { companyId, sku: p.sku } },
          create: {
            companyId,
            sku: p.sku,
            name: p.name,
            costPrice: p.costPrice,
            avgCost: p.costPrice,
            weightKg: p.weightKg,
            modelCode: p.modelCode,
            linkedSkus: linked,
            unit: 'UN',
          },
          update: {
            name: p.name !== p.sku ? p.name : undefined,
            costPrice: p.costPrice > 0 ? p.costPrice : undefined,
            avgCost: p.costPrice > 0 ? p.costPrice : undefined,
            weightKg: p.weightKg ?? undefined,
            modelCode: p.modelCode ?? undefined,
            linkedSkus: linked ?? undefined,
          },
        });
        productIdBySku.set(p.sku, row.id);
        productsUpserted += 1;

        for (const account of accounts) {
          await prisma.accountStock.upsert({
            where: { accountId_productId: { accountId: account.id, productId: row.id } },
            create: { accountId: account.id, productId: row.id, stock: 0, minStock: 5 },
            update: {},
          });
        }
      }

      // Fill missing kit component products
      for (const kit of parsed.catalog.kits) {
        if (!productIdBySku.has(kit.componentSku)) {
          const row = await prisma.product.upsert({
            where: { companyId_sku: { companyId, sku: kit.componentSku } },
            create: {
              companyId,
              sku: kit.componentSku,
              name: kit.componentSku,
              costPrice: 0,
              avgCost: 0,
              unit: 'UN',
            },
            update: {},
          });
          productIdBySku.set(kit.componentSku, row.id);
        }
        if (!productIdBySku.has(kit.kitSku)) {
          const row = await prisma.product.upsert({
            where: { companyId_sku: { companyId, sku: kit.kitSku } },
            create: {
              companyId,
              sku: kit.kitSku,
              name: kit.kitSku,
              costPrice: 0,
              avgCost: 0,
              unit: 'UN',
            },
            update: {},
          });
          productIdBySku.set(kit.kitSku, row.id);
        }

        const kitId = productIdBySku.get(kit.kitSku)!;
        const componentId = productIdBySku.get(kit.componentSku)!;
        await prisma.productKitComponent.upsert({
          where: {
            kitProductId_componentProductId: {
              kitProductId: kitId,
              componentProductId: componentId,
            },
          },
          create: {
            kitProductId: kitId,
            componentProductId: componentId,
            quantity: kit.quantity,
          },
          update: { quantity: kit.quantity },
        });
        kitsUpserted += 1;
      }

      // Enrich kit costs from components when missing
      for (const [sku, id] of productIdBySku) {
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product || Number(product.costPrice) > 0) continue;
        const comps = await prisma.productKitComponent.findMany({
          where: { kitProductId: id },
          include: { componentProduct: true },
        });
        if (!comps.length) continue;
        const cost = comps.reduce(
          (acc, c) => acc + Number(c.quantity) * Number(c.componentProduct.costPrice),
          0,
        );
        if (cost > 0) {
          await prisma.product.update({
            where: { id },
            data: { costPrice: cost, avgCost: cost },
          });
        }
        void sku;
      }

      const taxByAccountId = new Map<string, number>();
      const taxRows = await prisma.accountTaxRate.findMany({ where: { companyId, channel: 'ML' } });
      for (const t of taxRows) taxByAccountId.set(t.accountId, Number(t.ratePercent));

      // Sales (ML only — parser already scoped by VENDAS sections)
      for (const sale of parsed.sales) {
        const account = accountByCode.get(sale.accountCode);
        if (!account) {
          salesSkipped += 1;
          continue;
        }

        await prisma.mlSaleRaw.upsert({
          where: {
            companyId_externalSaleId: {
              companyId,
              externalSaleId: sale.externalSaleId,
            },
          },
          create: {
            companyId,
            accountId: account.id,
            externalSaleId: sale.externalSaleId,
            soldAt: sale.soldAt,
            sku: sale.sku,
            title: sale.title,
            units: sale.units,
            revenueProducts: sale.revenueProducts,
            fees: sale.fees,
            shippingRevenue: sale.shippingRevenue,
            shippingFees: sale.shippingFees,
            total: sale.total,
            buyerName: sale.buyerName,
            status: sale.status,
            mlItemId: sale.mlItemId,
            rawJson: JSON.stringify(sale.raw).slice(0, 50_000),
            importBatchId: batch.id,
          },
          update: {
            accountId: account.id,
            soldAt: sale.soldAt,
            sku: sale.sku,
            title: sale.title,
            units: sale.units,
            revenueProducts: sale.revenueProducts,
            fees: sale.fees,
            shippingRevenue: sale.shippingRevenue,
            shippingFees: sale.shippingFees,
            total: sale.total,
            buyerName: sale.buyerName,
            status: sale.status,
            mlItemId: sale.mlItemId,
            importBatchId: batch.id,
          },
        });

        let customerId: string | null = null;
        if (sale.buyerName) {
          const existing = await prisma.customer.findFirst({
            where: { companyId, name: sale.buyerName },
          });
          if (existing) customerId = existing.id;
          else {
            const created = await prisma.customer.create({
              data: {
                companyId,
                name: sale.buyerName,
                marketplace: 'MERCADO_LIVRE',
                externalId: sale.externalSaleId,
              },
            });
            customerId = created.id;
          }
        }

        let productId = sale.sku ? productIdBySku.get(sale.sku) : undefined;
        if (!productId && sale.sku) {
          const created = await prisma.product.create({
            data: {
              companyId,
              sku: sale.sku,
              name: sale.title || sale.sku,
              costPrice: 0,
              avgCost: 0,
              salePrice: sale.units > 0 ? sale.revenueProducts / sale.units : 0,
              unit: 'UN',
              mlItemId: sale.mlItemId,
            },
          });
          productId = created.id;
          productIdBySku.set(sale.sku, created.id);
          for (const acc of accounts) {
            await prisma.accountStock.upsert({
              where: { accountId_productId: { accountId: acc.id, productId: created.id } },
              create: { accountId: acc.id, productId: created.id, stock: 0, minStock: 5 },
              update: {},
            });
          }
        }
        if (!productId) {
          salesSkipped += 1;
          continue;
        }

        const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
        const taxRate = taxByAccountId.get(account.id) ?? 0;
        const unitPrice = sale.units > 0 ? sale.revenueProducts / sale.units : sale.revenueProducts;
        const economics = calcSaleEconomics({
          revenueProducts: sale.revenueProducts,
          netTotal: sale.total,
          unitCost: Number(product.costPrice),
          units: sale.units,
          taxRatePercent: taxRate,
        });

        const existingOrder = await prisma.order.findFirst({
          where: { companyId, externalId: sale.externalSaleId },
          include: { items: true },
        });

        if (existingOrder) {
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              accountId: account.id,
              total: sale.revenueProducts,
              freight: sale.shippingFees,
              marketplaceFee: sale.fees,
              netAmount: sale.total,
              orderedAt: sale.soldAt || existingOrder.orderedAt,
              customerId: customerId || existingOrder.customerId,
              status: 'ENTREGUE',
            },
          });
          if (existingOrder.items[0]) {
            await prisma.orderItem.update({
              where: { id: existingOrder.items[0].id },
              data: {
                productId,
                quantity: sale.units,
                unitPrice,
                totalPrice: sale.revenueProducts,
                productCost: economics.productCost,
                taxAmount: economics.taxAmount,
                grossProfit: economics.grossProfit,
                marginPercent: economics.marginPercent,
              },
            });
          }
        } else {
          const number = `ML-${sale.externalSaleId}`;
          await prisma.order.create({
            data: {
              companyId,
              accountId: account.id,
              number,
              externalId: sale.externalSaleId,
              customerId,
              platform: 'MERCADO_LIVRE',
              status: 'ENTREGUE',
              total: sale.revenueProducts,
              freight: sale.shippingFees,
              marketplaceFee: sale.fees,
              netAmount: sale.total,
              orderedAt: sale.soldAt || new Date(),
              notes: sale.title,
              items: {
                create: {
                  productId,
                  quantity: sale.units,
                  unitPrice,
                  totalPrice: sale.revenueProducts,
                  productCost: economics.productCost,
                  taxAmount: economics.taxAmount,
                  grossProfit: economics.grossProfit,
                  marginPercent: economics.marginPercent,
                },
              },
            },
          });
        }
        salesImported += 1;
      }

      // Stock snapshot by description → product name match
      const allProducts = await prisma.product.findMany({
        where: { companyId },
        select: { id: true, name: true, sku: true },
      });
      const byDesc = new Map(allProducts.map((p) => [normalizeDesc(p.name), p.id]));

      for (const row of parsed.stock) {
        const productId = byDesc.get(normalizeDesc(row.description));
        if (!productId) continue;
        for (const [code, qty] of Object.entries(row.byAccount)) {
          const account = accountByCode.get(code);
          if (!account || qty == null) continue;
          await prisma.accountStock.upsert({
            where: { accountId_productId: { accountId: account.id, productId } },
            create: { accountId: account.id, productId, stock: qty, minStock: 5 },
            update: { stock: qty },
          });
          stockUpdated += 1;
        }
        await syncProductTotalStock(productId);
      }

      // Deliveries
      for (const del of parsed.deliveries) {
        const account = accountByCode.get(del.accountCode);
        if (!account || !del.lines.length) continue;
        const created = await prisma.purchaseDelivery.create({
          data: {
            companyId,
            accountId: account.id,
            supplierName: del.supplierName,
            status: del.status,
            orderedAt: new Date(),
            deliveredAt: del.status === 'ENTREGA' ? new Date() : null,
            stockApplied: false,
            lines: {
              create: del.lines.map((line) => {
                const pid = byDesc.get(normalizeDesc(line.description)) || null;
                return {
                  productId: pid,
                  description: line.description,
                  quantity: line.quantity,
                  unitCost: 0,
                };
              }),
            },
          },
        });
        if (del.status === 'ENTREGA') {
          await applyDeliveryStockEntry(companyId, created.id);
        }
        deliveriesImported += 1;
      }

      // Financeiro (rateio)
      for (const fin of parsed.finance) {
        await prisma.costAllocation.upsert({
          where: {
            companyId_monthLabel_description: {
              companyId,
              monthLabel: fin.monthLabel,
              description: fin.description,
            },
          },
          create: {
            companyId,
            monthLabel: fin.monthLabel,
            category: fin.category,
            description: fin.description,
            amount: fin.amount,
            ratePcp: fin.ratePcp,
            rateRc: fin.rateRc,
            ratePp: fin.ratePp,
            allocatedPcp: fin.allocatedPcp,
            allocatedRc: fin.allocatedRc,
            allocatedPp: fin.allocatedPp,
          },
          update: {
            category: fin.category,
            amount: fin.amount,
            ratePcp: fin.ratePcp,
            rateRc: fin.rateRc,
            ratePp: fin.ratePp,
            allocatedPcp: fin.allocatedPcp,
            allocatedRc: fin.allocatedRc,
            allocatedPp: fin.allocatedPp,
          },
        });
        financeImported += 1;

        // Gera lançamento de saída por conta com valor alocado > 0
        for (const [code, allocated] of [
          ['PCP', fin.allocatedPcp],
          ['RC', fin.allocatedRc],
          ['P&P', fin.allocatedPp],
        ] as const) {
          if (allocated <= 0) continue;
          const acc = accountByCode.get(code);
          if (!acc) continue;
          const desc = `${fin.description} · ${fin.monthLabel} · ${code}`;
          const existing = await prisma.financeEntry.findFirst({
            where: { companyId, description: desc },
          });
          if (!existing) {
            await prisma.financeEntry.create({
              data: {
                companyId,
                type: 'SAIDA',
                status: 'PENDENTE',
                description: desc,
                amount: allocated,
                category: `${fin.category} · ${code}`,
              },
            });
          }
        }
      }

      await prisma.spreadsheetImport.update({
        where: { id: batch.id },
        data: {
          status: 'CONFIRMED',
          productsUpserted,
          salesImported,
          stockUpdated,
          deliveriesImported,
          financeImported,
          message: `kits=${kitsUpserted}; tax=${taxRatesUpserted}; skipped=${salesSkipped}`,
        },
      });

      return {
        ok: true,
        importId: batch.id,
        productsUpserted,
        kitsUpserted,
        taxRatesUpserted,
        salesImported,
        salesSkipped,
        stockUpdated,
        deliveriesImported,
        financeImported,
      };
    } catch (e) {
      await prisma.spreadsheetImport.update({
        where: { id: batch.id },
        data: {
          status: 'FAILED',
          message: e instanceof Error ? e.message : 'Falha na importação',
        },
      });
      throw e;
    }
  }
}
