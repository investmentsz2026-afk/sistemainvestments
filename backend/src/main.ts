import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // CORS seguro: permite localhost y tu frontend en producción
    app.enableCors({
      origin: [
        'http://localhost:3000', // para desarrollo local
        'http://127.0.0.1:3000', // alternativa local
        'https://frontend-production-120326.up.railway.app', // frontend en Railway
      ],
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

    // Servir archivos estáticos desde la carpeta 'public'
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // Prefijo global para todas las rutas excepto la raíz
    app.setGlobalPrefix('api', {
      exclude: ['/'],
    });

    // Puerto dinámico para Railway
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await app.listen(port, '0.0.0.0');

    logger.log(`✅ Application running on port ${port}`);
  } catch (err) {
    logger.error('❌ Failed to start application', err);
    process.exit(1);
  }
}

bootstrap();