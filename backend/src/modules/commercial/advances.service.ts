import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdvancesService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateAdvanceCode(): Promise<string> {
    const totalCount = await this.prisma.clientAdvance.count();
    let nextNum = totalCount + 1;
    let code = `AD-${String(nextNum).padStart(6, '0')}`;
    
    // Ensure uniqueness
    let exists = await this.prisma.clientAdvance.findUnique({ where: { code } });
    while (exists) {
      nextNum++;
      code = `AD-${String(nextNum).padStart(6, '0')}`;
      exists = await this.prisma.clientAdvance.findUnique({ where: { code } });
    }
    return code;
  }

  async create(userId: string, data: any) {
    const { clientId, amount, paymentMethod, reference, description, evidenceUrl, createdAt } = data;

    if (!clientId) {
      throw new BadRequestException('Debe seleccionar un cliente.');
    }

    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestException('El monto del adelanto debe ser mayor a 0.');
    }

    const code = await this.generateAdvanceCode();

    const advance = await this.prisma.clientAdvance.create({
      data: {
        code,
        clientId,
        amount: parsedAmount,
        usedAmount: 0,
        remainingAmount: parsedAmount,
        paymentMethod: paymentMethod || 'EFECTIVO',
        reference: reference || null,
        description: description || null,
        evidenceUrl: evidenceUrl || null,
        status: 'DISPONIBLE',
        createdById: userId,
        createdAt: createdAt ? new Date(createdAt) : new Date(),
      },
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    return advance;
  }

  async findAll(user: any, query: any) {
    const { search, status, clientId, startDate, endDate } = query;
    const where: any = {};

    // Vendor zone restriction
    if (user?.role === 'VENDEDOR_LIMA') {
      where.client = { zone: 'LIMA' };
    } else if (user?.role === 'VENDEDOR_ORIENTE') {
      where.client = { zone: 'ORIENTE' };
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { client: { name: { contains: term, mode: 'insensitive' } } },
        { client: { documentNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const advances = await this.prisma.clientAdvance.findMany({
      where,
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true }
        },
        usages: {
          include: {
            sale: {
              select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                createdAt: true,
                paymentStatus: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return advances;
  }

  async getStats(user: any) {
    const where: any = {};
    if (user?.role === 'VENDEDOR_LIMA') {
      where.client = { zone: 'LIMA' };
    } else if (user?.role === 'VENDEDOR_ORIENTE') {
      where.client = { zone: 'ORIENTE' };
    }

    const advances = await this.prisma.clientAdvance.findMany({
      where,
      select: {
        amount: true,
        usedAmount: true,
        remainingAmount: true,
        status: true,
      }
    });

    const totalRecaudado = advances.reduce((sum, a) => sum + a.amount, 0);
    const totalDisponible = advances.reduce((sum, a) => sum + a.remainingAmount, 0);
    const totalConsumido = advances.reduce((sum, a) => sum + a.usedAmount, 0);
    const totalActivos = advances.filter(a => a.status === 'DISPONIBLE' || a.status === 'PARCIAL').length;

    return {
      totalRecaudado,
      totalDisponible,
      totalConsumido,
      totalActivos,
      totalCount: advances.length
    };
  }

  async findOne(id: string) {
    const advance = await this.prisma.clientAdvance.findUnique({
      where: { id },
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true }
        },
        usages: {
          include: {
            sale: {
              select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                createdAt: true,
                paymentStatus: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!advance) throw new NotFoundException('Adelanto no encontrado');
    return advance;
  }

  async getAvailableForClient(clientId: string) {
    if (!clientId) return [];

    const advances = await this.prisma.clientAdvance.findMany({
      where: {
        clientId,
        remainingAmount: { gt: 0.009 },
        status: { in: ['DISPONIBLE', 'PARCIAL'] }
      },
      orderBy: { createdAt: 'asc' }
    });

    return advances;
  }

  async delete(id: string) {
    const advance = await this.prisma.clientAdvance.findUnique({
      where: { id },
      include: { usages: true }
    });

    if (!advance) throw new NotFoundException('Adelanto no encontrado');

    if (advance.usedAmount > 0.01 || advance.usages.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar el adelanto ${advance.code} porque ya fue utilizado en ventas. Saldo consumido: S/ ${advance.usedAmount.toFixed(2)}.`
      );
    }

    await this.prisma.clientAdvance.delete({
      where: { id }
    });

    return { success: true, message: `Adelanto ${advance.code} eliminado correctamente.` };
  }

  async getSaleCreditInfo(saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        client: true,
        items: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        },
        payments: true
      }
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada.');
    }

    const totalPaid = (sale.payments || [])
      .filter((p: any) => p.status === 'APROBADO' || p.status === 'CONCILIADO')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    const invoiceNum = sale.invoiceNumber?.trim();
    let unconvertedReturns: any[] = [];
    let unconvertedReturnedValue = 0;

    const sizeFields = ['s28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46', 'size48', 'size50', 'size52'];
    const normalize = (str: string) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
    const normalizeFuzzy = (str: string) => normalize(str).replace(/Y/g, 'I');

    if (invoiceNum) {
      const allReturns = await this.prisma.returnRequest.findMany({
        where: {
          status: 'COMPLETADO',
          OR: [
            { reason: { contains: invoiceNum, mode: 'insensitive' } },
            { clientId: sale.clientId || undefined }
          ]
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      });

      unconvertedReturns = allReturns.filter((req: any) => {
        const invoiceMatch = req.reason && req.reason.match(/\[Comprobante:\s*([^\]]+)\]/i);
        const matchedInvoice = invoiceMatch ? invoiceMatch[1].trim() : null;
        const directMention = req.reason && req.reason.toUpperCase().includes(invoiceNum.toUpperCase());
        if (!matchedInvoice && !directMention) return false;
        if (matchedInvoice && matchedInvoice.toUpperCase() !== invoiceNum.toUpperCase()) return false;

        // Skip if already credited via credit note or advance
        const hasNC = (req.reason && req.reason.match(/\[NC:\s*([^\]]+)\]/i)) || (req.qualityObservations && req.qualityObservations.match(/\[NC:\s*([^\]]+)\]/i));
        const hasAdvance = (req.reason && req.reason.match(/\[Adelanto:\s*([^\]]+)\]/i)) || (req.qualityObservations && req.qualityObservations.match(/\[Adelanto:\s*([^\]]+)\]/i));
        if (hasNC || hasAdvance) return false;

        return true;
      });

      for (const ret of unconvertedReturns) {
        let retTotal = 0;
        for (const it of ret.items) {
          const mNorm = normalize(it.modelName);
          const mFuzzy = normalizeFuzzy(it.modelName);
          const matchingSaleItem = (sale.items || []).find((si: any) =>
            normalize(si.variant?.product?.name) === mNorm
          ) || (sale.items || []).find((si: any) =>
            normalizeFuzzy(si.variant?.product?.name) === mFuzzy
          ) || (sale.items || []).find((si: any) => {
            const pNorm = normalize(si.variant?.product?.name || '');
            return pNorm.includes(mNorm) || mNorm.includes(pNorm);
          });

          let unitPrice = matchingSaleItem ? matchingSaleItem.unitPrice : 0;
          if (!unitPrice || unitPrice <= 0) {
            const totalSaleQty = (sale.items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0);
            unitPrice = totalSaleQty > 0 ? (sale.totalAmount / totalSaleQty) : 0;
          }
          unitPrice = Math.round(unitPrice * 100) / 100;

          let itemQty = it.quantity || 0;
          if (!itemQty || itemQty === 0) {
            itemQty = sizeFields.reduce((acc, field) => acc + ((it as any)[field] || 0), 0);
          }
          retTotal += Math.round(itemQty * unitPrice * 100) / 100;
        }
        unconvertedReturnedValue += retTotal;
      }
    }

    // Determine effective total of sale:
    const originalItemsSum = (sale.items || []).reduce((acc: number, it: any) => acc + ((it.quantity || 0) * (it.unitPrice || 0)), 0);
    let effectiveTotal = sale.totalAmount;
    const candidateEffectiveTotal = Math.max(0, Math.round((sale.totalAmount - unconvertedReturnedValue) * 100) / 100);
    if (unconvertedReturnedValue > 0 && Math.abs(sale.totalAmount - originalItemsSum) <= 0.05 && totalPaid > candidateEffectiveTotal + 0.009) {
      effectiveTotal = candidateEffectiveTotal;
    }

    // Surplus = what was paid above effectiveTotal
    const surplusAmount = Math.max(0, Math.round((totalPaid - effectiveTotal) * 100) / 100);

    const convertedPayment = (sale.payments || []).find((p: any) => p.advanceId && p.amount < 0);
    let convertedAdvance: any = null;
    if (convertedPayment && (convertedPayment as any).advanceId) {
      convertedAdvance = await this.prisma.clientAdvance.findUnique({
        where: { id: (convertedPayment as any).advanceId }
      });
    }

    return {
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      clientName: sale.client?.name,
      clientId: sale.clientId,
      totalAmount: sale.totalAmount,
      effectiveTotal,
      totalPaid,
      surplusAmount,
      hasSurplus: surplusAmount > 0.009,
      unconvertedReturnsCount: unconvertedReturns.length,
      unconvertedReturnedValue,
      activeCompletedReturns: unconvertedReturns.map((r: any) => ({
        id: r.id,
        returnNumber: r.returnNumber,
        itemsCount: r.items?.length || 0,
      })),
      convertedAdvance
    };
  }

  async convertFromSaleCredit(userId: string, data: { saleId: string; amount?: number; notes?: string }) {
    const { saleId, amount, notes } = data;
    if (!saleId) {
      throw new BadRequestException('ID de venta requerido.');
    }

    const creditInfo = await this.getSaleCreditInfo(saleId);
    if (!creditInfo.hasSurplus || creditInfo.surplusAmount <= 0.009) {
      throw new BadRequestException('Esta venta no cuenta con saldo a favor por devolución disponible para transferir a adelantos.');
    }
    if (!creditInfo.clientId) {
      throw new BadRequestException('La venta no tiene un cliente válido asignado para crear el adelanto.');
    }

    const targetAmount = amount && parseFloat(amount as any) > 0 
      ? Math.min(parseFloat(amount as any), creditInfo.surplusAmount) 
      : creditInfo.surplusAmount;

    const code = await this.generateAdvanceCode();

    return await this.prisma.$transaction(async (tx) => {
      // 1. If sale totalAmount needs to be updated to effectiveTotal
      if (Math.abs(creditInfo.totalAmount - creditInfo.effectiveTotal) > 0.01) {
        await tx.sale.update({
          where: { id: saleId },
          data: { totalAmount: creditInfo.effectiveTotal }
        });
      }

      // 2. Create the ClientAdvance
      const advance = await tx.clientAdvance.create({
        data: {
          code,
          clientId: creditInfo.clientId as string,
          amount: targetAmount,
          usedAmount: 0,
          remainingAmount: targetAmount,
          paymentMethod: 'DEVOLUCION',
          reference: creditInfo.invoiceNumber ? `Devolución ${creditInfo.invoiceNumber}` : `Devolución Venta #${saleId.slice(-6)}`,
          description: notes || `Saldo a favor por devolución de prendas reingresadas a almacén (Comprobante: ${creditInfo.invoiceNumber || saleId})`,
          status: 'DISPONIBLE',
          createdById: userId,
        },
        include: {
          client: true,
          createdBy: { select: { id: true, name: true } }
        }
      });

      // 3. Register the negative adjustment payment in the sale
      await tx.salePayment.create({
        data: {
          saleId,
          amount: -targetAmount,
          paymentDate: new Date(),
          method: 'ADELANTO',
          notes: `Traspaso a módulo Adelantos (${code}) por saldo a favor de devolución`,
          status: 'APROBADO',
          registeredById: userId,
          advanceId: advance.id
        }
      });

      // 4. Tag the active completed returns so they aren't counted again
      if (creditInfo.activeCompletedReturns && creditInfo.activeCompletedReturns.length > 0) {
        for (const ret of creditInfo.activeCompletedReturns) {
          const existingReq = await tx.returnRequest.findUnique({ where: { id: ret.id } });
          if (existingReq) {
            const updatedReason = `${existingReq.reason || ''} [Adelanto: ${code}]`.trim();
            await tx.returnRequest.update({
              where: { id: ret.id },
              data: { reason: updatedReason }
            });
          }
        }
      }

      // 5. Ensure sale payment status is CANCELADO
      await tx.sale.update({
        where: { id: saleId },
        data: { paymentStatus: 'CANCELADO' }
      });

      return {
        success: true,
        advance,
        surplus: targetAmount,
        message: `Saldo a favor de S/ ${targetAmount.toFixed(2)} transferido correctamente a Adelantos (${code}).`
      };
    });
  }
}
