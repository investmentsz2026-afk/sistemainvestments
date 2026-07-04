import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import axios from 'axios';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {
    this.ensureInvoiceConfigs();
  }

  async debugData() {
    return {
      sales: await this.prisma.sale.findMany({ include: { client: true } }),
      orders: await this.prisma.order.findMany({ include: { client: true } })
    };
  }

  async ensureInvoiceConfigs() {
    const configs = [
      { type: 'FACTURA', series: 'F001' },
      { type: 'BOLETA', series: 'B001' },
      { type: 'GUIA', series: 'TTT1' },
      { type: 'NOTA_CREDITO_FACTURA', series: 'FC01' },
      { type: 'NOTA_CREDITO_BOLETA', series: 'BC01' }
    ];

    for (const config of configs) {
      await this.prisma.invoiceConfig.upsert({
        where: { type: config.type },
        update: {},
        create: { ...config, nextNumber: 1 }
      });
    }
  }

  async getNextInvoiceNumber(type: 'FACTURA' | 'BOLETA' | 'GUIA' | 'NOTA_CREDITO_FACTURA' | 'NOTA_CREDITO_BOLETA') {
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
    const { clientId, items, paymentMethod, notes, referralGuide } = data;
    let { invoiceNumber } = data;

    if (!items || items.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un producto');
    }

    const client = clientId ? await this.prisma.client.findUnique({ where: { id: clientId } }) : null;

    // Auto-generate invoiceNumber if not provided
    if (!invoiceNumber) {
      const type = client?.documentType === 'RUC' ? 'FACTURA' : 'BOLETA';
      invoiceNumber = await this.getNextInvoiceNumber(type);
    }

    const sale = await this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      let totalCost = 0;
      const saleItemsData: any[] = [];

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

        const costPrice = variant.product.purchasePrice || 0;
        const itemTotalCost = item.quantity * costPrice;
        totalCost += itemTotalCost;

        const itemUnitPrice = item.unitPrice !== undefined ? item.unitPrice : variant.product.sellingPrice;
        const itemTotal = item.quantity * itemUnitPrice;
        totalAmount += itemTotal;

        saleItemsData.push({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: itemUnitPrice,
          totalPrice: itemTotal,
          costPrice: costPrice,
        });
      }

      // 2. Create Sale
      const newSale = await (tx.sale as any).create({
        data: {
          invoiceNumber,
          clientId,
          paymentMethod,
          totalAmount,
          totalCost,
          notes,
          referralGuide,
          sellerId: userId,
          sunatStatus: 'PENDIENTE',
          deliveryAddress: client?.address || null,
          items: {
            create: saleItemsData,
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
      where.client = { zone: 'LIMA' };
    } else if (user.role === 'VENDEDOR_ORIENTE') {
      where.client = { zone: 'ORIENTE' };
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
        payments: {
          include: {
            letraDetails: true
          }
        },
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
        payments: {
          include: {
            letraDetails: true
          }
        },
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

  async addPayment(saleId: string, data: any, currentUser?: any) {
    const { amount, method, notes, evidenceUrl, creditNoteMotive, creditNoteNumber, isElectronic, paymentDate } = data;

    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { payments: true }
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');

    const totalPaid = sale.payments
      .filter(p => p.status === 'APROBADO')
      .reduce((acc, p) => acc + p.amount, 0);

    const totalPending = sale.payments
      .filter(p => p.status === 'PENDIENTE')
      .reduce((acc, p) => acc + p.amount, 0);

    if (totalPaid >= sale.totalAmount) {
      throw new BadRequestException('Esta venta ya está completamente pagada (Liquidada).');
    }

    const remainingToPay = sale.totalAmount - totalPaid;
    const remainingToPayWithPending = remainingToPay - totalPending;

    if (remainingToPayWithPending <= 0) {
      throw new BadRequestException('Ya existen abonos pendientes de aprobación que cubren el saldo restante.');
    }

    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount) || inputAmount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero.');
    }

    if (inputAmount > remainingToPayWithPending + 0.01) {
      throw new BadRequestException(`El monto ingresado (S/ ${inputAmount}) supera el saldo pendiente real disponible de S/ ${remainingToPayWithPending.toFixed(2)}.`);
    }

    if (method === 'LETRAS') {
      if (!data.letras || !Array.isArray(data.letras) || data.letras.length === 0) {
        throw new BadRequestException('Debe especificar al menos una letra.');
      }
      const sumOfLetras = data.letras.reduce((sum: number, l: any) => sum + parseFloat(l.amount || 0), 0);
      if (Math.abs(sumOfLetras - inputAmount) > 0.01) {
        throw new BadRequestException(`La suma de las letras (S/ ${sumOfLetras.toFixed(2)}) no coincide con el monto total del abono (S/ ${inputAmount.toFixed(2)}).`);
      }
    }

    const isVendor = currentUser?.role === 'VENDEDOR_LIMA' || currentUser?.role === 'VENDEDOR_ORIENTE';
    const isElecCN = isElectronic === true || isElectronic === 'true';

    return await this.prisma.$transaction(async (tx) => {
      let paymentData: any = {
        saleId,
        amount: parseFloat(amount),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        method: method || 'EFECTIVO',
        notes,
        evidenceUrl,
        status: isVendor ? 'PENDIENTE' : 'APROBADO',
        registeredById: currentUser?.id || null,
        registeredByName: currentUser?.name || null,
      };

      if (method === 'LETRAS' && data.letras && Array.isArray(data.letras)) {
        paymentData.letraDetails = {
          create: data.letras.map((letra: any) => ({
            number: parseInt(letra.number),
            dueDate: new Date(letra.dueDate),
            amount: parseFloat(letra.amount),
            uniqueNumber: letra.uniqueNumber || null,
            observation: letra.observation || null,
            status: 'PENDIENTE',
          })),
        };
      }

      if (method === 'NOTA_CREDITO') {
        paymentData.creditNoteMotive = creditNoteMotive;
        if (isVendor) {
          // Keep it pending, wait for Commercial approval
          paymentData.status = 'PENDIENTE';
          paymentData.creditNoteNumber = creditNoteNumber || null;
        } else {
          // Approved automatically
          paymentData.status = 'APROBADO';
          if (isElecCN) {
            // Generate in Nubefact immediately
            const sunatResult = await this.sendCreditNoteToSunat(tx, saleId, parseFloat(amount), creditNoteMotive, notes || 'Nota de crédito');
            paymentData.creditNoteNumber = sunatResult.creditNoteNumber;
            paymentData.sunatStatus = sunatResult.sunatStatus;
            paymentData.sunatResponse = sunatResult.sunatResponse;
            paymentData.sunatXmlUrl = sunatResult.sunatXmlUrl;
            paymentData.sunatPdfUrl = sunatResult.sunatPdfUrl;
            paymentData.sunatCdrUrl = sunatResult.sunatCdrUrl;
          } else {
            // Manual credit note registration
            paymentData.creditNoteNumber = creditNoteNumber || null;
            paymentData.creditNoteMotive = creditNoteMotive || 'Manual';
          }
        }
      }

      // Create payment
      const payment = await tx.salePayment.create({
        data: paymentData,
        include: { letraDetails: true }
      });

      // If registered by a vendor, the payment remains pending and doesn't update sale status
      if (!isVendor) {
        // Calculate total paid including the new payment (only approved ones)
        const existingTotal = sale.payments
          .filter(p => p.status === 'APROBADO')
          .reduce((acc, p) => acc + p.amount, 0);
        const newTotalPaid = existingTotal + parseFloat(amount);

        let paymentStatus = 'PARCIAL';
        if (newTotalPaid >= sale.totalAmount) {
          paymentStatus = 'CANCELADO';
        }

        await tx.sale.update({
          where: { id: saleId },
          data: { paymentStatus }
        });
      }

      return payment;
    });
  }

  async finalizePayment(saleId: string, currentUser?: any) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        payments: {
          include: {
            letraDetails: true
          }
        }
      }
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');

    const totalPaid = sale.payments
      .filter(p => p.status === 'APROBADO')
      .reduce((acc, p) => acc + p.amount, 0);

    const totalPending = sale.payments
      .filter(p => p.status === 'PENDIENTE')
      .reduce((acc, p) => acc + p.amount, 0);

    const pendingAmount = sale.totalAmount - totalPaid;
    const remainingToPayWithPending = pendingAmount - totalPending;

    if (pendingAmount <= 0) {
      throw new BadRequestException('Esta venta ya está completamente pagada (Liquidada).');
    }

    if (remainingToPayWithPending <= 0) {
      throw new BadRequestException('Ya existen abonos pendientes de aprobación que cubren el saldo restante.');
    }

    const isVendor = currentUser?.role === 'VENDEDOR_LIMA' || currentUser?.role === 'VENDEDOR_ORIENTE';

    return await this.prisma.$transaction(async (tx) => {
      // If there is a pending balance, record a liquidation payment
      const liquidationAmount = remainingToPayWithPending;
      if (liquidationAmount > 0) {
        await tx.salePayment.create({
          data: {
            saleId,
            amount: liquidationAmount,
            method: 'LIQUIDACION',
            notes: 'Liquidación manual de saldo pendiente',
            status: isVendor ? 'PENDIENTE' : 'APROBADO',
            registeredById: currentUser?.id || null,
            registeredByName: currentUser?.name || null,
          }
        });
      }

      if (!isVendor && liquidationAmount === pendingAmount) {
        return await tx.sale.update({
          where: { id: saleId },
          data: { paymentStatus: 'CANCELADO' }
        });
      }

      return sale;
    });
  }

  async getPendingPayments() {
    return this.prisma.salePayment.findMany({
      where: { status: 'PENDIENTE' },
      include: {
        letraDetails: true,
        sale: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approvePayment(paymentId: string) {
    const payment = await this.prisma.salePayment.findUnique({
      where: { id: paymentId },
      include: { sale: { include: { payments: true } } },
    });

    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== 'PENDIENTE') {
      throw new BadRequestException('El pago ya ha sido procesado');
    }

    const existingApprovedTotal = payment.sale.payments
      .filter(p => p.status === 'APROBADO' && p.id !== paymentId)
      .reduce((acc, p) => acc + p.amount, 0);

    if (existingApprovedTotal >= payment.sale.totalAmount) {
      throw new BadRequestException('Esta venta ya está completamente pagada.');
    }

    const remainingToPay = payment.sale.totalAmount - existingApprovedTotal;
    if (payment.amount > remainingToPay + 0.01) {
      throw new BadRequestException(`El monto de este abono (S/ ${payment.amount}) supera el saldo pendiente restante por pagar (S/ ${remainingToPay.toFixed(2)}).`);
    }

    return await this.prisma.$transaction(async (tx) => {
      let updateData: any = { status: 'APROBADO' };

      if (payment.method === 'NOTA_CREDITO') {
        // If it was requested as electronic (has motive and doesn't have credit note number yet)
        const isElectronic = payment.creditNoteMotive && payment.creditNoteMotive !== 'Manual' && !payment.creditNoteNumber;
        if (isElectronic) {
          // Generate in Nubefact on approval
          const sunatResult = await this.sendCreditNoteToSunat(tx, payment.saleId, payment.amount, payment.creditNoteMotive || '4', payment.notes || 'Nota de crédito');
          updateData.creditNoteNumber = sunatResult.creditNoteNumber;
          updateData.sunatStatus = sunatResult.sunatStatus;
          updateData.sunatResponse = sunatResult.sunatResponse;
          updateData.sunatXmlUrl = sunatResult.sunatXmlUrl;
          updateData.sunatPdfUrl = sunatResult.sunatPdfUrl;
          updateData.sunatCdrUrl = sunatResult.sunatCdrUrl;
        }
      }

      // Approve the payment
      const approvedPayment = await tx.salePayment.update({
        where: { id: paymentId },
        data: updateData,
      });

      // Calculate total paid including this newly approved payment
      const existingApprovedTotal = payment.sale.payments
        .filter(p => p.status === 'APROBADO' && p.id !== paymentId)
        .reduce((acc, p) => acc + p.amount, 0);
      const newTotalPaid = existingApprovedTotal + payment.amount;

      let paymentStatus = 'PARCIAL';
      if (newTotalPaid >= payment.sale.totalAmount) {
        paymentStatus = 'CANCELADO';
      }

      await tx.sale.update({
        where: { id: payment.saleId },
        data: { paymentStatus },
      });

      return approvedPayment;
    });
  }

  async rejectPayment(paymentId: string) {
    const payment = await this.prisma.salePayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== 'PENDIENTE') {
      throw new BadRequestException('El pago ya ha sido procesado');
    }

    return this.prisma.salePayment.update({
      where: { id: paymentId },
      data: { status: 'RECHAZADO' },
    });
  }

  async sendCreditNoteToSunat(tx: any, saleId: string, amount: number, motiveCode: string, sustentoText: string) {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { client: true }
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (!sale.invoiceNumber) throw new BadRequestException('La venta no tiene un comprobante de referencia');

    const API_TOKEN = process.env.SUNAT_INVOICING_TOKEN;
    const API_URL = process.env.SUNAT_INVOICING_URL;

    if (!API_TOKEN || !API_URL) {
      throw new BadRequestException('API de Facturación no configurada en el servidor');
    }

    // Determine type: modify Factura (1) or Boleta (2)
    const isFactura = sale.invoiceNumber.startsWith('F');
    const docModificaTipo = isFactura ? 1 : 2;
    
    // Split original invoice number (e.g. F001-000456)
    const refParts = sale.invoiceNumber.split('-');
    const refSerie = refParts[0];
    const refNumero = parseInt(refParts[1]);

    // Reserve credit note number
    const configType = isFactura ? 'NOTA_CREDITO_FACTURA' : 'NOTA_CREDITO_BOLETA';
    
    const config = await tx.invoiceConfig.findUnique({
      where: { type: configType }
    });
    if (!config) throw new BadRequestException(`Configuración no encontrada para ${configType}`);
    const number = config.nextNumber;
    const formattedCNNumber = `${config.series}-${number.toString().padStart(6, '0')}`;
    
    // Update config nextNumber
    await tx.invoiceConfig.update({
      where: { type: configType },
      data: { nextNumber: number + 1 }
    });

    // Calculate subtotal and IGV for the credit note amount
    const total = parseFloat(amount.toFixed(2));
    const subtotal = parseFloat((total / 1.18).toFixed(2));
    const igv = parseFloat((total - subtotal).toFixed(2));

    const getFormattedDate = (d: Date) => {
      const formatter = new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const pts = formatter.formatToParts(d);
      const day = pts.find(p => p.type === 'day')?.value;
      const month = pts.find(p => p.type === 'month')?.value;
      const year = pts.find(p => p.type === 'year')?.value;
      return `${day}-${month}-${year}`;
    };

    const fechaEmision = getFormattedDate(new Date());

    const payload = {
      operacion: "generar_comprobante",
      tipo_de_comprobante: 3, // Nota de Crédito
      serie: config.series,
      numero: number,
      sunat_transaction: 1,
      cliente_tipo_de_documento: sale.client?.documentType === 'RUC' ? 6 : (sale.client?.documentType === 'DNI' ? 1 : "-"),
      cliente_numero_de_documento: sale.client?.documentNumber || "00000000",
      cliente_denominacion: sale.client?.name || "PÚBLICO GENERAL",
      cliente_direccion: sale.deliveryAddress || sale.client?.address || "",
      cliente_email: sale.client?.email || "",
      fecha_de_emision: fechaEmision,
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
      total: parseFloat(total.toFixed(2)),
      enviar_a_sunat: true,
      documento_que_modifica_tipo: docModificaTipo,
      documento_que_modifica_serie: refSerie,
      documento_que_modifica_numero: refNumero,
      tipo_de_nota_de_credito: parseInt(motiveCode) || 4, // Descuento global por defecto
      motivo_o_sustento: sustentoText,
      items: [
        {
          unidad_de_medida: "ZZ",
          codigo: "",
          descripcion: sustentoText || `NOTA DE CRÉDITO POR MODIFICACIÓN DE COMPROBANTE ${sale.invoiceNumber}`,
          cantidad: 1,
          valor_unitario: parseFloat(subtotal.toFixed(2)),
          precio_unitario: parseFloat(total.toFixed(2)),
          subtotal: parseFloat(subtotal.toFixed(2)),
          tipo_de_igv: 1,
          igv: parseFloat(igv.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          anticipo_regularizacion: false,
          anticipo_documento_serie: null,
          anticipo_documento_numero: null
        }
      ]
    };

    try {
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

      return {
        creditNoteNumber: formattedCNNumber,
        sunatStatus: result.aceptada_por_sunat ? 'ACEPTADO' : 'ENVIADO',
        sunatResponse: result.sunat_description || 'Nota de crédito generada correctamente',
        sunatXmlUrl: result.enlace_del_xml,
        sunatPdfUrl: result.enlace_del_pdf,
        sunatCdrUrl: result.enlace_del_cdr,
      };
    } catch (error) {
      console.error('Error generating Credit Note in Nubefact:', error);
      throw new BadRequestException('Error de comunicación con Nubefact: ' + error.message);
    }
  }

  async sendToSunat(saleId: string, customFechaEmision?: string) {
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

      // Calculate time difference in Peru timezone to adjust fecha_de_emision if it exceeds SUNAT's 3-day limit.
      const getMidnightPeru = (d: Date) => {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Lima',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        });
        const pts = formatter.formatToParts(d);
        const year = pts.find(p => p.type === 'year')?.value;
        const month = pts.find(p => p.type === 'month')?.value;
        const day = pts.find(p => p.type === 'day')?.value;
        return new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
      };

      const nowMidnight = getMidnightPeru(new Date());
      const saleMidnight = getMidnightPeru(sale.createdAt);
      const diffTime = Math.abs(nowMidnight.getTime() - saleMidnight.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const getFormattedDate = (d: Date) => {
        const formatter = new Intl.DateTimeFormat('es-PE', {
          timeZone: 'America/Lima',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const pts = formatter.formatToParts(d);
        const day = pts.find(p => p.type === 'day')?.value;
        const month = pts.find(p => p.type === 'month')?.value;
        const year = pts.find(p => p.type === 'year')?.value;
        return `${day}-${month}-${year}`;
      };

      // La fecha de emisión será la fecha personalizada si se provee (formato YYYY-MM-DD),
      // formateada a DD-MM-YYYY para Nubefact. De lo contrario, la fecha actual.
      let fechaEmision = getFormattedDate(new Date());
      if (customFechaEmision) {
        const dateParts = customFechaEmision.split('-');
        if (dateParts.length === 3) {
          fechaEmision = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        }
      }

      const payload = {
        operacion: "generar_comprobante",
        tipo_de_comprobante: sale.invoiceNumber.startsWith('F') ? 1 : 2,
        serie: serie,
        numero: numero,
        sunat_transaction: 1,
        cliente_tipo_de_documento: sale.client?.documentType === 'RUC' ? 6 : (sale.client?.documentType === 'DNI' ? 1 : "-"),
        cliente_numero_de_documento: sale.client?.documentNumber || "00000000",
        cliente_denominacion: sale.client?.name || "PÚBLICO GENERAL",
        cliente_direccion: sale.deliveryAddress || sale.client?.address || "",
        cliente_email: sale.client?.email || "",
        fecha_de_emision: fechaEmision,
        condicion_de_pago: sale.paymentMethod === 'CREDITO' ? 2 : 1,
        ...(sale.paymentMethod === 'CREDITO' ? {
          cuotas: [
            {
              cuota: 1,
              fecha_de_pago: fechaEmision,
              importe: parseFloat(sale.totalAmount.toFixed(2))
            }
          ]
        } : {}),
        observaciones: `METODO DE PAGO: ${sale.paymentMethod || 'NO ESPECIFICADO'}`,
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
        ...(typeof (sale as any).referralGuide === 'string' && (sale as any).referralGuide ? {
          guias: [
            {
              guia_tipo: 1,
              guia_serie_numero: (sale as any).referralGuide
            }
          ]
        } : {}),
        items: sale.items.map(item => {
          const itemSubtotal = item.totalPrice / 1.18;
          const itemIgv = item.totalPrice - itemSubtotal;
          return {
            unidad_de_medida: "NIU",
            codigo: "", // Se envía vacío para que no ocupe espacio extra en la factura PDF
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
      clientData.documentNumber = clientData.documentNumber.trim();
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
    if (updateData.documentNumber) {
      updateData.documentNumber = updateData.documentNumber.trim();
    }
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

  async annulSale(id: string, user: any, revertDispatch: boolean = false) {
    if (user.role !== 'ADMIN' && user.role !== 'COMERCIAL') {
      throw new BadRequestException('No tienes permisos para anular ventas');
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.status === 'ANULADO') throw new BadRequestException('La venta ya está anulada');

    // Annul the sale
    await this.prisma.sale.update({
      where: { id },
      data: { status: 'ANULADO' }
    });

    // Revert inventory if requested
    if (revertDispatch) {
      for (const item of sale.items) {
        const variant = await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } }
        });
        await this.prisma.movement.create({
          data: {
            type: 'ENTRY',
            quantity: item.quantity,
            reason: `ANULACIÓN DE VENTA Y DESPACHO - Ref: ${sale.invoiceNumber || sale.id}`,
            reference: sale.invoiceNumber || sale.id,
            previousStock: variant.stock - item.quantity,
            newStock: variant.stock,
            variantId: item.variantId,
            userId: user.id
          }
        });
      }
    }

    // Revert the order status
    if (sale.notes && sale.notes.includes('VENTA DESDE PEDIDO #')) {
      const match = sale.notes.match(/VENTA DESDE PEDIDO #([A-Za-z0-9-]+)/);
      if (match && match[1]) {
        const orderIdentifier = match[1];
        const orders = await this.prisma.order.findMany({
          where: {
            OR: [
              { orderNumber: orderIdentifier },
              { id: { endsWith: orderIdentifier } }
            ]
          }
        });
        
        for (const order of orders) {
          if (order.status === 'ENTREGADO' || order.status === 'COMPLETADO') {
            await (this.prisma as any).order.update({
              where: { id: order.id },
              data: { status: revertDispatch ? 'PENDIENTE' : 'DESPACHADO' }
            });
          }
        }
      }
    }

    return { 
      success: true, 
      message: revertDispatch 
        ? 'Venta anulada. Los productos regresaron al inventario y el pedido vuelve a estar pendiente.' 
        : 'Venta anulada correctamente. El pedido ha vuelto a estado DESPACHADO.' 
    };
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
    // Usamos el token del .env o el token oficial proporcionado por el jefe como respaldo directo
    const API_TOKEN = process.env.APIS_PERU_TOKEN || "3c15657df04155b7e39e9037867db9f325408192dbf9c792164c198b8dadaeba";
    const BACKEND_URL = process.env.BACKEND_URL || "https://americancolt-system-production.up.railway.app";
    const type = docType.toLowerCase();

    // Lista de endpoints actualizados (2025)
    const endpoints = [
      { url: `https://apiperu.dev/api/${type}`, method: 'POST', data: { [type]: docNum } },
      { url: `https://dniruc.apisperu.com/api/v1/${type}/${docNum}?token=${API_TOKEN}`, method: 'GET' },
    ];

    let lastError = '';

    for (const endpoint of endpoints) {
      try {
        const config: any = {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Referer': BACKEND_URL,
            'Origin': BACKEND_URL
          },
          timeout: 10000,
          family: 4
        };

        let response;
        if (endpoint.method === 'POST') {
          response = await axios.post(endpoint.url, endpoint.data, config);
        } else {
          response = await axios.get(endpoint.url, config);
        }

        const result = response.data.data || response.data;
        let name = '';
        let address = '';

        if (type === 'ruc') {
          name = result.razonSocial || result.nombre_o_razon_social || result.razon_social || result.nombre || '';
          address = result.direccion || result.direccion_fiscal || '';
        } else {
          name = result.nombre_completo || result.nombre || `${result.nombres || ''} ${result.apellidoPaterno || result.apellido_paterno || ''} ${result.apellidoMaterno || result.apellido_materno || ''}`;
        }

        return {
          success: true,
          data: {
            name: name.trim(),
            address: address || '',
            documentNumber: docNum,
            documentType: docType,
            status: result.estado || 'ACTIVO',
            condition: result.condicion || 'HABIDO'
          }
        };
      } catch (error: any) {
        lastError = error.response?.data?.message || error.message;
        console.warn(`Fallo en ${endpoint.url}: ${lastError}`);
        continue;
      }
    }

    throw new BadRequestException(`No se pudo conectar con ningún servidor de validación. Error: ${lastError}`);
  }

  async updateReferralGuide(saleId: string, referralGuide: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId }
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');

    return this.prisma.sale.update({
      where: { id: saleId },
      data: { referralGuide: referralGuide || null }
    });
  }

  async updateCargoUrl(saleId: string, cargoUrl: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId }
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');

    return this.prisma.sale.update({
      where: { id: saleId },
      data: { cargoUrl: cargoUrl || null }
    });
  }

  async updateInvoiceNumber(saleId: string, invoiceNumber: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId }
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');

    // Check unique constraint manually to return user friendly error
    if (invoiceNumber) {
      const existing = await this.prisma.sale.findUnique({
        where: { invoiceNumber }
      });
      if (existing && existing.id !== saleId) {
        throw new BadRequestException('El número de comprobante ya está registrado en otra venta.');
      }
    }

    return this.prisma.sale.update({
      where: { id: saleId },
      data: { invoiceNumber: invoiceNumber || null }
    });
  }

  async sendGreToSunat(saleId: string, greData: any) {
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

    if (!sale) throw new NotFoundException('Venta no encontrada');

    const API_TOKEN = process.env.SUNAT_INVOICING_TOKEN;
    const API_URL = process.env.SUNAT_INVOICING_URL;

    if (!API_TOKEN || !API_URL) {
      throw new BadRequestException('API de Facturación no configurada en el servidor');
    }

    let finalGuideNumber = sale.referralGuide;
    if (!finalGuideNumber || !finalGuideNumber.startsWith('TTT')) {
      finalGuideNumber = await this.getNextInvoiceNumber('GUIA');
    }
    const parts = finalGuideNumber.split('-');
    const series = parts[0];
    const numero = parseInt(parts[1]);

    const clientDocType = sale.client?.documentType === 'RUC' ? 6 : (sale.client?.documentType === 'DNI' ? 1 : "-");
    const clientDocNum = sale.client?.documentNumber || "00000000";
    const clientDenominacion = sale.client?.name || "PÚBLICO GENERAL";
    const clientDireccion = sale.deliveryAddress || sale.client?.address || "";
    const clientEmail = sale.client?.email || "";

    const peso = parseFloat(greData.peso_bruto_total) || 1.0;
    const bultos = parseInt(greData.numero_de_bultos) || 1;
    const partidaUbigeo = greData.punto_de_partida_ubigeo || "150110";
    const partidaDireccion = greData.punto_de_partida_direccion || "Mza. E Lote. 11 Dpto. 201 Cnd. Las Praderas (Block 18), Lima - Lima - Comas";
    const llegadaUbigeo = greData.punto_de_llegada_ubigeo || "150101";
    const llegadaDireccion = greData.punto_de_llegada_direccion || clientDireccion || "Sin direccion";
    const plate = (greData.vehiculo_placa || "CTP-078").trim();
    const driverDni = (greData.conductor_numero_de_documento || "40401880").trim();
    const driverName = (greData.conductor_denominacion || "Juan Carlos Aguirre haro").trim();
    const driverLicence = (greData.conductor_licencia || "E40401880").trim();

    // Build document reference (factura/boleta associated to this guide)
    const invoiceNum = sale.invoiceNumber || "";
    let docRefTipo = "";
    let docRefSerie = "";
    let docRefNumero = "";
    if (invoiceNum) {
      const invParts = invoiceNum.split('-');
      docRefSerie = invParts[0] || "";
      docRefNumero = invParts[1] || "";
      // F = Factura (01), B = Boleta (03)
      if (invoiceNum.startsWith('F')) {
        docRefTipo = "01";
      } else if (invoiceNum.startsWith('B')) {
        docRefTipo = "03";
      }
    }

    // Split driverName to get name and last name
    const nameParts = driverName.split(/\s+/);
    const conductor_nombre = nameParts[0] || "";
    const conductor_apellidos = nameParts.slice(1).join(" ") || "Aguirre haro";

    const getFormattedDate = (d: Date) => {
      const formatter = new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const pts = formatter.formatToParts(d);
      const day = pts.find(p => p.type === 'day')?.value;
      const month = pts.find(p => p.type === 'month')?.value;
      const year = pts.find(p => p.type === 'year')?.value;
      return `${day}-${month}-${year}`;
    };

    const payload = {
      operacion: "generar_guia",
      tipo_de_comprobante: 7,
      serie: series,
      numero: numero,
      fecha_de_emision: getFormattedDate(new Date()),
      fecha_de_inicio_de_traslado: getFormattedDate(new Date()),
      cliente_tipo_de_documento: clientDocType,
      cliente_numero_de_documento: clientDocNum,
      cliente_denominacion: clientDenominacion,
      cliente_direccion: clientDireccion,
      cliente_email: clientEmail,
      motivo_de_traslado: "01",
      tipo_de_transporte: "02",
      peso_bruto_total: peso,
      unidad_de_medida_peso_bruto: "KGM",
      numero_de_bultos: bultos,
      punto_de_partida_ubigeo: partidaUbigeo,
      punto_de_partida_direccion: partidaDireccion,
      punto_de_llegada_ubigeo: llegadaUbigeo,
      punto_de_llegada_direccion: llegadaDireccion,
      transportista_placa_numero: plate,
      vehiculo_placa: plate,
      placa: plate,
      
      conductor_documento_tipo: 1,
      conductor_tipo_de_documento: "1",
      chofer_documento_tipo: 1,
      chofer_tipo_de_documento: "1",
      
      conductor_documento_numero: driverDni,
      conductor_numero_de_documento: driverDni,
      chofer_documento_numero: driverDni,
      chofer_numero_de_documento: driverDni,
      
      conductor_denominacion: driverName,
      conductor_nombres: driverName,
      chofer_denominacion: driverName,
      chofer_nombre: driverName,
      
      conductor_nombre: conductor_nombre,
      conductor_apellidos: conductor_apellidos,
      conductor_numero_licencia: driverLicence,
      
      conductor_licencia: driverLicence,
      conductor_licencia_de_conducir: driverLicence,
      licencia_de_conducir: driverLicence,
      conductor_licencia_numero: driverLicence,
      conductor_licencia_nro: driverLicence,
      chofer_licencia: driverLicence,
      chofer_licencia_nro: driverLicence,
      chofer_licencia_numero: driverLicence,
      chofer_licencia_de_conducir: driverLicence,
      licencia_conductor: driverLicence,
      licencia_chofer: driverLicence,
      
      conductor: {
        documento_tipo: 1,
        conductor_documento_tipo: 1,
        tipo_de_documento: 1,
        tipoDoc: "1",
        tipoIdentidad: "1",
        tipoDocumentoConductor: "1",
        tipo: "Principal",
        
        documento_numero: driverDni,
        conductor_documento_numero: driverDni,
        numero_de_documento: driverDni,
        nroDoc: driverDni,
        numeroDocumentoConductor: driverDni,
        conductor_numero_de_documento: driverDni,
        chofer_documento_numero: driverDni,
        chofer_numero_de_documento: driverDni,
        
        denominacion: driverName,
        conductor_denominacion: driverName,
        nombre: conductor_nombre,
        conductor_nombre: conductor_nombre,
        nombres: driverName,
        apellidos: conductor_apellidos,
        conductor_apellidos: conductor_apellidos,
        conductor_nombres: driverName,
        chofer_denominacion: driverName,
        chofer_nombre: driverName,
        chofer_nombres: driverName,
        nombres_y_apellidos: driverName,
        
        licencia: driverLicence,
        conductor_licencia: driverLicence,
        licencia_de_conducir: driverLicence,
        conductor_licencia_de_conducir: driverLicence,
        licencia_conductor: driverLicence,
        licencia_chofer: driverLicence,
        numeroLicencia: driverLicence,
        conductor_licencia_numero: driverLicence,
        conductor_licencia_nro: driverLicence,
        conductor_numero_licencia: driverLicence,
        chofer_licencia: driverLicence,
        chofer_licencia_nro: driverLicence,
        chofer_licencia_numero: driverLicence,
        chofer_licencia_de_conducir: driverLicence,
      },
      chofer: {
        documento_tipo: 1,
        conductor_documento_tipo: 1,
        tipo_de_documento: 1,
        tipoDoc: "1",
        tipoIdentidad: "1",
        tipoDocumentoConductor: "1",
        tipo: "Principal",
        
        documento_numero: driverDni,
        conductor_documento_numero: driverDni,
        numero_de_documento: driverDni,
        nroDoc: driverDni,
        numeroDocumentoConductor: driverDni,
        conductor_numero_de_documento: driverDni,
        chofer_documento_numero: driverDni,
        chofer_numero_de_documento: driverDni,
        
        denominacion: driverName,
        conductor_denominacion: driverName,
        nombre: conductor_nombre,
        conductor_nombre: conductor_nombre,
        nombres: driverName,
        apellidos: conductor_apellidos,
        conductor_apellidos: conductor_apellidos,
        conductor_nombres: driverName,
        chofer_denominacion: driverName,
        chofer_nombre: driverName,
        chofer_nombres: driverName,
        nombres_y_apellidos: driverName,
        
        licencia: driverLicence,
        conductor_licencia: driverLicence,
        licencia_de_conducir: driverLicence,
        conductor_licencia_de_conducir: driverLicence,
        licencia_conductor: driverLicence,
        licencia_chofer: driverLicence,
        numeroLicencia: driverLicence,
        conductor_licencia_numero: driverLicence,
        conductor_licencia_nro: driverLicence,
        conductor_numero_licencia: driverLicence,
        chofer_licencia: driverLicence,
        chofer_licencia_nro: driverLicence,
        chofer_licencia_numero: driverLicence,
        chofer_licencia_de_conducir: driverLicence,
      },
      conductores: [
        {
          documento_tipo: 1,
          conductor_documento_tipo: 1,
          tipo_de_documento: 1,
          tipoDoc: "1",
          tipoIdentidad: "1",
          tipoDocumentoConductor: "1",
          tipo: "Principal",
          
          documento_numero: driverDni,
          conductor_documento_numero: driverDni,
          numero_de_documento: driverDni,
          nroDoc: driverDni,
          numeroDocumentoConductor: driverDni,
          conductor_numero_de_documento: driverDni,
          chofer_documento_numero: driverDni,
          chofer_numero_de_documento: driverDni,
          
          denominacion: driverName,
          conductor_denominacion: driverName,
          nombre: conductor_nombre,
          conductor_nombre: conductor_nombre,
          nombres: driverName,
          apellidos: conductor_apellidos,
          conductor_apellidos: conductor_apellidos,
          conductor_nombres: driverName,
          chofer_denominacion: driverName,
          chofer_nombre: driverName,
          chofer_nombres: driverName,
          nombres_y_apellidos: driverName,
          
          licencia: driverLicence,
          conductor_licencia: driverLicence,
          licencia_de_conducir: driverLicence,
          conductor_licencia_de_conducir: driverLicence,
          licencia_conductor: driverLicence,
          licencia_chofer: driverLicence,
          numeroLicencia: driverLicence,
          conductor_licencia_numero: driverLicence,
          conductor_licencia_nro: driverLicence,
          conductor_numero_licencia: driverLicence,
          chofer_licencia: driverLicence,
          chofer_licencia_nro: driverLicence,
          chofer_licencia_numero: driverLicence,
          chofer_licencia_de_conducir: driverLicence,
        }
      ],
      choferes: [
        {
          documento_tipo: 1,
          conductor_documento_tipo: 1,
          tipo_de_documento: 1,
          tipoDoc: "1",
          tipoIdentidad: "1",
          tipoDocumentoConductor: "1",
          tipo: "Principal",
          
          documento_numero: driverDni,
          conductor_documento_numero: driverDni,
          numero_de_documento: driverDni,
          nroDoc: driverDni,
          numeroDocumentoConductor: driverDni,
          conductor_numero_de_documento: driverDni,
          chofer_documento_numero: driverDni,
          chofer_numero_de_documento: driverDni,
          
          denominacion: driverName,
          conductor_denominacion: driverName,
          nombre: conductor_nombre,
          conductor_nombre: conductor_nombre,
          nombres: driverName,
          apellidos: conductor_apellidos,
          conductor_apellidos: conductor_apellidos,
          conductor_nombres: driverName,
          chofer_denominacion: driverName,
          chofer_nombre: driverName,
          chofer_nombres: driverName,
          nombres_y_apellidos: driverName,
          
          licencia: driverLicence,
          conductor_licencia: driverLicence,
          licencia_de_conducir: driverLicence,
          conductor_licencia_de_conducir: driverLicence,
          licencia_conductor: driverLicence,
          licencia_chofer: driverLicence,
          numeroLicencia: driverLicence,
          conductor_licencia_numero: driverLicence,
          conductor_licencia_nro: driverLicence,
          conductor_numero_licencia: driverLicence,
          chofer_licencia: driverLicence,
          chofer_licencia_nro: driverLicence,
          chofer_licencia_numero: driverLicence,
          chofer_licencia_de_conducir: driverLicence,
        }
      ],
      documentochoferes: [
        {
          documento_tipo: 1,
          conductor_documento_tipo: 1,
          tipo_de_documento: 1,
          tipoDoc: "1",
          tipoIdentidad: "1",
          tipoDocumentoConductor: "1",
          tipo: "Principal",
          
          documento_numero: driverDni,
          conductor_documento_numero: driverDni,
          numero_de_documento: driverDni,
          nroDoc: driverDni,
          numeroDocumentoConductor: driverDni,
          conductor_numero_de_documento: driverDni,
          chofer_documento_numero: driverDni,
          chofer_numero_de_documento: driverDni,
          
          denominacion: driverName,
          conductor_denominacion: driverName,
          nombre: conductor_nombre,
          conductor_nombre: conductor_nombre,
          nombres: driverName,
          apellidos: conductor_apellidos,
          conductor_apellidos: conductor_apellidos,
          conductor_nombres: driverName,
          chofer_denominacion: driverName,
          chofer_nombre: driverName,
          chofer_nombres: driverName,
          nombres_y_apellidos: driverName,
          
          licencia: driverLicence,
          conductor_licencia: driverLicence,
          licencia_de_conducir: driverLicence,
          conductor_licencia_de_conducir: driverLicence,
          licencia_conductor: driverLicence,
          licencia_chofer: driverLicence,
          numeroLicencia: driverLicence,
          conductor_licencia_numero: driverLicence,
          conductor_licencia_nro: driverLicence,
          conductor_numero_licencia: driverLicence,
          chofer_licencia: driverLicence,
          chofer_licencia_nro: driverLicence,
          chofer_licencia_numero: driverLicence,
          chofer_licencia_de_conducir: driverLicence,
        }
      ],
      vehiculo: {
        placa: plate,
        vehiculo_placa: plate,
        transportista_placa_numero: plate,
      },
      transportista: {
        placa: plate,
        vehiculo_placa: plate,
        transportista_placa_numero: plate,
      },
      enviar_a_sunat: true,
      // Reference to the associated invoice/boleta
      ...(docRefTipo && docRefSerie && docRefNumero ? {
        documento_asociado_tipo: docRefTipo,
        documento_asociado_serie: docRefSerie,
        documento_asociado_numero: parseInt(docRefNumero),
        documentos_relacionados: [
          {
            tipo_de_documento_relacionado: docRefTipo,
            numero_de_documento_relacionado: `${docRefSerie}-${docRefNumero}`,
            ruc_documento_relacionado: "20611188715"
          }
        ]
      } : {}),
      items: sale.items.map((item, index) => ({
        item: index + 1,
        codigo: item.variant.variantSku,
        descripcion: `${item.variant.product.name} (${item.variant.size}/${item.variant.color})`,
        cantidad: item.quantity,
        unidad_de_medida: "NIU"
      }))
    };

    // Debug: write payload before calling the API
    try {
      require('fs').writeFileSync('debug_gre.json', JSON.stringify({ payload }, null, 2));
    } catch (e) {}
    console.log("GRE Payload sent to Nubefact:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': API_TOKEN
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log("GRE Response from Nubefact:", JSON.stringify(result, null, 2));

      // Debug: write payload and API response
      try {
        require('fs').writeFileSync('debug_gre.json', JSON.stringify({ payload, result }, null, 2));
      } catch (e) {}

      if (result.errors) {
        throw new Error(result.errors);
      }

      // Update sale with guide info
      await this.prisma.sale.update({
        where: { id: saleId },
        data: {
          referralGuide: finalGuideNumber,
          sunatGuidePdfUrl: result.enlace_del_pdf || result.enlace || null,
        }
      });

      return {
        success: true,
        message: 'Guía de remisión generada y enviada a SUNAT correctamente',
        data: result
      };
    } catch (error: any) {
      console.error('Error generating GRE:', error);
      throw new BadRequestException('Error al generar la Guía de Remisión: ' + error.message);
    }
  }

  async consultarGuia(saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (!sale.referralGuide) throw new BadRequestException('Esta venta no tiene guía de remisión generada');

    const API_TOKEN = process.env.SUNAT_INVOICING_TOKEN;
    const API_URL = process.env.SUNAT_INVOICING_URL;

    if (!API_TOKEN || !API_URL) {
      throw new BadRequestException('API de Facturación no configurada en el servidor');
    }

    const parts = sale.referralGuide.split('-');
    const series = parts[0];
    const numero = parseInt(parts[1]);

    const payload = {
      operacion: "consultar_guia",
      tipo_de_comprobante: 7,
      serie: series,
      numero: numero,
    };

    console.log("Consultar Guia Payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': API_TOKEN
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log("Consultar Guia Response:", JSON.stringify(result, null, 2));

      const pdfUrl = result.enlace_del_pdf || result.enlace || null;
      const cdrUrl = result.enlace_del_cdr || null;
      const xmlUrl = result.enlace_del_xml || null;

      // Update the sale with the PDF URL if available
      if (pdfUrl) {
        await this.prisma.sale.update({
          where: { id: saleId },
          data: {
            sunatGuidePdfUrl: pdfUrl,
          }
        });
      }

      return {
        success: true,
        pdfUrl: pdfUrl,
        cdrUrl: cdrUrl,
        xmlUrl: xmlUrl,
        accepted: result.aceptada_por_sunat !== undefined ? result.aceptada_por_sunat : null,
        sunatDescription: result.sunat_description || result.cadena_para_codigo_qr || null,
        data: result
      };
    } catch (error: any) {
      console.error('Error consulting GRE:', error);
      throw new BadRequestException('Error al consultar la Guía de Remisión: ' + error.message);
    }
  }
}
