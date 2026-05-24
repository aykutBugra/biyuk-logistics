import { Prisma } from "@prisma/client";
import type { RoleName } from "../../../common/constants/role-names";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";


//veritabanindaki rol kaydinin service tarafina sade haliyle donmesi icin kullanilir.
export type StoredRoleRecord = {
  id: number;
  rolAd: string;
};


@Injectable()
export class RolesRepository {
  //constructor ile PrismaService'i enjekte ediyoruz. Bu sayede veritabanı 
  //işlemlerini gerçekleştirmek için PrismaClient'e erişiyoruz.
  constructor(private readonly prisma: PrismaService) {}

  //findbyrolename metodu rol adini aliyor normalize ediyor ve veritabaninda bu 
  //role ait kaydi bulmaya calisiyor. Eger kayit bulunamazsa null doner.
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


  //kullanicinin rollerini getirir.asil tablo kullanici_rol tablosudur. Bu tabloda 
  //kullaniciId ve rolId bulunur.cunku many-to-many iliski vardir. Bu nedenle kullanici_rol 
  //tablosunda kullaniciId'ye gore filtreleme yapariz ve ilgili rollerin adlarini doneriz.
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

    //rows.map ile her bir satırdaki rol adını alırız ve string dizisi olarak döndürürüz.
    return rows.map((row) => row.rol.rolAd);
  }

  //kullaniciya yeni rol atar. kullaniciId ve rolId'yi alir ve kullanici_rol tablosuna yeni bir kayit ekler.
  async createRoleAssignment(userId: number, roleId: number): Promise<void> {
    await this.prisma.client.kullaniciRol.create({
      data: {
        kullaniciId: userId,
        rolId: roleId,
      },
    });
  }

  //ayni isleminbir transaction versiyonudur. bu, birden fazla veritabanı işleminin tek bir 
  //birim olarak yürütülmesini sağlar. eğer herhangi bir işlem başarısız olursa, tüm işlemler
  //geri alınır ve veritabanı tutarlı kalır.
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
