import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ CORS GLOBAL (modo seguro producción + debugging)
  app.enableCors({
    origin: true, // permite cualquier dominio temporalmente
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
  });

  // ✅ Validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ Archivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // ✅ Prefijo global API
  app.setGlobalPrefix('api');

  // ✅ Puerto Railway
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Backend running on port ${port}`);
}

bootstrap();