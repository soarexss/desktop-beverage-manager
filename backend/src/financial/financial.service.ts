import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  CreateFinancialTransactionDto,
  UpdateFinancialTransactionDto,
} from './dto/financial.dto';
import { FinancialRepository } from './financial.repository';
import { PrismaService } from '../database/prisma.service';
import { serializable } from '../common/transaction';

@Injectable()
export class FinancialService {
  constructor(
    private readonly financialRepository: FinancialRepository,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  findAll() {
    return this.financialRepository.findAll();
  }

  async create(dto: CreateFinancialTransactionDto, user: AuthenticatedUser) {
    if (dto.orderId)
      throw new BadRequestException(
        'Títulos de pedidos são gerados pelo fluxo de venda',
      );
    if (dto.status === 'PAID')
      throw new BadRequestException(
        'Crie o título em aberto e registre o pagamento',
      );

    const transaction = await this.financialRepository.create({
      ...dto,
      dueDate: new Date(dto.dueDate),
      createdById: user.sub,
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: 'financial.create',
      entityType: 'financial_transaction',
      entityId: transaction.id,
      metadata: { type: transaction.type, amount: transaction.amount },
    });

    return transaction;
  }

  async update(
    id: string,
    dto: UpdateFinancialTransactionDto,
    user: AuthenticatedUser,
  ) {
    return serializable(this.prisma, async (tx) => {
      const existing = await tx.financialTransaction.findUnique({
        where: { id },
        include: { payments: true },
      });
      if (!existing) throw new NotFoundException('Título não encontrado');
      if (
        dto.orderId ||
        existing.orderId ||
        existing.purchaseOrderId ||
        dto.status === 'PAID' ||
        existing.status === 'PAID' ||
        existing.status === 'CANCELLED' ||
        existing.payments.length > 0
      )
        throw new BadRequestException(
          'Títulos vinculados, pagos ou cancelados devem ser tratados pelo fluxo de origem',
        );
      const transaction = await tx.financialTransaction.update({
        where: { id },
        data: {
          ...dto,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          action: 'financial.update',
          entityType: 'financial_transaction',
          entityId: id,
        },
      });
      return transaction;
    });
  }

  async summary() {
    const rows = await this.financialRepository.findAll();

    let totalReceivables = 0;

    let totalPayables = 0;

    for (const row of rows) {
      if (!['PENDING', 'OVERDUE'].includes(row.status)) continue;

      const balance =
        Number(row.amount) -
        row.payments.reduce((sum, p) => sum + Number(p.amount), 0);

      if (row.type === 'RECEIVABLE') totalReceivables += balance;
      else totalPayables += balance;
    }

    return {
      totalReceivables,
      totalPayables,
      pendingBalance: totalReceivables - totalPayables,
    };
  }
}
