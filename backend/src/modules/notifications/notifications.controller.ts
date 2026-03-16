import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.service.findAll(req.user);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    return { count: await this.service.getUnreadCount(req.user) };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(id);
  }
}
