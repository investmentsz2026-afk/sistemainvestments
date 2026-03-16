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

    @Get('auditable-items')
    async getAuditableItems() {
        return this.service.getAuditableItems();
    }

    @Get('finalized-audits')
    async getFinalizedAudits() {
        return this.service.getFinalizedAudits();
    }

    @Get()
    async findAll(@Query() query: any) {
        return this.service.findAll(query);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id/progress')
    async updateProgress(@Param('id') id: string, @Body() body: any) {
        return this.service.updateProgress(id, body);
    }

    @Patch(':id/finalize')
    async finalizeAudit(@Param('id') id: string, @Body() body: any) {
        return this.service.finalizeAudit(id, body);
    }

    @Patch(':id/approval')
    async updateApproval(@Param('id') id: string, @Body('status') status: string) {
        return this.service.updateApprovalStatus(id, status);
    }

    @Patch(':id/admin-review')
    async adminReview(@Req() req: any, @Param('id') id: string, @Body() body: any) {
        return this.service.adminReview(id, req.user.id, body);
    }

    @Patch(':id/logistics-receive')
    async logisticsReceive(@Param('id') id: string) {
        return this.service.logisticsConfirm(id);
    }

    @Patch('corrective-action/:id/status')
    async updateCorrectiveAction(@Param('id') id: string, @Body('status') status: string) {
        return this.service.updateCorrectiveAction(id, status);
    }
}
