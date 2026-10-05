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
    const { items, type, reason, reference } = registerBulkMovementDto;

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

        const previousStock = variant.stock;
        let newStock: number;

        if (type === 'ENTRY') {
          newStock = previousStock + item.quantity;
        } else {
          if (previousStock < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for ${variant.product.name} - ${variant.size} ${variant.color}. ` +
                `Available: ${previousStock}, Requested: ${item.quantity}`,
            );
          }
          newStock = previousStock - item.quantity;
        }

        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock },
        });

        const movement = await prisma.movement.create({
          data: {
            type,
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

  async registerExchange(userId: string, data: any) {
    const { saleId, invoiceNumber, clientName, clientDocument, outItems, inItems, notes } = data;

    if (!outItems || !Array.isArray(outItems) || outItems.length === 0) {
      throw new BadRequestException('Debe haber al menos un producto que sale de almacén.');
    }
    if (!inItems || !Array.isArray(inItems) || inItems.length === 0) {
      throw new BadRequestException('Debe haber al menos un producto que ingresa a almacén.');
    }

    const exchangeId = `CHG-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (prisma) => {
      // 1. Process Outgoing Items (EXIT)
      const exitMovements: any[] = [];
      for (const item of outItems) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });

        if (!variant) {
          throw new NotFoundException(`Variante a entregar (${item.variantId}) no encontrada`);
        }

        const previousStock = variant.stock;
        if (previousStock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${variant.product.name} - Talla ${variant.size} Color ${variant.color}. Disponible: ${previousStock}, Solicitado: ${item.quantity}`
          );
        }

        const newStock = previousStock - item.quantity;
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock },
        });

        const referenceData = {
          isExchange: true,
          exchangeId,
          role: 'EXIT',
          saleId: saleId || null,
          invoiceNumber: invoiceNumber || 'S/N',
          clientName: clientName || 'Cliente',
          clientDocument: clientDocument || '',
          notes: notes || 'Cambio de producto',
          outItems,
          inItems,
          createdAt: new Date().toISOString(),
        };

        const movement = await prisma.movement.create({
          data: {
            type: 'EXIT',
            quantity: item.quantity,
            reason: 'Cambio',
            reference: JSON.stringify(referenceData),
            previousStock,
            newStock,
            variantId: item.variantId,
            userId,
          },
          include: {
            variant: { include: { product: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        });
        exitMovements.push(movement);
      }

      // 2. Process Incoming Items (ENTRY)
      const entryMovements: any[] = [];
      for (const item of inItems) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });

        if (!variant) {
          throw new NotFoundException(`Variante a recibir (${item.variantId}) no encontrada`);
        }

        const previousStock = variant.stock;
        const newStock = previousStock + item.quantity;

        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock },
        });

        const referenceData = {
          isExchange: true,
          exchangeId,
          role: 'ENTRY',
          saleId: saleId || null,
          invoiceNumber: invoiceNumber || 'S/N',
          clientName: clientName || 'Cliente',
          clientDocument: clientDocument || '',
          notes: notes || 'Cambio de producto',
          outItems,
          inItems,
          createdAt: new Date().toISOString(),
        };

        const movement = await prisma.movement.create({
          data: {
            type: 'ENTRY',
            quantity: item.quantity,
            reason: 'Cambio',
            reference: JSON.stringify(referenceData),
            previousStock,
            newStock,
            variantId: item.variantId,
            userId,
          },
          include: {
            variant: { include: { product: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        });
        entryMovements.push(movement);
      }

      return {
        success: true,
        exchangeId,
        invoiceNumber: invoiceNumber || 'S/N',
        clientName: clientName || 'Cliente',
        clientDocument: clientDocument || '',
        notes: notes || 'Cambio de producto',
        date: new Date().toISOString(),
        outItems,
        inItems,
        movements: [...exitMovements, ...entryMovements],
      };
    });
  }
}