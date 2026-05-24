import { Injectable, Optional } from "@nestjs/common";
import { AppErrorCode, AppErrors } from "../../common/errors";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  BUSINESS_ROLE_VALUES,
  ROLE_NAMES,
  type RoleName,
} from "../../common/constants/role-names";
import type { DashboardIntroRole } from "../../common/types/dashboard-intro-role.type";
import { ImageProcessingService } from "../../infrastructure/media/image-processing.service";
import { MediaStorageService } from "../../infrastructure/media/media-storage.service";
import { RolesService } from "../roles/roles.service";
import { UserProfileResponseDto } from "./dto/user-profile-response.dto";
import {
  type CreateStoredUserInput,
  type DeleteStoredUserAccountResult,
  type StoredUserProfileRecord,
  type StoredUserRecord,
  UsersRepository,
} from "./repositories/users.repository";

//authuserrecord, kimlik doğrulaması yapılmış kullanıcı bilgilerini temsil eder.
export type AuthUserRecord = {
  id: number;
  publicId: string;
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  profileImageUrl?: string;
  profilFotografiStorageKey?: string | null;
  customerIntroDismissedAt?: Date | null;
  carrierIntroDismissedAt?: Date | null;
  sifreHash: string;
  roles: RoleName[];
};

//createuserwithroleinput, yeni bir kullanıcı oluşturmak için gereken bilgileri temsil eder.
//omit kullanarak CreateStoredUserInput türünden roleId alanını çıkarıyoruz ve yerine roleName ekliyoruz.
export type CreateUserWithRoleInput = Omit<CreateStoredUserInput, "roleId"> & {
  roleName: RoleName;
};

//CreateUserWithResolvedRoleIdInput türünün CreateStoredUserInput ile aynı olduğunu belirtir.
export type CreateUserWithResolvedRoleIdInput = CreateStoredUserInput;

//UsersRepository'nin findAllActiveProfiles yönteminin artık ad filtresi alabileceğini 
//TypeScript'e bildirir. Bu, getAllActiveProfiles yönteminin gelecekte ad filtresi eklenerek genişletilmesine sağlar.
type UsersRepositoryWithProfileList = UsersRepository & {
  findAllActiveProfiles(): Promise<StoredUserProfileRecord[]>;
};


//USER_IMAGE_ALLOWED_MIME_TYPES, kullanıcıların profil fotoğrafı olarak yükleyebilecekleri dosya türlerini belirtir. 
const USER_IMAGE_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_USER_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

//type UsersRepositoryWithProfileList = UsersRepository & {
  //findAllActiveProfiles(ad?: string): Promise<StoredUserProfileRecord[]>;
//};
// Repository metodunun artık opsiyonel ad filtresi aldığını TypeScript'e söylüyoruz.



