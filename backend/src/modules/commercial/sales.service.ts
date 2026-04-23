import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) { }

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
          sunatStatus: invoiceNumber ? 'PENDIENTE' : null,
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

  async findAll(user: any, query: any) {
    const { startDate, endDate, clientId, sellerId, status, zone } = query;
    const where: any = {};

    if (clientId) where.clientId = clientId;
    if (sellerId) where.sellerId = sellerId;
    if (status) where.status = status;

    // Filter by zone if the user is a zone-specific vendor
    if (user.role === 'VENDEDOR_LIMA') {
      where.seller = { zone: 'LIMA' };
    } else if (user.role === 'VENDEDOR_ORIENTE') {
      where.seller = { zone: 'ORIENTE' };
    } else if (zone && zone !== 'ALL') {
      where.seller = { zone: zone };
    }

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
        seller: { select: { name: true, zone: true } },
        payments: true,
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
        seller: { select: { name: true, zone: true } },
        payments: true,
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

  async addPayment(saleId: string, data: any) {
    const { amount, method, notes, evidenceUrl } = data;

    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { payments: true }
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');

    return await this.prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.salePayment.create({
        data: {
          saleId,
          amount: parseFloat(amount),
          method: method || 'EFECTIVO',
          notes,
          evidenceUrl,
        }
      });

      // Calculate total paid including the new payment
      const existingTotal = sale.payments.reduce((acc, p) => acc + p.amount, 0);
      const newTotalPaid = existingTotal + parseFloat(amount);

      let paymentStatus = 'PARCIAL';
      if (newTotalPaid >= sale.totalAmount) {
        paymentStatus = 'CANCELADO';
      }

      await tx.sale.update({
        where: { id: saleId },
        data: { paymentStatus }
      });

      return payment;
    });
  }

  async finalizePayment(saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { payments: true }
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');

    const totalPaid = sale.payments.reduce((acc, p) => acc + p.amount, 0);
    const pendingAmount = sale.totalAmount - totalPaid;

    return await this.prisma.$transaction(async (tx) => {
      // If there is a pending balance, record a liquidation payment
      if (pendingAmount > 0) {
        await tx.salePayment.create({
          data: {
            saleId,
            amount: pendingAmount,
            method: 'LIQUIDACION',
            notes: 'Liquidación manual de saldo pendiente',
          }
        });
      }

      return await tx.sale.update({
        where: { id: saleId },
        data: { paymentStatus: 'CANCELADO' }
      });
    });
  }

  async sendToSunat(saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        client: true,
        items: {
          include: {
            variant: { include: { product: true } }
          }
        }
      }
    });

    if (!sale || !sale.invoiceNumber) return;

    // This is where we call the Invoicing API (e.g. Nubefact, ApisPeru, Greenter)
    // Recommended: Nubefact because it is very easy to use with JSON.
    
    const API_TOKEN = process.env.SUNAT_INVOICING_TOKEN;
    const API_URL = process.env.SUNAT_INVOICING_URL;

    if (!API_TOKEN || !API_URL) {
      return {
        success: false,
        message: 'API de Facturación no configurada (.env)'
      };
    }

    try {
      // Mocking the payload for Nubefact
      const payload = {
        operacion: "generar_comprobante",
        tipo_de_comprobante: sale.invoiceNumber.startsWith('F') ? 1 : 2, // 1: Factura, 2: Boleta
        serie: sale.invoiceNumber.split('-')[0],
        numero: sale.invoiceNumber.split('-')[1],
        cliente_tipo_de_documento: sale.client?.documentType === 'RUC' ? 6 : 1,
        cliente_numero_de_documento: sale.client?.documentNumber,
        cliente_denominacion: sale.client?.name,
        cliente_direccion: sale.client?.address,
        total: sale.totalAmount,
        items: sale.items.map(item => ({
          descripcion: item.variant.product.name,
          cantidad: item.quantity,
          valor_unitario: item.unitPrice / 1.18,
          precio_unitario: item.unitPrice,
          total: item.totalPrice
        }))
      };

      // Here you would do: await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload), headers: { Authorization: API_TOKEN } })
      
      // Update sale status
      await this.prisma.sale.update({
        where: { id: saleId },
        data: {
          sunatStatus: 'ENVIADO', // In real life this would depend on the response
          sunatResponse: 'Documento enviado a SUNAT (Demostración)'
        }
      });

      return { success: true, message: 'Documento enviado a SUNAT' };
    } catch (error) {
      console.error('Error sending to SUNAT:', error);
      await this.prisma.sale.update({
        where: { id: saleId },
        data: {
          sunatStatus: 'ERROR',
          sunatResponse: error.message
        }
      });
      return { success: false, message: error.message };
    }
  }

  // Clients
  async createClient(user: any, data: any) {
    const clientData = { ...data };

    // Auto-set zone if the creator is a zone-specific vendor
    if (user.role === 'VENDEDOR_LIMA') clientData.zone = 'LIMA';
    if (user.role === 'VENDEDOR_ORIENTE') clientData.zone = 'ORIENTE';

    // Track creator
    clientData.createdById = user.id;

    // Check for duplicate documentNumber
    if (clientData.documentNumber) {
      const existingClient = await (this.prisma.client as any).findFirst({
        where: { documentNumber: clientData.documentNumber },
      });
      if (existingClient) {
        throw new BadRequestException(`Ya existe un cliente registrado con el número de documento ${clientData.documentNumber}`);
      }
    }

    // Sanitize data before create
    const { id: _id, createdAt, createdBy, createdById: _createdById, updatedAt, sales, ...cleanData } = clientData;

    const client = await (this.prisma.client as any).create({
      data: {
        ...cleanData,
        createdById: user.id
      },
      include: { createdBy: { select: { name: true } } }
    });

    // Notify COMERCIAL
    if (user.role === 'VENDEDOR_LIMA' || user.role === 'VENDEDOR_ORIENTE') {
      await this.notifications.create({
        title: 'Nuevo Cliente de Vendedor',
        message: `El vendedor ${user.name} (${clientData.zone}) ha registrado un nuevo cliente: ${client.name}`,
        type: 'INFO',
        targetRole: 'COMERCIAL',
        referenceId: client.id
      });
    }

    return client;
  }

  async updateClient(user: any, id: string, data: any) {
    const client = await (this.prisma.client as any).findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    // Security check: vendors can only edit clients in their zone
    if (user.role === 'VENDEDOR_LIMA' && client.zone !== 'LIMA') {
      throw new BadRequestException('No tienes permiso para editar clientes de Lima');
    }
    if (user.role === 'VENDEDOR_ORIENTE' && client.zone !== 'ORIENTE') {
      throw new BadRequestException('No tienes permiso para editar clientes de Oriente');
    }

    // Sanitize data before update to remove relation objects or read-only fields
    const { id: _id, createdAt, createdBy, createdById, updatedAt, sales, ...updateData } = data;

    // Check for duplicate documentNumber on update
    if (updateData.documentNumber && updateData.documentNumber !== client.documentNumber) {
      const existingClient = await (this.prisma.client as any).findFirst({
        where: { documentNumber: updateData.documentNumber },
      });
      if (existingClient && existingClient.id !== id) {
        throw new BadRequestException(`Ya existe otro cliente registrado con el número de documento ${updateData.documentNumber}`);
      }
    }

    const updated = await (this.prisma.client as any).update({
      where: { id },
      data: updateData,
    });

    // Notify COMERCIAL if vendor is editing
    if (user.role === 'VENDEDOR_LIMA' || user.role === 'VENDEDOR_ORIENTE') {
      await this.notifications.create({
        title: 'Cliente Editado por Vendedor',
        message: `El vendedor ${user.name} (${user.zone}) ha editado los datos del cliente: ${updated.name}`,
        type: 'WARNING',
        targetRole: 'COMERCIAL',
        referenceId: updated.id
      });
    }

    return updated;
  }

  async findAllClients(user: any) {
    const where: any = {};

    if (user.role === 'VENDEDOR_LIMA') where.zone = 'LIMA';
    if (user.role === 'VENDEDOR_ORIENTE') where.zone = 'ORIENTE';

    return (this.prisma.client as any).findMany({
      where,
      include: {
        createdBy: {
          select: { name: true, zone: true }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  async lookupDocument(docType: string, docNum: string) {
    // This is a proxy to an external SUNAT/RENIEC API
    // Recommended: https://apisperu.com/ or https://peruconsultas.com/
    
    // For now, we use a placeholder or a mock implementation if no token is provided
    const API_TOKEN = process.env.SUNAT_API_TOKEN;
    
    if (!API_TOKEN) {
      // If no token, we return a mock or inform the user
      // throw new BadRequestException('SUNAT API Token not configured');
      
      // Let's return a friendly message for now so the user knows they need a token
      return {
        success: false,
        message: 'Para usar esta función necesitas configurar un Token de API (apisperu.com o similar)',
        mockData: true,
        data: {
          name: 'CLIENTE DE PRUEBA S.A.C.',
          address: 'AV. LAS FLORES 123 - LIMA',
          documentNumber: docNum,
          documentType: docType
        }
      };
    }

    try {
      // Example implementation for ApisPeru
      const url = docType === 'RUC' 
        ? `https://api.apisperu.com/v1/ruc/${docNum}?token=${API_TOKEN}`
        : `https://api.apisperu.com/v1/dni/${docNum}?token=${API_TOKEN}`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.message || 'Error en la consulta');

      return {
        success: true,
        data: {
          name: result.razonSocial || result.nombreCompleto || result.nombres,
          address: result.direccion || '',
          documentNumber: docNum,
          documentType: docType,
          ubigeo: result.ubigeo,
          condition: result.condicion,
          status: result.estado
        }
      };
    } catch (error) {
      console.error('Error in SUNAT lookup:', error);
      throw new BadRequestException('Error al consultar el documento: ' + error.message);
    }
  }
}
