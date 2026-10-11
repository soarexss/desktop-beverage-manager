import { BadRequestException } from '@nestjs/common';
import { serializable } from '../common/transaction';
import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    email: string;
    role: Role;
    passwordHash: string;
    isActive?: boolean;
  }) {
    return this.prisma.user.create({ data });
  }

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  findCredentialsById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  update(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      role: Role;
      isActive: boolean;
      passwordHash: string;
    }>,
  ) {
    return serializable(this.prisma, async (tx) => {
      const existing = await tx.user.findUniqueOrThrow({ where: { id } });
      if (
        existing.role === 'admin' &&
        existing.isActive &&
        (data.isActive === false || (data.role && data.role !== 'admin'))
      ) {
        const otherAdmins = await tx.user.count({
          where: { id: { not: id }, role: 'admin', isActive: true },
        });
        if (!otherAdmins)
          throw new BadRequestException(
            'Mantenha ao menos um administrador ativo',
          );
      }
      return tx.user.update({
        where: { id },
        data: { ...data, sessionVersion: { increment: 1 } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });
    });
  }

  remove(id: string) {
    return this.update(id, { isActive: false });
  }
}
