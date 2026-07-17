import { createRequire } from 'node:module';
import { normalizeAccountCode, type AccountCode } from '@pep/shared';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx') as typeof import('xlsx');

const PT_MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  marco: 2,
  março: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

export function parseMoney(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;
  let s = String(value).replace(/R\$\s*/gi, '').replace(/%/g, '').trim();
  if (!s) return 0;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // 1.234,56
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    s = s.replace(',', '.');
  }
  // keep single dot as decimal (9.04)
  s = s.replace(/[^\d.-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function parsePtDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const epoch = XLSX.SSF?.parse_date_code?.(value);
    if (epoch) return new Date(Date.UTC(epoch.y, epoch.m - 1, epoch.d, epoch.H || 0, epoch.M || 0));
  }
  const s = String(value).trim().toLowerCase();
  // "31 de maio de 2026 18:56 hs."
  const m = s.match(
    /(\d{1,2})\s+de\s+([a-zçã]+)\s+de\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/,
  );
  if (m) {
    const month = PT_MONTHS[m[2]];
    if (month == null) return null;
    return new Date(
      Number(m[3]),
      month,
      Number(m[1]),
      Number(m[4] || 0),
      Number(m[5] || 0),
    );
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function cleanSku(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).replace(/"/g, '').trim();
  if (!s || !/^[A-Z0-9_]+$/i.test(s)) return null;
  return s.toUpperCase();
}

function parseLinkedSkus(value: unknown): string[] {
  if (value == null) return [];
  return String(value)
    .split(/[;,\n]/)
    .map((s) => s.replace(/"/g, '').trim())
    .filter((s) => /^[A-Z0-9_]+$/i.test(s))
    .map((s) => s.toUpperCase());
}

function modelFromSku(sku: string): string | null {
  const m = sku.match(/^([A-Z]+)/i);
  return m ? m[1].toUpperCase() : null;
}

/** Explode kit SKU → component SKUs with quantities (PAR = ×2). */
export function explodeKitSku(kitSku: string): Array<{ componentSku: string; qty: number }> {
  const sku = kitSku.toUpperCase();
  if (sku.startsWith('PAR')) {
    const base = sku.replace(/^PAR/, '');
    return base ? [{ componentSku: base, qty: 2 }] : [];
  }

  // KITPARHBP1_2_3 → HBP1,HBP2,HBP3 ×2
  const kitPar = sku.match(/^KITPAR([A-Z]+)([\d_]+)$/i);
  if (kitPar) {
    const prefix = kitPar[1].toUpperCase();
    const nums = kitPar[2].split('_').filter(Boolean);
    return nums.map((n) => ({ componentSku: `${prefix}${n}`, qty: 2 }));
  }

  // KITPAE5_15 / KITPAI2_3_5 → AE5,AE15 ×2 or AI ×2
  const kitPa = sku.match(/^KITPA([A-Z]+)([\d_]+)$/i);
  if (kitPa) {
    const prefix = kitPa[1].toUpperCase();
    const nums = kitPa[2].split('_').filter(Boolean);
    return nums.map((n) => ({ componentSku: `${prefix}${n}`, qty: 2 }));
  }

  return [{ componentSku: sku, qty: 1 }];
}

export type ParsedCatalog = {
  products: Array<{
    sku: string;
    name: string;
    costPrice: number;
    weightKg: number | null;
    modelCode: string | null;
    linkedSkus: string[];
  }>;
  taxRates: Array<{ accountCode: AccountCode; ratePercent: number }>;
  modelCosts: Array<{ modelCode: string; costPerKg: number; supplier: string | null }>;
  kits: Array<{ kitSku: string; componentSku: string; quantity: number }>;
};

export type ParsedMlSale = {
  accountCode: AccountCode;
  externalSaleId: string;
  soldAt: Date | null;
  sku: string | null;
  title: string | null;
  units: number;
  revenueProducts: number;
  fees: number;
  shippingRevenue: number;
  shippingFees: number;
  total: number;
  buyerName: string | null;
  status: string | null;
  mlItemId: string | null;
  raw: unknown[];
};

export type ParsedStockRow = {
  description: string;
  byAccount: Partial<Record<AccountCode, number>>;
};

export type ParsedDelivery = {
  accountCode: AccountCode;
  supplierName: string | null;
  status: 'PEDIDO' | 'ENTREGA';
  lines: Array<{ description: string; quantity: number }>;
};

export type ParsedCostAllocation = {
  monthLabel: string;
  category: string;
  description: string;
  amount: number;
  ratePcp: number;
  rateRc: number;
  ratePp: number;
  allocatedPcp: number;
  allocatedRc: number;
  allocatedPp: number;
};

export type ParsedSpreadsheet = {
  catalog: ParsedCatalog;
  sales: ParsedMlSale[];
  stock: ParsedStockRow[];
  deliveries: ParsedDelivery[];
  finance: ParsedCostAllocation[];
};

function sheetRows(wb: import('xlsx').WorkBook, name: string): unknown[][] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false }) as unknown[][];
}

export function parseDadosCatalog(rows: unknown[][]): ParsedCatalog {
  const productsMap = new Map<string, ParsedCatalog['products'][number]>();
  const taxRates: ParsedCatalog['taxRates'] = [];
  const modelCosts: ParsedCatalog['modelCosts'] = [];
  const kits: ParsedCatalog['kits'] = [];

  for (let i = 3; i <= 5; i++) {
    const code = normalizeAccountCode(String(rows[i]?.[11] ?? ''));
    const rate = parseMoney(String(rows[i]?.[12] ?? '').replace('%', ''));
    // 9.04% comes as 0.0904 or "9.04%" depending on raw — handle both
    let ratePercent = rate;
    if (ratePercent > 0 && ratePercent < 1) ratePercent = ratePercent * 100;
    if (['P&P', 'RC', 'PCP'].includes(code) && ratePercent > 0) {
      taxRates.push({ accountCode: code, ratePercent });
    }
  }

  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const sku = cleanSku(row[1]);
    if (sku) {
      const cost = parseMoney(row[2]);
      const kg = parseMoney(row[3]) || null;
      productsMap.set(sku, {
        sku,
        name: sku,
        costPrice: cost,
        weightKg: kg,
        modelCode: modelFromSku(sku),
        linkedSkus: [],
      });
    }

    const desc = row[6] != null ? String(row[6]).trim() : '';
    const linked = parseLinkedSkus(row[7]);
    const baseSku = cleanSku(row[8]);
    if (desc && (linked.length || baseSku)) {
      if (baseSku) {
        const existing = productsMap.get(baseSku);
        if (existing) {
          existing.name = desc;
          existing.linkedSkus = linked;
        } else {
          productsMap.set(baseSku, {
            sku: baseSku,
            name: desc,
            costPrice: 0,
            weightKg: null,
            modelCode: modelFromSku(baseSku),
            linkedSkus: linked,
          });
        }
      }
      for (const kitSku of linked) {
        if (!productsMap.has(kitSku)) {
          productsMap.set(kitSku, {
            sku: kitSku,
            name: desc,
            costPrice: 0,
            weightKg: null,
            modelCode: modelFromSku(kitSku),
            linkedSkus: [],
          });
        }
        const exploded = explodeKitSku(kitSku);
        for (const part of exploded) {
          if (!productsMap.has(part.componentSku) && baseSku) {
            // component may already exist
          }
          kits.push({
            kitSku,
            componentSku: part.componentSku,
            quantity: part.qty,
          });
        }
      }
    }

    const model = row[15] != null ? String(row[15]).trim().toUpperCase() : '';
    const costPerKg = parseMoney(row[16]);
    if (model && /^[A-Z]+$/i.test(model) && costPerKg > 0) {
      modelCosts.push({ modelCode: model, costPerKg, supplier: 'Marciela' });
    }
  }

  // Deduplicate kits
  const kitKey = new Set<string>();
  const uniqueKits = kits.filter((k) => {
    const key = `${k.kitSku}|${k.componentSku}|${k.quantity}`;
    if (kitKey.has(key)) return false;
    kitKey.add(key);
    return true;
  });

  return {
    products: [...productsMap.values()],
    taxRates,
    modelCosts,
    kits: uniqueKits,
  };
}

