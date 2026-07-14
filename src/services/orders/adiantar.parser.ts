/** Formato diário do cliente:
 * 13/07/2026 BILD ML 2 Halter bola emborrachado 2 Kg Patricia Nazario
 */

export type AdiantarParsedLine = {
  lineNumber: number;
  raw: string;
  date: Date;
  brand: string;
  platformCode: string;
  quantity: number;
  productText: string;
  customerName?: string;
  ok: boolean;
  error?: string;
};

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Aliases do PDF → nomes do catálogo */
const PRODUCT_ALIASES: Array<{ pattern: RegExp; catalog: string }> = [
  { pattern: /presilha\s*lockpress\s*25\s*mm.*verde/i, catalog: 'Presilha 25mm Preta c/verde' },
  { pattern: /presilha\s*lockpress\s*28\s*mm.*azul/i, catalog: 'Presilha 28mm Preta c/ azul' },
  { pattern: /presilha\s*25\s*mm/i, catalog: 'Presilha 25mm Preta c/verde' },
  { pattern: /presilha\s*28\s*mm/i, catalog: 'Presilha 28mm Preta c/ azul' },
];

export function parseAdiantarDate(value: string): Date | null {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Separa produto e cliente no restante da linha.
 * Ex.: "Halter bola emborrachado 2 Kg Patricia Nazario"
 */
export function splitProductAndCustomer(
  remainder: string,
  catalogNames: string[],
): { productText: string; customerName?: string } {
  const remNorm = normalize(remainder);

  for (const alias of PRODUCT_ALIASES) {
    const m = remainder.match(alias.pattern);
    if (m && m.index === 0) {
      const after = remainder.slice(m[0].length).trim();
      return { productText: alias.catalog, customerName: after || undefined };
    }
  }

  const sorted = [...catalogNames].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const n = normalize(name);
    if (remNorm === n || remNorm.startsWith(`${n} `)) {
      const wordCount = name.trim().split(/\s+/).length;
      const remWords = remainder.trim().split(/\s+/);
      const customer = remWords.slice(wordCount).join(' ').trim();
      return { productText: name, customerName: customer || undefined };
    }
  }

  // Fallback: corta após peso "X Kg" ou "XKG"
  const weight = remainder.match(/^(.*?(\d+(?:[.,]\d+)?\s*kg))\s*(.*)$/i);
  if (weight) {
    return {
      productText: weight[1].trim(),
      customerName: weight[3]?.trim() || undefined,
    };
  }

  return { productText: remainder.trim() };
}

export function parseAdiantarText(text: string, catalogNames: string[] = []): AdiantarParsedLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('--') && !/^page\b/i.test(l));

  const results: AdiantarParsedLine[] = [];
  let lineNumber = 0;

  for (const raw of lines) {
    lineNumber += 1;

    // Linha só com nome (continuação sem data) — ignora no parse estruturado
    if (!/^\d{2}\/\d{2}\/\d{4}\b/.test(raw)) {
      results.push({
        lineNumber,
        raw,
        date: new Date(),
        brand: '',
        platformCode: '',
        quantity: 0,
        productText: raw,
        ok: false,
        error: 'Linha sem data/formato (ignorada ou nome solto)',
      });
      continue;
    }

    const m = raw.match(
      /^(\d{2}\/\d{2}\/\d{4})\s+(\S+)\s+(ML|SHOPEE|AMZ|WHATSAPP|LOJA)\s+(\d+)\s+(.+)$/i,
    );
    if (!m) {
      results.push({
        lineNumber,
        raw,
        date: new Date(),
        brand: '',
        platformCode: '',
        quantity: 0,
        productText: '',
        ok: false,
        error: 'Formato inválido. Esperado: DD/MM/AAAA MARCA ML QTD PRODUTO [CLIENTE]',
      });
      continue;
    }

    const date = parseAdiantarDate(m[1]);
    if (!date) {
      results.push({
        lineNumber,
        raw,
        date: new Date(),
        brand: m[2],
        platformCode: m[3].toUpperCase(),
        quantity: Number(m[4]),
        productText: m[5],
        ok: false,
        error: 'Data inválida',
      });
      continue;
    }

    const qty = Number(m[4]);
    const { productText, customerName } = splitProductAndCustomer(m[5].trim(), catalogNames);

    results.push({
      lineNumber,
      raw,
      date,
      brand: m[2].toUpperCase(),
      platformCode: m[3].toUpperCase(),
      quantity: qty,
      productText,
      customerName,
      ok: qty > 0,
      error: qty > 0 ? undefined : 'Quantidade inválida',
    });
  }

  return results;
}

export function matchProductName(
  productText: string,
  products: { id: string; name: string; sku: string; salePrice: unknown }[],
) {
  const target = normalize(productText);

  for (const alias of PRODUCT_ALIASES) {
    if (alias.pattern.test(productText) || normalize(alias.catalog) === target) {
      const found = products.find((p) => normalize(p.name) === normalize(alias.catalog));
      if (found) return found;
    }
  }

  let best: (typeof products)[number] | null = null;
  let bestLen = 0;
  for (const p of products) {
    const n = normalize(p.name);
    if (n === target) return p;
    if (target.startsWith(n) && n.length > bestLen) {
      best = p;
      bestLen = n.length;
    }
    if (n.includes(target) && target.length >= 8 && target.length > bestLen) {
      best = p;
      bestLen = target.length;
    }
  }
  return best;
}

export function platformFromCode(code: string) {
  switch (code.toUpperCase()) {
    case 'ML':
      return 'MERCADO_LIVRE' as const;
    case 'SHOPEE':
      return 'SHOPEE' as const;
    case 'WHATSAPP':
      return 'WHATSAPP' as const;
    case 'LOJA':
      return 'LOJA' as const;
    default:
      return 'MERCADO_LIVRE' as const;
  }
}

export function formatAdiantarLine(params: {
  date: Date;
  brand: string;
  platformCode: string;
  quantity: number;
  productName: string;
  customerName?: string | null;
}) {
  const dd = String(params.date.getDate()).padStart(2, '0');
  const mm = String(params.date.getMonth() + 1).padStart(2, '0');
  const yyyy = params.date.getFullYear();
  const base = `${dd}/${mm}/${yyyy} ${params.brand} ${params.platformCode} ${params.quantity} ${params.productName}`;
  return params.customerName ? `${base} ${params.customerName}` : base;
}
