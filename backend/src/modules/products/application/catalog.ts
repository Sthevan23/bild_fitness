/** Catálogo Bild Fitness — produtos unitários (sem kits). */
export type CatalogItem = {
  sku: string;
  name: string;
  category: string;
  weightKg?: number;
};

function kg(n: number) {
  return n;
}

export const BILD_CATALOG: CatalogItem[] = [
  // Halter bola pintado 1–10
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => ({
    sku: `HBP${w}`,
    name: `Halter Bola Pintado ${w} Kg`,
    category: 'Halter bola pintado',
    weightKg: kg(w),
  })),
  // Halter bola emborrachado 1–10
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => ({
    sku: `HBE${w}`,
    name: `Halter bola emborrachado ${w} Kg`,
    category: 'Halter bola emborrachado',
    weightKg: kg(w),
  })),
  // Halter sextavado emborrachado 1–10 + 12–20 even
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20].map((w) => ({
    sku: `HSE${w}`,
    name: `Halter sextavado emborrachado ${w} Kg`,
    category: 'Halter sextavado emborrachado',
    weightKg: kg(w),
  })),
  // Halter sextavado pintado 1–10
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => ({
    sku: `HSP${w}`,
    name: `Halter sextavado pintado ${w} Kg`,
    category: 'Halter sextavado pintado',
    weightKg: kg(w),
  })),
  // Anilha emborrachada
  ...[1, 2, 3, 5, 10, 15].map((w) => ({
    sku: `AE${w}`,
    name: `Anilha emborrachada ${w} Kg`,
    category: 'Anilha emborrachada',
    weightKg: kg(w),
  })),
  // Anilha Vazada Injetada
  ...[1, 2, 3, 5, 10, 15].map((w) => ({
    sku: `AVI${w}`,
    name: `Anilha Vazada Injetada ${w} Kg`,
    category: 'Anilha Vazada Injetada',
    weightKg: kg(w),
  })),
  // Anilha Sport emborrachada
  ...[1, 2, 3, 5, 10, 15].map((w) => ({
    sku: `ASE${w}`,
    name: `Anilha Sport emborrachada ${w} Kg`,
    category: 'Anilha Sport emborrachada',
    weightKg: kg(w),
  })),
  // Kettlebell Emborrachado
  ...[4, 6, 8, 10, 12, 14, 16, 18, 20].map((w) => ({
    sku: `KETE${w}`,
    name: `Kettlebell Emborrachado ${w} Kg`,
    category: 'Kettlebell Emborrachado',
    weightKg: kg(w),
  })),
  // Acessórios / bases
  { sku: 'SUPHALT1_5', name: 'Suporte Halteres 1 a 5', category: 'Suporte' },
  { sku: 'SUPHALT1_10', name: 'Suporte Halteres 1 a 10', category: 'Suporte' },
  { sku: 'BASEAGACH', name: 'Base de Agachamento', category: 'Base' },
  { sku: 'BASEFUGOLIMP', name: 'Base fugueteiro Barras Olimpicas', category: 'Base' },
  { sku: 'BASEFUGOLIMPSTD', name: 'Base fugueteiro Barras Olimpicas /Standart', category: 'Base' },
  { sku: 'BASEFUGSTD', name: 'Base fugueteiro Barras Standart', category: 'Base' },
  { sku: 'PRES25', name: 'Presilha 25mm Preta c/verde', category: 'Presilha' },
  { sku: 'PRES28', name: 'Presilha 28mm Preta c/ azul', category: 'Presilha' },
];

export async function upsertCatalogProducts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  companyId: string,
) {
  const accounts = await prisma.salesAccount.findMany({ where: { companyId } });
  let upserted = 0;
  for (const item of BILD_CATALOG) {
    const product = await prisma.product.upsert({
      where: { companyId_sku: { companyId, sku: item.sku } },
      create: {
        companyId,
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: 'UN',
        stock: 0,
        minStock: 5,
        costPrice: 0,
        avgCost: 0,
        salePrice: 0,
        weightKg: item.weightKg ?? null,
      },
      update: {
        name: item.name,
        category: item.category,
        weightKg: item.weightKg ?? null,
      },
    });
    for (const account of accounts) {
      await prisma.accountStock.upsert({
        where: { accountId_productId: { accountId: account.id, productId: product.id } },
        create: { accountId: account.id, productId: product.id, stock: 0, minStock: 5 },
        update: {},
      });
    }
    upserted += 1;
  }
  return upserted;
}
