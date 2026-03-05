import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MovementFiltersDto } from './dto/movement.dto';

@Injectable()
export class MovementsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: MovementFiltersDto) {
    const where: any = {};

    if (filters.productId) {
      where.variant = { productId: filters.productId };
    }
    if (filters.variantId) {
      where.variantId = filters.variantId;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.movement.findMany({
      where,
      include: {
        variant: {
          include: { product: true },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.movement.findMany({
      where: { variant: { productId } },
      include: {
        variant: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByVariant(variantId: string) {
    return this.prisma.movement.findMany({
      where: { variantId },
      include: {
        variant: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getKardex(variantId: string) {
    // simple alias for now; could compute running balance if needed
    return this.findByVariant(variantId);
  }
}
