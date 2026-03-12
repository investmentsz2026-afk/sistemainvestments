import { Controller, Get, Post, Body, Param, Put, UseGuards, Req } from '@nestjs/common';
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
  findAll() {
    return this.samplesService.findAll();
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
}