export function parseDadosMl(rows: unknown[][]): ParsedMlSale[] {
  const sales: ParsedMlSale[] = [];
  let accountCode: AccountCode | null = null;

  for (const row of rows) {
    if (!row) continue;
    const marker = row[0] != null ? String(row[0]).trim() : '';
    if (/^VENDAS\s+PCP/i.test(marker)) {
      accountCode = 'PCP';
      continue;
    }
    if (/^VENDAS\s+RC/i.test(marker)) {
      accountCode = 'RC';
      continue;
    }
    if (/^VENDAS\s+P\s*&?\s*P/i.test(marker) || /^VENDAS\s+PEP/i.test(marker)) {
      accountCode = 'P&P';
      continue;
    }

    const saleId = marker.replace(/\D/g, '');
    if (!accountCode || saleId.length < 10) continue;

    const sku = cleanSku(row[22]);
    const units = parseMoney(row[7]) || 1;
    const revenueProducts = parseMoney(row[8]);
    const fees = Math.abs(parseMoney(row[11]));
    const shippingRevenue = parseMoney(row[12]);
    const shippingFees = Math.abs(parseMoney(row[13]));
    const total = parseMoney(row[18]);
    const title = row[25] != null ? String(row[25]).trim() : null;
    const buyerName = row[35] != null ? String(row[35]).trim() : null;
    const status = row[3] != null ? String(row[3]).trim() : null;
    const mlItemId = row[23] != null ? String(row[23]).trim() : null;

    sales.push({
      accountCode,
      externalSaleId: saleId,
      soldAt: parsePtDate(row[1]),
      sku,
      title,
      units,
      revenueProducts,
      fees,
      shippingRevenue,
      shippingFees,
      total: total || revenueProducts - fees - shippingFees + shippingRevenue,
      buyerName: buyerName || null,
      status,
      mlItemId: mlItemId || null,
      raw: row,
    });
  }

  return sales;
}

