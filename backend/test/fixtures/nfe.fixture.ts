// Synthetic XML for tests only. Not a signed/authorized fiscal document.
export const RECIPIENT_CNPJ = '12345678000195';
export function nfeFixture(number = 123, recipient = RECIPIENT_CNPJ) {
  const issuer = '11222333000181';
  const base = `532610${issuer}55001${String(number).padStart(9, '0')}112345678`;
  let sum = 0;
  for (
    let index = 42, weight = 2;
    index >= 0;
    index--, weight = weight === 9 ? 2 : weight + 1
  )
    sum += Number(base[index]) * weight;
  const remainder = sum % 11;
  const key = base + (remainder < 2 ? 0 : 11 - remainder);
  return {
    key,
    xml: `<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${key}" versao="4.00"><ide><mod>55</mod><serie>1</serie><nNF>${number}</nNF><dhEmi>2026-10-12T10:00:00-03:00</dhEmi><tpNF>1</tpNF><finNFe>1</finNFe><tpAmb>1</tpAmb></ide><emit><CNPJ>${issuer}</CNPJ><xNome>Fornecedor de teste</xNome></emit><dest><CNPJ>${recipient}</CNPJ></dest><det nItem="1"><prod><cProd>CX-1</cProd><cEAN>7891234567890</cEAN><xProd>Produto de teste em caixa</xProd><NCM>22021000</NCM><CFOP>5102</CFOP><uCom>CX</uCom><qCom>2.0000</qCom><vUnCom>12.0000000000</vUnCom><vProd>24.00</vProd><indTot>1</indTot></prod></det><total><ICMSTot><vProd>24.00</vProd><vFrete>5.00</vFrete><vDesc>1.00</vDesc><vNF>28.00</vNF></ICMSTot></total></infNFe></NFe><protNFe><infProt><tpAmb>1</tpAmb><chNFe>${key}</chNFe><cStat>100</cStat></infProt></protNFe></nfeProc>`,
  };
}
