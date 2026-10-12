import { normalizeCnpj, TAX_REGIMES, validCnpj } from './company-validation';
describe('Company registration', () => {
  it.each([
    '11.222.333/0001-81',
    '12345678000195',
    '12.ABC.345/01DE-35',
    '00.000.000/E08G-12',
  ])('accepts official numeric/alphanumeric CNPJ format %s', (document) => {
    expect(validCnpj(document)).toBe(true);
  });
  it.each([
    '00000000000000',
    '12345678000196',
    '12ABC34501DE36',
    '123',
    '12!ABC34501DE35',
  ])('rejects invalid CNPJ %s', (document) => {
    expect(validCnpj(document)).toBe(false);
  });
  it('normalizes formatting and distinguishes MEI from normal regimes', () => {
    expect(normalizeCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35');
    expect(TAX_REGIMES.MEI).toBe('4');
    expect(TAX_REGIMES.LUCRO_REAL).toBe('3');
  });
});
