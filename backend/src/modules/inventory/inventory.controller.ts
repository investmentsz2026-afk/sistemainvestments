// backend/src/modules/inventory/inventory.controller.ts
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
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
}