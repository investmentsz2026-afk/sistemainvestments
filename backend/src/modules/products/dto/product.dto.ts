// backend/src/modules/products/dto/product.dto.ts
import { IsString, IsNumber, IsOptional, IsArray, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @IsString()
  size: string;

  @IsString()
  color: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  initialStock?: number;

  @IsString()
  @IsOptional()
  variantSku?: string;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  inventoryType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  op?: string;

  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minStock?: number;

  @IsArray()
  @IsOptional()
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  inventoryType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  op?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  purchasePrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  sellingPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minStock?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @Type(() => UpdateVariantDto)
  variants?: UpdateVariantDto[];
}

export class UpdateVariantDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  size: string;

  @IsString()
  color: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  initialStock?: number;

  @IsString()
  @IsOptional()
  variantSku?: string;
}