// backend/src/modules/purchases/purchases.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
    constructor(private readonly purchasesService: PurchasesService) { }

    @Post()
    @Roles('LOGISTICA', 'ADMIN')
    async create(@Request() req, @Body() dto: CreatePurchaseDto) {
        try {
            const result = await this.purchasesService.create(req.user.id, dto);
            return { success: true, message: 'Compra registrada exitosamente', data: result };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    @Get()
    @Roles('LOGISTICA', 'ADMIN', 'CONTABILIDAD')
    async findAll() {
        try {
            const result = await this.purchasesService.findAll();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    @Get(':id')
    @Roles('LOGISTICA', 'ADMIN', 'CONTABILIDAD')
    async findOne(@Param('id') id: string) {
        try {
            const result = await this.purchasesService.findOne(id);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    @Put(':id')
    @Roles('LOGISTICA', 'ADMIN')
    async update(@Param('id') id: string, @Body() dto: CreatePurchaseDto) {
        try {
            const result = await this.purchasesService.update(id, dto);
            return { success: true, message: 'Compra actualizada exitosamente', data: result };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    @Delete(':id')
    @Roles('LOGISTICA', 'ADMIN')
    async remove(@Param('id') id: string) {
        try {
            await this.purchasesService.remove(id);
            return { success: true, message: 'Compra eliminada exitosamente' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}
