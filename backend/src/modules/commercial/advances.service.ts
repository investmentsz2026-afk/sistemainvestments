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
}
