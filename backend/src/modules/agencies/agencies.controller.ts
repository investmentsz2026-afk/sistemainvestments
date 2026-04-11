import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto, UpdateAgencyDto } from './dto/agency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('agencies')
@UseGuards(JwtAuthGuard)
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Post()
  async create(@Req() req: any, @Body() createAgencyDto: CreateAgencyDto) {
    const data = await this.agenciesService.create(createAgencyDto, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: any, @Query('zone') zone?: string) {
    const data = await this.agenciesService.findAll(req.user, zone);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.agenciesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateAgencyDto: UpdateAgencyDto) {
    const data = await this.agenciesService.update(id, updateAgencyDto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.agenciesService.remove(id);
    return { success: true };
  }
}
