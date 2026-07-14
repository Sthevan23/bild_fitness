import { prisma } from '@/lib/prisma';

export class MercadoLivreFinancialService {
  static async upsertForOrder(params: {
    companyId: string;
    orderId: string;
    orderNumber: string;
    gross: number;
    fee: number;
    freight: number;
    net: number;
    paymentMethod?: string | null;
    paid: boolean;
    date: Date;
  }) {
    let created = 0;

    const saleDesc = `ML venda #${params.orderNumber} (bruto)`;
    const existingSale = await prisma.financeEntry.findFirst({
      where: { companyId: params.companyId, orderId: params.orderId, category: 'Vendas ML' },
    });
    if (!existingSale) {
      await prisma.financeEntry.create({
        data: {
          companyId: params.companyId,
          orderId: params.orderId,
          type: 'ENTRADA',
          status: params.paid ? 'RECEBIDO' : 'PENDENTE',
          description: saleDesc,
          amount: params.gross,
          category: 'Vendas ML',
          dueDate: params.date,
          paidAt: params.paid ? params.date : null,
        },
      });
      created += 1;
    } else {
      await prisma.financeEntry.update({
        where: { id: existingSale.id },
        data: {
          amount: params.gross,
          status: params.paid ? 'RECEBIDO' : 'PENDENTE',
          paidAt: params.paid ? params.date : null,
        },
      });
    }

    if (params.fee > 0) {
      const feeDesc = `ML taxa/comissão #${params.orderNumber}`;
      const existingFee = await prisma.financeEntry.findFirst({
        where: { companyId: params.companyId, orderId: params.orderId, category: 'Taxa ML' },
      });
      if (!existingFee) {
        await prisma.financeEntry.create({
          data: {
            companyId: params.companyId,
            orderId: params.orderId,
            type: 'SAIDA',
            status: 'PAGO',
            description: feeDesc,
            amount: params.fee,
            category: 'Taxa ML',
            dueDate: params.date,
            paidAt: params.date,
          },
        });
        created += 1;
      } else {
        await prisma.financeEntry.update({
          where: { id: existingFee.id },
          data: { amount: params.fee },
        });
      }
    }

    if (params.freight > 0) {
      const freightDesc = `ML frete #${params.orderNumber}`;
      const existingFreight = await prisma.financeEntry.findFirst({
        where: { companyId: params.companyId, orderId: params.orderId, category: 'Frete ML' },
      });
      if (!existingFreight) {
        await prisma.financeEntry.create({
          data: {
            companyId: params.companyId,
            orderId: params.orderId,
            type: 'SAIDA',
            status: 'PAGO',
            description: freightDesc,
            amount: params.freight,
            category: 'Frete ML',
            dueDate: params.date,
            paidAt: params.date,
          },
        });
        created += 1;
      }
    }

    return { created, net: params.net, paymentMethod: params.paymentMethod };
  }
}
