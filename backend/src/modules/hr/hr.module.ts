import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

@Module({
  controllers: [EmployeesController, ShiftsController],
  providers: [EmployeesService, ShiftsService],
})
export class HrModule {}
