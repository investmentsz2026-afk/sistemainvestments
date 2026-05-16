import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {
    this.ensureInvoiceConfigs();
  }

  async ensureInvoiceConfigs() {
    const configs = [
      { type: 'FACTURA', series: 'F001' },
      { type: 'BOLETA', series: 'B001' }
    ];

    for (const config of configs) {
      await this.prisma.invoiceConfig.upsert({
        where: { type: config.type },
        update: {},
        create: { ...config, nextNumber: 1 }
      });
    }
  }

  async getNextInvoiceNumber(type: 'FACTURA' | 'BOLETA') {
    return await this.prisma.$transaction(async (tx) => {
      const config = await tx.invoiceConfig.findUnique({
        where: { type }
      });

      if (!config) throw new BadRequestException(`Configuración no encontrada para ${type}`);

      const number = config.nextNumber;
      const formattedNumber = `${config.series}-${number.toString().padStart(6, '0')}`;

      await tx.invoiceConfig.update({
        where: { type },
        data: { nextNumber: number + 1 }
      });

      return formattedNumber;
    });
  }

  async createSale(userId: string, data: any) {
    const { clientId, items, paymentMethod, notes } = data;
    let { invoiceNumber } = data;

    if (!items || items.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un producto');
    }

    // Auto-generate invoiceNumber if not provided
    if (!invoiceNumber) {
      const client = clientId ? await this.prisma.client.findUnique({ where: { id: clientId } }) : null;
      const type = client?.documentType === 'RUC' ? 'FACTURA' : 'BOLETA';
      invoiceNumber = await this.getNextInvoiceNumber(type);
    }

    const sale = await this.prisma.$transaction(async (tx) => {
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
      const newSale = await tx.sale.create({
        data: {
          invoiceNumber,
          clientId,
          paymentMethod,
          totalAmount,
          notes,
          sellerId: userId,
          sunatStatus: 'PENDIENTE',
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
            reason: `VENTA - Ref: ${newSale.id}`,
            reference: newSale.invoiceNumber || newSale.id,
            previousStock: variant.stock + item.quantity,
            newStock: variant.stock,
            variantId: item.variantId,
            userId: userId,
          },
        });
      }

      return newSale;
    });

    // 4. Trigger SUNAT asynchronously
    this.sendToSunat(sale.id).catch(err => console.error('Auto SUNAT failed:', err));

    return sale;
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

    if (!sale || !sale.invoiceNumber) return { success: false, message: 'La venta no tiene un número de comprobante' };

    const API_TOKEN = process.env.SUNAT_INVOICING_TOKEN;
    const API_URL = process.env.SUNAT_INVOICING_URL;

    if (!API_TOKEN || !API_URL) {
      return {
        success: false,
        message: 'API de Facturación no configurada en el servidor'
      };
    }

    try {
      // Price already includes IGV
      const total = parseFloat(sale.totalAmount.toFixed(2));
      const subtotal = parseFloat((total / 1.18).toFixed(2));
      const igv = parseFloat((total - subtotal).toFixed(2));

      // Split invoiceNumber (expected format: F001-123)
      const parts = sale.invoiceNumber.split('-');
      const serie = parts[0];
      const numero = parseInt(parts[1]);

      const payload = {
        operacion: "generar_comprobante",
        tipo_de_comprobante: sale.invoiceNumber.startsWith('F') ? 1 : 2,
        serie: serie,
        numero: numero,
        sunat_transaction: 1,
        cliente_tipo_de_documento: sale.client?.documentType === 'RUC' ? 6 : (sale.client?.documentType === 'DNI' ? 1 : "-"),
        cliente_numero_de_documento: sale.client?.documentNumber || "00000000",
        cliente_denominacion: sale.client?.name || "PÚBLICO GENERAL",
        cliente_direccion: sale.client?.address || "",
        cliente_email: sale.client?.email || "",
        fecha_de_emision: new Date(sale.createdAt).toLocaleDateString('es-PE').split('/').join('-'),
        moneda: 1, // Soles
        tipo_de_cambio: null,
        porcentaje_de_igv: 18.0,
        total_descuento: null,
        total_anticipo: null,
        total_gravada: parseFloat(subtotal.toFixed(2)),
        total_inafecta: null,
        total_exonerada: null,
        total_gratuita: null,
        total_otros_cargos: null,
        total_igv: parseFloat(igv.toFixed(2)),
        total_pago_otros: null,
        total_pago_con_monto_fijo_por_item: null,
        total: parseFloat(sale.totalAmount.toFixed(2)),
        enviar_a_sunat: true,
        items: sale.items.map(item => {
          const itemSubtotal = item.totalPrice / 1.18;
          const itemIgv = item.totalPrice - itemSubtotal;
          return {
            unidad_de_medida: "NIU",
            codigo: item.variant.variantSku,
            descripcion: `${item.variant.product.name} (${item.variant.size}/${item.variant.color})`,
            cantidad: item.quantity,
            valor_unitario: parseFloat((item.unitPrice / 1.18).toFixed(2)),
            precio_unitario: parseFloat(item.unitPrice.toFixed(2)),
            subtotal: parseFloat(itemSubtotal.toFixed(2)),
            tipo_de_igv: 1,
            igv: parseFloat(itemIgv.toFixed(2)),
            total: parseFloat(item.totalPrice.toFixed(2)),
            anticipo_regularizacion: false,
            anticipo_documento_serie: null,
            anticipo_documento_numero: null
          };
        })
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': API_TOKEN
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors);
      }

      // Update sale with SUNAT info
      await this.prisma.sale.update({
        where: { id: saleId },
        data: {
          sunatStatus: result.aceptada_por_sunat ? 'ACEPTADO' : 'ENVIADO',
          sunatResponse: result.sunat_description || 'Comprobante generado correctamente',
          sunatXmlUrl: result.enlace_del_xml,
          sunatPdfUrl: result.enlace_del_pdf,
          sunatCdrUrl: result.enlace_del_cdr,
        }
      });

      return { 
        success: true, 
        message: 'Comprobante enviado a Nubefact/SUNAT correctamente',
        data: result
      };

    } catch (error) {
      console.error('Error sending to SUNAT:', error);
      await this.prisma.sale.update({
        where: { id: saleId },
        data: {
          sunatStatus: 'ERROR',
          sunatResponse: error.message
        }
      });
      return { success: false, message: 'Error al enviar a Nubefact: ' + error.message };
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
    const API_TOKEN = process.env.APIS_PERU_TOKEN;
    const BASE_URL = process.env.APIS_PERU_URL || 'https://api.apisperu.net/v3/';
    
    if (!API_TOKEN) {
      throw new BadRequestException('El Token de Apis Perú no está configurado en el servidor.');
    }

    try {
      const url = `${BASE_URL}${docType.toLowerCase()}/${docNum}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Accept': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Error en la consulta a Apis Perú');
      }

      // Mapping Apis Perú v3 response to our format
      // RUC returns razonSocial, direccion, etc.
      // DNI returns nombres, apellidoPaterno, apellidoMaterno
      let name = '';
      let address = '';

      if (docType === 'RUC') {
        name = result.razonSocial;
        address = result.direccion;
      } else {
        name = `${result.nombres} ${result.apellidoPaterno} ${result.apellidoMaterno}`;
      }

      return {
        success: true,
        data: {
          name: name.trim(),
          address: address || '',
          documentNumber: docNum,
          documentType: docType,
          status: result.estado || 'ACTIVO',
          condition: result.condicion || 'HABIDO',
          ubigeo: result.ubigeo
        }
      };
    } catch (error) {
      console.error('Error in ApisPeru lookup:', error);
      throw new BadRequestException('Error al consultar el documento: ' + error.message);
    }
  }
}
