import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { OrdersModule } from "../orders/orders.module";
import { DeliveriesController } from "./deliveries.controller";
import { DeliveriesRepository } from "./deliveries.repository";
import { DeliveriesService } from "./deliveries.service";

@Module({
  imports: [AuditModule, OrdersModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesRepository, DeliveriesService],
})
export class DeliveriesModule {}
