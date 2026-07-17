import { prisma } from '../../../shared/prisma.js';

export type ExplodedComponent = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
};

/**
 * Resolve um produto vendido em componentes de estoque.
 * - Se tiver kit (ProductKitComponent), retorna os componentes × quantidade.
 * - Caso contrário, retorna o próprio produto (qty 1).
 * Sempre multiplicado pela quantidade vendida.
 */
export async function explodeProductForStock(
  productId: string,
  soldQuantity: number,
): Promise<ExplodedComponent[]> {
  const components = await prisma.productKitComponent.findMany({
    where: { kitProductId: productId },
    include: { componentProduct: true },
  });

  if (!components.length) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return [];
    return [
      {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: soldQuantity,
      },
    ];
  }

  return components.map((c) => ({
    productId: c.componentProductId,
    sku: c.componentProduct.sku,
    name: c.componentProduct.name,
    quantity: Number(c.quantity) * soldQuantity,
  }));
}
