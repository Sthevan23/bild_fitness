import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Item = {
  descricao: string;
  codigo: string;
  categoria: string;
  unidade: string;
  skusVinculados?: string[];
};

const items: Item[] = [
  // Halter Bola Pintado
  { descricao: 'Halter Bola Pintado 1 Kg', codigo: 'HBP1', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBP1', 'KITPARHBP1_2'] },
  { descricao: 'Halter Bola Pintado 2 Kg', codigo: 'HBP2', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBP2', 'KITPARHBP1_2'] },
  { descricao: 'Halter Bola Pintado 3 Kg', codigo: 'HBP3', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBP3', 'KITPARHBP1_3'] },
  { descricao: 'Halter Bola Pintado 4 Kg', codigo: 'HBP4', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBP4', 'KITPARHBP2_4_6'] },
  { descricao: 'Halter Bola Pintado 5 Kg', codigo: 'HBP5', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBP5', 'KITPARHBP2_5'] },
  { descricao: 'Halter Bola Pintado 6 Kg', codigo: 'HBP6', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBP6', 'KITPARHBP2_4_6'] },
  { descricao: 'Halter Bola Pintado 7 Kg', codigo: 'HBP7', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBP7', 'KITPARHBP2_7'] },
  { descricao: 'Halter Bola Pintado 8 Kg', codigo: 'HBP8', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBP8', 'KITPARHBP2_8'] },
  { descricao: 'Halter Bola Pintado 9 Kg', codigo: 'HBP9', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBP9', 'KITPARHBP7_9'] },
  { descricao: 'Halter Bola Pintado 10 Kg', codigo: 'HBP10', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBP10', 'KITPARHBP2_10'] },

  // Halter Bola Emborrachado
  { descricao: 'Halter Bola Emborrachado 1 Kg', codigo: 'HBE1', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['KITPARHBE1_2', 'PARHBE1'] },
  { descricao: 'Halter Bola Emborrachado 2 Kg', codigo: 'HBE2', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBE2', 'KITPARHBE1_2'] },
  { descricao: 'Halter Bola Emborrachado 3 Kg', codigo: 'HBE3', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBE3', 'KITPARHBE1_3'] },
  { descricao: 'Halter Bola Emborrachado 4 Kg', codigo: 'HBE4', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBE4', 'KITPARHBE2_4_6'] },
  { descricao: 'Halter Bola Emborrachado 5 Kg', codigo: 'HBE5', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBE5', 'KITPARHBE2_5'] },
  { descricao: 'Halter Bola Emborrachado 6 Kg', codigo: 'HBE6', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBE6', 'KITPARHBE2_4_6'] },
  { descricao: 'Halter Bola Emborrachado 7 Kg', codigo: 'HBE7', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBE7', 'KITPARHBE2_7'] },
  { descricao: 'Halter Bola Emborrachado 8 Kg', codigo: 'HBE8', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBE8', 'KITPARHBE2_8'] },
  { descricao: 'Halter Bola Emborrachado 9 Kg', codigo: 'HBE9', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBE9', 'KITPARHBE7_9'] },
  { descricao: 'Halter Bola Emborrachado 10 Kg', codigo: 'HBE10', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHBE10', 'KITPARHBE2_10'] },

  // Halter Sextavado Emborrachado
  { descricao: 'Halter Sextavado Emborrachado 1 Kg', codigo: 'HSE1', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['KITPARHSE1_2', 'PARHSE1'] },
  { descricao: 'Halter Sextavado Emborrachado 2 Kg', codigo: 'HSE2', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE2', 'KITPARHSE1_2'] },
  { descricao: 'Halter Sextavado Emborrachado 3 Kg', codigo: 'HSE3', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE3', 'KITPARHSE1_3'] },
  { descricao: 'Halter Sextavado Emborrachado 4 Kg', codigo: 'HSE4', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE4', 'KITPARHSE2_4_6'] },
  { descricao: 'Halter Sextavado Emborrachado 5 Kg', codigo: 'HSE5', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE5', 'KITPARHSE2_5'] },
  { descricao: 'Halter Sextavado Emborrachado 6 Kg', codigo: 'HSE6', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE6', 'KITPARHSE2_4_6'] },
  { descricao: 'Halter Sextavado Emborrachado 7 Kg', codigo: 'HSE7', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE7', 'KITPARHSE2_7'] },
  { descricao: 'Halter Sextavado Emborrachado 8 Kg', codigo: 'HSE8', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE8', 'KITPARHSE2_8'] },
  { descricao: 'Halter Sextavado Emborrachado 9 Kg', codigo: 'HSE9', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE9', 'KITPARHSE7_9'] },
  { descricao: 'Halter Sextavado Emborrachado 10 Kg', codigo: 'HSE10', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE10', 'KITPARHSE2_10'] },
  { descricao: 'Halter Sextavado Emborrachado 12 Kg', codigo: 'HSE12', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE12'] },
  { descricao: 'Halter Sextavado Emborrachado 14 Kg', codigo: 'HSE14', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE14'] },
  { descricao: 'Halter Sextavado Emborrachado 16 Kg', codigo: 'HSE16', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE16'] },
  { descricao: 'Halter Sextavado Emborrachado 18 Kg', codigo: 'HSE18', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSE18'] },
  { descricao: 'Halter Sextavado Emborrachado 20 Kg', codigo: 'HSE20', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHS20', 'PARHSE20'] },

  // Halter Sextavado Pintado
  { descricao: 'Halter Sextavado Pintado 1 Kg', codigo: 'HSP1', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['KITPARHSP1_2', 'PARHSP1'] },
  { descricao: 'Halter Sextavado Pintado 2 Kg', codigo: 'HSP2', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSP2', 'KITPARHSP1_2'] },
  { descricao: 'Halter Sextavado Pintado 3 Kg', codigo: 'HSP3', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSP3', 'KITPARHSP1_3'] },
  { descricao: 'Halter Sextavado Pintado 4 Kg', codigo: 'HSP4', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSP4', 'KITPARHSP2_4_6'] },
  { descricao: 'Halter Sextavado Pintado 5 Kg', codigo: 'HSP5', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSP5', 'KITPARHSP2_5'] },
  { descricao: 'Halter Sextavado Pintado 6 Kg', codigo: 'HSP6', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSP6', 'KITPARHSP2_4_6'] },
  { descricao: 'Halter Sextavado Pintado 7 Kg', codigo: 'HSP7', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSP7', 'KITPARHSP2_7'] },
  { descricao: 'Halter Sextavado Pintado 8 Kg', codigo: 'HSP8', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSP8', 'KITPARHSP2_8'] },
  { descricao: 'Halter Sextavado Pintado 9 Kg', codigo: 'HSP9', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSP9', 'KITPARHSP7_9'] },
  { descricao: 'Halter Sextavado Pintado 10 Kg', codigo: 'HSP10', categoria: 'Halteres', unidade: 'UN', skusVinculados: ['PARHSP10', 'KITPARHSP2_10'] },

  // Anilha Emborrachada
  { descricao: 'Anilha Emborrachada 1 Kg', codigo: 'AE1', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAE1', 'KITPAE1_2'] },
  { descricao: 'Anilha Emborrachada 2 Kg', codigo: 'AE2', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAE2', 'KITPAE1_2'] },
  { descricao: 'Anilha Emborrachada 3 Kg', codigo: 'AE3', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAE3', 'KITPAE1_3'] },
  { descricao: 'Anilha Emborrachada 5 Kg', codigo: 'AE5', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAE5', 'KITPAE1_5'] },
  { descricao: 'Anilha Emborrachada 10 Kg', codigo: 'AE10', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAE10', 'KITPAE1_10'] },
  { descricao: 'Anilha Emborrachada 15 Kg', codigo: 'AE15', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAE15', 'KITPAE3_15'] },

  // Anilha Vazada Injetada
  { descricao: 'Anilha Vazada Injetada 1 Kg', codigo: 'AI1', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAI1', 'KITPAI1_2'] },
  { descricao: 'Anilha Vazada Injetada 2 Kg', codigo: 'AI2', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAI2', 'KITPAI1_2'] },
  { descricao: 'Anilha Vazada Injetada 3 Kg', codigo: 'AI3', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAI3', 'KITPAI1_3'] },
  { descricao: 'Anilha Vazada Injetada 5 Kg', codigo: 'AI5', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAI5', 'KITPAI1_5'] },
  { descricao: 'Anilha Vazada Injetada 10 Kg', codigo: 'AI10', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAI10', 'KITPAI1_10'] },
  { descricao: 'Anilha Vazada Injetada 15 Kg', codigo: 'AI15', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PAI15', 'KITPAI3_15'] },

  // Anilha Sport Emborrachada
  { descricao: 'Anilha Sport Emborrachada 1 Kg', codigo: 'ASE1', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PASE1', 'KITPASE1_2'] },
  { descricao: 'Anilha Sport Emborrachada 2 Kg', codigo: 'ASE2', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PASE2', 'KITPASE1_2'] },
  { descricao: 'Anilha Sport Emborrachada 3 Kg', codigo: 'ASE3', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PASE3', 'KITPASE1_3'] },
  { descricao: 'Anilha Sport Emborrachada 5 Kg', codigo: 'ASE5', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PASE5', 'KITPASE1_5'] },
  { descricao: 'Anilha Sport Emborrachada 10 Kg', codigo: 'ASE10', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PASE10', 'KITPASE1_10'] },
  { descricao: 'Anilha Sport Emborrachada 15 Kg', codigo: 'ASE15', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PASE15', 'KITPASE3_15'] },
  { descricao: 'Anilha Sport Emborrachada 20 Kg', codigo: 'ASE20', categoria: 'Anilhas', unidade: 'UN', skusVinculados: ['PASE20'] },

  // Kettlebell Emborrachado
  { descricao: 'Kettlebell Emborrachado 4 Kg', codigo: 'KETE4', categoria: 'Kettlebell', unidade: 'UN', skusVinculados: ['KITKETE4_6'] },
  { descricao: 'Kettlebell Emborrachado 6 Kg', codigo: 'KETE6', categoria: 'Kettlebell', unidade: 'UN', skusVinculados: ['KITKETE4_6'] },
  { descricao: 'Kettlebell Emborrachado 8 Kg', codigo: 'KETE8', categoria: 'Kettlebell', unidade: 'UN', skusVinculados: ['KITKETE4_8', 'KITKETE8_10'] },
  { descricao: 'Kettlebell Emborrachado 10 Kg', codigo: 'KETE10', categoria: 'Kettlebell', unidade: 'UN', skusVinculados: ['KITKETE4_10', 'KITKETE8_10'] },
  { descricao: 'Kettlebell Emborrachado 12 Kg', codigo: 'KETE12', categoria: 'Kettlebell', unidade: 'UN', skusVinculados: ['KITKETE4_12'] },
  { descricao: 'Kettlebell Emborrachado 14 Kg', codigo: 'KETE14', categoria: 'Kettlebell', unidade: 'UN', skusVinculados: ['KITKETE4_14', 'KITKETE6_10_14'] },
  { descricao: 'Kettlebell Emborrachado 16 Kg', codigo: 'KETE16', categoria: 'Kettlebell', unidade: 'UN', skusVinculados: ['KITKETE4_16'] },
  { descricao: 'Kettlebell Emborrachado 18 Kg', codigo: 'KETE18', categoria: 'Kettlebell', unidade: 'UN', skusVinculados: ['KITKETE4_18'] },
  { descricao: 'Kettlebell Emborrachado 20 Kg', codigo: 'KETE20', categoria: 'Kettlebell', unidade: 'UN', skusVinculados: ['KITKETE4_20'] },

  // Acessórios
  { descricao: 'Tala Strap', codigo: 'TALASTRAP', categoria: 'Acessórios', unidade: 'PAR' },
  { descricao: 'Munhequeira Cross', codigo: 'MUNHECROSS', categoria: 'Acessórios', unidade: 'PAR' },
  { descricao: 'Munhequeira Tala Strap', codigo: 'MUNHETALA', categoria: 'Acessórios', unidade: 'PAR' },
  { descricao: 'Presilha 25mm Preta c/verde', codigo: 'PARP_2x25', categoria: 'Acessórios', unidade: 'PAR' },
  { descricao: 'Presilha 28mm Preta c/ azul', codigo: 'PARP_2x28', categoria: 'Acessórios', unidade: 'PAR' },
  { descricao: 'Suporte Halter 1 a 10 - A', codigo: 'SUPHALTER1A10A', categoria: 'Acessórios', unidade: 'UN' },
];

async function upsertProduct(companyId: string, item: Item) {
  const linked = item.skusVinculados?.filter(Boolean).join('; ') || null;
  const name = item.descricao;
  const sku = item.codigo;

  const existing = await prisma.product.findUnique({
    where: { companyId_sku: { companyId, sku } },
  });
  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        name,
        category: item.categoria,
        unit: item.unidade,
        brand: 'Bild Fitness',
        linkedSkus: linked,
      },
    });
    return 'updated' as const;
  }

  await prisma.product.create({
    data: {
      companyId,
      sku,
      name,
      stock: 0,
      minStock: 5,
      costPrice: 0,
      avgCost: 0,
      salePrice: 0,
      unit: item.unidade,
      category: item.categoria,
      brand: 'Bild Fitness',
      linkedSkus: linked,
    },
  });
  return 'created' as const;
}

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) throw new Error('Nenhuma empresa no banco. Rode npm run db:seed');

  let created = 0;
  let updated = 0;

  for (const item of items) {
    const result = await upsertProduct(company.id, item);
    if (result === 'created') created += 1;
    else updated += 1;
    console.log(`${result === 'created' ? 'Criado' : 'Atualizado'}: ${item.codigo} — ${item.descricao}`);
  }

  console.log(`\nConcluído: ${created} criados, ${updated} atualizados, total ${items.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
