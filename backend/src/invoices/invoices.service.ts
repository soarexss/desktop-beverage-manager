import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { Role } from "../common/enums/role.enum";
import { OrdersService } from "../orders/orders.service";
import { CreateInvoiceDto, UpdateInvoiceDto } from "./dto/invoice.dto";
import { InvoicesRepository } from "./invoices.repository";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly ordersService: OrdersService,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.invoicesRepository.findAll();
  }

  async create(dto: CreateInvoiceDto, user: AuthenticatedUser) {
    await this.ordersService.findOne(dto.orderId, {
      sub: user.sub,
      email: user.email,
      role: user.role === Role.ADMIN ? user.role : Role.ADMIN,
    });

    const invoice = await this.invoicesRepository.create({
      orderId: dto.orderId,
      externalReference: dto.externalReference,
      xmlContent: dto.xmlContent,
      status: "PENDING",
      issuedById: user.sub,
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "invoices.create",
      entityType: "invoice",
      entityId: invoice.id,
      metadata: { orderId: dto.orderId },
    });

    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto, user: AuthenticatedUser) {
    const existing = await this.invoicesRepository.findById(id);

    if (!existing) {
      throw new NotFoundException("Invoice not found");
    }

    const invoice = await this.invoicesRepository.update(id, {
      ...dto,
      processedAt:
        dto.status && dto.status !== "PENDING" ? new Date() : undefined,
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "invoices.update",
      entityType: "invoice",
      entityId: id,
      metadata: { status: dto.status },
    });

    return invoice;
  }
}
