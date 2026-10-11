import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

import { PrismaService } from '../database/prisma.service';
import { serializable } from '../common/transaction';

import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { InvoicesRepository } from './invoices.repository';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,

    private readonly prisma: PrismaService,
  ) {}

  findAll() {
    return this.invoicesRepository.findAll();
  }

  async create(dto: CreateInvoiceDto, user: AuthenticatedUser) {
    return serializable(this.prisma, async (tx) => {
      const order = await tx.order.findUnique({ where: { id: dto.orderId } });
      if (!order || order.status === 'CANCELLED')
        throw new BadRequestException(
          'Pedido indisponível para pendência fiscal',
        );
      const existing = await tx.invoice.findUnique({
        where: { orderId: dto.orderId },
      });
      if (existing) return existing;
      const invoice = await tx.invoice.create({
        data: { ...dto, status: 'PENDING', issuedById: user.sub },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          action: 'invoices.create',
          entityType: 'invoice',
          entityId: invoice.id,
          metadata: { orderId: dto.orderId },
        },
      });
      return invoice;
    });
  }

  async update(id: string, dto: UpdateInvoiceDto, user: AuthenticatedUser) {
    return serializable(this.prisma, async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Pendência não encontrada');
      if (
        dto.orderId ||
        existing.status !== 'PENDING' ||
        (dto.status && dto.status !== 'PENDING')
      )
        throw new BadRequestException(
          'Vínculo é imutável e status fiscal depende de integração autorizada',
        );
      const invoice = await tx.invoice.update({ where: { id }, data: dto });
      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          action: 'invoices.update',
          entityType: 'invoice',
          entityId: id,
        },
      });
      return invoice;
    });
  }
}
