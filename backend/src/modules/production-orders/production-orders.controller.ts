import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';
import { CreateProductionOrderDto } from './dto/production-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('production-orders')
@UseGuards(JwtAuthGuard)
export class ProductionOrdersController {
  constructor(private readonly productionOrdersService: ProductionOrdersService) {}

  @Post()
  create(@Body() createProductionOrderDto: CreateProductionOrderDto) {
    return this.productionOrdersService.create(createProductionOrderDto);
  }

  @Get()
  findAll() {
    return this.productionOrdersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionOrdersService.findOne(id);
  }
}
