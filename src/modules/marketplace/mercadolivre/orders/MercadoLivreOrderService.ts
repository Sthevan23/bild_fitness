import { prisma } from '@/lib/prisma';
import type { OrderStatus } from '@prisma/client';
import { mlFetch } from '../client';
import { MercadoLivreAuthService } from '../auth/MercadoLivreAuthService';
import { MercadoLivreProductService } from '../products/MercadoLivreProductService';
import { MercadoLivreCustomerService } from '../customers/MercadoLivreCustomerService';
import { MercadoLivreInventoryService } from '../inventory/MercadoLivreInventoryService';
import { MercadoLivreFinancialService } from '../financial/MercadoLivreFinancialService';

type MlOrder = {
  id: number;
  status: string;
  date_created: string;
  total_amount: number;
  paid_amount?: number;
  shipping?: {
    id?: number;
    cost?: number;
    status?: string;
    tracking_number?: string;
    receiver_address?: {
      city?: { name?: string };
      state?: { name?: string };
      address_line?: string;
    };
  };
  buyer?: {
    id?: number;
    nickname?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: { number?: string; area_code?: string } | null;
    billing_info?: { doc_number?: string };
  };
  order_items?: Array<{
    item: { id: string; title: string; seller_sku?: string | null };
    quantity: number;
    unit_price: number;
    full_unit_price?: number;
  }>;
  payments?: Array<{
    status?: string;
    payment_method_id?: string;
    transaction_amount?: number;
    shipping_cost?: number;
    marketplace_fee?: number;
    net_received_amount?: number;
  }>;
};

function mapMlStatus(status: string, shippingStatus?: string): OrderStatus {
  const s = status.toLowerCase();
  if (s === 'cancelled') return 'CANCELADO';
  if (s === 'delivered') return 'ENTREGUE';
  const ship = (shippingStatus || '').toLowerCase();
  if (ship === 'shipped' || ship === 'delivered' || s === 'paid') {
    if (ship === 'delivered') return 'ENTREGUE';
    if (ship === 'shipped') return 'ENVIADO';
  }
  if (s === 'paid' || s === 'confirmed') return 'AGUARDANDO';
  return 'AGUARDANDO';
}

export class MercadoLivreOrderService {
  static async searchRecentOrderIds(connectionId: string, sellerId: string, from?: Date) {
    const token = await MercadoLivreAuthService.getValidAccessToken(connectionId);
    const ids: number[] = [];
    let offset = 0;
    const limit = 50;
    const fromIso = (from || new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)).toISOString();

