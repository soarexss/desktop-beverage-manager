import { parseNfe } from './nfe-parser';
import { nfeFixture } from '../../test/fixtures/nfe.fixture';
describe('NF-e operational XML boundary', () => {
  it('preserves document total, commercial units, codes and decimal values', () => {
    const { xml, key } = nfeFixture();
    const parsed = parseNfe(xml);
    expect(parsed.accessKey).toBe(key);
    expect(parsed.totalAmount).toBe('28.00');
    expect(parsed.items[0]).toMatchObject({
      quantity: '2',
      unit: 'CX',
      total: '24.00',
      ncm: '22021000',
    });
  });
  it.each([
    [
      'DOCTYPE',
      (xml: string) =>
        xml.replace(
          '<nfeProc',
          '<!DOCTYPE nfeProc [<!ENTITY x SYSTEM "file:///sensitive">]><nfeProc',
        ),
    ],
    ['homologation', (xml: string) => xml.replaceAll('<tpAmb>1', '<tpAmb>2')],
    [
      'rejected/canceled',
      (xml: string) => xml.replace('<cStat>100', '<cStat>101'),
    ],
    ['consumer invoice', (xml: string) => xml.replace('<mod>55', '<mod>65')],
    ['tampered quantity', (xml: string) => xml.replace('2.0000', '3.0000')],
    [
      'duplicated item',
      (xml: string) =>
        xml.replace('</det>', '</det><det nItem="1"><prod/></det>'),
    ],
    ['oversized input', () => 'x'.repeat(524289)],
    ['deep input', () => '<a>'.repeat(65) + '</a>'.repeat(65)],
  ])('rejects %s', (_name, mutation) => {
    expect(() => parseNfe(mutation(nfeFixture().xml))).toThrow();
  });
});
