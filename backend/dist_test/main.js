"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        // CORS seguro
        app.enableCors({
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        });
        // Validaciones globales
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        // Servir archivos estáticos
        app.useStaticAssets((0, path_1.join)(__dirname, '..', 'public'));
        // Prefijo global (excluyendo la raíz para que Railway encuentre el health check)
        app.setGlobalPrefix('api', {
            exclude: ['/'],
        });
        // Puerto dinámico para Railway
        const port = process.env.PORT || 3000;
        await app.listen(port, '0.0.0.0');
        const url = await app.getUrl();
        logger.log(`✅ Application running on: ${url}`);
    }
    catch (err) {
        logger.error('❌ Failed to start application', err);
        process.exit(1);
    }
}
bootstrap();
