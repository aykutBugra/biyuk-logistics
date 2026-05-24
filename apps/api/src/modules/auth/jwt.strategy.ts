import { Injectable } from "@nestjs/common";
import { AppErrorCode, AppErrors } from "../../common/errors";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { RoleName } from "../../common/constants/role-names";
import {
  isLegacyNumericEntityId,
  isLegacyNumericIdsAllowed,
  isUuidV4,
} from "../../common/public-ids/public-entity-id";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { UsersService } from "../users/users.service";

//ac token payload'ını tanımlayan bir türdür. JWT token'ının içinde yer alan bilgileri temsil eder.
type AccessTokenPayload = {
  sub: string | number;
  mail: string;
  kullaniciAdi: string;
  roles: RoleName[];
};

@Injectable()
// JWT token nasıl okunacak ve nasıl doğrulanacak, onu tarif eden bir stratejidir .
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    //stratejinin ihtiyaç duyduğu ConfigService ve UsersService'i alır.
    configService: ConfigService,
    private readonly usersService: UsersService
  ) {
    super({
      //token i http header daki bearer token olarak alır.
      //frontend "Authorization: Bearer <accessToken>" şeklinde göndermelidir.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,  //token süre kontrolü
      
      //token doğrulaması için kullanılan gizli anahtar, 
      //configService üzerinden dinamik olarak alınır.
      secretOrKey: configService.getOrThrow<string>("auth.accessSecret"),
    });
  }

  //token doğruysa passport bu validate fonksiyonunu çağırır ve payload'ı verir.
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    //token içindeki sub yani kul. id si ile aktif kulllanıcı aranır .
    const subject = String(payload.sub);
    const user = isUuidV4(subject)
      ? await this.usersService.findActiveByPublicId(subject)
      : isLegacyNumericIdsAllowed() && isLegacyNumericEntityId(subject)
        ? await this.usersService.findActiveById(Number(subject))
        : null;

    //aktif kullanıcı yoksa istek red
    if (!user) {
      throw AppErrors.unauthorized(AppErrorCode.AUTH_USER_NOT_ACTIVE, "Aktif kullanıcı bulunamadı.");
    }

    //bu dönen değer request.user içine atanır ve uygulamanın geri 
    //kalanında kimlik doğrulaması yapılmış kullanıcı bilgilerine erişim sağlanır.
    return {
      id: user.id,
      publicId: user.publicId,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      roles: user.roles,
    };
  }
}
