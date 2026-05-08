import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateClientDto, UpdateClientDto } from "./dto/client.dto";
import { ClientsRepository } from "./clients.repository";

@Injectable()
export class ClientsService {
  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly auditService: AuditService,
  ) {}

  findAll(user: AuthenticatedUser) {
    return this.clientsRepository.findAll(
      user.role === Role.ADMIN ? {} : { createdById: user.sub },
    );
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const client = await this.clientsRepository.findById(id);
    this.ensureOwnership(client, user);
    return client;
  }

  async create(dto: CreateClientDto, user: AuthenticatedUser) {
    const client = await this.clientsRepository.create({
      ...dto,
      createdById: user.sub,
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "clients.create",
      entityType: "client",
      entityId: client.id,
    });

    return client;
  }

  async update(id: string, dto: UpdateClientDto, user: AuthenticatedUser) {
    await this.findOne(id, user);
    const client = await this.clientsRepository.update(id, { ...dto });
    await this.auditService.logAction({
      actorId: user.sub,
      action: "clients.update",
      entityType: "client",
      entityId: id,
    });
    return client;
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.findOne(id, user);
    await this.clientsRepository.remove(id);
    await this.auditService.logAction({
      actorId: user.sub,
      action: "clients.delete",
      entityType: "client",
      entityId: id,
    });
    return { message: "Client removed" };
  }

  async getPurchaseHistory(id: string, user: AuthenticatedUser) {
    await this.findOne(id, user);
    return this.clientsRepository.purchaseHistory(id);
  }

  private ensureOwnership(client: { createdById: string } | null, user: AuthenticatedUser) {
    if (!client) {
      throw new NotFoundException("Client not found");
    }

    if (user.role !== Role.ADMIN && client.createdById !== user.sub) {
      throw new ForbiddenException("You do not have access to this client");
    }
  }
}
