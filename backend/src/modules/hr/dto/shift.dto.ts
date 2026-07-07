import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShiftDto {
  @IsString()
  employeeId: string;

  @IsString()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}

export class ShiftItemDto {
  @IsString()
  employeeId: string;

  @IsString()
  status: string; // ASISTIO, FALTA, DESCANSO

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;
}

export class BatchShiftsDto {
  @IsString()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftItemDto)
  shifts: ShiftItemDto[];
}
