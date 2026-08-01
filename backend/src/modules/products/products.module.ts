// backend/src/modules/products/products.module.ts
import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MeasurementsService } from './measurements.service';
import { MeasurementsController } from './measurements.controller';

@Module({
  controllers: [ProductsController, MeasurementsController],
  providers: [ProductsService, MeasurementsService],
  exports: [ProductsService, MeasurementsService],
})
export class ProductsModule {}