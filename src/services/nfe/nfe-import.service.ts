import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { parseNfeXml } from './nfe-xml.parser';
import { validateParsedNfe } from './nfe.validator';
import { matchProduct } from './product-matcher.service';
import type { NfePreview, ParsedNfe, PreviewItem } from './nfe.types';

type PreviewEntry = {
  userId: string;
  companyId: string;
  nfe: ParsedNfe;
  itens: PreviewItem[];
  createdAt: number;
};

const globalStore = globalThis as unknown as {
  nfePreviewStore?: Map<string, PreviewEntry>;
};

const previewStore = globalStore.nfePreviewStore ?? new Map<string, PreviewEntry>();
globalStore.nfePreviewStore = previewStore;

const PREVIEW_TTL_MS = 30 * 60 * 1000;

function cleanupPreviews() {
  const now = Date.now();
  for (const [id, value] of previewStore.entries()) {
    if (now - value.createdAt > PREVIEW_TTL_MS) previewStore.delete(id);
  }
}

function toNum(v: { toNumber(): number } | number) {
  return typeof v === 'number' ? v : v.toNumber();
}

export async function previewNfeImport(params: {
  userId: string;
  companyId: string;
  xmlContent: string;
}): Promise<NfePreview> {
  cleanupPreviews();
  const nfe = parseNfeXml(params.xmlContent);
  validateParsedNfe(nfe);

  const existing = await prisma.invoice.findFirst({
    where: { companyId: params.companyId, accessKey: nfe.chaveAcesso },
  });
  if (existing) {
    throw new AppError(409, 'Esta NF-e já foi importada anteriormente');
  }

  const itens: PreviewItem[] = [];
  for (const item of nfe.itens) {
    const match = await matchProduct(item, params.companyId);
    itens.push({
      ...item,
      matchKind: match.matchKind,
      matchScore: match.matchScore,
      product: match.product,
      action: match.product ? 'update' : 'create',
    });
  }

  const previewId = randomUUID();
  previewStore.set(previewId, {
    userId: params.userId,
    companyId: params.companyId,
    nfe,
    itens,
    createdAt: Date.now(),
  });

  const { itens: _i, ...nota } = nfe;

  return {
    previewId,
    nota,
    itens,
    summary: {
      totalItens: itens.length,
      itensExistentes: itens.filter((i) => i.action === 'update').length,
      itensNovos: itens.filter((i) => i.action === 'create').length,
      itensFuzzy: itens.filter((i) => i.matchKind === 'fuzzy').length,
    },
  };
}

