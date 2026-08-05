import { prisma } from '../../../shared/prisma.js';

export type ListCustomersFilters = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export class ListCustomersUseCase {
  async execute(companyId: string, filters: ListCustomersFilters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 50));
    const search = filters.search?.trim();

    const where = {
      companyId,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { document: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          orders: {
            orderBy: { orderedAt: 'desc' },
            take: 5,
            select: {
              id: true,
              number: true,
              orderedAt: true,
              total: true,
              status: true,
              platform: true,
            },
          },
          _count: { select: { orders: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      customers: customers.map((c) => {
        const last = c.orders[0] || null;
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          document: c.document,
          email: c.email,
          city: c.city,
          state: c.state,
          marketplace: c.marketplace,
          ordersCount: c._count.orders,
          lastOrderAt: last?.orderedAt ?? null,
          lastOrderTotal: last ? Number(last.total) : null,
          lastOrderNumber: last?.number ?? null,
          recentOrders: c.orders.map((o) => ({
            id: o.id,
            number: o.number,
            orderedAt: o.orderedAt,
            total: Number(o.total),
            status: o.status,
            platform: o.platform,
          })),
        };
      }),
    };
  }
}
