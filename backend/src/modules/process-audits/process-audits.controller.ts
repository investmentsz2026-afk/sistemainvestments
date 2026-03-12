import { Controller, Get, Post, Body, Param, Query, Patch, UseGuards, Req } from '@nestjs/common';
import { ProcessAuditsService } from './process-audits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('process-audits')
@UseGuards(JwtAuthGuard)
export class ProcessAuditsController {
    constructor(private readonly service: ProcessAuditsService) { }

    @Post()
    async create(@Req() req: any, @Body() body: any) {
        return this.service.createAudit(req.user.id, body);
    }

    @Get()
    async findAll(@Query() query: any) {
        return this.service.findAll(query);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id/approval')
    async updateApproval(@Param('id') id: string, @Body('status') status: string) {
        return this.service.updateApprovalStatus(id, status);
    }

    @Patch('corrective-action/:id/status')
    async updateCorrectiveAction(@Param('id') id: string, @Body('status') status: string) {
        return this.service.updateCorrectiveAction(id, status);
    }
}
