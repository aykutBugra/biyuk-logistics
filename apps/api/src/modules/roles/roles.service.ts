import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  BUSINESS_ROLE_VALUES,
  ROLE_NAMES,
  ROLE_VALUES,
  type BusinessRoleName,
  type RoleName,
} from "../../common/constants/role-names";
import { RoleResponseDto } from "./dto/role-response.dto";
import { RolesRepository } from "./repositories/roles.repository";
import { UsersRepository } from "../users/repositories/users.repository";

@Injectable()
export class RolesService {
  //kullanici gercekten aktif mi kontrolu yapilir. Boylece silinmis veya pasif kullanicilarin 
  //rollerine erisimi engellenir.
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly usersRepository: UsersRepository
  ) {}

  //giris yapmis kullanicinin rollerini getirir. 
  //genel akis:
  //db den rolleri al
  //rolleri normalize et
  //normalize edilmis rolleri role response dto'suna donustur ve don.
  async getRolesForUser(userId: number): Promise<RoleResponseDto> {
    const roleNames = await this.rolesRepository.findRoleNamesByUserId(userId);

    return this.toRoleResponse(this.normalizeRoleNames(roleNames));
  }

  //kullanici kendi kendine nakliyeci rolu alamiyor arac da eklemesi gerekiyor .
  //addBusinessRoleToUser metodu, kullaniciya yeni bir is rolunu atamak icin kullanilir.
  //is akisi su sekildedir:
  //1. eger kullanici nakliyeci rolunu almaya calisiyorsa, bu islemi engelleriz cunku nakliyeci rolu profil olusturma islemi sirasinda verilir.
  //2. kullanici veritabaninda aktif olarak bulunur mu kontrol edilir. Eger bulunmazsa, NotFoundException firlatilir.
  //3. kullanicinin mevcut rollerini normalize ederiz. Boylece veri tutarsizligi veya formatlama sorunlarini engelleriz.
  //4. eger kullanici zaten bu is rolune sahipse, ConflictException firlatilir.
  //5. roleId'si veritabanindan alinir. Eger roleId bulunamazsa, InternalServerErrorException firlatilir cunku bu durum genellikle konfigürasyon hatasina isaret eder.
  //6. yeni rol atamasi veritabanina kaydedilir. Eger bu islem sırasında P2002 hatasi olusursa, bu durum kullanicinin zaten bu is rolune sahip oldugunu gosterir ve ConflictException firlatilir.
  //7. son olarak, kullanicinin guncellenmis rollerini veritabanindan tekrar aliriz ve RoleResponseDto formatinda doneriz.
  async addBusinessRoleToUser(
    userId: number,
    roleName: BusinessRoleName
  ): Promise<RoleResponseDto> {
    if (roleName === ROLE_NAMES.NAKLIYECI) {
      throw new ConflictException(
        "Nakliyeci rolu profil olusturma islemi sirasinda verilir."
      );
    }

    const user = await this.usersRepository.findActiveById(userId);

    if (!user) {
      throw new NotFoundException("Mevcut kullanici bulunamadi.");
    }

    const currentRoles = this.normalizeRoleNames(user.roleNames);

    if (currentRoles.includes(roleName)) {
      throw new ConflictException("Mevcut kullanici zaten bu is rolune sahip.");
    }

    const roleId = await this.requireRoleId(roleName);

    try {
      await this.rolesRepository.createRoleAssignment(userId, roleId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Mevcut kullanici zaten bu is rolune sahip.");
      }

      throw error;
    }
    //Rol eklendikten sonra güncel roller tekrar DB’den okunuyor ve response dönüyor.
    const updatedRoleNames = await this.rolesRepository.findRoleNamesByUserId(userId);
    return this.toRoleResponse(this.normalizeRoleNames(updatedRoleNames));
  }



  //bu metot disardan transaction alir . mselsa kayit olurken arac olusturma basarili rol ekleme basarisiz
  //ise transaction komple geri alinir ve veritabani temiz kalir .
  async assignRoleToUserInTransaction(
    tx: Prisma.TransactionClient,
    userId: number,
    roleName: RoleName
  ): Promise<void> {
    const roleId = await this.requireRoleId(roleName);

    try {
      await this.rolesRepository.createRoleAssignmentInTransaction(tx, userId, roleId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Mevcut kullanici zaten bu is rolune sahip.");
      }

      throw error;
    }
  }


  //bu yardimci metot rolun db de gercekten tanimli olup olmadigini kontrol eder . 
  async requireRoleId(roleName: RoleName): Promise<number> {
    const role = await this.rolesRepository.findByRoleName(roleName);

    if (!role) {
      throw new InternalServerErrorException(
        `Kayit rolu yapilandirilmamis: ${roleName}.`
      );
    }

    return role.id;
  }


  //db den gelen rod adlarini normalize eder 
  normalizeRoleNames(roleNames: string[]): RoleName[] {
    const normalized = roleNames.map((roleName) => {
      const normalizedRoleName = roleName.trim().toUpperCase();

      //db de ilk once kullanici olan rol adini musteri ile degistirme islemid
      if (normalizedRoleName === "KULLANICI") {
        return ROLE_NAMES.MUSTERI;
      }

      return normalizedRoleName;
    });

    //DB’de sistemin tanımadığı bir rol varsa bunu sessizce kabul etmiyor
    const invalidRoleNames = normalized.filter(
      (roleName): roleName is string => !ROLE_VALUES.includes(roleName as RoleName)
    );

    if (invalidRoleNames.length > 0) {
      throw new InternalServerErrorException("Unsupported role configuration.");
    }


    //tekrarli rolleri temizler ve sadece benzersiz rolleri doner.
    return [...new Set(normalized)] as RoleName[];
  }


  //frontendden donecek rol cevabini hazirlar
  private toRoleResponse(roleNames: RoleName[]): RoleResponseDto {
    return {
      roles: roleNames,
      businessRoles: BUSINESS_ROLE_VALUES.filter((roleName) =>
        roleNames.includes(roleName)
      ),
      isAdmin: roleNames.includes(ROLE_NAMES.ADMIN),
    };
  }
}
