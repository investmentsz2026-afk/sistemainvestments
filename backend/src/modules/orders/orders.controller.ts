import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.ordersService.create(req.user, data);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.ordersService.findAll(req.user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.ordersService.update(id, req.user, data);
  }

  @Patch(':id/send-to-logistics')
  sendToLogistics(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.sendToLogistics(id, req.user);
  }

  @Patch(':id/dispatch')
  dispatch(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.ordersService.dispatch(id, req.user, data);
  }

  @Patch(':id/complete')
  completeOrder(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.ordersService.completeOrder(id, req.user, data);
  }
}
