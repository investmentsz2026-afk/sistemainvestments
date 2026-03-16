import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { title: string; message: string; type: string; referenceId?: string; targetRole?: string; userId?: string }) {
    return (this.prisma as any).notification.create({
      data,
    });
  }

  async findAll(user?: any) {
    const where: any = {};
    if (user) {
      where.OR = [
        { targetRole: user.role },
        { userId: user.id },
        { targetRole: null, userId: null } // Public notifications
      ];
    }
    return (this.prisma as any).notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async markAsRead(id: string) {
    return (this.prisma as any).notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async getUnreadCount(user?: any) {
    const where: any = { isRead: false };
    if (user) {
      where.OR = [
        { targetRole: user.role },
        { userId: user.id },
        { targetRole: null, userId: null }
      ];
    }
    return (this.prisma as any).notification.count({
      where,
    });
  }
}
