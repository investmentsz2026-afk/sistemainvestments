// backend/src/modules/movements/dto/movement.dto.ts
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class MovementFiltersDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsEnum(['ENTRY', 'EXIT'])
  @IsOptional()
  type?: 'ENTRY' | 'EXIT';

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}