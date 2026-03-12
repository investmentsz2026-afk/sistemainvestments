// backend/src/modules/purchases/dto/create-purchase.dto.ts
import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum PurchaseCategory {
    MATERIALES = 'Materiales',
    MAQUINARIA = 'Maquinaria',
    AVIOS = 'Avios',
    PRODUCTOS_QUIMICOS = 'Productos Químicos',
}

class PurchaseItemDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    category: string;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsNumber()
    quantity: number;

    @IsNumber()
    price: number;

    @IsOptional()
    @IsString()
    productId?: string;

    @IsOptional()
    @IsString()
    variantId?: string;
}

export class CreatePurchaseDto {
    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    invoiceNumber?: string;

    @IsOptional()
    @IsString()
    op?: string;

    @IsOptional()
    @IsString()
    supplierId?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PurchaseItemDto)
    items: PurchaseItemDto[];
}
