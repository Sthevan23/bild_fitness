import { prisma } from '../../../shared/prisma.js';
import {
  ensureSalesAccountRows,
  resolveActiveAccount,
  syncProductTotalStock,
} from '../../accounts/infrastructure/accounts.repo.js';
import { calcSaleEconomics } from './planilha-parser.js';
import { parseMlVendasFile, parseMlVendasWorkbook, type ParsedMlVenda } from './ml-vendas-parser.js';

export type ImportMlVendasResult = {
  ok: true;
  importId: string;
  accountCode: string;
  salesImported: number;
  salesUpdated: number;
  salesSkipped: number;
  productsCreated: number;
  customersUpserted: number;
  stockMovements: number;
};

function toNum(v: unknown) {
  return Number(v) || 0;
}

export class ImportMlVendasUseCase {
  async executeFromPath(
    companyId: string,
    filePath: string,
    activeCode: string | undefined,
    fileName?: string,
    userId?: string,
  ) {
    const rows = parseMlVendasFile(filePath);
    return this.persist(companyId, rows, fileName || filePath, activeCode, userId);
  }

  async executeFromBuffer(
    companyId: string,
    buffer: Buffer,
    fileName: string,
    activeCode: string | undefined,
    userId?: string,
  ) {
    const rows = parseMlVendasWorkbook(buffer);
    return this.persist(companyId, rows, fileName, activeCode, userId);
  }

