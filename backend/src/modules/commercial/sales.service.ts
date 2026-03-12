import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async createSale(userId: string, data: any) {
    const { clientId, items, paymentMethod, notes, invoiceNumber } = data;

    if (!items || items.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un producto');
    }

    return await this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;

      // 1. Validate stock and calculate total
      for (const item of items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });

        if (!variant) {
          throw new NotFoundException(`Variante de producto no encontrada: ${item.variantId}`);
        }

        if (variant.stock < item.quantity) {
          throw new BadRequestException(`Stock insuficiente para ${variant.product.name} (${variant.size}/${variant.color}). Disponible: ${variant.stock}`);
        }

        const itemTotal = item.quantity * (item.unitPrice || variant.product.sellingPrice);
        totalAmount += itemTotal;
      }

      // 2. Create Sale
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          clientId,
          paymentMethod,
          totalAmount,
          notes,
          sellerId: userId,
          items: {
            create: items.map((item: any) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 3. Update stock and create movements
      for (const item of items) {
        const variant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        await tx.movement.create({
          data: {
            type: 'EXIT',
            quantity: item.quantity,
            reason: `VENTA - Ref: ${sale.id}`,
            reference: sale.invoiceNumber || sale.id,
            previousStock: variant.stock + item.quantity,
            newStock: variant.stock,
            variantId: item.variantId,
            userId: userId,
          },
        });
      }

      return sale;
    });
  }

  async findAll(query: any) {
    const { startDate, endDate, clientId, sellerId, status } = query;
    const where: any = {};

    if (clientId) where.clientId = clientId;
    if (sellerId) where.sellerId = sellerId;
    if (status) where.status = status;

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return this.prisma.sale.findMany({
      where,
      include: {
        client: true,
        seller: { select: { name: true } },
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        client: true,
        seller: { select: { name: true } },
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  // Clients
  async createClient(data: any) {
    return this.prisma.client.create({ data });
  }

  async findAllClients() {
    return this.prisma.client.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