export async function confirmNfeImport(params: {
  userId: string;
  companyId: string;
  previewId: string;
}) {
  cleanupPreviews();
  const preview = previewStore.get(params.previewId);
  if (!preview) {
    throw new AppError(404, 'Preview expirado ou não encontrado. Faça o upload novamente.');
  }
  if (preview.userId !== params.userId || preview.companyId !== params.companyId) {
    throw new AppError(403, 'Preview não pertence ao usuário autenticado');
  }

  const { nfe, itens } = preview;

  const duplicate = await prisma.invoice.findFirst({
    where: { companyId: params.companyId, accessKey: nfe.chaveAcesso },
  });
  if (duplicate) {
    previewStore.delete(params.previewId);
    throw new AppError(409, 'Esta NF-e já foi importada anteriormente');
  }

  const result = await prisma.$transaction(async (tx) => {
    let supplier = nfe.fornecedor.cnpj
      ? await tx.supplier.findFirst({
          where: { companyId: params.companyId, cnpj: nfe.fornecedor.cnpj },
        })
      : null;

    if (supplier) {
      supplier = await tx.supplier.update({
        where: { id: supplier.id },
        data: {
          name: nfe.fornecedor.razaoSocial || supplier.name,
          phone: nfe.fornecedor.telefone || supplier.phone,
        },
      });
    } else {
      supplier = await tx.supplier.create({
        data: {
          companyId: params.companyId,
          name: nfe.fornecedor.razaoSocial || 'Fornecedor NF-e',
          cnpj: nfe.fornecedor.cnpj || null,
          phone: nfe.fornecedor.telefone,
          city: nfe.fornecedor.endereco?.municipio,
        },
      });
    }

    let itemsUpdated = 0;
    let itemsCreated = 0;

    const nfeImport = await tx.nfeImport.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        accessKey: nfe.chaveAcesso,
        totalItems: itens.length,
        itemsUpdated: 0,
        itemsCreated: 0,
        totalValue: nfe.valorTotal,
        status: 'CONFIRMED',
      },
    });

    const invoice = await tx.invoice.create({
      data: {
        companyId: params.companyId,
        number: nfe.numero,
        series: nfe.serie,
        accessKey: nfe.chaveAcesso,
        supplierId: supplier.id,
        totalValue: nfe.valorTotal,
        taxValue: nfe.valorImpostos,
        freight: nfe.frete,
        discount: nfe.desconto,
        issuedAt: nfe.dataEmissao,
        importId: nfeImport.id,
      },
    });

    for (const item of itens) {
      let productId: string;

      if (item.action === 'update' && item.product) {
        const current = await tx.product.findUniqueOrThrow({ where: { id: item.product.id } });
        const oldStock = toNum(current.stock);
        const oldAvg = toNum(current.avgCost) || toNum(current.costPrice);
        const newStock = oldStock + item.quantidade;
        const newAvg =
          newStock > 0
            ? (oldStock * oldAvg + item.quantidade * item.valorUnitario) / newStock
            : item.valorUnitario;

        await tx.product.update({
          where: { id: current.id },
          data: {
            stock: newStock,
            costPrice: item.valorUnitario,
            avgCost: newAvg,
            unit: item.unidade || current.unit,
            brand: item.marca || current.brand,
            barcode: item.codigoBarras && !current.barcode ? item.codigoBarras : current.barcode,
            supplierId: supplier.id,
          },
        });
        productId = current.id;
        itemsUpdated += 1;
      } else {
        let sku = item.codigo || `NFE-${nfe.chaveAcesso.slice(-8)}-${item.numeroItem}`;
        const existingSku = await tx.product.findUnique({
          where: { companyId_sku: { companyId: params.companyId, sku } },
        });
        if (existingSku) {
          sku = `${sku}-${nfe.chaveAcesso.slice(-6)}`;
        }

        let barcode = item.codigoBarras ?? null;
        if (barcode) {
          const existingEan = await tx.product.findFirst({
            where: { companyId: params.companyId, barcode },
          });
          if (existingEan) barcode = null;
        }

        const created = await tx.product.create({
          data: {
            companyId: params.companyId,
            sku,
            barcode,
            name: item.descricao,
            stock: item.quantidade,
            costPrice: item.valorUnitario,
            avgCost: item.valorUnitario,
            salePrice: item.valorUnitario * 1.4,
            unit: item.unidade || 'UN',
            brand: item.marca,
            supplierId: supplier.id,
            category: 'Importado NF-e',
          },
        });
        productId = created.id;
        itemsCreated += 1;
      }

      await tx.stockMovement.create({
        data: {
          companyId: params.companyId,
          productId,
          type: 'ENTRADA',
          quantity: item.quantidade,
          unitCost: item.valorUnitario,
          totalCost: item.valorTotal,
          note: `NF-e ${nfe.numero}/${nfe.serie}`,
          invoiceId: invoice.id,
          userId: params.userId,
        },
      });
    }

    const updatedImport = await tx.nfeImport.update({
      where: { id: nfeImport.id },
      data: { itemsUpdated, itemsCreated },
      include: {
        user: { select: { id: true, name: true, email: true } },
        invoices: { include: { supplier: true } },
      },
    });

    return { import: updatedImport, invoice, supplier, itemsUpdated, itemsCreated };
  });

  previewStore.delete(params.previewId);
  return result;
}

export function cancelNfePreview(previewId: string, userId: string) {
  const preview = previewStore.get(previewId);
  if (!preview) throw new AppError(404, 'Preview não encontrado');
  if (preview.userId !== userId) {
    throw new AppError(403, 'Preview não pertence ao usuário autenticado');
  }
  previewStore.delete(previewId);
  return { cancelled: true };
}

export async function listImportHistory(companyId: string) {
  return prisma.nfeImport.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      invoices: {
        include: {
          supplier: { select: { id: true, name: true, cnpj: true } },
        },
      },
    },
  });
}

export async function getImportById(id: string, companyId: string) {
  const item = await prisma.nfeImport.findFirst({
    where: { id, companyId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      invoices: {
        include: {
          supplier: true,
          movements: { include: { product: true } },
        },
      },
    },
  });
  if (!item) throw new AppError(404, 'Importação não encontrada');
  return item;
}
