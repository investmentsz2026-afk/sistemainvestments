import { Module } from '@nestjs/common';
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
import { AppController } from './app.controller';

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
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule { }