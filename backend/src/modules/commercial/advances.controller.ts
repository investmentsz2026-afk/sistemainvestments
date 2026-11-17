import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AdvancesService } from './advances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('commercial/advances')
@UseGuards(JwtAuthGuard)
export class AdvancesController {
  constructor(private readonly advancesService: AdvancesService) {}

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.advancesService.create(req.user.id, data);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.advancesService.findAll(req.user, query);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.advancesService.getStats(req.user);
  }

  @Get('client/:clientId/available')
  getAvailableForClient(@Param('clientId') clientId: string) {
    return this.advancesService.getAvailableForClient(clientId);
  }

  @Get('sale-credit-info/:saleId')
  getSaleCreditInfo(@Param('saleId') saleId: string) {
    return this.advancesService.getSaleCreditInfo(saleId);
  }

  @Post('convert-from-sale-credit')
  convertFromSaleCredit(@Req() req: any, @Body() data: any) {
    return this.advancesService.convertFromSaleCredit(req.user.id, data);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.advancesService.findOne(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.advancesService.delete(id);
  }
}
