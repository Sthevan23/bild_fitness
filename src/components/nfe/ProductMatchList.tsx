import type { MatchKind, PreviewItem } from '@/services/nfe/nfe.types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';

const kindLabel: Record<MatchKind, string> = {
  codigo: 'SKU',
  ean: 'EAN',
  fuzzy: 'Similar',
  novo: 'Novo',
};

export function ProductMatchList({ items }: { items: PreviewItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2">Item</th>
            <th className="py-2">SKU / EAN</th>
            <th className="py-2">Qtd</th>
            <th className="py-2">Custo</th>
            <th className="py-2">Match</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.numeroItem} className="border-b last:border-0">
              <td className="py-2">
                <p className="font-medium">{item.descricao}</p>
                {item.product && item.matchKind === 'fuzzy' && (
                  <p className="text-xs text-muted-foreground">Similar a: {item.product.name}</p>
                )}
                {item.product && (
                  <p className="text-xs text-muted-foreground">
                    Estoque atual: {formatNumber(item.product.stock)}
                  </p>
                )}
              </td>
              <td className="py-2 font-mono text-xs">
                <p>{item.codigo}</p>
                <p className="text-muted-foreground">{item.codigoBarras || '—'}</p>
              </td>
              <td className="py-2">{formatNumber(item.quantidade)}</td>
              <td className="py-2">{formatCurrency(item.valorUnitario)}</td>
              <td className="py-2">
                <Badge variant={item.action === 'create' ? 'secondary' : 'success'}>
                  {kindLabel[item.matchKind]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
