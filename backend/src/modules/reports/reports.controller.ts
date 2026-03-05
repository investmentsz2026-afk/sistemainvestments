// backend/src/modules/reports/reports.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { DateRangeDto } from './dto/reports.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Get('stock/current')
  getCurrentStock(@Query() filters: DateRangeDto) {
    return this.reportsService.getCurrentStock(filters);
  }

  @Get('stock/valued')
  getValuedStock(@Query() filters: DateRangeDto) {
    return this.reportsService.getValuedStock(filters);
  }

  @Get('movements')
  getMovementsByDateRange(@Query() dateRange: DateRangeDto) {
    return this.reportsService.getMovementsByDateRange(dateRange);
  }
}