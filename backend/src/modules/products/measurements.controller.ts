import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { MeasurementsService } from './measurements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products-measurements')
@UseGuards(JwtAuthGuard)
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Get()
  async getMeasurements(
    @Query('productId') productId?: string,
    @Query('sampleId') sampleId?: string,
    @Query('op') op?: string,
    @Query('size') size?: string,
  ) {
    return this.measurementsService.findMeasurements({
      productId,
      sampleId,
      op,
      size,
    });
  }

  @Post()
  async saveMeasurement(@Body() body: any) {
    return this.measurementsService.saveMeasurement(body);
  }
}
