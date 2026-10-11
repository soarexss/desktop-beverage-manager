import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import QRCode from 'qrcode';
import { PrismaService } from '../database/prisma.service';
import { OrdersService } from './orders.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

function field(id: string, value: string) {
  const length = Buffer.byteLength(value, 'utf8');
  if (length > 99)
    throw new BadRequestException('Campo PIX excedeu o tamanho permitido');
  return `${id}${length.toString().padStart(2, '0')}${value}`;
}

export function crc16(value: string) {
  let crc = 0xffff;
  for (const byte of Buffer.from(value, 'utf8')) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function pixPayload(
  key: string,
  name: string,
  city: string,
  amount: string,
  txid: string,
) {
  if (
    !/^(?:\d{11}|\d{14}|\+[1-9]\d{1,14}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[^\s@]+@[^\s@]+\.[^\s@]+)$/i.test(
      key,
    )
  )
    throw new BadRequestException('Chave PIX inválida');
  if (
    !/^[A-Za-z0-9]{1,25}$/.test(txid) ||
    !/^\d+\.\d{2}$/.test(amount) ||
    Number(amount) <= 0
  )
    throw new BadRequestException('Dados PIX inválidos');
  const normalized = (text: string, max: number) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 .-]/g, '')
      .trim()
      .slice(0, max);
  const merchant = normalized(name, 25);
  const location = normalized(city, 15);
  if (!merchant || !location)
    throw new BadRequestException('Configure nome e cidade do recebedor');
  const body =
    field('00', '01') +
    field('26', field('00', 'br.gov.bcb.pix') + field('01', key)) +
    field('52', '0000') +
    field('53', '986') +
    field('54', amount) +
    field('58', 'BR') +
    field('59', merchant) +
    field('60', location) +
    field('62', field('05', txid)) +
    '6304';
  return body + crc16(body);
}

@Injectable()
export class PixService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  async forOrder(id: string, user: AuthenticatedUser) {
    const order = await this.orders.findOne(id, user);
    if (order.status === 'CANCELLED')
      throw new BadRequestException('Pedido cancelado');
    const title = await this.prisma.financialTransaction.findFirst({
      where: {
        orderId: id,
        type: 'RECEIVABLE',
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      include: { payments: true },
    });
    if (!title) throw new BadRequestException('Pedido sem saldo a receber');
    const amount = title.payments.reduce(
      (sum, p) => sum.minus(p.amount),
      title.amount,
    );
    if (amount.lessThanOrEqualTo(0))
      throw new BadRequestException('Pedido sem saldo a receber');
    const key = this.config.get<string>('PIX_KEY');
    const name = this.config.get<string>('PIX_MERCHANT_NAME');
    const city = this.config.get<string>('PIX_MERCHANT_CITY');
    if (!key || !name || !city)
      throw new ServiceUnavailableException(
        'PIX não configurado. Solicite ao administrador a chave, nome e cidade do lojista.',
      );
    const txid = order.id;
    const copyPaste = pixPayload(key, name, city, amount.toFixed(2), txid);
    return {
      copyPaste,
      qrCode: await QRCode.toDataURL(copyPaste, {
        errorCorrectionLevel: 'M',
        margin: 4,
        width: 320,
      }),
      amount: amount.toFixed(2),
      txid,
      merchantName: name,
      confirmation: 'MANUAL',
      message:
        'Recebimento direto na conta vinculada à chave. Confira no banco antes de dar baixa.',
    };
  }
}
