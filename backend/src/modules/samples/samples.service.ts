import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SamplesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) { }

  private generateNumericBarcode(): string {
    const prefix = '775';
    let randomPart = '';
    for (let i = 0; i < 9; i++) {
      randomPart += Math.floor(Math.random() * 10).toString();
    }
    return prefix + randomPart;
  }

  async create(udpId: string, data: any) {
    const { name, code, description, characteristics, images, materials, isExisting } = data;
    
    return await this.prisma.$transaction(async (tx) => {
      const sample = await (tx as any).productSample.create({
        data: {
          name,
          code,
          description,
          characteristics,
          images: images || [],
          udpId,
          isExisting: !!isExisting,
          materialReceiptStatus: isExisting ? 'DESARROLLO_COMPLETADO' : (materials && materials.length > 0 ? 'PENDIENTE_ADMIN' : null),
          adminOpApprovalStatus: 'SIN_OP',
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
        if (!isExisting) {
          await this.notifications.create({
            title: 'Nueva Solicitud de Materiales para Muestra',
            message: `UDP ha solicitado materiales para la muestra: ${name} ${code ? `(Código: ${code})` : ''}`,
            type: 'SAMPLE_MATERIAL_REQUEST',
            referenceId: sample.id,
            targetRole: 'ADMIN',
          });
        }
      }

      return sample;
    });
  }

  async findAll(user?: any) {
    const where: any = {};
    return (this.prisma as any).productSample.findMany({
      where,
      include: {
        udp: { select: { name: true } },
        commercial: { select: { name: true } },
        materials: {
          include: { 
            product: {
              include: { variants: true }
            }
          }
        },
        processAudits: true
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
          include: { 
            product: {
              include: { variants: true }
            }
          }
        },
        processAudits: true
      },
    });
    if (!sample) throw new NotFoundException('Muestra no encontrada');
    return sample;
  }

  async updateReview(id: string, commercialId: string, data: any) {
    const { status, observations, recommendations, materials, op, barcode, productionQuantity, productionColor, productionSizeData } = data;

    const existingSample = await this.findOne(id);

    if (existingSample.adminOpApprovalStatus === 'APROBADO' && op && op !== existingSample.op) {
      throw new BadRequestException('Esta OP ya ha sido aprobada por el Administrador y no puede ser modificada.');
    }

    const hasOPCreation = !!(op && op.trim());
    
    // Ensure pure numeric barcode
    let sampleBarcode = barcode || existingSample.barcode;
    if (!sampleBarcode || !/^\d+$/.test(sampleBarcode)) {
      sampleBarcode = this.generateNumericBarcode();
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Update status and observations
      const updatedSample = await (tx as any).productSample.update({
        where: { id },
        data: {
          status,
          observations,
          recommendations,
          barcode: sampleBarcode,
          op: hasOPCreation ? op.trim() : (status === 'APROBADO' ? existingSample.op : null),
          productionQuantity: hasOPCreation ? (productionQuantity || null) : (status === 'APROBADO' ? existingSample.productionQuantity : null),
          productionColor: hasOPCreation ? (productionColor || null) : (status === 'APROBADO' ? existingSample.productionColor : null),
          productionSizeData: hasOPCreation ? (productionSizeData || null) : (status === 'APROBADO' ? existingSample.productionSizeData : null),
          commercialId,
          approvedAt: status === 'APROBADO' ? (existingSample.approvedAt || new Date()) : null,
          adminOpApprovalStatus: hasOPCreation ? 'PENDIENTE' : (status === 'APROBADO' ? (existingSample.adminOpApprovalStatus || 'SIN_OP') : 'SIN_OP'),
          materialReceiptStatus: hasOPCreation ? 'DESARROLLO_COMPLETADO' : existingSample.materialReceiptStatus,
        },
      });

      // 2. If approved/has materials, handle BOM (Materials)
      if (materials && materials.length > 0) {
        // Clear previous materials if any
        await (tx as any).sampleMaterial.deleteMany({ where: { sampleId: id } });

        for (const mat of materials) {
          const productIdVal = mat.productId && !String(mat.productId).startsWith('custom-') ? mat.productId : null;

          if (!productIdVal) {
            // Save as custom material if no product ID
            await (tx as any).sampleMaterial.create({
              data: {
                sampleId: id,
                productId: null,
                customMaterial: mat.name || mat.customMaterial || 'Material Personalizado',
                quantity: mat.totalQuantity || mat.quantity || mat.quantityPerUnit || 1,
                unitPriceAtTime: mat.unitPrice || mat.price || 0,
              },
            });
            continue;
          }

          const product = await tx.product.findUnique({ where: { id: productIdVal } });
          if (!product) {
            // Save as custom material if product not found in database
            await (tx as any).sampleMaterial.create({
              data: {
                sampleId: id,
                productId: null,
                customMaterial: mat.name || mat.customMaterial || `Insumo Especial (${productIdVal})`,
                quantity: mat.totalQuantity || mat.quantity || mat.quantityPerUnit || 1,
                unitPriceAtTime: mat.unitPrice || mat.price || 0,
              },
            });
            continue;
          }

          await (tx as any).sampleMaterial.create({
            data: {
              sampleId: id,
              productId: productIdVal,
              quantity: mat.totalQuantity || mat.quantity || mat.quantityPerUnit || 1,
              unitPriceAtTime: product.purchasePrice || mat.unitPrice || mat.price || 0,
            },
          });
        }
      }

      // If Commercial created an OP, notify Admin
      if (hasOPCreation) {
        await tx.notification.create({
          data: {
            title: existingSample.op ? 'OP Actualizada por Comercial' : 'Nueva OP Creada para Producción',
            message: `Comercial ha registrado la OP ${op.trim()} (${productionQuantity || 0} prendas) para la muestra ${existingSample.name}. Pendiente de aprobación de Admin.`,
            type: 'SAMPLE_APPROVED',
            referenceId: id,
            targetRole: 'ADMIN',
          }
        });
      } else if (status === 'APROBADO' && existingSample.status !== 'APROBADO') {
        // Just prototype approval
        await tx.notification.create({
          data: {
            title: 'Muestra Aprobada por Comercial',
            message: `Comercial ha aprobado el prototipo de la muestra: ${existingSample.name} ${existingSample.code ? `(${existingSample.code})` : ''}.`,
            type: 'SAMPLE_APPROVED',
            referenceId: id,
            userId: (existingSample as any).udpId,
          }
        });
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
      message: `Admin ha aprobado los materiales para la muestra ${sample.name} ${sample.code ? `(Código: ${sample.code})` : ''}. Logística puede proceder con la entrega.`,
      type: 'SAMPLE_MATERIAL_APPROVED',
      referenceId: id,
      targetRole: 'LOGISTICA',
    });

    return updated;
  }

  async adminApproveOP(id: string, notes?: string) {
    const sample = await this.findOne(id);
    const updated = await (this.prisma as any).productSample.update({
      where: { id },
      data: {
        adminOpApprovalStatus: 'APROBADO',
        // Optional: Could store admin notes here if we had a field
      }
    });

    await this.notifications.create({
      title: 'OP Aprobada por Administrador',
      message: `El administrador ha aprobado la muestra ${sample.name} y su OP ${sample.op}. Ya está disponible para Auditoría de Procesos.`,
      type: 'OP_APPROVED',
      referenceId: id,
      targetRole: 'UDP', // or whatever role audits
    });

    return updated;
  }

  async dischargeInventory(id: string, discharges: { materialId: string, variantId: string, quantity: number }[], userId: string) {
    const sample = await this.findOne(id);
    
    return await this.prisma.$transaction(async (tx) => {
      for (const item of discharges) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        if (!variant) throw new BadRequestException(`Variante ${item.variantId} no encontrada`);
        if (variant.stock < item.quantity) {
          throw new BadRequestException(`Stock insuficiente para ${variant.variantSku}`);
        }

        const newStock = variant.stock - item.quantity;

        // movement
        await tx.movement.create({
          data: {
            type: 'EXIT',
            quantity: item.quantity,
            reason: `Descarga para Muestra ${sample.name} (${sample.code || id})`,
            previousStock: variant.stock,
            newStock: newStock,
            variantId: item.variantId,
            userId: userId,
            reference: sample.code || sample.id
          }
        });

        // update stock
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock }
        });
      }

      if ((sample as any).isExisting) {
        await tx.productSample.update({
          where: { id },
          data: { materialReceiptStatus: 'DESCARGADO_LOGISTICA' }
        });
      }

      return { success: true };
    });
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
      message: `Logística ha entregado los materiales para la muestra ${sample.name} ${sample.code ? `(Código: ${sample.code})` : ''}. UDP debe confirmar recepción.`,
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

  async saveUdpRequirements(id: string, udpRequirements: any) {
    return await (this.prisma as any).productSample.update({
      where: { id },
      data: { udpRequirements }
    });
  }

  async update(id: string, udpId: string, data: any) {
    const sample = await this.findOne(id);
    if (sample.status === 'COMPLETADO_INVENTARIO') {
      throw new BadRequestException('No se puede editar una muestra que ya ha sido completada en inventario');
    }

    const { name, code, description, characteristics, images, materials } = data;

    return await this.prisma.$transaction(async (tx) => {
      const updated = await (tx as any).productSample.update({
        where: { id },
        data: {
          name: name !== undefined ? name : sample.name,
          code: code !== undefined ? code : sample.code,
          description: description !== undefined ? description : sample.description,
          characteristics: characteristics !== undefined ? characteristics : sample.characteristics,
          images: images !== undefined ? images : sample.images,
          status: sample.status === 'OBSERVADO' ? 'PENDIENTE' : sample.status,
        },
      });

      if (materials && Array.isArray(materials)) {
        await (tx as any).sampleMaterial.deleteMany({ where: { sampleId: id } });
        for (const mat of materials) {
          await (tx as any).sampleMaterial.create({
            data: {
              sampleId: id,
              productId: mat.productId || null,
              customMaterial: mat.customMaterial || (!mat.productId ? mat.name : null),
              quantity: mat.quantity || 1,
              unitPriceAtTime: mat.unitPriceAtTime || 0,
            },
          });
        }
      }

      // Notify Commercial about the update
      await tx.notification.create({
        data: {
          title: 'Muestra Actualizada por UDP',
          message: `UDP ha actualizado los datos de la muestra: ${updated.name} ${updated.code ? `(${updated.code})` : ''}. Lista para revisión comercial.`,
          type: 'SAMPLE_DEVELOPMENT_COMPLETED',
          referenceId: id,
          targetRole: 'COMERCIAL',
        }
      });

      return updated;
    });
  }
}
