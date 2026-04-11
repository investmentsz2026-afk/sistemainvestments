import { IsString, IsOptional } from 'class-validator';

export class CreateAgencyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  zone: string; // LIMA, ORIENTE, COMERCIAL

  @IsOptional()
  @IsString()
  ruc?: string;

  @IsOptional()
  @IsString()
  contactName?: string;
}

export class UpdateAgencyDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() zone?: string;
  @IsOptional() @IsString() ruc?: string;
  @IsOptional() @IsString() contactName?: string;
}