    for (let page = 0; page < 20; page++) {
      const qs = new URLSearchParams({
        seller: sellerId,
        sort: 'date_desc',
        offset: String(offset),
        limit: String(limit),
        'order.date_created.from': fromIso,
      });
      const data = await mlFetch<{ results: number[]; paging?: { total: number } }>(
        `/orders/search?${qs.toString()}`,
        { accessToken: token },
      );
      const results = data.results || [];
      ids.push(...results);
      offset += limit;
      if (results.length < limit) break;
    }
    return [...new Set(ids)];
  }

  static async fetchOrder(connectionId: string, orderId: number) {
    const token = await MercadoLivreAuthService.getValidAccessToken(connectionId);
    return mlFetch<MlOrder>(`/orders/${orderId}`, { accessToken: token });
  }

  static async upsertOrder(companyId: string, connectionId: string, mlOrder: MlOrder) {
    const externalId = String(mlOrder.id);
    const payment = mlOrder.payments?.[0];
    const freight = Number(payment?.shipping_cost ?? mlOrder.shipping?.cost ?? 0) || 0;
    const fee = Number(payment?.marketplace_fee ?? 0) || 0;
    const gross = Number(mlOrder.paid_amount ?? mlOrder.total_amount ?? 0) || 0;
    const net = Number(payment?.net_received_amount ?? gross - fee) || 0;
    const status = mapMlStatus(mlOrder.status, mlOrder.shipping?.status);
    const orderedAt = new Date(mlOrder.date_created);
    const paymentMethod = payment?.payment_method_id || 'Mercado Pago';
    const shippingId = mlOrder.shipping?.id != null ? String(mlOrder.shipping.id) : null;
    const tracking = mlOrder.shipping?.tracking_number || null;
    const number = `ML-${externalId}`;

    const customer = mlOrder.buyer
      ? await MercadoLivreCustomerService.upsertFromBuyer(companyId, mlOrder.buyer, mlOrder.shipping)
      : null;

    const lines = mlOrder.order_items || [];
    const productLines = [];
    for (const line of lines) {
      const product = await MercadoLivreProductService.findOrCreateFromOrderLine(companyId, {
        itemId: line.item.id,
        title: line.item.title,
        sku: line.item.seller_sku,
        unitPrice: line.unit_price || line.full_unit_price || 0,
        quantity: line.quantity,
      });
      productLines.push({
        productId: product.id,
        quantity: line.quantity,
        unitPrice: line.unit_price || line.full_unit_price || 0,
        totalPrice: (line.unit_price || line.full_unit_price || 0) * line.quantity,
      });
    }

    const existing = await prisma.order.findFirst({
      where: { companyId, externalId },
      include: { items: true },
    });

    let orderId: string;
    let isNew = false;

    if (existing) {
      await prisma.orderItem.deleteMany({ where: { orderId: existing.id } });
      const updated = await prisma.order.update({
        where: { id: existing.id },
        data: {
          customerId: customer?.id,
          status,
          paymentMethod,
          trackingCode: tracking || existing.trackingCode,
          total: gross,
          freight,
          marketplaceFee: fee,
          netAmount: net,
          shippingId,
          orderedAt,
          shippedAt: status === 'ENVIADO' || status === 'ENTREGUE' ? new Date() : existing.shippedAt,
          notes: `Mercado Livre order ${externalId}`,
          items: { create: productLines },
        },
      });
      orderId = updated.id;
    } else {
      isNew = true;
      const created = await prisma.order.create({
        data: {
          companyId,
          number,
          customerId: customer?.id,
          platform: 'MERCADO_LIVRE',
          status,
          paymentMethod,
          trackingCode: tracking,
          total: gross,
          freight,
          marketplaceFee: fee,
          netAmount: net,
          externalId,
          shippingId,
          orderedAt,
          shippedAt: status === 'ENVIADO' || status === 'ENTREGUE' ? new Date() : null,
          notes: `Mercado Livre order ${externalId}`,
          items: { create: productLines },
        },
      });
      orderId = created.id;
    }

    const finance = await MercadoLivreFinancialService.upsertForOrder({
      companyId,
      orderId,
      orderNumber: number,
      gross,
      fee,
      freight,
      net,
      paymentMethod,
      paid: (payment?.status || '').toLowerCase() === 'approved' || mlOrder.status === 'paid',
      date: orderedAt,
    });

    let stockMovements = 0;
    const paidLike = ['paid', 'confirmed', 'ready_to_ship', 'shipped', 'delivered'].includes(
      mlOrder.status,
    );

    if (status === 'CANCELADO') {
      const restored = await MercadoLivreInventoryService.restoreIfCancelled(orderId);
      stockMovements += restored.movements;
    } else if (paidLike) {
      const current = await prisma.order.findUnique({ where: { id: orderId } });
      if (current && !current.stockDeducted) {
        const deduct = await MercadoLivreInventoryService.deductForOrder(orderId);
        stockMovements += deduct.movements;
      }
    }

    return {
      orderId,
      isNew,
      customerId: customer?.id,
      financeCreated: finance.created,
      stockMovements,
    };
  }

  static async syncOrders(companyId: string, connectionId: string, sellerId: string, from?: Date) {
    const ids = await this.searchRecentOrderIds(connectionId, sellerId, from);
    let ordersUpserted = 0;
    let customersUpserted = 0;
    let financeCreated = 0;
    let stockMovements = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const mlOrder = await this.fetchOrder(connectionId, id);
        const result = await this.upsertOrder(companyId, connectionId, mlOrder);
        ordersUpserted += 1;
        if (result.customerId) customersUpserted += 1;
        financeCreated += result.financeCreated;
        stockMovements += result.stockMovements;
      } catch (e) {
        errors.push(`Pedido ${id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return { ordersUpserted, customersUpserted, financeCreated, stockMovements, errors, total: ids.length };
  }
}
