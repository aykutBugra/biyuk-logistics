import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { RoleName } from "../../common/constants/role-names";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";

type AccessTokenPayload = {
  sub: number;
  mail: string;
  kullaniciAdi: string;
  roles: RoleName[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("auth.accessSecret") ?? "dev-access-secret",
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      mail: payload.mail,
      kullaniciAdi: payload.kullaniciAdi,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
  }
}
