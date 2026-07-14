export type StockStatus = 'ok' | 'baixo' | 'zerado';

export function getStockStatus(
  estoque: number,
  estoqueMinimo = 10,
): StockStatus {
  if (estoque <= 0) return 'zerado';
  if (estoque <= estoqueMinimo) return 'baixo';
  return 'ok';
}

export function stockStatusLabel(status: StockStatus) {
  if (status === 'zerado') return 'Zerado';
  if (status === 'baixo') return 'Estoque baixo';
  return 'Em estoque';
}
