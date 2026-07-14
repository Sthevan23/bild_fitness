export interface NfeAddress {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

export interface NfeSupplier {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco?: NfeAddress;
  telefone?: string;
}

export interface NfeItem {
  numeroItem: number;
  codigo: string;
  codigoBarras?: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  ncm?: string;
  cfop?: string;
  cest?: string;
  marca?: string;
}

export interface ParsedNfe {
  numero: string;
  serie: string;
  chaveAcesso: string;
  dataEmissao: Date;
  dataEntrada?: Date;
  fornecedor: NfeSupplier;
  valorTotal: number;
  valorImpostos: number;
  frete: number;
  desconto: number;
  valorFinal: number;
  itens: NfeItem[];
}

export type MatchKind = 'codigo' | 'ean' | 'fuzzy' | 'novo';

export interface MatchedProduct {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  stock: number;
  avgCost: number;
}

export interface PreviewItem extends NfeItem {
  matchKind: MatchKind;
  matchScore?: number;
  product?: MatchedProduct;
  action: 'update' | 'create';
}

export interface NfePreview {
  previewId: string;
  nota: Omit<ParsedNfe, 'itens'>;
  itens: PreviewItem[];
  summary: {
    totalItens: number;
    itensExistentes: number;
    itensNovos: number;
    itensFuzzy: number;
  };
}
