import { XMLParser } from 'fast-xml-parser';
import { AppError } from '@/lib/errors';
import type { NfeAddress, NfeItem, ParsedNfe } from './nfe.types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  isArray: (name) => name === 'det',
  parseTagValue: false,
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && value !== null && '#text' in value) {
    return String((value as { '#text': unknown })['#text'] ?? '').trim();
  }
  return String(value).trim();
}

function num(value: unknown, fallback = 0): number {
  const n = Number(text(value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function parseDate(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new AppError(400, `Data inválida no XML: ${value}`);
  }
  return d;
}

function parseAddress(ender: Record<string, unknown> | undefined): NfeAddress | undefined {
  if (!ender) return undefined;
  return {
    logradouro: text(ender.xLgr) || undefined,
    numero: text(ender.nro) || undefined,
    complemento: text(ender.xCpl) || undefined,
    bairro: text(ender.xBairro) || undefined,
    municipio: text(ender.xMun) || undefined,
    uf: text(ender.UF) || undefined,
    cep: text(ender.CEP) || undefined,
  };
}

export function parseNfeXml(xmlContent: string): ParsedNfe {
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xmlContent) as Record<string, unknown>;
  } catch {
    throw new AppError(400, 'XML corrompido ou inválido');
  }

  const root = (parsed.nfeProc ?? parsed.NFe ?? parsed) as Record<string, unknown>;
  const nfe = (root.NFe ?? root) as Record<string, unknown>;
  const infNFe = (nfe.infNFe ?? nfe) as Record<string, unknown>;

  if (!infNFe || typeof infNFe !== 'object') {
    throw new AppError(400, 'Estrutura de NF-e não encontrada no XML');
  }

  const ide = (infNFe.ide ?? {}) as Record<string, unknown>;
  const emit = (infNFe.emit ?? {}) as Record<string, unknown>;
  const total = ((infNFe.total as Record<string, unknown> | undefined)?.ICMSTot ??
    {}) as Record<string, unknown>;
  const prot = ((root.protNFe as Record<string, unknown> | undefined)?.infProt ??
    {}) as Record<string, unknown>;

  const mod = text(ide.mod);
  if (mod && mod !== '55') {
    throw new AppError(400, `Documento não é NF-e (modelo ${mod}). Esperado modelo 55.`);
  }

  const chaveAttr = text(infNFe['@_Id']).replace(/^NFe/i, '');
  const chaveAcesso = onlyDigits(text(prot.chNFe) || chaveAttr);
  if (chaveAcesso.length !== 44) {
    throw new AppError(400, 'Chave de acesso da NF-e inválida ou ausente');
  }

  const cnpj = onlyDigits(text(emit.CNPJ) || text(emit.CPF));
  if (!cnpj) {
    throw new AppError(400, 'CNPJ/CPF do emitente não encontrado');
  }

  const enderEmit = emit.enderEmit as Record<string, unknown> | undefined;
  const dataEmissao = parseDate(text(ide.dhEmi) || text(ide.dEmi));
  const dhSaiEnt = text(ide.dhSaiEnt) || text(ide.dSaiEnt);

  const dets = asArray(infNFe.det as Record<string, unknown> | Record<string, unknown>[]);
  if (dets.length === 0) {
    throw new AppError(400, 'A NF-e não possui itens');
  }

  const itens: NfeItem[] = dets.map((det, index) => {
    const prod = (det.prod ?? {}) as Record<string, unknown>;
    const ean = text(prod.cEAN) || text(prod.cEANTrib);
    const codigoBarras = ean && ean !== 'SEM GTIN' ? ean : undefined;

    return {
      numeroItem: Number(text(det['@_nItem'])) || index + 1,
      codigo: text(prod.cProd) || `ITEM-${index + 1}`,
      codigoBarras,
      descricao: text(prod.xProd) || 'Produto sem descrição',
      quantidade: num(prod.qCom),
      unidade: text(prod.uCom) || 'UN',
      valorUnitario: num(prod.vUnCom),
      valorTotal: num(prod.vProd),
      ncm: text(prod.NCM) || undefined,
      cfop: text(prod.CFOP) || undefined,
      cest: text(prod.CEST) || undefined,
      marca: undefined,
    };
  });

  const valorTotal = num(total.vNF);
  const frete = num(total.vFrete);
  const desconto = num(total.vDesc);
  const valorImpostos = num(total.vTotTrib);

  return {
    numero: text(ide.nNF),
    serie: text(ide.serie),
    chaveAcesso,
    dataEmissao,
    dataEntrada: dhSaiEnt ? parseDate(dhSaiEnt) : undefined,
    fornecedor: {
      cnpj,
      razaoSocial: text(emit.xNome) || 'Fornecedor sem nome',
      nomeFantasia: text(emit.xFant) || undefined,
      telefone: text(enderEmit?.fone) || undefined,
      endereco: parseAddress(enderEmit),
    },
    valorTotal,
    valorImpostos,
    frete,
    desconto,
    valorFinal: valorTotal,
    itens,
  };
}
