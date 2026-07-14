import { AppError } from '@/lib/errors';
import type { ParsedNfe } from './nfe.types';

export function validateParsedNfe(nfe: ParsedNfe): void {
  if (!nfe.numero) throw new AppError(400, 'Número da NF-e ausente no XML');
  if (!nfe.serie) throw new AppError(400, 'Série da NF-e ausente no XML');
  if (!nfe.chaveAcesso || nfe.chaveAcesso.length !== 44) {
    throw new AppError(400, 'Chave de acesso inválida');
  }
  if (!nfe.fornecedor.cnpj) throw new AppError(400, 'CNPJ do fornecedor ausente');
  if (!nfe.itens.length) throw new AppError(400, 'NF-e sem itens');
  for (const item of nfe.itens) {
    if (!item.descricao) throw new AppError(400, `Item ${item.numeroItem} sem descrição`);
    if (item.quantidade <= 0) {
      throw new AppError(400, `Item ${item.numeroItem} com quantidade inválida`);
    }
  }
}
