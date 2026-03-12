import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { QualityService } from './quality.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('quality')
@UseGuards(JwtAuthGuard)
export class QualityController {
    constructor(private readonly qualityService: QualityService) { }

    @Get('pending')
    async getPendingItems() {
        return this.qualityService.getPendingItems();
    }

    @Get('processed')
    async getProcessedItems() {
        return this.qualityService.getProcessedItems();
    }

    @Post('acknowledge/:itemId')
    async acknowledgeItem(@Param('itemId') itemId: string) {
        return this.qualityService.acknowledgeItem(itemId);
    }

    @Post('process/:itemId')
    async processItem(
        @Req() req: any,
        @Param('itemId') itemId: string,
        @Body() data: {
            status: 'RECIBIDO' | 'RECHAZADO';
            observations?: string;
            rejectionReason?: string;
        },
    ) {
        return this.qualityService.processItem(req.user.id, itemId, data);
    }
}
