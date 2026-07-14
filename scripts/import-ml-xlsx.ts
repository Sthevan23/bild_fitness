import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';

const prisma = new PrismaClient();
const path =
  'c:/Users/Administrador/Downloads/Vendas_BR_Mercado_Livre_2024-01-04_10-30hs_541666081.xlsx';

type RowAgg = {
  sku: string | null;
  titulo: string;
  variacao: string;
  preco: number;
  unidades: number;
};

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) throw new Error('Nenhuma empresa no banco. Rode npm run db:seed');

  const wb = XLSX.readFile(path);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Vendas BR'], {
    header: 1,
    defval: null,
  }) as unknown[][];

  const map = new Map<string, RowAgg>();

  for (let i = 6; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[16]) continue;

    const sku = r[14] ? String(r[14]).trim() : null;
    const titulo = String(r[16]).trim();
    const variacao = r[17] ? String(r[17]).trim() : '';
    const preco = Number(r[18] ?? r[6] ?? 0) || 0;
    const unidades = Number(r[5] ?? 0) || 0;
    const key = sku || titulo;

    const prev = map.get(key) || { sku, titulo, variacao, preco, unidades: 0 };
    prev.unidades += unidades;
    if (preco > 0) prev.preco = preco;
    if (variacao) prev.variacao = variacao;
    map.set(key, prev);
  }

  const products = [...map.values()];
  console.log(`Produtos únicos na planilha: ${products.length}`);

  let created = 0;
  let updated = 0;

  for (const p of products) {
    const sku =
      p.sku ||
      `ML-${p.titulo.slice(0, 20).replace(/\s+/g, '').toUpperCase()}`;
    const name = p.variacao ? `${p.titulo} — ${p.variacao}` : p.titulo;
    const costPrice = Number((p.preco * 0.55).toFixed(2));

    const existing = await prisma.product.findUnique({
      where: { companyId_sku: { companyId: company.id, sku } },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name,
          salePrice: p.preco,
          costPrice: Number(existing.costPrice) > 0 ? existing.costPrice : costPrice,
          category: 'Halteres',
          brand: 'Bild Fitness',
          unit: 'PAR',
          minStock: 4,
        },
      });
      updated += 1;
      console.log(`Atualizado: ${sku} — ${name}`);
    } else {
      await prisma.product.create({
        data: {
          companyId: company.id,
          sku,
          name,
          stock: 10,
          minStock: 4,
          costPrice,
          avgCost: costPrice,
          salePrice: p.preco,
          unit: 'PAR',
          category: 'Halteres',
          brand: 'Bild Fitness',
        },
      });
      created += 1;
      console.log(`Criado: ${sku} — ${name}`);
    }
  }

  console.log(`\nConcluído: ${created} criados, ${updated} atualizados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
