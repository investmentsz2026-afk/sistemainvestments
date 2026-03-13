import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // CORS seguro
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    });

    // Validaciones globales
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Servir archivos estáticos
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // Prefijo global (excluyendo la raíz para que Railway encuentre el health check)
    app.setGlobalPrefix('api', {
      exclude: ['/'],
    });

    // Puerto dinámico para Railway
    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');

    const url = await app.getUrl();
    logger.log(`✅ Application running on: ${url}`);
  } catch (err) {
    logger.error('❌ Failed to start application', err);
    process.exit(1);
  }
}

bootstrap();