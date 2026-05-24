import { Injectable } from "@nestjs/common";
import { AppErrorCode, AppErrors } from "../../common/errors";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import {
  ROLE_NAMES,
  type BusinessRoleName,
} from "../../common/constants/role-names";
import {
  isLegacyNumericEntityId,
  isLegacyNumericIdsAllowed,
  isUuidV4,
} from "../../common/public-ids/public-entity-id";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import type { DashboardIntroRole } from "../../common/types/dashboard-intro-role.type";
import type { JwtTtlValue } from "../../config/auth.config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RolesService } from "../roles/roles.service";
import { UserProfileResponseDto } from "../users/dto/user-profile-response.dto";
import { type AuthUserRecord, UsersService } from "../users/users.service";
import { CreateVehicleDto } from "../vehicles/dto/create-vehicle.dto";
import {
  createVehicleForOwner,
  isVehiclePlateUniqueConstraintTarget,
  type VehicleDraft,
} from "../vehicles/vehicle-write.helpers";
import { AuthTokenResponseDto } from "./dto/auth-token-response.dto";
import { LoginDto } from "./dto/login.dto";
import { type RegisterRoleName, RegisterDto } from "./dto/register.dto";

//accesstokenpayload ve refreshtokenpayload token oluşturulurken 
//kullanılan veri yapılarıdır. kayıt olan kullanıcının bilgileri ve 
//rollerine göre erişim token'ı oluşturulur.
type AccessTokenPayload = {
  sub: string;
  mail: string;
  kullaniciAdi: string;
  roles: AuthUserRecord["roles"];
};


type RefreshTokenPayload = {
  sub: string | number;
  type: "refresh";
};

//normalizedregisterinput registerdto dan dönüştürülen ve
//servis içinde kullanılan veri yapısıdır.
type NormalizedRegisterInput = {
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  password: string;
  role: BusinessRoleName;
  initialVehicle: VehicleDraft | null;
};



