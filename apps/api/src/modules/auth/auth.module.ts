import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";    //Auth’ın çalışmak için ihtiyaç duyduğu modüller
import type { JwtTtlValue } from "../../config/auth.config";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { RolesModule } from "../roles/roles.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RolesModule,
    UsersModule,    //Auth’ın çalışmak için ihtiyaç duyduğu modüller
    PassportModule.register({
      defaultStrategy: "jwt",
    }),

    //jwt ayarları sabit bir şekilde JwtModule içinde değil, ConfigService üzerinden dinamik olarak alınır.
    JwtModule.registerAsync({   //JwtModule, JWT tabanlı kimlik doğrulama işlemleri için yapılandırılır
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("auth.accessSecret"),
        signOptions: {
          expiresIn: configService.getOrThrow<JwtTtlValue>("auth.accessTtl"),
        },
      }),
    }),
  ],
  controllers: [AuthController],    //AuthController'ı kaydeder, böylece istekleri işleyebilir
  providers: [AuthService, JwtStrategy, JwtAuthGuard],  //AuthService, JwtStrategy ve JwtAuthGuard'ı sağlayıcı olarak kaydeder, böylece bunlar uygulama genelinde kullanılabilir
  exports: [AuthService, JwtAuthGuard],//AuthService ve JwtAuthGuard'ı dışa aktarır, böylece diğer modüllerde de kullanılabilir hale getirir
})
export class AuthModule {} 
