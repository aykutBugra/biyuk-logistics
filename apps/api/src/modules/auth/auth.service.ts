import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcryptjs";
import type { JwtTtlValue } from "../../config/auth.config";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { UserProfileResponseDto } from "../users/dto/user-profile-response.dto";
import { type AuthUserRecord, UsersService } from "../users/users.service";
import { AuthTokenResponseDto } from "./dto/auth-token-response.dto";
import { LoginDto } from "./dto/login.dto";

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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(loginDto: LoginDto): Promise<AuthTokenResponseDto> {
    const identifier = loginDto.identifier.trim();
    const user = await this.usersService.findActiveByIdentifier(identifier);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const isPasswordValid = await compare(loginDto.password, user.sifreHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const tokens = await this.createTokenPair(user);

    return {
      ...tokens,
      user: this.usersService.toUserProfile(this.toUserIdentity(user)),
    };
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

  async getCurrentUser(currentUser: AuthenticatedUser): Promise<UserProfileResponseDto> {
    const user = await this.usersService.findProfileById(currentUser.id);

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
