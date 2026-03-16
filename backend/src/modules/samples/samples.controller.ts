import { Controller, Get, Post, Body, Param, Put, Patch, UseGuards, Req } from '@nestjs/common';
import { SamplesService } from './samples.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('samples')
@UseGuards(JwtAuthGuard)
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.samplesService.create(req.user.id, data);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.samplesService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.samplesService.findOne(id);
  }

  @Put(':id/review')
  updateReview(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.samplesService.updateReview(id, req.user.id, data);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.samplesService.update(id, req.user.id, data);
  }

  @Patch(':id/admin-approve-materials')
  adminApproveMaterials(@Param('id') id: string, @Body() body: any) {
    return this.samplesService.adminApproveMaterials(id, body.notes);
  }

  @Patch(':id/logistics-deliver-materials')
  logisticsDeliverMaterials(@Param('id') id: string) {
    return this.samplesService.logisticsDeliverMaterials(id);
  }

  @Patch(':id/udp-confirm-materials')
  udpConfirmMaterials(@Param('id') id: string) {
    return this.samplesService.udpConfirmMaterials(id);
  }

  @Patch(':id/udp-complete-development')
  udpCompleteDevelopment(@Param('id') id: string) {
    return this.samplesService.udpCompleteDevelopment(id);
  }
}
