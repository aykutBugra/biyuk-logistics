import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";    //Auth’ın çalışmak için ihtiyaç duyduğu modüller
import type { JwtTtlValue } from "../../config/auth.config";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    ConfigModule,
    UsersModule,    //Auth’ın çalışmak için ihtiyaç duyduğu modüller
    PassportModule.register({
      defaultStrategy: "jwt",
    }),
    JwtModule.registerAsync({   //JwtModule, JWT tabanlı kimlik doğrulama işlemleri için yapılandırılır
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("auth.accessSecret") ?? "dev-access-secret",
        signOptions: {
          expiresIn:
            (configService.get<JwtTtlValue>("auth.accessTtl") ?? "15m") as JwtTtlValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],    //AuthController'ı kaydeder, böylece istekleri işleyebilir
  providers: [AuthService, JwtStrategy, JwtAuthGuard],  //AuthService, JwtStrategy ve JwtAuthGuard'ı sağlayıcı olarak kaydeder, böylece bunlar uygulama genelinde kullanılabilir
  exports: [AuthService, JwtAuthGuard],//AuthService ve JwtAuthGuard'ı dışa aktarır, böylece diğer modüllerde de kullanılabilir hale getirir
})
export class AuthModule {} 
