import * as XLSX from '@e965/xlsx';
import { readFileSync } from 'fs';
import type { OrderStatus } from '@prisma/client';

export type ParsedMlVenda = {
  externalSaleId: string;
  soldAt: Date | null;
  status: OrderStatus;
  statusRaw: string;
  units: number;
  revenueProducts: number;
  fees: number;
  shippingRevenue: number;
  shippingFees: number;
  total: number;
  sku: string;
  mlItemId: string | null;
  title: string;
  buyerName: string | null;
  document: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  trackingCode: string | null;
  carrier: string | null;
  lineIndex: number;
};

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

function cellStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

function cellNum(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v)
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function normalizeHeader(h: string) {
  return h
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findCol(headers: string[], ...needles: string[]) {
  const normalized = headers.map(normalizeHeader);
  // 1) exact match
  for (const needle of needles) {
    const n = normalizeHeader(needle);
    const exact = normalized.findIndex((h) => h === n);
    if (exact >= 0) return exact;
  }
  // 2) startsWith (avoids “pago pelo comprador” matching “comprador”)
  for (const needle of needles) {
    const n = normalizeHeader(needle);
    const idx = normalized.findIndex((h) => h.startsWith(n));
    if (idx >= 0) return idx;
  }
  return -1;
}

function findColNth(headers: string[], needle: string, occurrence: number) {
  const n = normalizeHeader(needle);
  const normalized = headers.map(normalizeHeader);
  let seen = 0;
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === n) {
      seen += 1;
      if (seen === occurrence) return i;
    }
  }
  return -1;
}

/** "5 de agosto de 2026 17:01 hs." ou serial Excel */
export function parseMlDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0);
  }
  const raw = cellStr(value);
  const m = raw.match(
    /(\d{1,2})\s+de\s+([a-zçãé]+)\s+de\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i,
  );
  if (m) {
    const day = Number(m[1]);
    const monthName = m[2].toLowerCase();
    const year = Number(m[3]);
    const hour = m[4] ? Number(m[4]) : 12;
    const minute = m[5] ? Number(m[5]) : 0;
    const month = PT_MONTHS[monthName];
    if (month == null) return null;
    return new Date(year, month, day, hour, minute, 0);
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mapMlStatus(estado: string): OrderStatus {
  const e = normalizeHeader(estado);
  if (e.includes('cancel')) return 'CANCELADO';
  if (e.includes('entregue')) return 'ENTREGUE';
  if (
    e.includes('caminho') ||
    e.includes('enviado') ||
    e.includes('enviada') ||
    e.includes('em transito') ||
    e.includes('coletado')
  ) {
    return 'ENVIADO';
  }
  return 'AGUARDANDO';
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i] || [];
    const joined = row.map((c) => normalizeHeader(cellStr(c))).join('|');
    if (
      joined.includes('de venda') &&
      (joined.includes('sku') || joined.includes('anuncio') || joined.includes('comprador'))
    ) {
      return i;
    }
  }
  return 5;
}

