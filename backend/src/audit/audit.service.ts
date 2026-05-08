import { Injectable, Logger } from "@nestjs/common";
import { AuditRepository } from "./audit.repository";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  async logAction(data: {
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.auditRepository.create(data);
    } catch (error) {
      this.logger.warn(`Failed to persist audit log for ${data.action}`);
      this.logger.debug(error instanceof Error ? error.message : JSON.stringify(error));
    }
  }
}