@Injectable()
export class AuthService {
  //authService in kullandığı başka servislerin tanımı ve 
  //constructor ile bu servislerin örnekleri alınır.
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}


  //kullanıcı kaydı ve normalizasyonu . 
  async register(registerDto: RegisterDto): Promise<AuthTokenResponseDto> {
    const normalizedInput = this.normalizeRegisterInput(registerDto);

    //mail ve kullanıcı adı için benzersizlik kontrolü
    await this.assertRegistrationIdentifiersAvailable(
      normalizedInput.mail,
      normalizedInput.kullaniciAdi
    );

    //her kullanıcı önce müşteri olarak açılır . 
    const customerRoleId = await this.rolesService.requireRoleId(ROLE_NAMES.MUSTERI);
   
    //şifre hashlenir. hashlenmiş şifre veritabanına kaydedilir .
    const sifreHash = await hash(normalizedInput.password, 12);

    let userId: number;
    try {
      //kullanıcı oluşturma işlemi ve eğer kayıt sırasında nakliyeci rolü 
      //seçilmişse araç oluşturma işlemi tek bir transaction içinde yapılır.
      userId = await this.prisma.client.$transaction(async (tx) => {
        const createdUser =
          await this.usersService.createUserWithResolvedRoleIdInTransaction(tx, {
            ad: normalizedInput.ad,
            soyad: normalizedInput.soyad,
            mail: normalizedInput.mail,
            kullaniciAdi: normalizedInput.kullaniciAdi,
            telefonNumarasi: normalizedInput.telefonNumarasi,
            sifreHash,
            roleId: customerRoleId,
          });
        
          //eğer nakliyeci rolü seçilmişse araç oluşturma işlemi yapılır ve kullanıcıya nakliyeci rolü atanır.
        if (normalizedInput.initialVehicle) {
          await createVehicleForOwner(tx, {
            sahipId: createdUser.id,
            ...normalizedInput.initialVehicle,
          });
          //await ile rollerervice içindeki assignRoleToUserInTransaction fonksiyonu çağrılır ve kullanıcıya nakliyeci rolü atanır.
          await this.rolesService.assignRoleToUserInTransaction(
            tx,
            createdUser.id,
            ROLE_NAMES.NAKLIYECI
          );
        }

        return createdUser.id;
      });
    } catch (error) {
      //eğer kayıt sırasında benzersizlik ihlali gibi bir hata oluşursa bu 
      //hata uygun bir ConflictException olarak yeniden fırlatılır.
      this.rethrowUniqueConstraintAsConflict(error);
      throw error;
    }

    //kayıt başarılıysa kullanıcı id'si ile token oluşturulur ve döndürülür.
    return this.createAuthResponseForUserId(userId);
  }


  //kullanıcı giriş işlemi yapılırken kullanıcı adı veya mail adresi kullanılabilir.
  async login(loginDto: LoginDto): Promise<AuthTokenResponseDto> {
    const identifier = loginDto.identifier.trim();
    const user = await this.usersService.findActiveByIdentifier(identifier);

    //kullanıcı yoksa hata 
    if (!user) {
      throw AppErrors.unauthorized(AppErrorCode.AUTH_INVALID_CREDENTIALS, "Invalid credentials.");
    }

    //girilen şifreninin veritabanı ile karşılaştırması
    const isPasswordValid = await compare(loginDto.password, user.sifreHash);

    //şifre yanlışsa hata
    if (!isPasswordValid) {
      throw AppErrors.unauthorized(AppErrorCode.AUTH_INVALID_CREDENTIALS, "Sifre hatali");
    }

    //şifre doğruya ac ve ref token oluşturulur ve döndürülür.
    return this.createAuthResponse(user);
  }


  //ac token biterse kişiye yeni yeni token verme işlemi 
  async refresh(refreshToken: string): Promise<AuthTokenResponseDto> {
    let payload: RefreshTokenPayload;

    try {
      //ref token doğrulanır
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw AppErrors.unauthorized(AppErrorCode.AUTH_INVALID_REFRESH_TOKEN, "Invalid refresh token.");
    }

    //doğrulanan token'ın gerçekten bir ref token olduğunun kontrolü 
    if (payload.type !== "refresh") {
      throw AppErrors.unauthorized(AppErrorCode.AUTH_INVALID_REFRESH_TOKEN, "Invalid refresh token.");
    }

    //token payload'undaki kullanıcı id'si ile kullanıcı bulunur.
    //eğer kullanıcı yoksa hata fırlatılır.
    const refreshSubject = String(payload.sub);
    const user = isUuidV4(refreshSubject)
      ? await this.usersService.findActiveByPublicId(refreshSubject)
      : isLegacyNumericIdsAllowed() && isLegacyNumericEntityId(refreshSubject)
        ? await this.usersService.findActiveById(Number(refreshSubject))
        : null;

    if (!user) {
      throw AppErrors.unauthorized(AppErrorCode.AUTH_INVALID_REFRESH_TOKEN, "Invalid refresh token.");
    }

    return this.createTokenPair(user);
  }


  //müşterinin sonradan nakliyeci rolü alması işlemi .
  async completeCarrierOnboarding(
    currentUser: AuthenticatedUser,
    createVehicleDto: CreateVehicleDto
  ): Promise<AuthTokenResponseDto> {
    //aktif kişiyi bul 
    const user = await this.usersService.findActiveById(currentUser.id);

    //aktif kişi bulunamazsa hata fırlatılır.
    if (!user) {
      throw AppErrors.unauthorized(AppErrorCode.AUTH_USER_NOT_ACTIVE, "Aktif kullanıcı bulunamadı.");
    }

    //zaten nakliyeciyse hata fırlatılır . 
    if (user.roles.includes(ROLE_NAMES.NAKLIYECI)) {
      throw AppErrors.conflict(AppErrorCode.AUTH_ROLE_CONFLICT, "Kişi zaten nakliyeci rolüne sahip.");
    }
    //müşteri değilse hata fırlatılır çünkü sadece müşteriler nakliyeci olabilir.
    if (!user.roles.includes(ROLE_NAMES.MUSTERI)) {
      throw AppErrors.conflict(AppErrorCode.AUTH_ROLE_CONFLICT, "Müşteri değilse nakliyeci olamaz.");
    }

    try {
      //araç oluşturulur ve kişiye nakliyeci rolü verilir . 
      //bu işlemler tek bir transaction içinde yapılır. böylece herhangi bir adımda 
      //hata olursa tüm işlemler geri alınır ve veri tutarlılığı sağlanır.
      await this.prisma.client.$transaction(async (tx) => {
        await createVehicleForOwner(tx, {
          sahipId: user.id,
          ...createVehicleDto,
        });
        await this.rolesService.assignRoleToUserInTransaction(
          tx,
          user.id,
          ROLE_NAMES.NAKLIYECI
        );
      });
    } catch (error) {
      this.rethrowUniqueConstraintAsConflict(error);
      throw error;
    }

    //yeni rol ile güncel token döner . 
    return this.createAuthResponseForUserId(user.id);
  }


  //giriş yapan kullanıcının bilgilerini döndürür.
  async getCurrentUser(
    currentUser: AuthenticatedUser
  ): Promise<UserProfileResponseDto> {
    //aktif kullanıcı id'si ile kullanıcının profil bilgileri bulunur ve döndürülür.
    const user = await this.usersService.findProfileById(currentUser.id);

    if (!user) {
      //bulunmazsa hata döner .
      throw AppErrors.unauthorized(AppErrorCode.AUTH_USER_NOT_ACTIVE, "Aktif kullanıcı bulunamadı.");
    }

    return user;
  }


  //dashboard intro kapatma işlemi . kullanıcı dashboard intro'yu kapattığında bu bilgi veritabanına kaydedilir.
  //bu sayede kişi kayıttan sonra sadece bir kez dashboard intro görür ve tekrar giriş yaptığında intro gösterilmez.
  async dismissDashboardIntro(
    currentUser: AuthenticatedUser,
    role: DashboardIntroRole
  ): Promise<UserProfileResponseDto> {
    const user = await this.usersService.dismissDashboardIntro(currentUser.id, role);

    if (!user) {
      throw AppErrors.unauthorized(AppErrorCode.AUTH_USER_NOT_ACTIVE, "Aktif kullanıcı bulunamadı.");
    }

    return user;
  }


  //update ve delete işlemleri . kullanıcı kendi profil fotoğrafını güncelleyebilir 
  //veya silebilir. ayrıca kendi hesabını silebilir.
  //asıl iş burda yapılmaz usersService içindeki fonksiyonlar çağrılır. 
  //authService sadece bu işlemi koordine eder.
  async updateCurrentUserProfileImage(
    currentUser: AuthenticatedUser,
    file: Express.Multer.File | undefined
  ): Promise<UserProfileResponseDto> {
    return this.usersService.updateOwnProfileImage(currentUser.id, file);
  }

  async deleteCurrentUserProfileImage(
    currentUser: AuthenticatedUser
  ): Promise<UserProfileResponseDto> {
    return this.usersService.deleteOwnProfileImage(currentUser.id);
  }

  async deleteCurrentUser(currentUser: AuthenticatedUser): Promise<void> {
    await this.usersService.deleteOwnAccount(currentUser.id);
  }



  //ac ve ref token burada üretilir .
  private async createTokenPair(user: AuthUserRecord): Promise<AuthTokenResponseDto> {
    
    //ac token payload'u oluşturulur. bu payload içinde kullanıcının id'si, maili, kullanıcı adı ve rolleri bulunur.
    const accessPayload: AccessTokenPayload = {
      sub: user.publicId,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      roles: user.roles,
    };

    //ref token payload'u oluşturulur. bu payload içinde sadece kullanıcı id'si ve token'ın 
    //ref token olduğunu belirten bir type alanı bulunur.
    const refreshPayload: RefreshTokenPayload = {
      sub: user.publicId,
      type: "refresh",
    };

    //jwtService kullanılarak ac ve ref token'ları oluşturulur. 
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.accessSecret,
        expiresIn: this.accessTtl,
      }),
      //secret ve süreler auth.config içinden alınır. 
      //bu sayede token yapılandırması merkezi bir yerden yönetilir
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl,
      }),
    ]);

    //dönen cevap
    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
    };
  }


  //createAuthResponseForUserId fonksiyonu, kullanıcı id'si ile kullanıcının bilgilerini bulur
  //ve bu bilgilerle token oluşturur.
  private async createAuthResponseForUserId(
    userId: number
  ): Promise<AuthTokenResponseDto> {
    const user = await this.usersService.findActiveById(userId);

    if (!user) {
      throw AppErrors.unauthorized(
        AppErrorCode.AUTH_CURRENT_USER_UNRESOLVED,
        "Current user could not be resolved."
      );
    }

    return this.createAuthResponse(user);
  }

  private async createAuthResponse(user: AuthUserRecord): Promise<AuthTokenResponseDto> {
    const tokens = await this.createTokenPair(user);

    return {
      ...tokens,
      user: this.usersService.toUserProfile(this.toUserIdentity(user)),
    };
  }


  //kayıt sırasında mail ve kullanıcı adı benzersiz olmalıdır. bu fonksiyon kayıt işlemi sırasında
  //girilen mail ve kullanıcı adının veritabanında zaten var olup olmadığını kontrol eder.
  private async assertRegistrationIdentifiersAvailable(
    mail: string,
    kullaniciAdi: string
  ): Promise<void> {
    const [mailExists, usernameExists] = await Promise.all([
      this.usersService.existsByMail(mail),
      this.usersService.existsByUsername(kullaniciAdi),
    ]);

    if (mailExists) {
      throw AppErrors.conflict(AppErrorCode.AUTH_EMAIL_IN_USE, "Mail zaten kullanımda.");
    }

    if (usernameExists) {
      throw AppErrors.conflict(AppErrorCode.AUTH_USERNAME_IN_USE, "Username zaten kullanımda.");
    }
  }


  //kayıt verisini temizler ve normalize eder .
  private normalizeRegisterInput(registerDto: RegisterDto): NormalizedRegisterInput {
    const normalizedRole = this.normalizeRegisterRole(registerDto.role);

    return {
      ad: registerDto.ad.trim(),
      soyad: registerDto.soyad.trim(),
      mail: registerDto.mail.trim().toLowerCase(),
      kullaniciAdi: registerDto.kullaniciAdi.trim().toLowerCase(),
      telefonNumarasi: registerDto.telefonNumarasi?.trim() || null,
      password: registerDto.password,
      role: normalizedRole,
      initialVehicle:
      //eğer rol nakliyeci ise araç bilgileri registerDto'dan alınır ve normalize edilerek
      //initialVehicle alanına atanır.
        normalizedRole === ROLE_NAMES.NAKLIYECI
          ? {
              marka: registerDto.marka ?? "",
              model: registerDto.model ?? "",
              plaka: registerDto.plaka ?? "",
              yil: registerDto.yil ?? 0,
              maksimumAgirlikKg: registerDto.maksimumAgirlikKg ?? 0,
              maksimumHacimM3: registerDto.maksimumHacimM3 ?? 0,
              kasaTipi: registerDto.kasaTipi ?? "DIGER",
              uzunlukCm: registerDto.uzunlukCm,
              genislikCm: registerDto.genislikCm,
              yukseklikCm: registerDto.yukseklikCm,
            }
          : null,
    };
  }


  //rol seçilmezse müsteri kabul edilir .
  private normalizeRegisterRole(role?: RegisterRoleName): BusinessRoleName {
    if (!role || role === "KULLANICI") {
      return ROLE_NAMES.MUSTERI;
    }

    return role;
  }

  //veritabanı benzersizlik ihlali hatalarını yakalar ve bu hataları uygun ConflictException'lara dönüştürür.
  private rethrowUniqueConstraintAsConflict(error: unknown): never | void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      return;
    }

    const targets = Array.isArray(error.meta?.target)
      ? error.meta.target.map((target) => String(target))
      : [];

    if (targets.includes("mail")) {
      throw AppErrors.conflict(AppErrorCode.AUTH_EMAIL_IN_USE, "Mail zaten kullanımda.");
    }

    if (targets.includes("kullaniciAdi")) {
      throw AppErrors.conflict(AppErrorCode.AUTH_USERNAME_IN_USE, "Username zaten kullanımda.");
    }

    if (isVehiclePlateUniqueConstraintTarget(targets)) {
      throw AppErrors.conflict(AppErrorCode.AUTH_PLATE_IN_USE, "Plaka zaten kullanımda.");
    }

    throw AppErrors.conflict(AppErrorCode.AUTH_DISPLAY_NAME_IN_USE, "Kullanıcı adı zaten kullanımda.");
  }


  //touseridentity fonksiyonu, AuthUserRecord içinden kullanıcı kimliğini temsil eden bilgileri seçer ve döndürür.
  private toUserIdentity(user: AuthUserRecord): Omit<AuthUserRecord, "sifreHash"> {
    return {
      id: user.id,
      publicId: user.publicId,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
      profileImageUrl: user.profileImageUrl,
      profilFotografiStorageKey: user.profilFotografiStorageKey,
      customerIntroDismissedAt: user.customerIntroDismissedAt ?? null,
      carrierIntroDismissedAt: user.carrierIntroDismissedAt ?? null,
      roles: user.roles,
    };
  }


  //swt secret get fonksiyonları auth.config içindeki değerleri alır. 
  //bu sayede token yapılandırması merkezi bir yerden yönetilir.
  private get accessSecret(): string {
    return this.configService.getOrThrow<string>("auth.accessSecret");
  }

  private get accessTtl(): JwtTtlValue {
    return this.configService.getOrThrow<JwtTtlValue>("auth.accessTtl");
  }

  private get refreshSecret(): string {
    return this.configService.getOrThrow<string>("auth.refreshSecret");
  }

  private get refreshTtl(): JwtTtlValue {
    return this.configService.getOrThrow<JwtTtlValue>("auth.refreshTtl");
  }
}
