import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class CreateSupplierDto {
    @IsString()
    documentType: string;

    @IsString()
    documentNumber: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    contactName?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
