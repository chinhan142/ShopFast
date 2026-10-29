import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  // 1. Enable Global Prefix
  app.setGlobalPrefix('api');

  // 2. Enable API Versioning (URI scheme: /api/v1/...)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 3. Security: CORS Configuration
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // 4. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 5. Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // 6. Swagger API Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ShopFast E-Commerce API')
    .setDescription(
      'Hệ thống API backend cho sàn TMĐT ShopFast - Defense Case Study 6 (Rikkei Academy).\n' +
      'Bao gồm: Auth (JWT/RBAC), Catalog & Orders, Realtime Tracking, Redis Cache, BullMQ Jobs và AI CSKH Agent.'
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Nhập JWT Access Token vào đây theo cú pháp: Bearer <token>',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // 7. Enable Graceful Shutdown Hooks
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`================================================================`);
  logger.log(`🚀 ShopFast Backend running on: http://localhost:${port}`);
  logger.log(`📚 Swagger API Docs available at: http://localhost:${port}/api/docs`);
  logger.log(`🛡️  API Versioning active: Base URL http://localhost:${port}/api/v1`);
  logger.log(`🌱 Environment: ${nodeEnv.toUpperCase()}`);
  logger.log(`================================================================`);
}

bootstrap();
