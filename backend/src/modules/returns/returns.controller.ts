import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('returns')
@UseGuards(JwtAuthGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.returnsService.create(req.user, data);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.returnsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.returnsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.returnsService.update(id, req.user, data);
  }

  @Post(':id/comercial-review')
  comercialReview(@Param('id') id: string, @Req() req: any, @Body() body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) {
    return this.returnsService.comercialReview(id, req.user, body);
  }

  @Post(':id/admin-review')
  adminReview(@Param('id') id: string, @Req() req: any, @Body() body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) {
    return this.returnsService.adminReview(id, req.user, body);
  }

  @Post(':id/udp-review')
  udpReview(@Param('id') id: string, @Req() req: any, @Body() body: { action: 'APPROVE' | 'REJECT'; observations: string; rejectionReason?: string }) {
    return this.returnsService.udpReview(id, req.user, body);
  }

  @Post(':id/logistics-receive')
  logisticsReceive(@Param('id') id: string, @Req() req: any) {
    return this.returnsService.logisticsReceive(id, req.user);
  }
}
