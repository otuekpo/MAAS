import * as dotenv from "dotenv";
dotenv.config({ quiet: true });

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { LowercaseEmailPipe } from "@app/shared/pipes";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { DataSource } from "typeorm";
import { User } from "@app/database/pg-entities";
import { UserRole } from "@app/shared";
import { hash } from "bcrypt";

async function seedSuperAdmin(dataSource: DataSource) {
  const shouldSeed = process.env.SEED_SUPER_ADMIN === "true";

  if (!shouldSeed) {
    return;
  }

  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const firstName = process.env.SUPER_ADMIN_FIRSTNAME;
  const lastName = process.env.SUPER_ADMIN_LASTNAME;

  if (!email || !password) {
    Logger.warn(
      "SEED_SUPER_ADMIN is true but SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD is not set. Skipping seed.",
    );
    return;
  }

  const userRepo = dataSource.getRepository(User);
  const existing = await userRepo.findOne({ where: { email } });

  if (existing) {
    if (existing.role !== UserRole.SUPERADMIN) {
      await userRepo.update({ id: existing.id }, { role: UserRole.SUPERADMIN });
      Logger.log(`Updated existing user ${email} to SUPERADMIN role.`);
    } else {
      Logger.log(
        `Super admin ${email} already exists with correct role. Skipping seed.`,
      );
    }
    return;
  }

  const hashedPassword = await hash(password, 10);

  const superAdmin = userRepo.create({
    email,
    password: hashedPassword,
    firstName,
    lastName,
    role: UserRole.SUPERADMIN,
    isEmailVerified: true,
    emailVerificationToken: "",
    emailVerificationTokenExpiry: null,
  });

  await userRepo.save(superAdmin);
  Logger.log(`Super admin seeded successfully: ${email}`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
    new LowercaseEmailPipe(),
  );

  app.useGlobalInterceptors(
    new ErrorResponseInterceptor(),
    new TrimInterceptor(),
  );

  app.setGlobalPrefix("api");

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Auth Service")
    .setDescription(
      "Authentication, authorization, and admin CRUD for faculties, departments, permissions, students, and courses",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.MAAS_MAIN_SERVICE_PORT ?? 3000;
  await seedSuperAdmin(app.get(DataSource));
  await app.listen(port);
  Logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}
bootstrap();
