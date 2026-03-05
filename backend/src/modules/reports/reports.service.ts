// backend/src/modules/reports/reports.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DateRangeDto } from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) { }

  private buildWhereClause(filters: DateRangeDto) {
    const where: any = {
      product: {
        isActive: true
      }
    };

    // Date range filter for products/variants
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        // Compensate for Peru timezone (UTC-5)
        start.setUTCHours(5, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        // Set to end of day in Peru
        end.setUTCDate(end.getUTCDate() + 1);
        end.setUTCHours(4, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (filters.category && filters.category !== 'todas') {
      where.product.category = filters.category;
    }
    if (filters.productId && filters.productId !== 'todos') {
      where.product.id = filters.productId;
    }
    if (filters.inventoryType && filters.inventoryType !== 'TODOS') {
      where.product.inventoryType = {
        equals: filters.inventoryType,
        mode: 'insensitive'
      };
    }

    return where;
  }

  async getCurrentStock(filters: DateRangeDto) {
    const where = this.buildWhereClause(filters);

    const variants = await this.prisma.productVariant.findMany({
      where,
      include: {
        product: true
      },
      orderBy: [
        { product: { name: 'asc' } },
        { size: 'asc' },
        { color: 'asc' }
      ]
    });

    return variants.map(variant => ({
      productId: variant.product.id,
      productName: variant.product.name,
      sku: variant.product.sku,
      category: variant.product.category,
      inventoryType: variant.product.inventoryType,
      variantSku: variant.variantSku,
      size: variant.size,
      color: variant.color,
      stock: variant.stock,
      purchasePrice: variant.product.purchasePrice,
      sellingPrice: variant.product.sellingPrice,
      totalValue: variant.stock * variant.product.purchasePrice,
      createdAt: variant.createdAt
    }));
  }

  async getValuedStock(filters: DateRangeDto) {
    const baseWhere = this.buildWhereClause(filters);
    const where = {
      ...baseWhere,
      stock: {
        gt: 0
      }
    };

    const variants = await this.prisma.productVariant.findMany({
      where,
      include: {
        product: true
      }
    });

    const totalValue = variants.reduce(
      (sum, variant) => sum + (variant.stock * variant.product.purchasePrice),
      0
    );

    const totalSalesValue = variants.reduce(
      (sum, variant) => sum + (variant.stock * variant.product.sellingPrice),
      0
    );

    return {
      totalProducts: variants.length,
      totalItems: variants.reduce((sum, v) => sum + v.stock, 0),
      totalPurchaseValue: totalValue,
      totalSalesValue: totalSalesValue,
      potentialProfit: totalSalesValue - totalValue,
      details: variants.map(variant => ({
        productId: variant.product.id,
        product: variant.product.name,
        category: variant.product.category,
        inventoryType: variant.product.inventoryType,
        variant: `${variant.size} - ${variant.color}`,
        quantity: variant.stock,
        purchaseValue: variant.stock * variant.product.purchasePrice,
        salesValue: variant.stock * variant.product.sellingPrice
      }))
    };
  }

  async getMovementsByDateRange(dateRange: DateRangeDto) {
    const where: any = {};

    // Date range filter for movements
    if (dateRange.startDate || dateRange.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) {
        const start = new Date(dateRange.startDate);
        start.setUTCHours(5, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (dateRange.endDate) {
        const end = new Date(dateRange.endDate);
        end.setUTCDate(end.getUTCDate() + 1);
        end.setUTCHours(4, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Advanced filters
    if (dateRange.category || dateRange.productId || dateRange.inventoryType) {
      where.variant = {
        product: {}
      };

      if (dateRange.category && dateRange.category !== 'todas') {
        where.variant.product.category = dateRange.category;
      }
      if (dateRange.productId && dateRange.productId !== 'todos') {
        where.variant.product.id = dateRange.productId;
      }
      if (dateRange.inventoryType && dateRange.inventoryType !== 'TODOS') {
        where.variant.product.inventoryType = {
          equals: dateRange.inventoryType,
          mode: 'insensitive'
        };
      }
    }

    const movements = await this.prisma.movement.findMany({
      where,
      include: {
        variant: {
          include: {
            product: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const summary = {
      totalMovements: movements.length,
      totalEntries: movements.filter(m => m.type === 'ENTRY').length,
      totalExits: movements.filter(m => m.type === 'EXIT').length,
      totalQuantity: movements.reduce((sum, m) => sum + m.quantity, 0),
      byReason: this.groupByReason(movements),
      movements
    };

    return summary;
  }

  private groupByReason(movements: any[]) {
    const grouped = {};
    movements.forEach(m => {
      if (!grouped[m.reason]) {
        grouped[m.reason] = {
          count: 0,
          quantity: 0
        };
      }
      grouped[m.reason].count++;
      grouped[m.reason].quantity += m.quantity;
    });
    return grouped;
  }
}