import { crc16, pixPayload } from './pix.service';

describe('BR Code PIX', () => {
  it('matches the Banco Central CRC example', () => {
    const body =
      '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
    expect(crc16(body)).toBe('1D3D');
  });
  it('includes the merchant key, amount and transaction reference', () => {
    const code = pixPayload(
      'lojista@example.com',
      'Loja São José',
      'São Paulo',
      '12.34',
      'c123456789012345678901234',
    );
    expect(code).toContain('lojista@example.com');
    expect(code).toContain('540512.34');
    expect(code).toContain('c123456789012345678901234');
    expect(code.slice(-4)).toBe(crc16(code.slice(0, -4)));
  });
  it('rejects invalid values and keys', () => {
    expect(() =>
      pixPayload('invalid', 'Loja', 'Cidade', '10.00', 'order1'),
    ).toThrow();
    expect(() =>
      pixPayload('lojista@example.com', 'Loja', 'Cidade', '-1.00', 'order1'),
    ).toThrow();
  });
});
