import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.salesService.createSale(req.user.id, data);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.salesService.findAll(query);
  }

  @Get('clients')
  findAllClients() {
    return this.salesService.findAllClients();
  }

  @Post('clients')
  createClient(@Body() data: any) {
    return this.salesService.createClient(data);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
