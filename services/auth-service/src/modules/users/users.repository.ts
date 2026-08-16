import { Injectable } from '@nestjs/common';
import { type Prisma, type User, type UserStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const userWithAccess = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type UserWithAccess = Prisma.UserGetPayload<{ include: typeof userWithAccess }>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByIdWithAccess(id: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: userWithAccess,
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsernameNormalized(usernameNormalized: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { usernameNormalized } });
  }

  findByEmailWithAccess(email: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: userWithAccess,
    });
  }

  findByUsernameNormalizedWithAccess(usernameNormalized: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findUnique({
      where: { usernameNormalized },
      include: userWithAccess,
    });
  }

  create(data: {
    email: string;
    username: string;
    usernameNormalized: string;
    passwordHash: string;
    status: UserStatus;
    roleId: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        usernameNormalized: data.usernameNormalized,
        passwordHash: data.passwordHash,
        status: data.status,
        roles: {
          create: { roleId: data.roleId },
        },
      },
    });
  }

  updateStatus(id: string, status: UserStatus): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  async replaceRoles(userId: string, roleIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      }),
    ]);
  }
}
