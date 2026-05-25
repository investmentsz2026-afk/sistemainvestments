import { IsString, IsArray, ValidateNested, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OPVariantSelectionDto {
  @IsString()
  size: string;

  @IsArray()
  @IsString({ each: true })
  colors: string[];
}

export class CreateProductionOrderDto {
  @IsString()
  opNumber: string;

  @IsString()
  productId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OPVariantSelectionDto)
  variants: OPVariantSelectionDto[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cost?: number;
}
