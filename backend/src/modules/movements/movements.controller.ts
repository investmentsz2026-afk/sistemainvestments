// backend/src/modules/movements/movements.controller.ts
import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { MovementFiltersDto } from './dto/movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('movements')
@UseGuards(JwtAuthGuard)
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Get()
  async findAll(@Query() filters: MovementFiltersDto) {
    return this.movementsService.findAll(filters);
  }

  @Get('product/:productId')
  async findByProduct(@Param('productId') productId: string) {
    return this.movementsService.findByProduct(productId);
  }

  @Get('variant/:variantId')
  async findByVariant(@Param('variantId') variantId: string) {
    return this.movementsService.findByVariant(variantId);
  }

  @Get('kardex/:variantId')
  async getKardex(@Param('variantId') variantId: string) {
    return this.movementsService.getKardex(variantId);
  }
}