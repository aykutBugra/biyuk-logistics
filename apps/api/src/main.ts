import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { mkdirSync } from "node:fs";
import * as classTransformer from "class-transformer";
import * as classValidator from "class-validator";
import { AppModule } from "./app.module";
import { GlobalAppExceptionFilter } from "./common/errors";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const corsOrigins = configService.get<string[]>("app.corsOrigins") ?? [];
  const mediaDriver = configService.get<string>("media.driver") ?? "local";
  const mediaLocalRoot = configService.get<string>("media.localRoot");

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new GlobalAppExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformerPackage: classTransformer,
      validatorPackage: classValidator,
    })
  );

  if (mediaDriver === "local" && mediaLocalRoot) {
    mkdirSync(mediaLocalRoot, { recursive: true });
    app.useStaticAssets(mediaLocalRoot, {
      prefix: "/uploads",
    });
  }

  const port = configService.get<number>("app.port") ?? 4000;
  await app.listen(port);
}

void bootstrap();
