import { normalizeAccountCode, updateAccountSchema, setActiveAccountSchema } from '@pep/shared';
import { prisma } from '../../../shared/prisma.js';
import { AppError } from '../../../shared/errors.js';
import {
  ensureSalesAccountRows,
  ensureSalesAccounts,
  resolveActiveAccount,
} from '../infrastructure/accounts.repo.js';

export class ListAccountsUseCase {
  async execute(companyId: string) {
    return ensureSalesAccountRows(companyId);
  }
}

export class GetAccountsHubUseCase {
  async execute(companyId: string, activeCode?: string | null) {
    const accounts = await ensureSalesAccounts(companyId);
    const code = normalizeAccountCode(activeCode);
    const connections = await prisma.marketplaceConnection.findMany({
      where: { companyId, marketplace: 'MERCADO_LIVRE' },
      select: {
        accountId: true,
        status: true,
        nickname: true,
        sellerId: true,
        lastSyncAt: true,
        lastSyncError: true,
      },
    });

    const stockCounts = await Promise.all(
      accounts.map(async (a) => {
        const rows = await prisma.accountStock.findMany({
          where: { accountId: a.id },
          select: { stock: true, minStock: true },
        });
        return {
          accountId: a.id,
          skus: rows.length,
          low: rows.filter((r) => Number(r.stock) > 0 && Number(r.stock) <= Number(r.minStock)).length,
          zerado: rows.filter((r) => Number(r.stock) <= 0).length,
        };
      }),
    );

    return {
      ok: true as const,
      activeCode: code,
      accounts: accounts.map((a) => {
        const conn = connections.find((c) => c.accountId === a.id);
        const stock = stockCounts.find((s) => s.accountId === a.id);
        return {
          id: a.id,
          code: a.code,
          name: a.name,
          cnpj: a.cnpj,
          active: a.active,
          isSelected: a.code === code,
          ml: conn
            ? {
                status: conn.status,
                nickname: conn.nickname,
                sellerId: conn.sellerId,
                lastSyncAt: conn.lastSyncAt,
                lastSyncError: conn.lastSyncError,
              }
            : null,
          stock: stock ?? { skus: 0, low: 0, zerado: 0 },
        };
      }),
    };
  }
}

export class UpdateAccountUseCase {
  async execute(companyId: string, input: unknown) {
    const data = updateAccountSchema.parse(input);
    const accounts = await ensureSalesAccountRows(companyId);
    const account = accounts.find((a) => a.code === data.code);
    if (!account) throw new AppError('Conta não encontrada');
    await prisma.salesAccount.update({
      where: { id: account.id },
      data: {
        cnpj: data.cnpj?.trim() || null,
        name: data.name?.trim() || account.name,
      },
    });
    return { ok: true as const };
  }
}

export class SetActiveAccountUseCase {
  async execute(companyId: string, input: unknown) {
    const data = setActiveAccountSchema.parse(input);
    const account = await resolveActiveAccount(companyId, data.code);
    return { ok: true as const, code: account.code, accountId: account.id };
  }
}

export class GetActiveAccountUseCase {
  async execute(companyId: string, code?: string | null) {
    return resolveActiveAccount(companyId, code);
  }
}