export function parseMlVendasWorkbook(buffer: Buffer): ParsedMlVenda[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => normalizeHeader(n).includes('vendas br')) || wb.SheetNames[0];
  if (!sheetName) throw new Error('Planilha sem abas');
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (!rows.length) return [];

  const headerIdx = findHeaderRow(rows);
  const headers = (rows[headerIdx] || []).map((c) => cellStr(c));

  const colSale = findCol(headers, 'n.º de venda', 'nº de venda', 'n. de venda', 'n.o de venda');
  // fallback: primeira coluna cujo nome contém "venda" e "n"
  const saleCol =
    colSale >= 0
      ? colSale
      : headers.findIndex((h) => {
          const n = normalizeHeader(h);
          return n.includes('venda') && (n.includes('n.') || n.startsWith('n'));
        });
  const colDate = findCol(headers, 'data da venda');
  const colEstado = findColNth(headers, 'estado', 1);
  const colUnits = findCol(headers, 'unidades');
  const colRevenue = findCol(headers, 'receita por produtos (brl)', 'receita por produtos');
  const colFees = findCol(headers, 'tarifa de venda e impostos');
  const colShipRev = findCol(headers, 'receita por envio');
  const colShipFee = findCol(headers, 'tarifas de envio');
  const colTotal = findCol(headers, 'total (brl)', 'total');
  const colSku = findCol(headers, 'sku');
  const colMlItem = findCol(headers, '# de anuncio', '# de anúncio');
  const colTitle = findCol(headers, 'titulo do anuncio', 'título do anúncio');
  const colUnitPrice = findCol(
    headers,
    'preco unitario de venda do anuncio',
    'preço unitário de venda do anúncio',
  );
  const colBuyer = findCol(headers, 'comprador');
  const colCpf = findCol(headers, 'cpf');
  const colPhone = findCol(headers, 'telefone', 'celular', 'phone');
  const colAddress = findColNth(headers, 'endereco', 2) >= 0
    ? findColNth(headers, 'endereco', 2)
    : findCol(headers, 'endereco');
  const colCity = findCol(headers, 'cidade');
  const colState = findColNth(headers, 'estado', 2);
  const colTracking = findCol(headers, 'numero de rastreamento', 'número de rastreamento');
  const colCarrier = findCol(headers, 'transportador');

  if (saleCol < 0 || colSku < 0) {
    throw new Error('Cabeçalho inválido: esperado export “Vendas BR” do Mercado Livre');
  }

  const out: ParsedMlVenda[] = [];
  let lastBuyer: {
    name: string | null;
    document: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  } = { name: null, document: null, phone: null, address: null, city: null, state: null };

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const saleId = cellStr(row[saleCol]);
    const sku = cellStr(row[colSku]);
    const units = colUnits >= 0 ? cellNum(row[colUnits]) : 0;

    const buyerName = colBuyer >= 0 ? cellStr(row[colBuyer]) || null : null;
    const document = colCpf >= 0 ? cellStr(row[colCpf]).replace(/\D/g, '') || null : null;
    const phone = colPhone >= 0 ? cellStr(row[colPhone]) || null : null;
    const address = colAddress >= 0 ? cellStr(row[colAddress]) || null : null;
    const city = colCity >= 0 ? cellStr(row[colCity]) || null : null;
    const state = colState >= 0 ? cellStr(row[colState]) || null : null;

    if (buyerName || document) {
      lastBuyer = {
        name: buyerName || lastBuyer.name,
        document: document || lastBuyer.document,
        phone: phone || lastBuyer.phone,
        address: address || lastBuyer.address,
        city: city || lastBuyer.city,
        state: state || lastBuyer.state,
      };
    }

    // Linha de pacote / vazia sem SKU
    if (!saleId || !sku || units <= 0) continue;

    const estado = colEstado >= 0 ? cellStr(row[colEstado]) : '';
    let revenueProducts = colRevenue >= 0 ? Math.abs(cellNum(row[colRevenue])) : 0;
    let fees = colFees >= 0 ? Math.abs(cellNum(row[colFees])) : 0;
    let shippingRevenue = colShipRev >= 0 ? cellNum(row[colShipRev]) : 0;
    let shippingFees = colShipFee >= 0 ? Math.abs(cellNum(row[colShipFee])) : 0;
    let total = colTotal >= 0 ? cellNum(row[colTotal]) : 0;
    const unitPrice = colUnitPrice >= 0 ? Math.abs(cellNum(row[colUnitPrice])) : 0;

    // Itens de pacote: receita fica na linha-mãe; usa preço unitário do anúncio
    if (revenueProducts <= 0 && unitPrice > 0) {
      revenueProducts = unitPrice * units;
      total = revenueProducts;
    }

    out.push({
      externalSaleId: saleId,
      soldAt: colDate >= 0 ? parseMlDate(row[colDate]) : null,
      status: mapMlStatus(estado),
      statusRaw: estado,
      units,
      revenueProducts,
      fees,
      shippingRevenue,
      shippingFees,
      total,
      sku,
      mlItemId: colMlItem >= 0 ? cellStr(row[colMlItem]) || null : null,
      title: colTitle >= 0 ? cellStr(row[colTitle]) : sku,
      buyerName: buyerName || lastBuyer.name,
      document: document || lastBuyer.document,
      phone: phone || lastBuyer.phone,
      address: address || lastBuyer.address,
      city: city || lastBuyer.city,
      state: state || lastBuyer.state,
      trackingCode: colTracking >= 0 ? cellStr(row[colTracking]) || null : null,
      carrier: colCarrier >= 0 ? cellStr(row[colCarrier]) || null : null,
      lineIndex: i,
    });
  }

  return out;
}

export function parseMlVendasFile(filePath: string): ParsedMlVenda[] {
  return parseMlVendasWorkbook(readFileSync(filePath));
}
