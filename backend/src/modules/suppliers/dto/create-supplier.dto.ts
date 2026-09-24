import { IsString, IsEmail, IsOptional, IsBoolean, ValidateIf } from 'class-validator';

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
    @ValidateIf((o) => o.email !== '' && o.email !== null && o.email !== undefined)
    @IsEmail({}, { message: 'El correo electrónico no es válido' })
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
