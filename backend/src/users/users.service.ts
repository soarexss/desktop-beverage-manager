import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { hash } from "bcrypt";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.usersRepository.findAll();
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    const existing = await this.usersRepository.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException("Email already in use");
    }

    const passwordHash = await hash(
      dto.password,
      this.configService.getOrThrow<number>("app.bcryptRounds"),
    );

    const created = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      role: dto.role,
      passwordHash,
      isActive: dto.isActive,
    });

    await this.auditService.logAction({
      actorId: actor.sub,
      action: "users.create",
      entityType: "user",
      entityId: created.id,
      metadata: { email: created.email, role: created.role },
    });

    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    await this.findOne(id);

    const data: Record<string, unknown> = {
      name: dto.name,
      email: dto.email,
      role: dto.role,
      isActive: dto.isActive,
    };

    if (dto.password) {
      data.passwordHash = await hash(
        dto.password,
        this.configService.getOrThrow<number>("app.bcryptRounds"),
      );
    }

    const updated = await this.usersRepository.update(id, data);

    await this.auditService.logAction({
      actorId: actor.sub,
      action: "users.update",
      entityType: "user",
      entityId: id,
    });

    return updated;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    await this.findOne(id);
    await this.usersRepository.remove(id);
    await this.auditService.logAction({
      actorId: actor.sub,
      action: "users.delete",
      entityType: "user",
      entityId: id,
    });

    return { message: "User removed" };
  }
}
