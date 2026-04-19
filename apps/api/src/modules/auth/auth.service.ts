import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { ROLE_NAMES, type RoleName } from "../../common/constants/role-names";
import type { JwtTtlValue } from "../../config/auth.config";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RolesService } from "../roles/roles.service";
import { UserProfileResponseDto } from "../users/dto/user-profile-response.dto";
import { type AuthUserRecord, UsersService } from "../users/users.service";
import {
  createVehicleForOwner,
  isVehiclePlateUniqueConstraintTarget,
  type VehicleDraft,
} from "../vehicles/vehicle-write.helpers";
import { AuthTokenResponseDto } from "./dto/auth-token-response.dto";
import { LoginDto } from "./dto/login.dto";
import { type RegisterRoleName, RegisterDto } from "./dto/register.dto";

type AccessTokenPayload = {   //AccessTokenPayload, erişim token'ının içinde yer alacak bilgileri tanımlayan bir türdür
  sub: number;
  mail: string;
  kullaniciAdi: string;
  roles: AuthUserRecord["roles"];
};

type RefreshTokenPayload = {  //RefreshTokenPayload, yenileme token'ının içinde yer alacak bilgileri tanımlayan bir türdür
  sub: number;
  type: "refresh";
};

type NormalizedRegisterInput = {  //NormalizedRegisterInput, kayıt işlemi sırasında gelen verilerin normalize edilmiş halini temsil eden bir türdür
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  password: string;
  role: RoleName;
  initialVehicle: VehicleDraft | null;
};

@Injectable()
export class AuthService {    //AuthService, kimlik doğrulama işlemlerini gerçekleştiren bir hizmettir
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthTokenResponseDto> { //register metodu, yeni bir kullanıcı kaydı oluşturur ve 
    const normalizedInput = this.normalizeRegisterInput(registerDto);       //başarılı bir kayıt işleminden sonra erişim ve yenileme 
                                                                            //token'ları içeren bir AuthTokenResponseDto döner
    await this.assertRegistrationIdentifiersAvailable(  //Kayıt sırasında kullanılan mail ve kullanıcı adı gibi tanımlayıcıların benzersiz olduğunu doğrular
      normalizedInput.mail,
      normalizedInput.kullaniciAdi
    );

    const roleId = await this.rolesService.requireRoleId(normalizedInput.role);
    const sifreHash = await hash(normalizedInput.password, 12);
    let user: AuthUserRecord;   

    try { //Yeni kullanıcı oluşturma işlemi sırasında oluşabilecek benzersiz kısıtlama hatalarını yakalar ve uygun şekilde ConflictException olarak yeniden fırlatır
      user = await this.prisma.client.$transaction(async (tx) => {
        const createdUser = await this.usersService.createUserWithResolvedRoleIdInTransaction(tx, {
          ad: normalizedInput.ad,
          soyad: normalizedInput.soyad,
          mail: normalizedInput.mail,
          kullaniciAdi: normalizedInput.kullaniciAdi,
          telefonNumarasi: normalizedInput.telefonNumarasi,
          sifreHash,
          roleId,
        });

        if (normalizedInput.initialVehicle) {
          await createVehicleForOwner(tx, {
            sahipId: createdUser.id,
            ...normalizedInput.initialVehicle,
          });
        }

        return createdUser;
      });
    } catch (error) { 
      this.rethrowUniqueConstraintAsConflict(error);
      throw error;
    }

    const tokens = await this.createTokenPair(user);

    return {
      ...tokens,
      user: this.usersService.toUserProfile(this.toUserIdentity(user)),
    };
  }

