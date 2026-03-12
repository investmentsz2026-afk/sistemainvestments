import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    @Post()
    @Roles('ADMIN')
    async create(@Body() createSupplierDto: CreateSupplierDto) {
        const supplier = await this.suppliersService.create(createSupplierDto);
        return {
            success: true,
            data: supplier,
            message: 'Proveedor registrado exitosamente',
        };
    }

    @Get()
    @Roles('ADMIN', 'LOGISTICA')
    async findAll() {
        const suppliers = await this.suppliersService.findAll();
        return {
            success: true,
            data: suppliers,
        };
    }

    @Get(':id')
    @Roles('ADMIN', 'LOGISTICA')
    async findOne(@Param('id') id: string) {
        const supplier = await this.suppliersService.findOne(id);
        return {
            success: true,
            data: supplier,
        };
    }

    @Patch(':id')
    @Roles('ADMIN')
    async update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
        const supplier = await this.suppliersService.update(id, updateSupplierDto);
        return {
            success: true,
            data: supplier,
            message: 'Proveedor actualizado exitosamente',
        };
    }

    @Delete(':id')
    @Roles('ADMIN')
    async remove(@Param('id') id: string) {
        await this.suppliersService.remove(id);
        return {
            success: true,
            message: 'Proveedor eliminado exitosamente',
        };
    }
}
