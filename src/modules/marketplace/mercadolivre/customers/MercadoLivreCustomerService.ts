import { prisma } from '@/lib/prisma';

export class MercadoLivreCustomerService {
  static async upsertFromBuyer(
    companyId: string,
    buyer: {
      id?: number | string;
      nickname?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: { number?: string; area_code?: string } | string | null;
      billing_info?: { doc_number?: string };
    },
    shipping?: {
      receiver_address?: {
        city?: { name?: string };
        state?: { name?: string };
        address_line?: string;
        zip_code?: string;
      };
    },
  ) {
    const externalId = buyer.id != null ? String(buyer.id) : undefined;
    const name =
      [buyer.first_name, buyer.last_name].filter(Boolean).join(' ').trim() ||
      buyer.nickname ||
      'Cliente ML';

    let phone: string | undefined;
    if (typeof buyer.phone === 'string') phone = buyer.phone;
    else if (buyer.phone?.number) {
      phone = [buyer.phone.area_code, buyer.phone.number].filter(Boolean).join(' ');
    }

    const city = shipping?.receiver_address?.city?.name;
    const state = shipping?.receiver_address?.state?.name;
    const address = shipping?.receiver_address?.address_line;
    const document = buyer.billing_info?.doc_number;
    const email = buyer.email;

    if (externalId) {
      const existing = await prisma.customer.findFirst({
        where: { companyId, externalId, marketplace: 'MERCADO_LIVRE' },
      });
      if (existing) {
        return prisma.customer.update({
          where: { id: existing.id },
          data: {
            name: name || existing.name,
            phone: phone || existing.phone,
            email: email || existing.email,
            city: city || existing.city,
            state: state || existing.state,
            address: address || existing.address,
            document: document || existing.document,
          },
        });
      }
    }

    const byName = await prisma.customer.findFirst({
      where: { companyId, name },
    });
    if (byName) {
      return prisma.customer.update({
        where: { id: byName.id },
        data: {
          externalId: externalId || byName.externalId,
          marketplace: 'MERCADO_LIVRE',
          phone: phone || byName.phone,
          email: email || byName.email,
          city: city || byName.city,
          state: state || byName.state,
          address: address || byName.address,
        },
      });
    }

    return prisma.customer.create({
      data: {
        companyId,
        name,
        phone,
        email,
        city,
        state,
        address,
        document,
        externalId,
        marketplace: 'MERCADO_LIVRE',
      },
    });
  }
}
