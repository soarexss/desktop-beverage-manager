import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, RegistryType } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { PrismaService } from "../database/prisma.service";
import {
  CreateRegistryEntryDto,
  RegistryQueryDto,
  UpdateRegistryEntryDto,
} from "./dto/registry.dto";

@Injectable()
export class RegistriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll(query: RegistryQueryDto) {
    return this.prisma.registryEntry.findMany({
      where: query.type ? { type: query.type } : undefined,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  async summary() {
    const grouped = await this.prisma.registryEntry.groupBy({
      by: ["type"],
      _count: { _all: true },
      orderBy: { type: "asc" },
    });

    const present = new Map(grouped.map((row) => [row.type, row._count._all]));

    return Object.values(RegistryType).map((type) => ({
      type,
      count: present.get(type) ?? 0,
    }));
  }

  async create(dto: CreateRegistryEntryDto, user: AuthenticatedUser) {
    const entry = await this.prisma.registryEntry.create({
      data: {
        type: dto.type,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
        code: dto.code?.trim() || null,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "registries.create",
      entityType: "registry_entry",
      entityId: entry.id,
      metadata: { type: entry.type, code: entry.code },
    });

    return entry;
  }

  async update(id: string, dto: UpdateRegistryEntryDto, user: AuthenticatedUser) {
    await this.ensureExists(id);

    const entry = await this.prisma.registryEntry.update({
      where: { id },
      data: {
        type: dto.type,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
        code: dto.code === undefined ? undefined : dto.code?.trim() || null,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "registries.update",
      entityType: "registry_entry",
      entityId: id,
      metadata: { type: entry.type, code: entry.code },
    });

    return entry;
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.ensureExists(id);
    await this.prisma.registryEntry.delete({ where: { id } });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "registries.delete",
      entityType: "registry_entry",
      entityId: id,
    });

    return { message: "Registry entry removed" };
  }

  private async ensureExists(id: string) {
    const entry = await this.prisma.registryEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException("Registry entry not found");
    }

    return entry;
  }
}
