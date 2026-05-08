import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ClientsModule } from "../clients/clients.module";
import { InventoryModule } from "../inventory/inventory.module";
import { ProductsModule } from "../products/products.module";
import { OrdersController } from "./orders.controller";
import { OrdersRepository } from "./orders.repository";
import { OrdersService } from "./orders.service";

@Module({
  imports: [AuditModule, ClientsModule, ProductsModule, InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersRepository, OrdersService],
})
export class OrdersModule {}
