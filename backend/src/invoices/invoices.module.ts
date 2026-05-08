import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { OrdersModule } from "../orders/orders.module";
import { InvoicesController } from "./invoices.controller";
import { InvoicesRepository } from "./invoices.repository";
import { InvoicesService } from "./invoices.service";

@Module({
  imports: [AuditModule, OrdersModule],
  controllers: [InvoicesController],
  providers: [InvoicesRepository, InvoicesService],
})
export class InvoicesModule {}
