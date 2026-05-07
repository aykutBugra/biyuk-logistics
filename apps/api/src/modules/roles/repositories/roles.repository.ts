import { Prisma } from "@prisma/client";
import type { RoleName } from "../../../common/constants/role-names";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

export type StoredRoleRecord = {
  id: number;
  rolAd: string;
};

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByRoleName(roleName: RoleName): Promise<StoredRoleRecord | null> {
    return this.prisma.client.rol.findUnique({
      where: {
        rolAd: roleName.trim().toUpperCase(),
      },
      select: {
        id: true,
        rolAd: true,
      },
    });
  }

  async findRoleNamesByUserId(userId: number): Promise<string[]> {
    const rows = await this.prisma.client.kullaniciRol.findMany({
      where: {
        kullaniciId: userId,
        kullanici: {
          silmeTarihi: null,
        },
      },
      select: {
        rol: {
          select: {
            rolAd: true,
          },
        },
      },
    });

    return rows.map((row) => row.rol.rolAd);
  }

  async createRoleAssignment(userId: number, roleId: number): Promise<void> {
    await this.prisma.client.kullaniciRol.create({
      data: {
        kullaniciId: userId,
        rolId: roleId,
      },
    });
  }

  async createRoleAssignmentInTransaction(
    tx: Prisma.TransactionClient,
    userId: number,
    roleId: number
  ): Promise<void> {
    await tx.kullaniciRol.create({
      data: {
        kullaniciId: userId,
        rolId: roleId,
      },
    });
  }
}
