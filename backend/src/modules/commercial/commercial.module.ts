import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { AdvancesService } from './advances.service';
import { AdvancesController } from './advances.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SalesController, AdvancesController],
  providers: [SalesService, AdvancesService],
  exports: [SalesService, AdvancesService],
})
export class CommercialModule {}
