import * as dotenv from "dotenv";
dotenv.config({ quiet: true });

import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { InjestionModule } from "./injestion.module";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { ApiKeyGuard } from "@app/shared/guards";

async function bootstrap() {
  const app = await NestFactory.create(InjestionModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(
    new ErrorResponseInterceptor(),
    new TrimInterceptor(),
  );

  // Require a valid API key before any request is handled.
  app.useGlobalGuards(new ApiKeyGuard("INGESTION_API_KEY")); 

  app.setGlobalPrefix("api");

  app.enableCors();

  const port = process.env.INJESTION_PORT ?? 3000;
  await app.listen(port);
  Logger.log(`Injestion service running on port ${port}`);
}
bootstrap();
