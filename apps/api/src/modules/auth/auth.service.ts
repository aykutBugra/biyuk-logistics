import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import {
  ROLE_NAMES,
  type BusinessRoleName,
} from "../../common/constants/role-names";
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

type AccessTokenPayload = {
  sub: number;
  mail: string;
  kullaniciAdi: string;
  roles: AuthUserRecord["roles"];
};

type RefreshTokenPayload = {
  sub: number;
  type: "refresh";
};

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
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthTokenResponseDto> {
    const normalizedInput = this.normalizeRegisterInput(registerDto);

    await this.assertRegistrationIdentifiersAvailable(
      normalizedInput.mail,
      normalizedInput.kullaniciAdi
    );

    const customerRoleId = await this.rolesService.requireRoleId(ROLE_NAMES.MUSTERI);
    const sifreHash = await hash(normalizedInput.password, 12);

    let userId: number;

    try {
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

        if (normalizedInput.initialVehicle) {
          await createVehicleForOwner(tx, {
            sahipId: createdUser.id,
            ...normalizedInput.initialVehicle,
          });
          await this.rolesService.assignRoleToUserInTransaction(
            tx,
            createdUser.id,
            ROLE_NAMES.NAKLIYECI
          );
        }

        return createdUser.id;
      });
    } catch (error) {
      this.rethrowUniqueConstraintAsConflict(error);
      throw error;
    }

    return this.createAuthResponseForUserId(userId);
  }

  async login(loginDto: LoginDto): Promise<AuthTokenResponseDto> {
    const identifier = loginDto.identifier.trim();
    const user = await this.usersService.findActiveByIdentifier(identifier);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const isPasswordValid = await compare(loginDto.password, user.sifreHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Sifre hatali");
    }

    return this.createAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokenResponseDto> {
    let payload: RefreshTokenPayload;

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

  async completeCarrierOnboarding(
    currentUser: AuthenticatedUser,
    createVehicleDto: CreateVehicleDto
  ): Promise<AuthTokenResponseDto> {
    const user = await this.usersService.findActiveById(currentUser.id);

    if (!user) {
      throw new UnauthorizedException("Current user could not be resolved.");
    }

    if (user.roles.includes(ROLE_NAMES.NAKLIYECI)) {
      throw new ConflictException("Carrier onboarding is already complete.");
    }

    if (!user.roles.includes(ROLE_NAMES.MUSTERI)) {
      throw new ConflictException("Current user is not eligible for carrier onboarding.");
    }

    try {
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

    return this.createAuthResponseForUserId(user.id);
  }

  async getCurrentUser(
    currentUser: AuthenticatedUser
  ): Promise<UserProfileResponseDto> {
    const user = await this.usersService.findProfileById(currentUser.id);

    if (!user) {
      throw new UnauthorizedException("Current user could not be resolved.");
    }

    return user;
  }

  async dismissDashboardIntro(
    currentUser: AuthenticatedUser,
    role: DashboardIntroRole
  ): Promise<UserProfileResponseDto> {
    const user = await this.usersService.dismissDashboardIntro(currentUser.id, role);

    if (!user) {
      throw new UnauthorizedException("Current user could not be resolved.");
    }

    return user;
  }

  async deleteCurrentUser(currentUser: AuthenticatedUser): Promise<void> {
    await this.usersService.deleteOwnAccount(currentUser.id);
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

  private async createAuthResponseForUserId(
    userId: number
  ): Promise<AuthTokenResponseDto> {
    const user = await this.usersService.findActiveById(userId);

    if (!user) {
      throw new UnauthorizedException("Current user could not be resolved.");
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

  private async assertRegistrationIdentifiersAvailable(
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

  private normalizeRegisterRole(role?: RegisterRoleName): BusinessRoleName {
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

  private toUserIdentity(user: AuthUserRecord): Omit<AuthUserRecord, "sifreHash"> {
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
    };
  }

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
