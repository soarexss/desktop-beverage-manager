import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FinancialController } from "./financial.controller";
import { FinancialRepository } from "./financial.repository";
import { FinancialService } from "./financial.service";

@Module({
  imports: [AuditModule],
  controllers: [FinancialController],
  providers: [FinancialRepository, FinancialService],
  exports: [FinancialRepository],
})
export class FinancialModule {}
