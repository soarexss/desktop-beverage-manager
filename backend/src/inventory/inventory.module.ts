import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ProductsModule } from "../products/products.module";
import { InventoryController } from "./inventory.controller";
import { InventoryRepository } from "./inventory.repository";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [AuditModule, ProductsModule],
  controllers: [InventoryController],
  providers: [InventoryRepository, InventoryService],
  exports: [InventoryRepository, InventoryService],
})
export class InventoryModule {}
