import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SamplesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) { }

  async create(udpId: string, data: any) {
    const { name, description, characteristics, images, materials } = data;
    
    return await this.prisma.$transaction(async (tx) => {
      const sample = await (tx as any).productSample.create({
        data: {
          name,
          description,
          characteristics,
          images: images || [],
          udpId,
          materialReceiptStatus: materials && materials.length > 0 ? 'PENDIENTE_ADMIN' : null,
        },
      });

      if (materials && materials.length > 0) {
        for (const mat of materials) {
          await (tx as any).sampleMaterial.create({
            data: {
              sampleId: sample.id,
              productId: mat.productId || null,
              customMaterial: mat.customMaterial || null,
              quantity: mat.quantity || 1,
              unitPriceAtTime: mat.unitPriceAtTime || 0,
            },
          });
        }

        // Notify Admin
        await this.notifications.create({
          title: 'Nueva Solicitud de Materiales para Muestra',
          message: `El usuario UDP ha solicitado materiales para la muestra: ${name}`,
          type: 'SAMPLE_MATERIAL_REQUEST',
          referenceId: sample.id,
          targetRole: 'ADMIN',
        });
      }

      return sample;
    });
  }

  async findAll(user?: any) {
    const where: any = {};
    if (user?.role === 'COMERCIAL') {
      where.OR = [
        { status: { not: 'PENDIENTE' } },
        { materialReceiptStatus: 'DESARROLLO_COMPLETADO' }
      ];
    }
    return (this.prisma as any).productSample.findMany({
      where,
      include: {
        udp: { select: { name: true } },
        commercial: { select: { name: true } },
        materials: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sample = await (this.prisma as any).productSample.findUnique({
      where: { id },
      include: {
        udp: { select: { name: true } },
        commercial: { select: { name: true } },
        materials: {
          include: { product: true }
        }
      },
    });
    if (!sample) throw new NotFoundException('Muestra no encontrada');
    return sample;
  }

  async updateReview(id: string, commercialId: string, data: any) {
    const { status, observations, recommendations, materials, op, productionQuantity, productionColor, productionSizeData } = data;

    const existingSample = await this.findOne(id);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Update status and observations
      const updatedSample = await (tx as any).productSample.update({
        where: { id },
        data: {
          status,
          observations,
          recommendations,
          op: status === 'APROBADO' ? (op || null) : null,
          productionQuantity: status === 'APROBADO' ? (productionQuantity || null) : null,
          productionColor: status === 'APROBADO' ? (productionColor || null) : null,
          productionSizeData: status === 'APROBADO' ? (productionSizeData || null) : null,
          commercialId,
          approvedAt: status === 'APROBADO' ? new Date() : null,
        },
      });

      // 2. If approved, handle BOM (Materials) - This is for final production BOM
      if (status === 'APROBADO' && materials && materials.length > 0) {
        // Clear previous materials if any
        await (tx as any).sampleMaterial.deleteMany({ where: { sampleId: id } });

        for (const mat of materials) {
          const product = await tx.product.findUnique({ where: { id: mat.productId } });
          if (!product) throw new BadRequestException(`Material/Insumo no encontrado: ${mat.productId}`);

          await (tx as any).sampleMaterial.create({
            data: {
              sampleId: id,
              productId: mat.productId,
              quantity: mat.quantity || 1,
              unitPriceAtTime: product.purchasePrice,
            },
          });
        }
      }

      return updatedSample;
    });
  }

  async adminApproveMaterials(id: string, notes?: string) {
    const sample = await this.findOne(id);
    const updated = await (this.prisma as any).productSample.update({
      where: { id },
      data: {
        materialReceiptStatus: 'APROBADO_ADMIN',
        adminMaterialNotes: notes,
      }
    });

    await this.notifications.create({
      title: 'Materiales Aprobados por Admin',
      message: `Admin ha aprobado los materiales para la muestra ${sample.name}. Logística puede proceder con la entrega.`,
      type: 'SAMPLE_MATERIAL_APPROVED',
      referenceId: id,
      targetRole: 'LOGISTICA',
    });

    return updated;
  }

  async logisticsDeliverMaterials(id: string) {
    const sample = await this.findOne(id);
    const updated = await (this.prisma as any).productSample.update({
      where: { id },
      data: {
        materialReceiptStatus: 'ENTREGADO_LOGISTICA',
        logisticsMaterialDate: new Date(),
      }
    });

    await this.notifications.create({
      title: 'Materiales Entregados por Logística',
      message: `Logística ha entregado los materiales para la muestra ${sample.name}. UDP debe confirmar recepción.`,
      type: 'SAMPLE_MATERIAL_DELIVERED',
      referenceId: id,
      userId: (sample as any).udpId, // Solo el creador de la muestra
    });

    return updated;
  }

  async udpConfirmMaterials(id: string) {
    const updated = await (this.prisma as any).productSample.update({
      where: { id },
      data: {
        materialReceiptStatus: 'RECIBIDO_UDP',
        udpMaterialReceivedAt: new Date(),
      }
    });

    return updated;
  }

  async udpCompleteDevelopment(id: string) {
    const sample = await this.findOne(id);
    const updated = await (this.prisma as any).productSample.update({
      where: { id },
      data: {
        materialReceiptStatus: 'DESARROLLO_COMPLETADO',
      }
    });

    await this.notifications.create({
      title: 'Muestra Lista para Revisión',
      message: `UDP ha finalizado el desarrollo de la muestra ${sample.name}. Puede proceder a revisarla.`,
      type: 'SAMPLE_DEVELOPMENT_COMPLETED',
      referenceId: id,
      targetRole: 'COMERCIAL',
    });

    return updated;
  }

  async update(id: string, udpId: string, data: any) {
    const sample = await this.findOne(id);
    if (sample.status !== 'PENDIENTE') {
      throw new BadRequestException('No se puede editar una muestra que ya ha sido revisada');
    }
    if ((sample as any).udpId !== udpId) {
      throw new BadRequestException('No tienes permiso para editar esta muestra');
    }

    const { name, description, characteristics, images } = data;
    return (this.prisma as any).productSample.update({
      where: { id },
      data: {
        name,
        description,
        characteristics,
        images: images || [],
      },
    });
  }
}
