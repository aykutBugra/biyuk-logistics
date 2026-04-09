import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import appConfig from "./config/app.config";    //Uygulama yapılandırmasını içeren modül
import authConfig from "./config/auth.config";
import { getEnvFilePaths } from "./config/env"; 
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";    
import { RolesModule } from "./modules/roles/roles.module"; //Kullanıcı ve rol yönetimi için gerekli modüller
import { UsersModule } from "./modules/users/users.module"; 

@Module({         //AppModule, uygulamanın kök modülüdür ve diğer modülleri içe aktarır
  imports: [
    ConfigModule.forRoot({  //ConfigModule, uygulamanın yapılandırma yönetimi için kullanılır
      isGlobal: true,                   //ConfigModule'u global olarak kullanılabilir hale getirir, böylece diğer modüllerde tekrar içe aktarmaya gerek kalmaz
      load: [appConfig, authConfig],    //Yapılandırma dosyalarını yükler
      envFilePath: getEnvFilePaths(),   //Çevresel değişken dosyalarının yollarını belirler
    }),
    PrismaModule,
    RolesModule,    //Kullanıcı ve rol yönetimi için gerekli modüller
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],   //Uygulamanın sağlık kontrolü gibi temel işlevlerini sağlayan AppController'ı kaydeder
})
export class AppModule {}  
