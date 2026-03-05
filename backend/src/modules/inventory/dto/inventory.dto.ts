// backend/src/modules/inventory/dto/inventory.dto.ts
import { IsString, IsNumber, IsEnum, IsArray, ValidateNested, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export enum MovementType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
}

export class RegisterMovementDto {
  @IsString()
  variantId: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  reference?: string;
}

export class BulkMovementItemDto {
  @IsString()
  variantId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class RegisterBulkMovementDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkMovementItemDto)
  items: BulkMovementItemDto[];

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  reference?: string;
}

export class ScanMovementDto {
  @IsString()
  variantSku: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  reason: string;
}