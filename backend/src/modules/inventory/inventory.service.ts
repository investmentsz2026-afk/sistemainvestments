// backend/src/modules/inventory/inventory.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  RegisterMovementDto,
  RegisterBulkMovementDto,
  MovementType,
} from './dto/inventory.dto';


@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async registerMovement(
    userId: string,
    registerMovementDto: RegisterMovementDto,
  ) {
    const { variantId, type, quantity, reason, reference } =
      registerMovementDto;

    return this.prisma.$transaction(async (prisma) => {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });

      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }

      const previousStock = variant.stock;
      let newStock: number;

      if (type === 'ENTRY') {
        newStock = previousStock + quantity;
      } else {
        if (previousStock < quantity) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${previousStock}, Requested: ${quantity}`,
          );
        }
        newStock = previousStock - quantity;
      }

      await prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      });

      const movement = await prisma.movement.create({
        data: {
          type,
          quantity,
          reason,
          reference,
          previousStock,
          newStock,
          variantId,
          userId,
        },
        include: {
          variant: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return movement;
    });
  }

  async registerBulkMovements(
    userId: string,
    registerBulkMovementDto: RegisterBulkMovementDto,
  ) {
    const { items, reason, reference } = registerBulkMovementDto;

    return this.prisma.$transaction(async (prisma) => {
      // 🔥 SOLUCIÓN AL ERROR never[]
      const movements: any[] = [];

      for (const item of items) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });

        if (!variant) {
          throw new NotFoundException(
            `Variant ${item.variantId} not found`,
          );
        }

        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${variant.product.name} - ${variant.size} ${variant.color}. ` +
              `Available: ${variant.stock}, Requested: ${item.quantity}`,
          );
        }

        const previousStock = variant.stock;
        const newStock = previousStock - item.quantity;

        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock },
        });

        const movement = await prisma.movement.create({
          data: {
            // 🔥 SOLUCIÓN AL ERROR "EXIT"
            type: 'EXIT',
            quantity: item.quantity,
            reason,
            reference,
            previousStock,
            newStock,
            variantId: item.variantId,
            userId,
          },
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        });

        movements.push(movement);
      }

      return movements;
    });
  }

  async scanAndRegister(
    userId: string,
    variantSku: string,
    quantity: number,
    reason: string,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { variantSku },
      include: { product: true },
    });

    if (!variant) {
      throw new NotFoundException(
        'Product not found with this barcode',
      );
    }

    return this.registerMovement(userId, {
      variantId: variant.id,
      type: MovementType.EXIT,
      quantity,
      reason,
      reference: 'SCAN',
    });
  }
}