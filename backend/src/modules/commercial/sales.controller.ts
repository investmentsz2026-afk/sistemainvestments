import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
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
  findAll(@Req() req: any, @Query() query: any) {
    return this.salesService.findAll(req.user, query);
  }

  @Get('clients')
  findAllClients(@Req() req: any) {
    return this.salesService.findAllClients(req.user);
  }

  @Post('clients')
  createClient(@Req() req: any, @Body() data: any) {
    return this.salesService.createClient(req.user, data);
  }

  @Patch('clients/:id')
  updateClient(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.salesService.updateClient(req.user, id, data);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() data: any) {
    return this.salesService.addPayment(id, data);
  }

  @Patch(':id/finalize')
  finalizePayment(@Param('id') id: string) {
    return this.salesService.finalizePayment(id);
  }
}
