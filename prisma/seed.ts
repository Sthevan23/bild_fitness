import { PrismaClient, Platform, OrderStatus, FinanceType, FinanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type CatalogItem = {
  name: string;
  sku: string;
  category: string;
  unit: string;
  linkedSkus?: string[];
};

const catalog: CatalogItem[] = [
  // Halter Bola Pintado
  { name: 'Halter Bola Pintado 1 Kg', sku: 'HBP1', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBP1', 'KITPARHBP1_2'] },
  { name: 'Halter Bola Pintado 2 Kg', sku: 'HBP2', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBP2', 'KITPARHBP1_2'] },
  { name: 'Halter Bola Pintado 3 Kg', sku: 'HBP3', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBP3', 'KITPARHBP1_3'] },
  { name: 'Halter Bola Pintado 4 Kg', sku: 'HBP4', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBP4', 'KITPARHBP2_4_6'] },
  { name: 'Halter Bola Pintado 5 Kg', sku: 'HBP5', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBP5', 'KITPARHBP2_5'] },
  { name: 'Halter Bola Pintado 6 Kg', sku: 'HBP6', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBP6', 'KITPARHBP2_4_6'] },
  { name: 'Halter Bola Pintado 7 Kg', sku: 'HBP7', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBP7', 'KITPARHBP2_7'] },
  { name: 'Halter Bola Pintado 8 Kg', sku: 'HBP8', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBP8', 'KITPARHBP2_8'] },
  { name: 'Halter Bola Pintado 9 Kg', sku: 'HBP9', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBP9', 'KITPARHBP7_9'] },
  { name: 'Halter Bola Pintado 10 Kg', sku: 'HBP10', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBP10', 'KITPARHBP2_10'] },

  // Halter Bola Emborrachado
  { name: 'Halter Bola Emborrachado 1 Kg', sku: 'HBE1', category: 'Halteres', unit: 'UN', linkedSkus: ['KITPARHBE1_2', 'PARHBE1'] },
  { name: 'Halter Bola Emborrachado 2 Kg', sku: 'HBE2', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBE2', 'KITPARHBE1_2'] },
  { name: 'Halter Bola Emborrachado 3 Kg', sku: 'HBE3', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBE3', 'KITPARHBE1_3'] },
  { name: 'Halter Bola Emborrachado 4 Kg', sku: 'HBE4', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBE4', 'KITPARHBE2_4_6'] },
  { name: 'Halter Bola Emborrachado 5 Kg', sku: 'HBE5', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBE5', 'KITPARHBE2_5'] },
  { name: 'Halter Bola Emborrachado 6 Kg', sku: 'HBE6', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBE6', 'KITPARHBE2_4_6'] },
  { name: 'Halter Bola Emborrachado 7 Kg', sku: 'HBE7', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBE7', 'KITPARHBE2_7'] },
  { name: 'Halter Bola Emborrachado 8 Kg', sku: 'HBE8', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBE8', 'KITPARHBE2_8'] },
  { name: 'Halter Bola Emborrachado 9 Kg', sku: 'HBE9', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBE9', 'KITPARHBE7_9'] },
  { name: 'Halter Bola Emborrachado 10 Kg', sku: 'HBE10', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHBE10', 'KITPARHBE2_10'] },

  // Halter Sextavado Emborrachado
  { name: 'Halter Sextavado Emborrachado 1 Kg', sku: 'HSE1', category: 'Halteres', unit: 'UN', linkedSkus: ['KITPARHSE1_2', 'PARHSE1'] },
  { name: 'Halter Sextavado Emborrachado 2 Kg', sku: 'HSE2', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE2', 'KITPARHSE1_2'] },
  { name: 'Halter Sextavado Emborrachado 3 Kg', sku: 'HSE3', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE3', 'KITPARHSE1_3'] },
  { name: 'Halter Sextavado Emborrachado 4 Kg', sku: 'HSE4', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE4', 'KITPARHSE2_4_6'] },
  { name: 'Halter Sextavado Emborrachado 5 Kg', sku: 'HSE5', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE5', 'KITPARHSE2_5'] },
  { name: 'Halter Sextavado Emborrachado 6 Kg', sku: 'HSE6', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE6', 'KITPARHSE2_4_6'] },
  { name: 'Halter Sextavado Emborrachado 7 Kg', sku: 'HSE7', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE7', 'KITPARHSE2_7'] },
  { name: 'Halter Sextavado Emborrachado 8 Kg', sku: 'HSE8', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE8', 'KITPARHSE2_8'] },
  { name: 'Halter Sextavado Emborrachado 9 Kg', sku: 'HSE9', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE9', 'KITPARHSE7_9'] },
  { name: 'Halter Sextavado Emborrachado 10 Kg', sku: 'HSE10', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE10', 'KITPARHSE2_10'] },
  { name: 'Halter Sextavado Emborrachado 12 Kg', sku: 'HSE12', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE12'] },
  { name: 'Halter Sextavado Emborrachado 14 Kg', sku: 'HSE14', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE14'] },
  { name: 'Halter Sextavado Emborrachado 16 Kg', sku: 'HSE16', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE16'] },
  { name: 'Halter Sextavado Emborrachado 18 Kg', sku: 'HSE18', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSE18'] },
  { name: 'Halter Sextavado Emborrachado 20 Kg', sku: 'HSE20', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHS20', 'PARHSE20'] },

  // Halter Sextavado Pintado
  { name: 'Halter Sextavado Pintado 1 Kg', sku: 'HSP1', category: 'Halteres', unit: 'UN', linkedSkus: ['KITPARHSP1_2', 'PARHSP1'] },
  { name: 'Halter Sextavado Pintado 2 Kg', sku: 'HSP2', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSP2', 'KITPARHSP1_2'] },
  { name: 'Halter Sextavado Pintado 3 Kg', sku: 'HSP3', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSP3', 'KITPARHSP1_3'] },
  { name: 'Halter Sextavado Pintado 4 Kg', sku: 'HSP4', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSP4', 'KITPARHSP2_4_6'] },
  { name: 'Halter Sextavado Pintado 5 Kg', sku: 'HSP5', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSP5', 'KITPARHSP2_5'] },
  { name: 'Halter Sextavado Pintado 6 Kg', sku: 'HSP6', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSP6', 'KITPARHSP2_4_6'] },
  { name: 'Halter Sextavado Pintado 7 Kg', sku: 'HSP7', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSP7', 'KITPARHSP2_7'] },
  { name: 'Halter Sextavado Pintado 8 Kg', sku: 'HSP8', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSP8', 'KITPARHSP2_8'] },
  { name: 'Halter Sextavado Pintado 9 Kg', sku: 'HSP9', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSP9', 'KITPARHSP7_9'] },
  { name: 'Halter Sextavado Pintado 10 Kg', sku: 'HSP10', category: 'Halteres', unit: 'UN', linkedSkus: ['PARHSP10', 'KITPARHSP2_10'] },

  // Anilha Emborrachada
  { name: 'Anilha Emborrachada 1 Kg', sku: 'AE1', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAE1', 'KITPAE1_2'] },
  { name: 'Anilha Emborrachada 2 Kg', sku: 'AE2', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAE2', 'KITPAE1_2'] },
  { name: 'Anilha Emborrachada 3 Kg', sku: 'AE3', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAE3', 'KITPAE1_3'] },
  { name: 'Anilha Emborrachada 5 Kg', sku: 'AE5', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAE5', 'KITPAE1_5'] },
  { name: 'Anilha Emborrachada 10 Kg', sku: 'AE10', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAE10', 'KITPAE1_10'] },
  { name: 'Anilha Emborrachada 15 Kg', sku: 'AE15', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAE15', 'KITPAE3_15'] },

  // Anilha Vazada Injetada
  { name: 'Anilha Vazada Injetada 1 Kg', sku: 'AI1', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAI1', 'KITPAI1_2'] },
  { name: 'Anilha Vazada Injetada 2 Kg', sku: 'AI2', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAI2', 'KITPAI1_2'] },
  { name: 'Anilha Vazada Injetada 3 Kg', sku: 'AI3', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAI3', 'KITPAI1_3'] },
  { name: 'Anilha Vazada Injetada 5 Kg', sku: 'AI5', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAI5', 'KITPAI1_5'] },
  { name: 'Anilha Vazada Injetada 10 Kg', sku: 'AI10', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAI10', 'KITPAI1_10'] },
  { name: 'Anilha Vazada Injetada 15 Kg', sku: 'AI15', category: 'Anilhas', unit: 'UN', linkedSkus: ['PAI15', 'KITPAI3_15'] },

  // Anilha Sport Emborrachada
  { name: 'Anilha Sport Emborrachada 1 Kg', sku: 'ASE1', category: 'Anilhas', unit: 'UN', linkedSkus: ['PASE1', 'KITPASE1_2'] },
  { name: 'Anilha Sport Emborrachada 2 Kg', sku: 'ASE2', category: 'Anilhas', unit: 'UN', linkedSkus: ['PASE2', 'KITPASE1_2'] },
  { name: 'Anilha Sport Emborrachada 3 Kg', sku: 'ASE3', category: 'Anilhas', unit: 'UN', linkedSkus: ['PASE3', 'KITPASE1_3'] },
  { name: 'Anilha Sport Emborrachada 5 Kg', sku: 'ASE5', category: 'Anilhas', unit: 'UN', linkedSkus: ['PASE5', 'KITPASE1_5'] },
  { name: 'Anilha Sport Emborrachada 10 Kg', sku: 'ASE10', category: 'Anilhas', unit: 'UN', linkedSkus: ['PASE10', 'KITPASE1_10'] },
  { name: 'Anilha Sport Emborrachada 15 Kg', sku: 'ASE15', category: 'Anilhas', unit: 'UN', linkedSkus: ['PASE15', 'KITPASE3_15'] },
  { name: 'Anilha Sport Emborrachada 20 Kg', sku: 'ASE20', category: 'Anilhas', unit: 'UN', linkedSkus: ['PASE20'] },

  // Kettlebell Emborrachado
  { name: 'Kettlebell Emborrachado 4 Kg', sku: 'KETE4', category: 'Kettlebell', unit: 'UN', linkedSkus: ['KITKETE4_6'] },
  { name: 'Kettlebell Emborrachado 6 Kg', sku: 'KETE6', category: 'Kettlebell', unit: 'UN', linkedSkus: ['KITKETE4_6'] },
  { name: 'Kettlebell Emborrachado 8 Kg', sku: 'KETE8', category: 'Kettlebell', unit: 'UN', linkedSkus: ['KITKETE4_8', 'KITKETE8_10'] },
  { name: 'Kettlebell Emborrachado 10 Kg', sku: 'KETE10', category: 'Kettlebell', unit: 'UN', linkedSkus: ['KITKETE4_10', 'KITKETE8_10'] },
  { name: 'Kettlebell Emborrachado 12 Kg', sku: 'KETE12', category: 'Kettlebell', unit: 'UN', linkedSkus: ['KITKETE4_12'] },
  { name: 'Kettlebell Emborrachado 14 Kg', sku: 'KETE14', category: 'Kettlebell', unit: 'UN', linkedSkus: ['KITKETE4_14', 'KITKETE6_10_14'] },
  { name: 'Kettlebell Emborrachado 16 Kg', sku: 'KETE16', category: 'Kettlebell', unit: 'UN', linkedSkus: ['KITKETE4_16'] },
  { name: 'Kettlebell Emborrachado 18 Kg', sku: 'KETE18', category: 'Kettlebell', unit: 'UN', linkedSkus: ['KITKETE4_18'] },
  { name: 'Kettlebell Emborrachado 20 Kg', sku: 'KETE20', category: 'Kettlebell', unit: 'UN', linkedSkus: ['KITKETE4_20'] },

  // Acessórios
  { name: 'Tala Strap', sku: 'TALASTRAP', category: 'Acessórios', unit: 'PAR' },
  { name: 'Munhequeira Cross', sku: 'MUNHECROSS', category: 'Acessórios', unit: 'PAR' },
  { name: 'Munhequeira Tala Strap', sku: 'MUNHETALA', category: 'Acessórios', unit: 'PAR' },
  { name: 'Presilha 25mm Preta c/verde', sku: 'PARP_2x25', category: 'Acessórios', unit: 'PAR' },
  { name: 'Presilha 28mm Preta c/ azul', sku: 'PARP_2x28', category: 'Acessórios', unit: 'PAR' },
  { name: 'Suporte Halter 1 a 10 - A', sku: 'SUPHALTER1A10A', category: 'Acessórios', unit: 'UN' },
];

const accessoryPrices: Record<string, { cost: number; sale: number }> = {
  TALASTRAP: { cost: 22, sale: 49 },
  MUNHECROSS: { cost: 18, sale: 39 },
  MUNHETALA: { cost: 25, sale: 55 },
  PARP_2x25: { cost: 8, sale: 19 },
  PARP_2x28: { cost: 9, sale: 22 },
  SUPHALTER1A10A: { cost: 180, sale: 349 },
};

function extractKg(name: string): number | null {
  const match = name.match(/(\d+)\s*Kg/i);
  return match ? Number(match[1]) : null;
}

function priceFor(item: CatalogItem): { costPrice: number; salePrice: number } {
  const accessory = accessoryPrices[item.sku];
  if (accessory) return { costPrice: accessory.cost, salePrice: accessory.sale };

  const kg = extractKg(item.name) ?? 1;
  // Anilhas a bit cheaper per kg; kettlebell a bit higher
  let costPerKg = 8;
  let salePerKg = 15;
  if (item.category === 'Anilhas') {
    costPerKg = 7;
    salePerKg = 13;
  } else if (item.category === 'Kettlebell') {
    costPerKg = 9;
    salePerKg = 17;
  }
  return {
    costPrice: Math.round(kg * costPerKg * 100) / 100,
    salePrice: Math.round(kg * salePerKg * 100) / 100,
  };
}

function randomStock(): number {
  return Math.floor(Math.random() * 41);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function wipe() {
  await prisma.orderItem.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.financeEntry.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.nfeImport.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.verificationToken.deleteMany();
}

async function main() {
  console.log('Limpando banco (SQLite)...');
  await wipe();

  const password = await bcrypt.hash('admin123', 10);

  const company = await prisma.company.create({
    data: {
      name: 'Bild Fitness',
      theme: 'light',
    },
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        companyId: company.id,
        email: 'admin@bildfitness.local',
        name: 'Administrador',
        password,
        role: 'ADMIN',
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        email: 'financeiro@bildfitness.local',
        name: 'Financeiro',
        password,
        role: 'FINANCEIRO',
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        email: 'expedicao@bildfitness.local',
        name: 'Expedição',
        password,
        role: 'EXPEDICAO',
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        email: 'estoque@bildfitness.local',
        name: 'Estoque',
        password,
        role: 'ESTOQUE',
      },
    }),
  ]);

  const supplier = await prisma.supplier.create({
    data: {
      companyId: company.id,
      name: 'Fornecedor Academia SP',
      phone: '(11) 3456-7890',
      email: 'contato@fornecedoracademia.sp',
      city: 'São Paulo',
      cnpj: '12.345.678/0001-90',
      notes: 'Fornecedor principal de pesos e acessórios',
    },
  });

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        companyId: company.id,
        name: 'Academia Strong Fit',
        phone: '(11) 98888-1001',
        document: '11.222.333/0001-44',
        email: 'compras@strongfit.com.br',
        address: 'Av. Paulista, 1000',
        city: 'São Paulo',
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        name: 'Carlos Mendes',
        phone: '(11) 97777-2002',
        document: '123.456.789-00',
        email: 'carlos.mendes@email.com',
        address: 'Rua das Flores, 50',
        city: 'Guarulhos',
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        name: 'CrossBox Zona Sul',
        phone: '(11) 96666-3003',
        document: '55.666.777/0001-88',
        email: 'pedidos@crossboxzs.com.br',
        address: 'Rua Domingos de Morais, 200',
        city: 'São Paulo',
      },
    }),
  ]);

  console.log(`Importando catálogo (${catalog.length} produtos)...`);
  const products = [];
  for (const item of catalog) {
    const { costPrice, salePrice } = priceFor(item);
    const product = await prisma.product.create({
      data: {
        companyId: company.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        linkedSkus: item.linkedSkus?.filter(Boolean).join('; ') || null,
        stock: randomStock(),
        minStock: 5,
        costPrice,
        avgCost: costPrice,
        salePrice,
        brand: 'Bild Fitness',
        supplierId: supplier.id,
      },
    });
    products.push(product);
  }

  type SampleOrder = {
    number: string;
    customerIndex: number;
    platform: Platform;
    status: OrderStatus;
    paymentMethod: string;
    daysAgo: number;
    trackingCode?: string;
    notes?: string;
    items: { sku: string; quantity: number }[];
  };

  const sampleOrders: SampleOrder[] = [
    {
      number: 'PED-0001',
      customerIndex: 0,
      platform: 'MERCADO_LIVRE',
      status: 'ENTREGUE',
      paymentMethod: 'PIX',
      daysAgo: 20,
      trackingCode: 'MLBR123456789BR',
      items: [
        { sku: 'HBE5', quantity: 2 },
        { sku: 'AE10', quantity: 4 },
      ],
    },
    {
      number: 'PED-0002',
      customerIndex: 1,
      platform: 'SHOPEE',
      status: 'ENVIADO',
      paymentMethod: 'Cartão',
      daysAgo: 5,
      trackingCode: 'SP123456789BR',
      items: [
        { sku: 'KETE8', quantity: 1 },
        { sku: 'TALASTRAP', quantity: 1 },
      ],
    },
    {
      number: 'PED-0003',
      customerIndex: 2,
      platform: 'WHATSAPP',
      status: 'SEPARANDO',
      paymentMethod: 'PIX',
      daysAgo: 2,
      notes: 'Cliente pediu urgente',
      items: [
        { sku: 'HSE10', quantity: 2 },
        { sku: 'HSE12', quantity: 2 },
        { sku: 'MUNHECROSS', quantity: 2 },
      ],
    },
    {
      number: 'PED-0004',
      customerIndex: 0,
      platform: 'LOJA',
      status: 'AGUARDANDO',
      paymentMethod: 'Dinheiro',
      daysAgo: 1,
      items: [
        { sku: 'HBP3', quantity: 2 },
        { sku: 'HBP5', quantity: 2 },
      ],
    },
    {
      number: 'PED-0005',
      customerIndex: 1,
      platform: 'MERCADO_LIVRE',
      status: 'CANCELADO',
      paymentMethod: 'Boleto',
      daysAgo: 12,
      notes: 'Cancelado pelo comprador',
      items: [{ sku: 'ASE15', quantity: 2 }],
    },
    {
      number: 'PED-0006',
      customerIndex: 2,
      platform: 'SHOPEE',
      status: 'ENTREGUE',
      paymentMethod: 'PIX',
      daysAgo: 15,
      trackingCode: 'SP987654321BR',
      items: [
        { sku: 'AI5', quantity: 4 },
        { sku: 'AI10', quantity: 2 },
        { sku: 'PARP_2x28', quantity: 1 },
      ],
    },
    {
      number: 'PED-0007',
      customerIndex: 0,
      platform: 'WHATSAPP',
      status: 'ENVIADO',
      paymentMethod: 'Transferência',
      daysAgo: 4,
      trackingCode: 'BR1234567890',
      items: [
        { sku: 'KETE12', quantity: 1 },
        { sku: 'KETE16', quantity: 1 },
      ],
    },
    {
      number: 'PED-0008',
      customerIndex: 1,
      platform: 'LOJA',
      status: 'ENTREGUE',
      paymentMethod: 'Cartão',
      daysAgo: 8,
      items: [
        { sku: 'HSP8', quantity: 2 },
        { sku: 'SUPHALTER1A10A', quantity: 1 },
      ],
    },
    {
      number: 'PED-0009',
      customerIndex: 2,
      platform: 'MERCADO_LIVRE',
      status: 'SEPARANDO',
      paymentMethod: 'PIX',
      daysAgo: 3,
      items: [
        { sku: 'AE5', quantity: 6 },
        { sku: 'AE1', quantity: 4 },
        { sku: 'PARP_2x25', quantity: 2 },
      ],
    },
    {
      number: 'PED-0010',
      customerIndex: 0,
      platform: 'SHOPEE',
      status: 'AGUARDANDO',
      paymentMethod: 'Cartão',
      daysAgo: 0,
      items: [
        { sku: 'HBE2', quantity: 2 },
        { sku: 'HBE4', quantity: 2 },
        { sku: 'HBE6', quantity: 2 },
      ],
    },
  ];

  const productBySku = new Map(products.map((p) => [p.sku, p]));
  const createdOrders = [];

  for (const sample of sampleOrders) {
    const orderItems = sample.items.map((line) => {
      const product = productBySku.get(line.sku);
      if (!product) throw new Error(`SKU não encontrado: ${line.sku}`);
      const unitPrice = Number(product.salePrice);
      const quantity = line.quantity;
      return {
        productId: product.id,
        quantity,
        unitPrice,
        totalPrice: Math.round(unitPrice * quantity * 100) / 100,
      };
    });

    const total = Math.round(orderItems.reduce((sum, i) => sum + i.totalPrice, 0) * 100) / 100;
    const orderedAt = daysAgo(sample.daysAgo);
    const shippedAt =
      sample.status === 'ENVIADO' || sample.status === 'ENTREGUE'
        ? daysAgo(Math.max(0, sample.daysAgo - 1))
        : null;

    const order = await prisma.order.create({
      data: {
        companyId: company.id,
        number: sample.number,
        customerId: customers[sample.customerIndex].id,
        platform: sample.platform,
        status: sample.status,
        paymentMethod: sample.paymentMethod,
        trackingCode: sample.trackingCode ?? null,
        total,
        notes: sample.notes ?? null,
        orderedAt,
        shippedAt,
        items: {
          create: orderItems,
        },
      },
      include: { items: true },
    });
    createdOrders.push(order);
  }

  // Entradas financeiras a partir dos pedidos (exceto cancelados)
  let financeCount = 0;
  for (const order of createdOrders) {
    if (order.status === 'CANCELADO') continue;

    const isPaid = order.status === 'ENTREGUE' || order.status === 'ENVIADO';
    await prisma.financeEntry.create({
      data: {
        companyId: company.id,
        type: FinanceType.ENTRADA,
        status: isPaid ? FinanceStatus.RECEBIDO : FinanceStatus.PENDENTE,
        description: `Recebimento pedido ${order.number}`,
        amount: Number(order.total),
        dueDate: order.orderedAt,
        paidAt: isPaid ? order.shippedAt ?? order.orderedAt : null,
        category: 'Vendas',
        orderId: order.id,
      },
    });
    financeCount += 1;
  }

  // Algumas saídas (despesas)
  const saidas = [
    {
      description: 'Aluguel galpão',
      amount: 3500,
      category: 'Infraestrutura',
      status: FinanceStatus.PAGO,
      daysAgo: 10,
    },
    {
      description: 'Energia elétrica',
      amount: 680.5,
      category: 'Utilidades',
      status: FinanceStatus.PAGO,
      daysAgo: 7,
    },
    {
      description: 'Compra matéria-prima fornecedor',
      amount: 4200,
      category: 'Compras',
      status: FinanceStatus.PENDENTE,
      daysAgo: 3,
    },
    {
      description: 'Frete transporte',
      amount: 450,
      category: 'Logística',
      status: FinanceStatus.PAGO,
      daysAgo: 5,
    },
  ];

  for (const saida of saidas) {
    await prisma.financeEntry.create({
      data: {
        companyId: company.id,
        type: FinanceType.SAIDA,
        status: saida.status,
        description: saida.description,
        amount: saida.amount,
        dueDate: daysAgo(saida.daysAgo),
        paidAt: saida.status === FinanceStatus.PAGO ? daysAgo(saida.daysAgo) : null,
        category: saida.category,
      },
    });
    financeCount += 1;
  }

  console.log('\n========== Seed concluído ==========');
  console.log(`Empresa: ${company.name}`);
  console.log(`Usuários: ${users.length}`);
  users.forEach((u) => console.log(`  - ${u.email} / admin123 (${u.role})`));
  console.log(`Fornecedor: ${supplier.name}`);
  console.log(`Clientes: ${customers.length}`);
  console.log(`Produtos: ${products.length}`);
  console.log(`Pedidos: ${createdOrders.length}`);
  console.log(`Lançamentos financeiros: ${financeCount}`);
  console.log('====================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
