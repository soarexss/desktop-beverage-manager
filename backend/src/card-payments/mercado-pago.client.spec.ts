import { MercadoPagoClient } from './mercado-pago.client';

describe('MercadoPagoClient transport', () => {
  const client = new MercadoPagoClient();
  afterEach(() => jest.restoreAllMocks());
  it('uses the documented Orders contract, fixed host and persisted idempotency key', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 'ORD123' })));
    await client.create(
      'test-only-token',
      'TERMINAL',
      'local-reference',
      '12.34',
      'same-key',
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/v1/orders');
    expect(init?.redirect).toBe('error');
    expect(init?.headers).toMatchObject({ 'X-Idempotency-Key': 'same-key' });
    expect(JSON.parse(init?.body as string)).toMatchObject({
      type: 'point',
      external_reference: 'local-reference',
      transactions: { payments: [{ amount: '12.34' }] },
      config: { point: { terminal_id: 'TERMINAL' } },
    });
  });
  it('requests asynchronous terminal cancellation without considering it final', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 202 }));
    await client.cancel('test-only-token', 'ORD123', 'cancel-key');
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      'x-allow-cancelable-status': 'at_terminal',
      'X-Idempotency-Key': 'cancel-key',
    });
    expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined();
  });
  it('does not expose provider error bodies or underlying transport errors', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('private-token-example'));
    await expect(client.get('test-only-token', 'ORD123')).rejects.toThrow(
      'Mercado Pago indisponível',
    );
  });
});