@Injectable()
export class UsersService {
  //constructor, UsersService'nin ihtiyaç duyduğu bağımlılıkları alır. UsersRepository, veritabanı işlemleri için; 
  //RolesService, kullanıcı rolleriyle ilgili işlemler için; MediaStorageService ve 
  //ImageProcessingService ise profil fotoğraflarıyla ilgili işlemler için kullanılır.
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesService: RolesService,
    @Optional() private readonly mediaStorageService?: MediaStorageService,
    @Optional() private readonly imageProcessingService?: ImageProcessingService
  ) {}

  //mail veya kul. adına göre aktif kullanıcı bulunur
  async findActiveByIdentifier(identifier: string): Promise<AuthUserRecord | null> {
    const user = await this.usersRepository.findActiveByIdentifier(identifier);
    return user ? this.mapStoredUser(user) : null;
  }

  //id ye göre aktif kullanıcı bulunur
  async findActiveById(id: number): Promise<AuthUserRecord | null> {
    const user = await this.usersRepository.findActiveById(id);
    return user ? this.mapStoredUser(user) : null;
  }

  async findActiveByPublicId(publicId: string): Promise<AuthUserRecord | null> {
    const user = await this.usersRepository.findActiveByPublicId(publicId);
    return user ? this.mapStoredUser(user) : null;
  }

  //id ye göre aktif kullanıcı profili bulunur
  async findProfileById(id: number): Promise<UserProfileResponseDto | null> {
    const user = await this.usersRepository.findProfileById(id);
    return user ? this.mapStoredProfile(user) : null;
  }

  //dashboard intro dismiss edilir
  async dismissDashboardIntro(
    userId: number,
    role: DashboardIntroRole
  ): Promise<UserProfileResponseDto | null> {
    const user = await this.usersRepository.dismissDashboardIntroById(userId, role);
    return user ? this.mapStoredProfile(user) : null;
  }

  //tüm aktif kullanıcı profilleri bulunur ve 
  //UserProfileResponseDto formatında döndürülür.
  async getAllActiveProfiles(): Promise<UserProfileResponseDto[]> {
    const usersRepository = this.usersRepository as UsersRepositoryWithProfileList;
    const users: StoredUserProfileRecord[] = await usersRepository.findAllActiveProfiles();
    return users.map((user: StoredUserProfileRecord) => this.mapStoredProfile(user));
  }


  //mail veya kul. adına göre aktif kullanıcı bulunup bulunmadığı kontrol edilir
  async existsByMail(mail: string): Promise<boolean> {
    return this.usersRepository.existsByMail(mail);
  }
  async existsByUsername(kullaniciAdi: string): Promise<boolean> {
    return this.usersRepository.existsByUsername(kullaniciAdi);
  }

  //yeni kullanıcı kaydı oluşturma metotlarodor . 
  //AuthService kayıt anında bunları kullanır.
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
  //createUserWithResolvedRoleId, roleId'si zaten çözülmüş bir kullanıcı oluşturmak için kullanılır.
  async createUserWithResolvedRoleId(
    input: CreateUserWithResolvedRoleIdInput
  ): Promise<AuthUserRecord> {
    const user = await this.usersRepository.createWithRole(input);
    return this.mapStoredUser(user);
  }
  //İnTransaction versiyonu, bir transaction içinde kullanıcı oluşturmak için kullanılır. 
  //Bu, kullanıcı oluşturma işlemiyle birlikte başka araç ekleme gibi işlemlerin de atomik 
  //olarak yapılmasını sağlar.
  async createUserWithResolvedRoleIdInTransaction(
    tx: Prisma.TransactionClient,
    input: CreateUserWithResolvedRoleIdInput
  ): Promise<AuthUserRecord> {
    const user = await this.usersRepository.createWithRoleInTransaction(tx, input);
    return this.mapStoredUser(user);
  }


  //kendi hesabını silme işlemi. Aktif bir sevkiyat varsa silme işlemi engellenir.
  async deleteOwnAccount(userId: number): Promise<void> {
    const result = await this.usersRepository.deleteAccountById(userId);
    this.assertDeleteSucceeded(result);
  }



  //profil fotoğrafı güncelleme işlemi. Dosya doğrulaması yapılır, 
  //eski fotoğraf silinir ve yeni fotoğraf kaydedilir.
  async updateOwnProfileImage(
    userId: number,
    file: Express.Multer.File | undefined
  ): Promise<UserProfileResponseDto> {
    if (!file) {
      throw AppErrors.badRequest(AppErrorCode.USER_PROFILE_IMAGE_REQUIRED, "Profil fotografi secmelisin.");
    }

    if (!this.mediaStorageService || !this.imageProcessingService) {
      throw AppErrors.badRequest(AppErrorCode.USER_MEDIA_NOT_READY, "Gorsel yukleme servisi hazir degil.");
    }

    this.assertValidUserImageFile(file);

    const currentUser = await this.usersRepository.findProfileById(userId);

    if (!currentUser) {
      throw AppErrors.unauthorized(AppErrorCode.USER_DELETE_UNAUTHORIZED, "Silmek istediginiz profil bulunamadi.");
    }

    const processedImage = await this.imageProcessingService.processProfileImage(
      file.buffer
    );

    const storageKey = `profile-images/${userId}/${randomUUID()}.webp`;

    await this.mediaStorageService.saveFile({
      storageKey,
      buffer: processedImage.buffer,
      contentType: processedImage.mimeType,
    });

    try {
      const updatedUser = await this.usersRepository.updateProfileImageStorageKeyById(
        userId,
        storageKey
      );

      if (!updatedUser) {
        throw AppErrors.unauthorized(AppErrorCode.USER_DELETE_UNAUTHORIZED, "Silmek istediginiz profil bulunamadi.");
      }

      if (currentUser.profilFotografiStorageKey) {
        await this.mediaStorageService.deleteFile(
          currentUser.profilFotografiStorageKey
        );
      }

      return this.mapStoredProfile(updatedUser);
    } catch (error) {
      await this.mediaStorageService.deleteFile(storageKey);
      throw error;
    }
  }




  //profil fotoğrafı silme işlemi. Fotoğraf depolama servisi kullanılarak eski fotoğraf 
  //silinir ve kullanıcı kaydında ilgili alan güncellenir.
  async deleteOwnProfileImage(userId: number): Promise<UserProfileResponseDto> {
    if (!this.mediaStorageService) {
      throw AppErrors.badRequest(AppErrorCode.USER_MEDIA_NOT_READY, "Gorsel yukleme servisi hazir degil.");
    }

    const currentUser = await this.usersRepository.findProfileById(userId);

    if (!currentUser) {
      throw AppErrors.unauthorized(AppErrorCode.USER_DELETE_UNAUTHORIZED, "Silmek istediginiz profil bulunamadi.");
    }

    if (!currentUser.profilFotografiStorageKey) {
      return this.mapStoredProfile(currentUser);
    }

    const previousStorageKey = currentUser.profilFotografiStorageKey;
    const updatedUser = await this.usersRepository.updateProfileImageStorageKeyById(
      userId,
      null
    );

    if (!updatedUser) {
      throw AppErrors.unauthorized(AppErrorCode.USER_DELETE_UNAUTHORIZED, "Silmek istediginiz profil bulunamadi.");
    }

    await this.mediaStorageService.deleteFile(previousStorageKey);

    return this.mapStoredProfile(updatedUser);
  }


  //toUserProfile kullanıcıyı frontende gönderilecek profile çevirir
  toUserProfile(user: Omit<AuthUserRecord, "sifreHash">): UserProfileResponseDto {
    return {
      id: user.publicId,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
      profileImageUrl:
        user.profileImageUrl ??
        this.toPublicMediaUrl(user.profilFotografiStorageKey ?? null),
      customerIntroDismissedAt: user.customerIntroDismissedAt ?? null,
      carrierIntroDismissedAt: user.carrierIntroDismissedAt ?? null,
      roles: user.roles,
      businessRoles: BUSINESS_ROLE_VALUES.filter((roleName) =>
        user.roles.includes(roleName)
      ),
      isAdmin: user.roles.includes(ROLE_NAMES.ADMIN),
    };
  }

  //mapStoredUser, veritabanından gelen kullanıcı kaydını AuthUserRecord formatına dönüştürür.
  private mapStoredUser(user: StoredUserRecord): AuthUserRecord {
    return {
      id: user.id,
      publicId: user.publicId,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
      profileImageUrl: this.toPublicMediaUrl(user.profilFotografiStorageKey),
      profilFotografiStorageKey: user.profilFotografiStorageKey,
      customerIntroDismissedAt: user.customerIntroDismissedAt,
      carrierIntroDismissedAt: user.carrierIntroDismissedAt,
      sifreHash: user.sifreHash,
      roles: this.rolesService.normalizeRoleNames(user.roleNames),
    };
  }

  //mapStoredProfile, veritabanından gelen kullanıcı profil kaydını UserProfileResponseDto formatına dönüştürür.
  private mapStoredProfile(user: StoredUserProfileRecord): UserProfileResponseDto {
    return this.toUserProfile({
      id: user.id,
      publicId: user.publicId,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
      profileImageUrl: this.toPublicMediaUrl(user.profilFotografiStorageKey),
      profilFotografiStorageKey: user.profilFotografiStorageKey,
      customerIntroDismissedAt: user.customerIntroDismissedAt,
      carrierIntroDismissedAt: user.carrierIntroDismissedAt,
      roles: this.rolesService.normalizeRoleNames(user.roleNames),
    });
  }

  //assertDeleteSucceeded, kullanıcı hesabı silme işleminin sonucunu kontrol eder. 
  //Silme işlemi başarısız olduysa, başarısızlık nedenine göre uygun bir istisna fırlatır.
  private assertDeleteSucceeded(result: DeleteStoredUserAccountResult): void {
    if (result.ok) {
      return;
    }
    switch (result.reason) {
      case "NOT_FOUND":
        throw AppErrors.unauthorized(AppErrorCode.USER_DELETE_UNAUTHORIZED, "Silmek istedigin hesap bulunamadi.");
      case "ACTIVE_CARRIER_SHIPMENT":
        throw AppErrors.conflict(
          AppErrorCode.USER_DELETE_ACTIVE_SHIPMENT,
          "Hesap, aktif bir sevkiyat varken silinemez."
        );
      case "ACTIVE_CUSTOMER_SHIPMENT":
        throw AppErrors.conflict(
          AppErrorCode.USER_DELETE_CONFLICT,
          "Hesap, aktif bir müşteri sevkiyatı varken silinemez."
        );
      case "OPEN_CARRIER_OFFER":
        throw AppErrors.conflict(
          AppErrorCode.USER_DELETE_CONFLICT,
          "Hesap, aktif bir teklif varken silinemez."
        );
      case "STALE_ACCEPTED_OFFER":
        throw AppErrors.conflict(
          AppErrorCode.USER_DELETE_CONFLICT,
          "Hesap, kabul edilen bir teklif tamamen kapatılmadığı için silinemez."
        );
      case "STALE_AGREED_REQUEST":
        throw AppErrors.conflict(
          AppErrorCode.USER_DELETE_CONFLICT,
          "Hesap, anlaşmalı bir ulaştırma talebi tamamen kapatılmadığı için silinemez."
        );
    }
  }


  //assertValidUserImageFile, kullanıcıların profil fotoğrafı olarak yükledikleri dosyanın 
  //geçerli olup olmadığını kontrol eder.
  private assertValidUserImageFile(file: Express.Multer.File): void {
    if (!file.buffer || file.buffer.length === 0) {
      throw AppErrors.badRequest(AppErrorCode.USER_FILE_UNREADABLE, "Dosya icerigi okunamadi.");
    }

    if (!USER_IMAGE_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw AppErrors.badRequest(
        AppErrorCode.USER_FILE_TYPE_INVALID,
        "Yalnizca JPEG, PNG veya WEBP gorseller yuklenebilir."
      );
    }

    if (file.size > MAX_USER_IMAGE_FILE_SIZE_BYTES) {
      throw AppErrors.badRequest(AppErrorCode.USER_FILE_TOO_LARGE, "Gorsel boyutu en fazla 5 MB olabilir.");
    }
  }

  //toPublicMediaUrl, profil fotoğrafı gibi medya dosyalarının depolama anahtarını alır ve 
  //bunu genel erişime açık bir URL'ye dönüştürür.
  private toPublicMediaUrl(storageKey: string | null | undefined): string | undefined {
    if (!storageKey || !this.mediaStorageService) {
      return undefined;
    }

    return this.mediaStorageService.toPublicUrl(storageKey);
  }
}
