import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config"; //nest uygulamasını başlatmak için 
import { NestFactory } from "@nestjs/core";     //gerekli modüller
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);  //CORS açmak ve global pipe eklemek 
  const configService = app.get(ConfigService);     //için Nest uygulamasını başlatır
  const corsOrigins = configService.get<string[]>("app.corsOrigins") ?? [];

  app.enableCors({            //CORS yapılandırması
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  app.setGlobalPrefix("api/v1");  //Tüm API yollarına /api/v1 öneki ekler
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,    //Gelen verilerde tanımlanmamış özellikleri otomatik olarak kaldırır
      transform: true,
      forbidNonWhitelisted: true,
    })
  );
  const port = configService.get<number>("app.port") ?? 4000; 
  await app.listen(port);  //Uygulamanın dinleyeceği portu yapılandırmadan alır, 
}                           //yoksa varsayılan olarak 4000 kullanır

void bootstrap(); //Bootstrap fonksiyonunu çağırarak uygulamayı başlatır
