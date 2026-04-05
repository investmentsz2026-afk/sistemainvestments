import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  async create(user: any, data: any) {
    const { clientId, condition, agency, observations, items, orderNumber, createdAt } = data;

    if (!items || items.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un modelo');
    }

    // Sanitize and calculate
    const sanitizedItems = items.map((item: any) => {
      const quantity = [
        's28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46'
      ].reduce((acc, field) => acc + (parseInt(item[field]) || 0), 0);

      const unitPrice = parseFloat(item.unitPrice) || 0;
      const totalPrice = quantity * unitPrice;

      return {
        modelName: item.modelName,
        color: item.color,
        s28: parseInt(item.s28) || 0,
        m30: parseInt(item.m30) || 0,
        l32: parseInt(item.l32) || 0,
        xl34: parseInt(item.xl34) || 0,
        xxl36: parseInt(item.xxl36) || 0,
        size38: parseInt(item.size38) || 0,
        size40: parseInt(item.size40) || 0,
        size42: parseInt(item.size42) || 0,
        size44: parseInt(item.size44) || 0,
        size46: parseInt(item.size46) || 0,
        quantity,
        unitPrice,
        totalPrice,
      };
    });

    const totalQuantity = sanitizedItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
    const totalAmount = sanitizedItems.reduce((acc: number, item: any) => acc + item.totalPrice, 0);

    // Determine zone fallback
    const actualZone = user.zone || (
      user.role === 'VENDEDOR_LIMA' ? 'LIMA' : 
      user.role === 'VENDEDOR_ORIENTE' ? 'ORIENTE' : 'OFICINA'
    );

    const order = await (this.prisma as any).order.create({
      data: {
        orderNumber, 
        clientId,
        condition,
        agency,
        observations,
        totalAmount,
        totalQuantity,
        sellerId: user.id,
        zone: actualZone,
        status: 'PENDIENTE',
        createdAt: createdAt ? new Date(createdAt) : undefined,
        items: {
          create: sanitizedItems,
        },
      },
      include: {
        items: true,
        client: true,
        seller: { select: { name: true, zone: true } },
      },
    });

    // Notify COMERCIAL
    await this.notifications.create({
      title: 'Nuevo Pedido Registrado',
      message: `El vendedor ${user.name} (${actualZone}) ha registrado la Nota de Pedido #${order.orderNumber || order.id.slice(-6)} para ${order.client?.name}`,
      type: 'NEW_ORDER_REGISTERED',
      targetRole: 'COMERCIAL',
      referenceId: order.id
    });

    return order;
  }

  async findAll(user: any, query: any) {
    const { status, zone } = query;
    const where: any = {};

    if (status) where.status = status;
    
    // Zonal filtering for vendors
    if (user.role === 'VENDEDOR_LIMA') where.zone = 'LIMA';
    else if (user.role === 'VENDEDOR_ORIENTE') where.zone = 'ORIENTE';
    else if (zone) where.zone = zone; // Commercial/Admin filter

    return (this.prisma as any).order.findMany({
      where,
      include: {
        client: true,
        seller: { select: { name: true, zone: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await (this.prisma as any).order.findUnique({
      where: { id },
      include: {
        client: true,
        seller: { select: { name: true, zone: true } },
        items: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async update(id: string, user: any, data: any) {
    const order = await this.findOne(id);
    
    if (order.status !== 'PENDIENTE' && user.role !== 'ADMIN') {
      throw new BadRequestException('No se puede editar un pedido que ya está en logística o completado.');
    }

    const { clientId, condition, agency, observations, items, orderNumber, createdAt } = data;

    // Sanitize items
    const sanitizedItems = items.map((item: any) => {
      const quantity = [
        's28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46'
      ].reduce((acc, field) => acc + (parseInt(item[field]) || 0), 0);

      const unitPrice = parseFloat(item.unitPrice) || 0;
      const totalPrice = quantity * unitPrice;

      return {
        modelName: item.modelName,
        color: item.color,
        s28: parseInt(item.s28) || 0,
        m30: parseInt(item.m30) || 0,
        l32: parseInt(item.l32) || 0,
        xl34: parseInt(item.xl34) || 0,
        xxl36: parseInt(item.xxl36) || 0,
        size38: parseInt(item.size38) || 0,
        size40: parseInt(item.size40) || 0,
        size42: parseInt(item.size42) || 0,
        size44: parseInt(item.size44) || 0,
        size46: parseInt(item.size46) || 0,
        quantity,
        unitPrice,
        totalPrice,
      };
    });

    const totalQuantity = sanitizedItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
    const totalAmount = sanitizedItems.reduce((acc: number, item: any) => acc + item.totalPrice, 0);

    const updated = await (this.prisma as any).order.update({
      where: { id },
      data: {
        orderNumber,
        clientId,
        condition,
        agency,
        observations,
        totalAmount,
        totalQuantity,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        items: {
          deleteMany: {}, // Simplest update strategy: replace all items
          create: sanitizedItems,
        },
      },
      include: {
        client: true,
        seller: { select: { name: true, zone: true } },
      },
    });

    // Notify COMERCIAL if edited by vendor
    if (user.role.startsWith('VENDEDOR')) {
      await this.notifications.create({
        title: 'Pedido Editado por Vendedor',
        message: `El vendedor ${user.name} (${order.zone}) ha editado el pedido #${order.orderNumber || order.id.slice(-6)}`,
        type: 'ORDER_EDITED_BY_SELLER',
        targetRole: 'COMERCIAL',
        referenceId: updated.id
      });
    }

    return updated;
  }

  async dispatch(id: string, user: any, data: { items: any[], dispatchedItems: any[] }) {
    const order = await this.findOne(id);
    
    if (order.status !== 'EN_LOGISTICA' && user.role !== 'ADMIN') {
      throw new BadRequestException('El pedido no está en fase de despacho.');
    }

    const { items, dispatchedItems } = data;

    // Process each item to deduct inventory
    for (const item of (items || [])) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: true }
      });

      if (!variant) continue;

      const previousStock = variant.stock;
      const newStock = previousStock - item.quantity;

      // Update variant stock
      await this.prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: newStock }
      });

      // Create movement
      await this.prisma.movement.create({
        data: {
          type: 'EXIT',
          quantity: item.quantity,
          reason: `Despacho de Pedido #${order.orderNumber || order.id.slice(-6)}`,
          reference: order.id,
          previousStock,
          newStock,
          variantId: variant.id,
          userId: user.id
        }
      });
    }

    // Update each OrderItem with the actual dispatched quantities
    if (dispatchedItems && dispatchedItems.length > 0) {
      for (const di of dispatchedItems) {
        const totalQty = (di.s28 || 0) + (di.m30 || 0) + (di.l32 || 0) + (di.xl34 || 0) + 
                          (di.xxl36 || 0) + (di.size38 || 0) + (di.size40 || 0) + 
                          (di.size42 || 0) + (di.size44 || 0) + (di.size46 || 0);
        const totalPrice = totalQty * (di.unitPrice || 0);

        await (this.prisma as any).orderItem.update({
          where: { id: di.orderItemId },
          data: {
            s28: di.s28 || 0,
            m30: di.m30 || 0,
            l32: di.l32 || 0,
            xl34: di.xl34 || 0,
            xxl36: di.xxl36 || 0,
            size38: di.size38 || 0,
            size40: di.size40 || 0,
            size42: di.size42 || 0,
            size44: di.size44 || 0,
            size46: di.size46 || 0,
            quantity: totalQty,
            totalPrice,
          }
        });
      }

      // Recalculate order totals
      const updatedItems = await (this.prisma as any).orderItem.findMany({
        where: { orderId: id }
      });
      const newTotalQuantity = updatedItems.reduce((acc: number, it: any) => acc + it.quantity, 0);
      const newTotalAmount = updatedItems.reduce((acc: number, it: any) => acc + it.totalPrice, 0);

      await (this.prisma as any).order.update({
        where: { id },
        data: { 
          status: 'DESPACHADO',
          totalQuantity: newTotalQuantity,
          totalAmount: newTotalAmount,
        }
      });
    } else {
      // No dispatched item details — just update status
      await (this.prisma as any).order.update({
        where: { id },
        data: { status: 'DESPACHADO' }
      });
    }

    // Notify Comercial
    await this.notifications.create({
      title: 'Pedido Despachado',
      message: `El pedido #${order.orderNumber || order.id.slice(-6)} ha sido despachado por Logística y ya está en camino.`,
      type: 'SUCCESS',
      targetRole: 'COMERCIAL',
      referenceId: order.id
    });

    return await this.findOne(id);
  }

  async sendToLogistics(id: string, user: any) {
    const order = await this.findOne(id);
    
    if (order.status !== 'PENDIENTE') {
      throw new BadRequestException('Solo los pedidos pendientes pueden enviarse a logística.');
    }

    const updated = await (this.prisma as any).order.update({
      where: { id },
      data: { 
        status: 'EN_LOGISTICA',
      },
    });

    // Notify LOGISTICA
    await this.notifications.create({
      title: 'Pedido Enviado a Logística',
      message: `El pedido #${order.orderNumber || order.id.slice(-6)} ha sido aprobado por comercial y está listo para ser despachado.`,
      type: 'ORDER_SENT_TO_LOGISTICS',
      targetRole: 'LOGISTICA',
      referenceId: order.id
    });

    return updated;
  }

  async completeOrder(id: string, user: any, data: any) {
    const order = await this.findOne(id);
    
    if (order.status !== 'DESPACHADO' && user.role !== 'ADMIN') {
      throw new BadRequestException('Solo los pedidos despachados pueden completarse.');
    }

    const { docNumber, docType, paymentMethod } = data;

    // 1. Update order status
    const updated = await (this.prisma as any).order.update({
      where: { id },
      data: { status: 'ENTREGADO' }
    });

    // 2. Create Sale Record
    // Map OrderItems to SaleItems
    const saleItems: any[] = [];
    const sizeMap: Record<string, string> = {
      's28': '28', 'm30': '30', 'l32': '32', 'xl34': '34', 'xxl36': '36',
      'size38': '38', 'size40': '40', 'size42': '42', 'size44': '44', 'size46': '46',
    };

    for (const item of order.items) {
      for (const [field, sizeNum] of Object.entries(sizeMap)) {
        const qty = item[field] || 0;
        if (qty <= 0) continue;

        // Find the variant
        // We look for product by name (case-insensitive) and variant by color and size
        const products = await this.prisma.product.findMany({
          where: { name: { contains: item.modelName, mode: 'insensitive' } },
          include: { variants: true }
        });

        const product = products.find(p => 
          p.name.toUpperCase().includes(item.modelName.toUpperCase()) || 
          item.modelName.toUpperCase().includes(p.name.toUpperCase())
        );

        if (product) {
          const variant = product.variants.find(v => 
            v.color.toUpperCase() === item.color.toUpperCase() && 
            v.size === sizeNum
          );

          if (variant) {
            saleItems.push({
              variantId: variant.id,
              quantity: qty,
              unitPrice: item.unitPrice,
              totalPrice: qty * item.unitPrice
            });
          }
        }
      }
    }

    // Create the Sale record
    // Note: This does NOT deduct stock again, because stock was already deducted during Dispatch.
    await this.prisma.sale.create({
      data: {
        invoiceNumber: docNumber || `REF-${order.orderNumber || order.id.slice(-6)}`,
        clientId: order.clientId,
        totalAmount: order.totalAmount,
        paymentMethod: paymentMethod || 'CREDITO',
        status: 'COMPLETADO',
        sellerId: order.sellerId,
        notes: `VENTA DESDE PEDIDO #${order.orderNumber || order.id.slice(-6)}. Tránsito: ${order.agency || 'N/A'}`,
        items: {
          create: saleItems
        }
      }
    });

    // Notify Comercial and Seller
    await this.notifications.create({
      title: 'Pedido Finalizado y Venta Registrada',
      message: `El pedido #${order.orderNumber || order.id.slice(-6)} ha sido marcado como ENTREGADO. Se ha registrado la venta correspondiente.`,
      type: 'SUCCESS',
      targetRole: 'COMERCIAL',
      referenceId: order.id
    });

    return updated;
  }
}