  private async persist(
    companyId: string,
    rows: ParsedMlVenda[],
    fileName: string,
    activeCode: string | undefined,
    userId?: string,
  ): Promise<ImportMlVendasResult> {
    const accounts = await ensureSalesAccountRows(companyId);
    const account = await resolveActiveAccount(companyId, activeCode);

    const batch = await prisma.spreadsheetImport.create({
      data: {
        companyId,
        fileName,
        status: 'PENDING',
        message: `ML Vendas BR · conta ${account.code}`,
      },
    });

    let salesImported = 0;
    let salesUpdated = 0;
    let salesSkipped = 0;
    let productsCreated = 0;
    let customersUpserted = 0;
    let stockMovements = 0;
    const touchedProducts = new Set<string>();

    const taxRow = await prisma.accountTaxRate.findFirst({
      where: { companyId, accountId: account.id, channel: 'ML' },
    });
    const taxRate = taxRow ? Number(taxRow.ratePercent) : 0;

    // Prefetch em lote para evitar N+1
    const skus = [...new Set(rows.map((r) => r.sku).filter(Boolean))];
    const externalIds = [...new Set(rows.map((r) => r.externalSaleId).filter(Boolean))];
    const docs = [
      ...new Set(rows.map((r) => r.document).filter((d): d is string => Boolean(d))),
    ];

    const [existingProducts, existingOrders, existingCustomersByDoc] = await Promise.all([
      skus.length
        ? prisma.product.findMany({ where: { companyId, sku: { in: skus } } })
        : Promise.resolve([]),
      externalIds.length
        ? prisma.order.findMany({
            where: { companyId, externalId: { in: externalIds } },
            include: { items: true },
          })
        : Promise.resolve([]),
      docs.length
        ? prisma.customer.findMany({ where: { companyId, document: { in: docs } } })
        : Promise.resolve([]),
    ]);

    const productBySku = new Map(existingProducts.map((p) => [p.sku, p]));
    const orderByExternal = new Map(
      existingOrders.filter((o) => o.externalId).map((o) => [o.externalId!, o]),
    );
    const customerByDoc = new Map(
      existingCustomersByDoc.filter((c) => c.document).map((c) => [c.document!, c]),
    );
    const customerByName = new Map<string, (typeof existingCustomersByDoc)[0]>();

    try {
      for (const sale of rows) {
        if (!sale.sku || sale.units <= 0) {
          salesSkipped += 1;
          continue;
        }

        let product = productBySku.get(sale.sku) || null;
        if (!product) {
          product = await prisma.product.create({
            data: {
              companyId,
              sku: sale.sku,
              name: sale.title || sale.sku,
              costPrice: 0,
              avgCost: 0,
              salePrice: sale.units > 0 ? sale.revenueProducts / sale.units : 0,
              unit: 'UN',
              mlItemId: sale.mlItemId,
              stock: 0,
              minStock: 5,
            },
          });
          productsCreated += 1;
          productBySku.set(sale.sku, product);
          await prisma.accountStock.createMany({
            data: accounts.map((acc) => ({
              accountId: acc.id,
              productId: product!.id,
              stock: 0,
              minStock: 5,
            })),
            skipDuplicates: true,
          });
        } else if (sale.mlItemId && !product.mlItemId) {
          product = await prisma.product.update({
            where: { id: product.id },
            data: { mlItemId: sale.mlItemId },
          });
          productBySku.set(sale.sku, product);
        }

        let customerId: string | null = null;
        if (sale.document || sale.buyerName) {
          let customer =
            (sale.document ? customerByDoc.get(sale.document) : undefined) ||
            (sale.buyerName ? customerByName.get(sale.buyerName) : undefined) ||
            null;
          if (!customer && sale.buyerName && !sale.document) {
            customer = await prisma.customer.findFirst({
              where: { companyId, name: sale.buyerName },
            });
            if (customer) customerByName.set(sale.buyerName, customer);
          }
          if (customer) {
            customer = await prisma.customer.update({
              where: { id: customer.id },
              data: {
                name: sale.buyerName || customer.name,
                document: sale.document || customer.document,
                phone: sale.phone || customer.phone,
                address: sale.address || customer.address,
                city: sale.city || customer.city,
                state: sale.state || customer.state,
                marketplace: 'MERCADO_LIVRE',
              },
            });
          } else {
            customer = await prisma.customer.create({
              data: {
                companyId,
                name: sale.buyerName || sale.document || 'Cliente ML',
                document: sale.document,
                phone: sale.phone,
                address: sale.address,
                city: sale.city,
                state: sale.state,
                marketplace: 'MERCADO_LIVRE',
                externalId: sale.externalSaleId,
              },
            });
          }
          if (customer.document) customerByDoc.set(customer.document, customer);
          if (customer.name) customerByName.set(customer.name, customer);
          customerId = customer.id;
          customersUpserted += 1;
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
            status: sale.statusRaw,
            mlItemId: sale.mlItemId,
            rawJson: JSON.stringify(sale).slice(0, 50_000),
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
            status: sale.statusRaw,
            mlItemId: sale.mlItemId,
            importBatchId: batch.id,
          },
        });

        const unitPrice = sale.units > 0 ? sale.revenueProducts / sale.units : sale.revenueProducts;
        const economics = calcSaleEconomics({
          revenueProducts: sale.revenueProducts,
          netTotal: sale.total,
          unitCost: toNum(product.costPrice),
          units: sale.units,
          taxRatePercent: taxRate,
        });

        const existingOrder = orderByExternal.get(sale.externalSaleId);

        const orderPayload = {
          accountId: account.id,
          total: sale.revenueProducts,
          freight: sale.shippingFees,
          marketplaceFee: sale.fees,
          netAmount: sale.total,
          orderedAt: sale.soldAt || new Date(),
          customerId: customerId,
          status: sale.status,
          trackingCode: sale.trackingCode,
          notes: [sale.title, sale.carrier].filter(Boolean).join(' · '),
        };

        if (existingOrder) {
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              ...orderPayload,
              customerId: customerId || existingOrder.customerId,
              orderedAt: sale.soldAt || existingOrder.orderedAt,
            },
          });
          if (existingOrder.items[0]) {
            await prisma.orderItem.update({
              where: { id: existingOrder.items[0].id },
              data: {
                productId: product.id,
                quantity: sale.units,
                unitPrice,
                totalPrice: sale.revenueProducts,
                productCost: economics.productCost,
                taxAmount: economics.taxAmount,
                grossProfit: economics.grossProfit,
                marginPercent: economics.marginPercent,
              },
            });
          } else {
            await prisma.orderItem.create({
              data: {
                orderId: existingOrder.id,
                productId: product.id,
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

          if (!existingOrder.stockDeducted && sale.status !== 'CANCELADO') {
            await this.deductStock({
              companyId,
              accountId: account.id,
              productId: product.id,
              quantity: sale.units,
              orderId: existingOrder.id,
              orderNumber: existingOrder.number,
              unitCost: toNum(product.avgCost),
              userId,
            });
            await prisma.order.update({
              where: { id: existingOrder.id },
              data: { stockDeducted: true },
            });
            stockMovements += 1;
            touchedProducts.add(product.id);
          }
          salesUpdated += 1;
        } else {
          const number = `ML-${sale.externalSaleId}`;
          const created = await prisma.order.create({
            data: {
              companyId,
              number,
              externalId: sale.externalSaleId,
              platform: 'MERCADO_LIVRE',
              stockDeducted: false,
              ...orderPayload,
              items: {
                create: {
                  productId: product.id,
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
            include: { items: true },
          });
          orderByExternal.set(sale.externalSaleId, created);

          if (sale.status !== 'CANCELADO') {
            await this.deductStock({
              companyId,
              accountId: account.id,
              productId: product.id,
              quantity: sale.units,
              orderId: created.id,
              orderNumber: number,
              unitCost: toNum(product.avgCost),
              userId,
            });
            await prisma.order.update({
              where: { id: created.id },
              data: { stockDeducted: true },
            });
            stockMovements += 1;
            touchedProducts.add(product.id);
          }
          salesImported += 1;
        }
      }

      for (const id of touchedProducts) await syncProductTotalStock(id);

      await prisma.spreadsheetImport.update({
        where: { id: batch.id },
        data: {
          status: 'CONFIRMED',
          message: `imported=${salesImported}; updated=${salesUpdated}; skipped=${salesSkipped}; products=${productsCreated}`,
        },
      });

      return {
        ok: true,
        importId: batch.id,
        accountCode: account.code,
        salesImported,
        salesUpdated,
        salesSkipped,
        productsCreated,
        customersUpserted,
        stockMovements,
      };
    } catch (e) {
      await prisma.spreadsheetImport.update({
        where: { id: batch.id },
        data: {
          status: 'FAILED',
          message: e instanceof Error ? e.message : 'Falha na importação ML',
        },
      });
      throw e;
    }
  }

  private async deductStock(input: {
    companyId: string;
    accountId: string;
    productId: string;
    quantity: number;
    orderId: string;
    orderNumber: string;
    unitCost: number;
    userId?: string;
  }) {
    const stockRow = await prisma.accountStock.upsert({
      where: {
        accountId_productId: { accountId: input.accountId, productId: input.productId },
      },
      create: {
        accountId: input.accountId,
        productId: input.productId,
        stock: 0,
        minStock: 5,
      },
      update: {},
    });
    // Permite negativo no import diário (histórico pode chegar antes da entrada)
    await prisma.accountStock.update({
      where: { id: stockRow.id },
      data: { stock: { decrement: input.quantity } },
    });
    await prisma.stockMovement.create({
      data: {
        companyId: input.companyId,
        accountId: input.accountId,
        productId: input.productId,
        type: 'SAIDA',
        quantity: input.quantity,
        unitCost: input.unitCost,
        totalCost: input.quantity * input.unitCost,
        orderId: input.orderId,
        userId: input.userId,
        note: `Import ML · pedido #${input.orderNumber}`,
      },
    });
  }
}
