import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaModule } from "../database/prisma.module";
import { OperationsController } from "./operations.controller";
import { OperationsService } from "./operations.service";

@Module({
  imports: [AuditModule, PrismaModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
