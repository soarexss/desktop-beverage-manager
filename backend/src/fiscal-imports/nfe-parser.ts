import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { validCnpj } from '../company-profile/company-validation';

export const MAX_XML_BYTES = 512 * 1024;
type Node = Record<string, unknown>;
function node(value: unknown): Node {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException(
      'Estrutura XML de NF-e inválida ou duplicada',
    );
  return value as Node;
}
function text(value: unknown, max = 150): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new BadRequestException(
      'Campo obrigatório da NF-e ausente ou inválido',
    );
  return value.trim();
}
function amount(value: unknown, decimals: number, positive = false) {
  const input = text(value, 25);
  if (!/^\d+(?:\.\d+)?$/.test(input))
    throw new BadRequestException('Valor/quantidade inválido no XML');
  const result = new Prisma.Decimal(input);
  if (
    result.decimalPlaces() > decimals ||
    result.greaterThan(999999999) ||
    (positive && result.lessThanOrEqualTo(0))
  )
    throw new BadRequestException(
      'Precisão ou limite de valor/quantidade não suportado',
    );
  return result;
}
export function validAccessKey(key: string) {
  if (!/^\d{44}$/.test(key)) return false;
  let sum = 0;
  for (
    let index = 42, weight = 2;
    index >= 0;
    index--, weight = weight === 9 ? 2 : weight + 1
  )
    sum += Number(key[index]) * weight;
  const remainder = sum % 11;
  return Number(key[43]) === (remainder < 2 ? 0 : 11 - remainder);
}
export function parseNfe(xml: string) {
  if (Buffer.byteLength(xml, 'utf8') > MAX_XML_BYTES)
    throw new BadRequestException('XML excede 512 KiB');
  if (
    /<!\s*(?:DOCTYPE|ENTITY)/i.test(xml) ||
    /<\s*(?:\w+:)?(?:__proto__|constructor|prototype)\b/i.test(xml)
  )
    throw new BadRequestException('Declarações XML não permitidas');
  let depth = 0,
    tags = 0;
  for (const [tag] of xml.matchAll(
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]*>/g,
  )) {
    if (++tags > 20000)
      throw new BadRequestException('XML com muitos elementos');
    if (tag.startsWith('<?') || tag.startsWith('<!')) continue;
    if (tag.startsWith('</')) depth--;
    else if (!tag.endsWith('/>')) depth++;
    if (depth > 64)
      throw new BadRequestException('XML com profundidade excessiva');
  }
  if (XMLValidator.validate(xml) !== true)
    throw new BadRequestException('XML malformado');
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
    processEntities: true,
    removeNSPrefix: true,
  });
  let root: Node;
  try {
    root = node(parser.parse(xml) as unknown);
  } catch {
    throw new BadRequestException('Não foi possível ler o XML');
  }
  const processed = node(root.nfeProc);
  const nfe = node(processed.NFe);
  const info = node(nfe.infNFe);
  const ide = node(info.ide);
  const issuer = node(info.emit),
    recipient = node(info.dest);
  const protocol = node(node(processed.protNFe).infProt);
  if (
    processed['@_versao'] !== '4.00' ||
    info['@_versao'] !== '4.00' ||
    ide.mod !== '55'
  )
    throw new BadRequestException(
      'Importe XML processado de NF-e modelo 55, versão 4.00; NFC-e/PDF não suportados',
    );
  if (
    ide.tpAmb !== '1' ||
    protocol.tpAmb !== '1' ||
    !['100', '150'].includes(String(protocol.cStat))
  )
    throw new BadRequestException(
      'XML deve informar autorização em produção; homologação/rejeição não entram no estoque',
    );
  if (ide.tpNF !== '1' || ide.finNFe !== '1')
    throw new BadRequestException(
      'Esta entrada aceita somente venda normal do fornecedor; devoluções/complementos exigem outro fluxo',
    );
  const accessKey = text(protocol.chNFe, 44);
  if (!validAccessKey(accessKey))
    throw new BadRequestException(
      'Chave inválida. Esta versão de importação aceita chaves numéricas de 44 dígitos',
    );
  const issuerDocument = text(issuer.CNPJ, 14),
    recipientDocument = text(recipient.CNPJ, 14);
  if (
    !validCnpj(issuerDocument) ||
    !validCnpj(recipientDocument) ||
    info['@_Id'] !== `NFe${accessKey}` ||
    accessKey.slice(6, 20) !== issuerDocument ||
    accessKey.slice(20, 22) !== '55'
  )
    throw new BadRequestException(
      'Chave, emitente ou destinatário divergentes no XML',
    );
  const number = text(ide.nNF, 9),
    series = text(ide.serie, 3);
  if (
    !/^\d+$/.test(number) ||
    !/^\d+$/.test(series) ||
    Number(accessKey.slice(25, 34)) !== Number(number) ||
    Number(accessKey.slice(22, 25)) !== Number(series)
  )
    throw new BadRequestException('Número/série divergentes da chave');
  const issuedAt = text(ide.dhEmi, 35);
  if (!Number.isFinite(Date.parse(issuedAt)))
    throw new BadRequestException('Data de emissão inválida');
  const details = Array.isArray(info.det) ? info.det : [info.det];
  if (!details.length || details.length > 100)
    throw new BadRequestException('Importe até 100 itens por nota');
  const items = details.map((value) => {
    const detail = node(value),
      product = node(detail.prod);
    const line = Number(text(detail['@_nItem'], 3));
    if (
      !Number.isInteger(line) ||
      line < 1 ||
      line > 999 ||
      product.indTot !== '1'
    )
      throw new BadRequestException(
        'Item sem composição de total não suportado',
      );
    const quantity = amount(product.qCom, 4, true);
    const unitCost = amount(product.vUnCom, 10);
    const total = amount(product.vProd, 2);
    if (
      unitCost
        .mul(quantity)
        .toDecimalPlaces(2)
        .minus(total)
        .abs()
        .greaterThan('0.01')
    )
      throw new BadRequestException('Total de item divergente no XML');
    const traces = product.rastro
      ? Array.isArray(product.rastro)
        ? product.rastro
        : [product.rastro]
      : [];
    if (traces.length > 1)
      throw new BadRequestException(
        'Item com múltiplos lotes: divida/concilie o recebimento antes de importar',
      );
    const trace = traces.length ? node(traces[0]) : null;
    if (trace && !amount(trace.qLote, 4, true).equals(quantity))
      throw new BadRequestException(
        'Quantidade do lote difere da quantidade comercial; concilie as unidades antes de importar',
      );
    const barcode =
      typeof product.cEAN === 'string' &&
      /^\d{8,14}$/.test(product.cEAN) &&
      !/^0+$/.test(product.cEAN)
        ? product.cEAN
        : null;
    const ncm = text(product.NCM, 8);
    if (!/^\d{8}$/.test(ncm)) throw new BadRequestException('NCM inválido');
    return {
      line,
      code: text(product.cProd, 60),
      name: text(product.xProd, 120),
      unit: text(product.uCom, 6),
      barcode,
      ncm,
      cfop: text(product.CFOP, 4),
      quantity: quantity.toString(),
      unitCost: unitCost.toString(),
      total: total.toFixed(2),
      batchNumber: trace ? text(trace.nLote, 20) : null,
      expiresAt: trace ? text(trace.dVal, 10) : null,
    };
  });
  if (new Set(items.map((item) => item.line)).size !== items.length)
    throw new BadRequestException('Item duplicado no XML');
  const total = node(node(info.total).ICMSTot);
  const productTotal = amount(total.vProd, 2);
  if (
    !items
      .reduce((sum, item) => sum.plus(item.total), new Prisma.Decimal(0))
      .equals(productTotal)
  )
    throw new BadRequestException('Total de produtos divergente');
  return {
    accessKey,
    number,
    series,
    issuedAt,
    issuerDocument,
    supplierName: text(issuer.xNome),
    recipientDocument,
    totalAmount: amount(total.vNF, 2, true).toFixed(2),
    subtotal: productTotal.toFixed(2),
    freightAmount: amount(total.vFrete ?? '0', 2).toFixed(2),
    discountAmount: amount(total.vDesc ?? '0', 2).toFixed(2),
    items,
  };
}
