import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import * as classTransformer from "class-transformer";
import * as classValidator from "class-validator";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const corsOrigins = configService.get<string[]>("app.corsOrigins") ?? [];

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformerPackage: classTransformer,
      validatorPackage: classValidator,
    })
  );

  const port = configService.get<number>("app.port") ?? 4000;
  await app.listen(port);
}

void bootstrap();
