import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import {
  CreateFinancialTransactionDto,
  UpdateFinancialTransactionDto,
} from "./dto/financial.dto";
import { FinancialRepository } from "./financial.repository";

@Injectable()
export class FinancialService {
  constructor(
    private readonly financialRepository: FinancialRepository,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.financialRepository.findAll();
  }

  async create(dto: CreateFinancialTransactionDto, user: AuthenticatedUser) {
    const transaction = await this.financialRepository.create({
      ...dto,
      dueDate: new Date(dto.dueDate),
      createdById: user.sub,
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "financial.create",
      entityType: "financial_transaction",
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
    const existing = await this.financialRepository.findById(id);

    if (!existing) {
      throw new NotFoundException("Financial transaction not found");
    }

    const transaction = await this.financialRepository.update(id, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      paidAt: dto.status === "PAID" ? new Date() : undefined,
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "financial.update",
      entityType: "financial_transaction",
      entityId: id,
    });

    return transaction;
  }

  async summary() {
    const [receivables, payables, pending] =
      await this.financialRepository.summary();

    return {
      totalReceivables: Number(receivables._sum.amount ?? 0),
      totalPayables: Number(payables._sum.amount ?? 0),
      pendingBalance: Number(pending._sum.amount ?? 0),
    };
  }
}
