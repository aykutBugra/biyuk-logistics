import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