export function parseEstoque(rows: unknown[][]): ParsedStockRow[] {
  const out: ParsedStockRow[] = [];
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[0] == null) continue;
    const description = String(row[0]).trim();
    if (!description || /descri/i.test(description)) continue;
    out.push({
      description,
      byAccount: {
        PCP: parseMoney(row[1]),
        RC: parseMoney(row[2]),
        'P&P': parseMoney(row[3]),
      },
    });
  }
  return out;
}

export function parseEntregas(rows: unknown[][]): ParsedDelivery[] {
  // Layout: PCP block cols B-E (pedido C, entrega E), RC from O, P&P from AB
  // Row 1: account labels; row 5 status; row 7+ quantities
  const blocks: Array<{ accountCode: AccountCode; descCol: number; qtyCols: number[] }> = [
    { accountCode: 'PCP', descCol: 1, qtyCols: [2, 4, 6, 8, 10, 12] },
    { accountCode: 'RC', descCol: 14, qtyCols: [15, 17, 19, 21, 23, 25] },
    { accountCode: 'P&P', descCol: 27, qtyCols: [28, 30, 32, 34, 36, 38] },
  ];

  const deliveries: ParsedDelivery[] = [];
  const header = rows[1] || [];
  const statusRow = rows[5] || [];

  for (const block of blocks) {
    for (let qi = 0; qi < block.qtyCols.length; qi++) {
      const qtyCol = block.qtyCols[qi];
      const statusCell = statusRow[qtyCol] != null ? String(statusRow[qtyCol]).toUpperCase() : '';
      // Status is under "Pedido" column in sample (col 3 for first PCP block) — use pair
      const status =
        statusCell.includes('ENTREG') || String(header[qtyCol] ?? '').toUpperCase().includes('ENTREG')
          ? 'ENTREGA'
          : 'PEDIDO';

      // Better: row5 col3 = Pedido for first block; delivery qty is col4
      // For each pair (pedido, entrega) take entrega qty preferentially if > 0
    }

    // Simpler heuristic from sample: col2 pedido, col4 entrega for PCP
    const pedidoCol = block.qtyCols[0];
    const entregaCol = block.qtyCols[1];
    const supplierCol = pedidoCol + 1;
    const supplierName =
      rows[1]?.[supplierCol] != null && String(rows[1][supplierCol]).trim()
        ? String(rows[1][supplierCol]).trim()
        : rows[1]?.[pedidoCol + 1] != null
          ? String(rows[1][pedidoCol + 1]).trim()
          : null;

    const pedidoLines: ParsedDelivery['lines'] = [];
    const entregaLines: ParsedDelivery['lines'] = [];

    for (let i = 7; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const description = row[block.descCol] != null ? String(row[block.descCol]).trim() : '';
      if (!description) continue;
      const pq = parseMoney(row[pedidoCol]);
      const eq = parseMoney(row[entregaCol]);
      if (pq > 0) pedidoLines.push({ description, quantity: pq });
      if (eq > 0) entregaLines.push({ description, quantity: eq });
    }

    if (pedidoLines.length) {
      deliveries.push({
        accountCode: block.accountCode,
        supplierName: supplierName && !/fornecedor/i.test(supplierName) ? supplierName : 'Marciela',
        status: 'PEDIDO',
        lines: pedidoLines,
      });
    }
    if (entregaLines.length) {
      deliveries.push({
        accountCode: block.accountCode,
        supplierName: supplierName && !/fornecedor/i.test(supplierName) ? supplierName : 'Marciela',
        status: 'ENTREGA',
        lines: entregaLines,
      });
    }
  }

  return deliveries;
}

