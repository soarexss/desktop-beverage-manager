import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaModule } from "../database/prisma.module";
import { RegistriesController } from "./registries.controller";
import { RegistriesService } from "./registries.service";

@Module({
  imports: [AuditModule, PrismaModule],
  controllers: [RegistriesController],
  providers: [RegistriesService],
  exports: [RegistriesService],
})
export class RegistriesModule {}
