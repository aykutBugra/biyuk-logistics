import { Injectable } from "@nestjs/common";
import type { RoleName } from "../../common/constants/role-names";
import { RolesService } from "../roles/roles.service";
import { UserProfileResponseDto } from "./dto/user-profile-response.dto";
import {
  type CreateStoredUserInput,
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
  sifreHash: string;
  roles: RoleName[];
};

export type CreateUserWithRoleInput = Omit<CreateStoredUserInput, "roleId"> & {
  roleName: RoleName;
};

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
    const user = await this.usersRepository.createWithRole({
      ad: input.ad,
      soyad: input.soyad,
      mail: input.mail,
      kullaniciAdi: input.kullaniciAdi,
      telefonNumarasi: input.telefonNumarasi,
      sifreHash: input.sifreHash,
      roleId,
    });

    return this.mapStoredUser(user);
  }

  toUserProfile(user: Omit<AuthUserRecord, "sifreHash">): UserProfileResponseDto {
    return {
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
      roles: user.roles,
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
      sifreHash: user.sifreHash,
      roles: this.rolesService.normalizeRoleNames(user.roleNames),
    };
  }

  private mapStoredProfile(user: StoredUserProfileRecord): UserProfileResponseDto {
    return {
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
      roles: this.rolesService.normalizeRoleNames(user.roleNames),
    };
  }
}
