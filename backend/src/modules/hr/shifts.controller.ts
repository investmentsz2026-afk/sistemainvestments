import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto, BatchShiftsDto } from './dto/shift.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('hr/shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  create(@Body() dto: CreateShiftDto) {
    return this.shiftsService.create(dto);
  }

  @Post('batch')
  saveBatch(@Body() dto: BatchShiftsDto) {
    return this.shiftsService.saveBatch(dto);
  }

  @Get()
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.shiftsService.findAll(employeeId, startDate, endDate);
  }

  @Get('grouped')
  findGroupedDays() {
    return this.shiftsService.findGroupedDays();
  }

  @Get('weekly-report')
  getWeeklyReport(
    @Query('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
  ) {
    return this.shiftsService.getWeeklyReport(employeeId, startDate);
  }

  @Delete('day')
  removeDay(@Query('date') dateStr: string) {
    return this.shiftsService.removeDay(dateStr);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shiftsService.remove(id);
  }
}