const MONTH_BLOCKS = [
  { labelCol: 7, pcpCol: 9, rcCol: 12, ppCol: 15 },
  { labelCol: 18, pcpCol: 20, rcCol: 23, ppCol: 26 },
  { labelCol: 27, pcpCol: 29, rcCol: 32, ppCol: 35 },
];

function parseRatePercent(value: unknown): number {
  if (value == null || value === '' || value === '-') return 0;
  const s = String(value).replace('%', '').trim();
  const n = parseMoney(s);
  return n;
}

export function parseFinanceiro(rows: unknown[][]): ParsedCostAllocation[] {
  const out: ParsedCostAllocation[] = [];
  const monthLabels: string[] = [];
  for (const block of MONTH_BLOCKS) {
    const label = rows[2]?.[block.labelCol];
    monthLabels.push(label ? String(label).trim().toUpperCase() : `M${block.labelCol}`);
  }

  let category = 'GERAL';
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const desc = row[1] != null ? String(row[1]).trim() : '';
    if (!desc) continue;
    if (/CUSTOS\s+FIXOS/i.test(desc)) {
      category = 'CUSTOS FIXOS';
      continue;
    }
    if (/CUSTOS\s+VARI/i.test(desc)) {
      category = 'CUSTOS VARIÁVEIS';
      continue;
    }
    if (/^RATEIO$/i.test(desc)) continue;

    const amount = parseMoney(row[2]);
    const ratePcp = parseRatePercent(row[3]);
    const rateRc = parseRatePercent(row[4]);
    const ratePp = parseRatePercent(row[5]);

    for (let mi = 0; mi < MONTH_BLOCKS.length; mi++) {
      const block = MONTH_BLOCKS[mi];
      const monthLabel = monthLabels[mi] || `MES${mi + 1}`;
      const allocatedPcp = parseMoney(row[block.pcpCol]);
      const allocatedRc = parseMoney(row[block.rcCol]);
      const allocatedPp = parseMoney(row[block.ppCol]);
      const hasMonthly =
        allocatedPcp > 0 || allocatedRc > 0 || allocatedPp > 0;
      const calcPcp = hasMonthly ? allocatedPcp : (amount * ratePcp) / 100;
      const calcRc = hasMonthly ? allocatedRc : (amount * rateRc) / 100;
      const calcPp = hasMonthly ? allocatedPp : (amount * ratePp) / 100;

      if (amount <= 0 && !hasMonthly) continue;

      out.push({
        monthLabel,
        category,
        description: desc,
        amount,
        ratePcp,
        rateRc,
        ratePp,
        allocatedPcp: calcPcp,
        allocatedRc: calcRc,
        allocatedPp: calcPp,
      });
    }
  }
  return out;
}

export function parseControleVendasWorkbook(buffer: Buffer | ArrayBuffer): ParsedSpreadsheet {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  return {
    catalog: parseDadosCatalog(sheetRows(wb, 'Dados')),
    sales: parseDadosMl(sheetRows(wb, 'Dados_ML')),
    stock: parseEstoque(sheetRows(wb, 'ESTOQUE')),
    deliveries: parseEntregas(sheetRows(wb, 'ENTREGAS')),
    finance: parseFinanceiro(sheetRows(wb, 'FINANCEIRO')),
  };
}

export function parseControleVendasFile(filePath: string): ParsedSpreadsheet {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  return {
    catalog: parseDadosCatalog(sheetRows(wb, 'Dados')),
    sales: parseDadosMl(sheetRows(wb, 'Dados_ML')),
    stock: parseEstoque(sheetRows(wb, 'ESTOQUE')),
    deliveries: parseEntregas(sheetRows(wb, 'ENTREGAS')),
    finance: parseFinanceiro(sheetRows(wb, 'FINANCEIRO')),
  };
}

export function calcSaleEconomics(input: {
  revenueProducts: number;
  netTotal: number;
  unitCost: number;
  units: number;
  taxRatePercent: number;
}) {
  const productCost = input.unitCost * input.units;
  const taxAmount = input.revenueProducts * (input.taxRatePercent / 100);
  const grossProfit = input.netTotal - productCost - taxAmount;
  const marginPercent = input.revenueProducts > 0 ? (grossProfit / input.revenueProducts) * 100 : 0;
  return { productCost, taxAmount, grossProfit, marginPercent };
}
