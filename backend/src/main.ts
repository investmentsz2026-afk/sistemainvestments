import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Validaciones globales
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Servir archivos estáticos (favicon, etc)
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Prefijo global
  app.setGlobalPrefix('api');

  // Escuchar puerto
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Application running on http://0.0.0.0:${port}`);
}

bootstrap().catch(err => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});