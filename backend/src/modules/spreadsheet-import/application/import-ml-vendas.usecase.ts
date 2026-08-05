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

type SaleGroup = {
  externalSaleId: string;
  lines: ParsedMlVenda[];
};

function groupBySaleId(rows: ParsedMlVenda[]): SaleGroup[] {
  const map = new Map<string, ParsedMlVenda[]>();
  for (const row of rows) {
    if (!row.sku || row.units <= 0) continue;
    const list = map.get(row.externalSaleId) || [];
    list.push(row);
    map.set(row.externalSaleId, list);
  }
  return [...map.entries()].map(([externalSaleId, lines]) => ({ externalSaleId, lines }));
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

    const validRows = rows.filter((r) => r.sku && r.units > 0);
    salesSkipped = rows.length - validRows.length;
    const groups = groupBySaleId(validRows);

    const skus = [...new Set(validRows.map((r) => r.sku))];
    const externalIds = [...new Set(groups.map((g) => g.externalSaleId))];
    const docs = [
      ...new Set(validRows.map((r) => r.document).filter((d): d is string => Boolean(d))),
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
      for (const group of groups) {
        const primary =
          group.lines.find((l) => l.buyerName || l.document) || group.lines[0]!;

        // Garante produtos de todas as linhas
        for (const sale of group.lines) {
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
        }

        let customerId: string | null = null;
        if (primary.document || primary.buyerName) {
          let customer =
            (primary.document ? customerByDoc.get(primary.document) : undefined) ||
            (primary.buyerName ? customerByName.get(primary.buyerName) : undefined) ||
            null;
          if (!customer && primary.buyerName && !primary.document) {
            customer = await prisma.customer.findFirst({
              where: { companyId, name: primary.buyerName },
            });
            if (customer) customerByName.set(primary.buyerName, customer);
          }
          if (customer) {
            customer = await prisma.customer.update({
              where: { id: customer.id },
              data: {
                name: primary.buyerName || customer.name,
                document: primary.document || customer.document,
                phone: primary.phone || customer.phone,
                address: primary.address || customer.address,
                city: primary.city || customer.city,
                state: primary.state || customer.state,
                marketplace: 'MERCADO_LIVRE',
              },
            });
          } else {
            customer = await prisma.customer.create({
              data: {
                companyId,
                name: primary.buyerName || primary.document || 'Cliente ML',
                document: primary.document,
                phone: primary.phone,
                address: primary.address,
                city: primary.city,
                state: primary.state,
                marketplace: 'MERCADO_LIVRE',
                externalId: group.externalSaleId,
              },
            });
          }
          if (customer.document) customerByDoc.set(customer.document, customer);
          if (customer.name) customerByName.set(customer.name, customer);
          customerId = customer.id;
          customersUpserted += 1;
        }

        // Raw por linha (sku) para não sobrescrever pacotes
        for (const sale of group.lines) {
          const rawId =
            group.lines.length > 1
              ? `${sale.externalSaleId}:${sale.sku}`
              : sale.externalSaleId;
          await prisma.mlSaleRaw.upsert({
            where: {
              companyId_externalSaleId: {
                companyId,
                externalSaleId: rawId,
              },
            },
            create: {
              companyId,
              accountId: account.id,
              externalSaleId: rawId,
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
        }

        const itemPayloads = group.lines.map((sale) => {
          const product = productBySku.get(sale.sku)!;
          const unitPrice = sale.units > 0 ? sale.revenueProducts / sale.units : sale.revenueProducts;
          const economics = calcSaleEconomics({
            revenueProducts: sale.revenueProducts,
            netTotal: sale.total,
            unitCost: toNum(product.costPrice),
            units: sale.units,
            taxRatePercent: taxRate,
          });
          return {
            product,
            sale,
            unitPrice,
            economics,
          };
        });

        const orderTotal = itemPayloads.reduce((a, i) => a + i.sale.revenueProducts, 0);
        const orderFees = itemPayloads.reduce((a, i) => a + i.sale.fees, 0);
        const orderFreight = itemPayloads.reduce((a, i) => a + i.sale.shippingFees, 0);
        const orderNet = itemPayloads.reduce((a, i) => a + i.sale.total, 0);
        const titles = [...new Set(itemPayloads.map((i) => i.sale.title).filter(Boolean))];
        const status =
          itemPayloads.some((i) => i.sale.status === 'CANCELADO') &&
          itemPayloads.every((i) => i.sale.status === 'CANCELADO')
            ? ('CANCELADO' as const)
            : primary.status;

        const orderPayload = {
          accountId: account.id,
          total: orderTotal,
          freight: orderFreight,
          marketplaceFee: orderFees,
          netAmount: orderNet || orderTotal,
          orderedAt: primary.soldAt || new Date(),
          customerId,
          status,
          trackingCode: primary.trackingCode,
          notes: [titles.join(' · '), primary.carrier].filter(Boolean).join(' · ').slice(0, 500),
        };

        const existingOrder = orderByExternal.get(group.externalSaleId);

        if (existingOrder) {
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              ...orderPayload,
              customerId: customerId || existingOrder.customerId,
              orderedAt: primary.soldAt || existingOrder.orderedAt,
            },
          });

          // Sincroniza itens: upsert por productId
          const existingByProduct = new Map(existingOrder.items.map((it) => [it.productId, it]));
          const seenProducts = new Set<string>();

          for (const item of itemPayloads) {
            seenProducts.add(item.product.id);
            const prev = existingByProduct.get(item.product.id);
            if (prev) {
              await prisma.orderItem.update({
                where: { id: prev.id },
                data: {
                  quantity: item.sale.units,
                  unitPrice: item.unitPrice,
                  totalPrice: item.sale.revenueProducts,
                  productCost: item.economics.productCost,
                  taxAmount: item.economics.taxAmount,
                  grossProfit: item.economics.grossProfit,
                  marginPercent: item.economics.marginPercent,
                },
              });
            } else {
              await prisma.orderItem.create({
                data: {
                  orderId: existingOrder.id,
                  productId: item.product.id,
                  quantity: item.sale.units,
                  unitPrice: item.unitPrice,
                  totalPrice: item.sale.revenueProducts,
                  productCost: item.economics.productCost,
                  taxAmount: item.economics.taxAmount,
                  grossProfit: item.economics.grossProfit,
                  marginPercent: item.economics.marginPercent,
                },
              });
            }
          }

          // Remove itens que saíram do pacote (raro)
          for (const old of existingOrder.items) {
            if (!seenProducts.has(old.productId)) {
              await prisma.orderItem.delete({ where: { id: old.id } });
            }
          }

          if (!existingOrder.stockDeducted && status !== 'CANCELADO') {
            for (const item of itemPayloads) {
              await this.deductStock({
                companyId,
                accountId: account.id,
                productId: item.product.id,
                quantity: item.sale.units,
                orderId: existingOrder.id,
                orderNumber: existingOrder.number,
                unitCost: toNum(item.product.avgCost),
                userId,
              });
              stockMovements += 1;
              touchedProducts.add(item.product.id);
            }
            await prisma.order.update({
              where: { id: existingOrder.id },
              data: { stockDeducted: true },
            });
            existingOrder.stockDeducted = true;
          }
          salesUpdated += 1;
        } else {
          const number = `ML-${group.externalSaleId}`;
          const created = await prisma.order.create({
            data: {
              companyId,
              number,
              externalId: group.externalSaleId,
              platform: 'MERCADO_LIVRE',
              stockDeducted: false,
              ...orderPayload,
              items: {
                create: itemPayloads.map((item) => ({
                  productId: item.product.id,
                  quantity: item.sale.units,
                  unitPrice: item.unitPrice,
                  totalPrice: item.sale.revenueProducts,
                  productCost: item.economics.productCost,
                  taxAmount: item.economics.taxAmount,
                  grossProfit: item.economics.grossProfit,
                  marginPercent: item.economics.marginPercent,
                })),
              },
            },
            include: { items: true },
          });
          orderByExternal.set(group.externalSaleId, created);

          if (status !== 'CANCELADO') {
            for (const item of itemPayloads) {
              await this.deductStock({
                companyId,
                accountId: account.id,
                productId: item.product.id,
                quantity: item.sale.units,
                orderId: created.id,
                orderNumber: number,
                unitCost: toNum(item.product.avgCost),
                userId,
              });
              stockMovements += 1;
              touchedProducts.add(item.product.id);
            }
            await prisma.order.update({
              where: { id: created.id },
              data: { stockDeducted: true },
            });
            created.stockDeducted = true;
          }
          salesImported += 1;
        }
      }

      for (const id of touchedProducts) await syncProductTotalStock(id);

      await prisma.spreadsheetImport.update({
        where: { id: batch.id },
        data: {
          status: 'CONFIRMED',
          message: `imported=${salesImported}; updated=${salesUpdated}; skipped=${salesSkipped}; products=${productsCreated}; groups=${groups.length}`,
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
