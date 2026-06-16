import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MovementsModule } from './modules/movements/movements.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { DatabaseModule } from './database/database.module';
import { QualityModule } from './modules/quality/quality.module';
import { ProcessAuditsModule } from './modules/process-audits/process-audits.module';
import { CommercialModule } from './modules/commercial/commercial.module';
import { SamplesModule } from './modules/samples/samples.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AgenciesModule } from './modules/agencies/agencies.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ProductionOrdersModule } from './modules/production-orders/production-orders.module';
import { AppController } from './app.controller';
import { PrismaService } from './database/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    ProductsModule,
    InventoryModule,
    MovementsModule,
    ReportsModule,
    PurchasesModule,
    SuppliersModule,
    QualityModule,
    ProcessAuditsModule,
    CommercialModule,
    SamplesModule,
    NotificationsModule,
    OrdersModule,
    AgenciesModule,
    UploadsModule,
    ProductionOrdersModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      const roles = [
        { name: 'ADMIN', description: 'Acceso total al sistema' },
        { name: 'CLIENTE', description: 'Módulo de clientes' },
        { name: 'COMERCIAL', description: 'Módulo de ventas y comercial' },
        { name: 'CONTABILIDAD', description: 'Módulo contable' },
        { name: 'LOGISTICA', description: 'Módulo de compras e inventario' },
        { name: 'UDP', description: 'Módulo de calidad y auditoría' },
        { name: 'VENDEDOR_LIMA', description: 'Vendedor exclusivo zona Lima' },
        { name: 'VENDEDOR_ORIENTE', description: 'Vendedor exclusivo zona Oriente' },
      ];

      for (const role of roles) {
        await this.prisma.role.upsert({
          where: { name: role.name },
          update: {},
          create: role,
        });
      }
      console.log('✅ Roles synchronized successfully in Database');
    } catch (error) {
      console.error('❌ Error synchronizing roles in Database on startup:', error);
    }
  }
}
