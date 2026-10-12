import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export type MpTokens = {
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_in: number;
  live_mode: boolean;
};
export type MpTerminal = {
  id: string;
  operating_mode: string;
  store_id?: string;
  pos_id?: string;
};
export type MpOrder = {
  user_id?: string | number;
  id: string;
  type: string;
  external_reference: string;
  status: string;
  status_detail?: string;
  config?: { point?: { terminal_id?: string } };
  transactions?: {
    payments?: Array<{
      id: string;
      amount: string;
      paid_amount?: string;
      status: string;
      status_detail?: string;
    }>;
  };
};

@Injectable()
export class MercadoPagoClient {
  private async request<T>(
    path: string,
    token?: string,
    method = 'GET',
    body?: unknown,
    key?: string,
  ): Promise<T> {
    try {
      const response = await fetch(`https://api.mercadopago.com${path}`, {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(key ? { 'X-Idempotency-Key': key } : {}),
          ...(path.endsWith('/cancel')
            ? { 'x-allow-cancelable-status': 'at_terminal' }
            : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      // Provider payloads/errors may contain credentials or customer information.
      if (!response.ok) throw new Error('Provider request rejected');
      return (await response.json()) as T;
    } catch {
      throw new ServiceUnavailableException(
        'Mercado Pago indisponível ou solicitação rejeitada. Consulte o status antes de repetir.',
      );
    }
  }

  async tokens(body: Record<string, string | boolean>) {
    const result = await this.request<MpTokens>(
      '/oauth/token',
      undefined,
      'POST',
      body,
    );
    if (
      typeof result.access_token !== 'string' ||
      typeof result.refresh_token !== 'string' ||
      !Number.isSafeInteger(result.user_id) ||
      !Number.isFinite(result.expires_in) ||
      result.expires_in <= 0 ||
      typeof result.live_mode !== 'boolean'
    )
      throw new ServiceUnavailableException('Resposta de autorização inválida');
    return result;
  }

  async terminals(token: string) {
    const all: MpTerminal[] = [];
    for (let offset = 0; offset < 1000; offset += 50) {
      const page = await this.request<{
        data: { terminals: MpTerminal[] };
        paging: { total: number };
      }>(`/terminals/v1/list?limit=50&offset=${offset}`, token);
      if (
        !Array.isArray(page.data?.terminals) ||
        page.data.terminals.some(
          (terminal) =>
            typeof terminal.id !== 'string' ||
            typeof terminal.operating_mode !== 'string',
        )
      )
        throw new ServiceUnavailableException('Lista de terminais inválida');
      all.push(...page.data.terminals);
      if (
        page.data.terminals.length < 50 ||
        all.length >= (page.paging?.total ?? Infinity)
      )
        return all;
    }
    throw new ServiceUnavailableException(
      'Limite de terminais excedido; contate o suporte',
    );
  }

  async create(
    token: string,
    terminalId: string,
    reference: string,
    amount: string,
    requestId: string,
  ) {
    return this.request<MpOrder>(
      '/v1/orders',
      token,
      'POST',
      {
        type: 'point',
        external_reference: reference,
        expiration_time: 'PT16M',
        transactions: { payments: [{ amount }] },
        config: {
          point: { terminal_id: terminalId, print_on_terminal: 'no_ticket' },
        },
        description: 'Venda no ERP',
      },
      requestId,
    );
  }

  get(token: string, id: string) {
    return this.request<MpOrder>(`/v1/orders/${encodeURIComponent(id)}`, token);
  }

  cancel(token: string, id: string, requestId: string) {
    return this.request<MpOrder>(
      `/v1/orders/${encodeURIComponent(id)}/cancel`,
      token,
      'POST',
      undefined,
      requestId,
    );
  }
}
