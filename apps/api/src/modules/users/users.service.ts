import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  BUSINESS_ROLE_VALUES,
  ROLE_NAMES,
  type RoleName,
} from "../../common/constants/role-names";
import type { DashboardIntroRole } from "../../common/types/dashboard-intro-role.type";
import { RolesService } from "../roles/roles.service";
import { UserProfileResponseDto } from "./dto/user-profile-response.dto";
import {
  type CreateStoredUserInput,
  type DeleteStoredUserAccountResult,
  type StoredUserProfileRecord,
  type StoredUserRecord,
  UsersRepository,
} from "./repositories/users.repository";

export type AuthUserRecord = {
  id: number;
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  customerIntroDismissedAt?: Date | null;
  carrierIntroDismissedAt?: Date | null;
  sifreHash: string;
  roles: RoleName[];
};

export type CreateUserWithRoleInput = Omit<CreateStoredUserInput, "roleId"> & {
  roleName: RoleName;
};

export type CreateUserWithResolvedRoleIdInput = CreateStoredUserInput;

type UsersRepositoryWithProfileList = UsersRepository & {
  findAllActiveProfiles(): Promise<StoredUserProfileRecord[]>;
};

//type UsersRepositoryWithProfileList = UsersRepository & {
  //findAllActiveProfiles(ad?: string): Promise<StoredUserProfileRecord[]>;
//};
// Repository metodunun artık opsiyonel ad filtresi aldığını TypeScript'e söylüyoruz.



@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesService: RolesService
  ) {}

  async findActiveByIdentifier(identifier: string): Promise<AuthUserRecord | null> {
    const user = await this.usersRepository.findActiveByIdentifier(identifier);
    return user ? this.mapStoredUser(user) : null;
  }

  async findActiveById(id: number): Promise<AuthUserRecord | null> {
    const user = await this.usersRepository.findActiveById(id);
    return user ? this.mapStoredUser(user) : null;
  }

  async findProfileById(id: number): Promise<UserProfileResponseDto | null> {
    const user = await this.usersRepository.findProfileById(id);
    return user ? this.mapStoredProfile(user) : null;
  }

  async dismissDashboardIntro(
    userId: number,
    role: DashboardIntroRole
  ): Promise<UserProfileResponseDto | null> {
    const user = await this.usersRepository.dismissDashboardIntroById(userId, role);
    return user ? this.mapStoredProfile(user) : null;
  }

  //getAllActiveProfiles, tüm aktif kullanıcı profillerini döndüren bir
  // yöntemdir. Bu yöntem, UsersRepository'nin findAllActiveProfiles yöntemini
  //  çağırarak veritabanından tüm aktif kullanıcıları alır ve ardından her
  //  kullanıcıyı UserProfileResponseDto formatına dönüştürmek için
  //  mapStoredProfile yöntemini kullanır.
  
  async getAllActiveProfiles(): Promise<UserProfileResponseDto[]> {
    const usersRepository = this.usersRepository as UsersRepositoryWithProfileList;
    const users: StoredUserProfileRecord[] = await usersRepository.findAllActiveProfiles();
    return users.map((user: StoredUserProfileRecord) => this.mapStoredProfile(user));
  }

  //async getAllActiveProfiles(ad?: string): Promise<UserProfileResponseDto[]> {
  //const usersRepository = this.usersRepository as UsersRepositoryWithProfileList;
  //const users: StoredUserProfileRecord[] = await usersRepository.findAllActiveProfiles(ad);
  //return users.map((user: StoredUserProfileRecord) => this.mapStoredProfile(user));
//}












  async existsByMail(mail: string): Promise<boolean> {
    return this.usersRepository.existsByMail(mail);
  }

  async existsByUsername(kullaniciAdi: string): Promise<boolean> {
    return this.usersRepository.existsByUsername(kullaniciAdi);
  }

  async createUserWithRole(input: CreateUserWithRoleInput): Promise<AuthUserRecord> {
    const roleId = await this.rolesService.requireRoleId(input.roleName);
    return this.createUserWithResolvedRoleId({
      ad: input.ad,
      soyad: input.soyad,
      mail: input.mail,
      kullaniciAdi: input.kullaniciAdi,
      telefonNumarasi: input.telefonNumarasi,
      sifreHash: input.sifreHash,
      roleId,
    });
  }

  async createUserWithResolvedRoleId(
    input: CreateUserWithResolvedRoleIdInput
  ): Promise<AuthUserRecord> {
    const user = await this.usersRepository.createWithRole(input);
    return this.mapStoredUser(user);
  }

  async createUserWithResolvedRoleIdInTransaction(
    tx: Prisma.TransactionClient,
    input: CreateUserWithResolvedRoleIdInput
  ): Promise<AuthUserRecord> {
    const user = await this.usersRepository.createWithRoleInTransaction(tx, input);
    return this.mapStoredUser(user);
  }

  async deleteOwnAccount(userId: number): Promise<void> {
    const result = await this.usersRepository.deleteAccountById(userId);
    this.assertDeleteSucceeded(result);
  }

  toUserProfile(user: Omit<AuthUserRecord, "sifreHash">): UserProfileResponseDto {
    return {
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
      customerIntroDismissedAt: user.customerIntroDismissedAt ?? null,
      carrierIntroDismissedAt: user.carrierIntroDismissedAt ?? null,
      roles: user.roles,
      businessRoles: BUSINESS_ROLE_VALUES.filter((roleName) =>
        user.roles.includes(roleName)
      ),
      isAdmin: user.roles.includes(ROLE_NAMES.ADMIN),
    };
  }

  private mapStoredUser(user: StoredUserRecord): AuthUserRecord {
    return {
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
      customerIntroDismissedAt: user.customerIntroDismissedAt,
      carrierIntroDismissedAt: user.carrierIntroDismissedAt,
      sifreHash: user.sifreHash,
      roles: this.rolesService.normalizeRoleNames(user.roleNames),
    };
  }

  private mapStoredProfile(user: StoredUserProfileRecord): UserProfileResponseDto {
    return this.toUserProfile({
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
      customerIntroDismissedAt: user.customerIntroDismissedAt,
      carrierIntroDismissedAt: user.carrierIntroDismissedAt,
      roles: this.rolesService.normalizeRoleNames(user.roleNames),
    });
  }

  private assertDeleteSucceeded(result: DeleteStoredUserAccountResult): void {
    if (result.ok) {
      return;
    }

    switch (result.reason) {
      case "NOT_FOUND":
        throw new UnauthorizedException("Current user could not be resolved.");
      case "ACTIVE_CARRIER_SHIPMENT":
        throw new ConflictException(
          "Account cannot be deleted while you have an active shipment."
        );
      case "ACTIVE_CUSTOMER_SHIPMENT":
        throw new ConflictException(
          "Account cannot be deleted while you have a transport request with an active shipment."
        );
      case "OPEN_CARRIER_OFFER":
        throw new ConflictException(
          "Account cannot be deleted while you have an active offer."
        );
      case "STALE_ACCEPTED_OFFER":
        throw new ConflictException(
          "Account cannot be deleted because an accepted offer is not fully closed."
        );
      case "STALE_AGREED_REQUEST":
        throw new ConflictException(
          "Account cannot be deleted because an agreed transport request is not fully closed."
        );
    }
  }
}
