import { Controller, Post, Get, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { RegisterMovementDto, RegisterBulkMovementDto, ScanMovementDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movements')
  registerMovement(
    @Request() req,
    @Body() registerMovementDto: RegisterMovementDto,
  ) {
    return this.inventoryService.registerMovement(req.user.id, registerMovementDto);
  }

  @Post('movements/bulk')
  registerBulkMovements(
    @Request() req,
    @Body() registerBulkMovementDto: RegisterBulkMovementDto,
  ) {
    return this.inventoryService.registerBulkMovements(req.user.id, registerBulkMovementDto);
  }

  @Post('scan')
  scanAndRegister(
    @Request() req,
    @Body() scanMovementDto: ScanMovementDto,
  ) {
    return this.inventoryService.scanAndRegister(
      req.user.id,
      scanMovementDto.variantSku,
      scanMovementDto.quantity,
      scanMovementDto.reason
    );
  }

  @Post('exchange')
  registerExchange(
    @Request() req,
    @Body() exchangeData: any,
  ) {
    return this.inventoryService.registerExchange(req.user.id, exchangeData);
  }

  // ==========================================
  // CONTEO Y AUDITORÍA FÍSICA DE INVENTARIO
  // ==========================================

  @Get('audits/active')
  getActiveAudit(
    @Query('period') period: string,
    @Query('type') type: string,
  ) {
    return this.inventoryService.getActiveAudit(period, type);
  }

  @Post('audits/save')
  saveAuditProgress(
    @Request() req,
    @Body() data: any,
  ) {
    return this.inventoryService.saveAuditProgress(req.user.id, data);
  }

  @Post('audits/:id/finalize')
  finalizeAudit(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { applyStockAdjustment: boolean; notes?: string },
  ) {
    return this.inventoryService.finalizeAudit(
      req.user.id,
      id,
      body?.applyStockAdjustment,
      body?.notes
    );
  }

  @Get('audits/history')
  getAuditsHistory(
    @Query('period') period?: string,
    @Query('type') type?: string,
  ) {
    return this.inventoryService.getAuditsHistory(period, type);
  }

  @Get('audits/:id')
  getAuditDetails(@Param('id') id: string) {
    return this.inventoryService.getAuditDetails(id);
  }
}