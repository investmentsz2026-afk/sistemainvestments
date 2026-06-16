import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req, Delete } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('debug')
  async debugData() {
    return this.salesService.debugData();
  }

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

  @Get('payments/pending')
  getPendingPayments() {
    return this.salesService.getPendingPayments();
  }

  @Post('payments/:paymentId/approve')
  approvePayment(@Param('paymentId') paymentId: string) {
    return this.salesService.approvePayment(paymentId);
  }

  @Post('payments/:paymentId/reject')
  rejectPayment(@Param('paymentId') paymentId: string) {
    return this.salesService.rejectPayment(paymentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Delete(':id')
  annul(@Param('id') id: string, @Req() req: any, @Query('revertDispatch') revertDispatch?: string) {
    return this.salesService.annulSale(id, req.user, revertDispatch === 'true');
  }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.salesService.addPayment(id, data, req.user);
  }

  @Patch(':id/finalize')
  finalizePayment(@Param('id') id: string, @Req() req: any) {
    return this.salesService.finalizePayment(id, req.user);
  }

  @Get('clients/lookup/:docType/:docNum')
  lookup(@Param('docType') docType: string, @Param('docNum') docNum: string) {
    return this.salesService.lookupDocument(docType, docNum);
  }

  @Post(':id/sunat')
  sendToSunat(@Param('id') id: string) {
    return this.salesService.sendToSunat(id);
  }

  @Patch(':id/referral-guide')
  updateReferralGuide(@Param('id') id: string, @Body() data: { referralGuide: string }) {
    return this.salesService.updateReferralGuide(id, data.referralGuide);
  }

  @Patch(':id/cargo')
  updateCargoUrl(@Param('id') id: string, @Body() data: { cargoUrl: string }) {
    return this.salesService.updateCargoUrl(id, data.cargoUrl);
  }

  @Patch(':id/invoice-number')
  updateInvoiceNumber(@Param('id') id: string, @Body() data: { invoiceNumber: string }) {
    return this.salesService.updateInvoiceNumber(id, data.invoiceNumber);
  }

  @Post(':id/generate-gre')
  generateGre(@Param('id') id: string, @Body() greData: any) {
    return this.salesService.sendGreToSunat(id, greData);
  }

  @Post(':id/consultar-guia')
  consultarGuia(@Param('id') id: string) {
    return this.salesService.consultarGuia(id);
  }
}
