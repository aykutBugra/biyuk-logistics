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
