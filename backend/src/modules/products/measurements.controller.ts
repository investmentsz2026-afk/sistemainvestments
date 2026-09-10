import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
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
    @Query('stage') stage?: string,
  ) {
    return this.measurementsService.findMeasurements({
      productId,
      sampleId,
      op,
      size,
      stage,
    });
  }

  @Post()
  async saveMeasurement(@Body() body: any) {
    return this.measurementsService.saveMeasurement(body);
  }

  @Delete(':id')
  async deleteMeasurement(@Param('id') id: string) {
    return this.measurementsService.deleteMeasurement(id);
  }
}