  async login(loginDto: LoginDto): Promise<AuthTokenResponseDto> {      //login metodu, kullanıcı giriş işlemini gerçekleştirir. Verilen kimlik bilgilerini 
    const identifier = loginDto.identifier.trim();                       //doğrular ve başarılı bir girişten sonra erişim ve yenileme token'ları içeren bir 
    const user = await this.usersService.findActiveByIdentifier(identifier);    //AuthTokenResponseDto döner

    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const isPasswordValid = await compare(loginDto.password, user.sifreHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("şifre hatalı");
    }

    const tokens = await this.createTokenPair(user);

    return {
      ...tokens,
      user: this.usersService.toUserProfile(this.toUserIdentity(user)),
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokenResponseDto> {  //refresh metodu, geçerli bir yenileme token'ı alır, doğrular ve 
    let payload: RefreshTokenPayload;                                   //yeni bir erişim ve yenileme token'ı çifti döner.

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const user = await this.usersService.findActiveById(payload.sub);

    if (!user) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    return this.createTokenPair(user);
  }

  async getCurrentUser(currentUser: AuthenticatedUser): Promise<UserProfileResponseDto> { //getCurrentUser metodu, geçerli kimliği doğrulanmış kullanıcı bilgilerini alır ve UserProfileResponseDto formatında döner
    const user = await this.usersService.findProfileById(currentUser.id);                 //bilgilerini alır ve UserProfileResponseDto formatında döner

    if (!user) {
      throw new UnauthorizedException("Current user could not be resolved.");
    }

    return user;
  }

  private async createTokenPair(user: AuthUserRecord): Promise<AuthTokenResponseDto> {  
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      roles: user.roles,
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      type: "refresh",
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.accessSecret,
        expiresIn: this.accessTtl,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
    };
  }

  private async assertRegistrationIdentifiersAvailable(  //Kayıt sırasında kullanılan mail ve kullanıcı adı gibi tanımlayıcıların benzersiz olduğunu doğrular
    mail: string,
    kullaniciAdi: string
  ): Promise<void> {
    const [mailExists, usernameExists] = await Promise.all([
      this.usersService.existsByMail(mail),
      this.usersService.existsByUsername(kullaniciAdi),
    ]);

    if (mailExists) {
      throw new ConflictException("Mail is already in use.");
    }

    if (usernameExists) {
      throw new ConflictException("Username is already in use.");
    }
  }

  private normalizeRegisterInput(registerDto: RegisterDto): NormalizedRegisterInput {
    return {  
      ad: registerDto.ad.trim(),
      soyad: registerDto.soyad.trim(),
      mail: registerDto.mail.trim().toLowerCase(),
      kullaniciAdi: registerDto.kullaniciAdi.trim().toLowerCase(),
      telefonNumarasi: registerDto.telefonNumarasi?.trim() || null,
      password: registerDto.password,
      role: this.normalizeRegisterRole(registerDto.role),
      initialVehicle:
        this.normalizeRegisterRole(registerDto.role) === ROLE_NAMES.NAKLIYECI
          ? {
              marka: registerDto.marka ?? "",
              model: registerDto.model ?? "",
              plaka: registerDto.plaka ?? "",
              yil: registerDto.yil ?? 0,
              kapasite: registerDto.kapasite ?? 0,
            }
          : null,
    };
  }

  private normalizeRegisterRole(role?: RegisterRoleName): RoleName {
    if (!role || role === "KULLANICI") {
      return ROLE_NAMES.MUSTERI;
    }

    return role;
  }

  private rethrowUniqueConstraintAsConflict(error: unknown): never | void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      return;
    }

    const targets = Array.isArray(error.meta?.target)
      ? error.meta.target.map((target) => String(target))
      : [];

    if (targets.includes("mail")) {
      throw new ConflictException("Mail is already in use.");
    }

    if (targets.includes("kullaniciAdi")) {
      throw new ConflictException("Username is already in use.");
    }

    if (isVehiclePlateUniqueConstraintTarget(targets)) {
      throw new ConflictException("Vehicle plate is already in use.");
    }

    throw new ConflictException("User identifiers must be unique.");
  }

          //toUserIdentity, AuthUserRecord içinden sifreHash alanını çıkartarak kullanıcının kimlik bilgilerini temsil eden bir nesne döner
  private toUserIdentity(user: AuthUserRecord): Omit<AuthUserRecord, "sifreHash"> {
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

  private get accessSecret(): string {
    return this.configService.get<string>("auth.accessSecret") ?? "dev-access-secret";
  }

  private get accessTtl(): JwtTtlValue {
    return (
      this.configService.get<JwtTtlValue>("auth.accessTtl") ?? "15m"
    ) as JwtTtlValue;
  }

  private get refreshSecret(): string {
    return (
      this.configService.get<string>("auth.refreshSecret") ?? "dev-refresh-secret"
    );
  }

  private get refreshTtl(): JwtTtlValue {
    return (
      this.configService.get<JwtTtlValue>("auth.refreshTtl") ?? "7d"
    ) as JwtTtlValue;
  }
}
