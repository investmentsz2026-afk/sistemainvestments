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

  private generateOpBarcode(cleanOp: string, used?: Set<string>): string {
    const opDigits = cleanOp || '0000';
    const prefix = '775';
    let attempts = 0;
    while (attempts < 1000) {
      const neededRandom = Math.max(0, 12 - prefix.length - opDigits.length);
      let rand = '';
      for (let i = 0; i < neededRandom; i++) rand += Math.floor(Math.random() * 10).toString();
      const cand = `${prefix}${rand}${opDigits}`.slice(0, 12).padEnd(12, '0');
      if (!used || !used.has(cand)) {
        if (used) used.add(cand);
        return cand;
      }
      attempts++;
    }
    return `${prefix}${Date.now().toString().slice(-9)}`;
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
    const samples = await (this.prisma as any).productSample.findMany({
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

    return samples.map((s: any) => {
      const entalle = (Array.isArray(s.productionSizeData) && s.productionSizeData[0]?.entalle) || null;
      return {
        ...s,
        entalle: s.entalle || entalle
      };
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
    const entalle = (Array.isArray(sample.productionSizeData) && sample.productionSizeData[0]?.entalle) || null;
    return {
      ...sample,
      entalle: sample.entalle || entalle
    };
  }

  async updateReview(id: string, commercialId: string, data: any) {
    const { status, observations, recommendations, materials, op, barcode, productionQuantity, productionColor, productionSizeData, entalle } = data;

    const existingSample = await this.findOne(id);

    if (existingSample.adminOpApprovalStatus === 'APROBADO' && op && op !== existingSample.op) {
      throw new BadRequestException('Esta OP ya ha sido aprobada por el Administrador y no puede ser modificada.');
    }

    const hasOPCreation = !!(op && op.trim());
    const cleanOp = hasOPCreation ? op.replace(/\D/g, '') : '';
    
    // Ensure pure numeric barcode
    let sampleBarcode = barcode || existingSample.barcode;
    if (hasOPCreation && cleanOp) {
      if (!sampleBarcode || !/^\d{12}$/.test(sampleBarcode) || !sampleBarcode.endsWith(cleanOp)) {
        sampleBarcode = this.generateOpBarcode(cleanOp);
      }
    } else if (!sampleBarcode || !/^\d+$/.test(sampleBarcode)) {
      sampleBarcode = this.generateNumericBarcode();
    }

    // Ensure every item in productionSizeData has its unique 12-digit numeric SKU ending with the OP digits
    let finalSizeData = productionSizeData;
    if (hasOPCreation && Array.isArray(productionSizeData)) {
      const usedSkus = new Set<string>();
      if (sampleBarcode) usedSkus.add(sampleBarcode);

      finalSizeData = productionSizeData.map((item: any) => {
        let itemSku = item.sku || item.variantSku;
        if (!itemSku || !/^\d{12}$/.test(itemSku) || (cleanOp && !itemSku.endsWith(cleanOp))) {
          itemSku = this.generateOpBarcode(cleanOp, usedSkus);
        } else {
          usedSkus.add(itemSku);
        }
        return {
          ...item,
          sku: itemSku,
          variantSku: itemSku,
          entalle: item.entalle || entalle || null
        };
      });

      if (finalSizeData.length > 0 && finalSizeData[0]?.sku) {
        sampleBarcode = finalSizeData[0].sku;
      }
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
          productionSizeData: hasOPCreation ? (finalSizeData || null) : (status === 'APROBADO' ? existingSample.productionSizeData : null),
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
        materialReceiptStatus: 'PENDIENTE_DESCARGA_LOGISTICA',
        adminMaterialNotes: notes || sample.adminMaterialNotes,
      }
    });

    // Enviar notificación a Logística para la descarga de materiales en inventario
    await this.notifications.create({
      title: `OP ${sample.op} Aprobada - Descarga Requerida`,
      message: `Administración aprobó la OP ${sample.op} (${sample.name}). Ingresa a Salida de Productos para descargar los materiales del inventario.`,
      type: 'OP_APPROVED_FOR_LOGISTICS',
      referenceId: id,
      targetRole: 'LOGISTICA',
    });

    return updated;
  }

  async getApprovedOPsForLogistics() {
    return await (this.prisma as any).productSample.findMany({
      where: {
        adminOpApprovalStatus: 'APROBADO',
        op: { not: null },
      },
      include: {
        materials: {
          include: {
            product: {
              include: { variants: true }
            }
          }
        },
        udp: { select: { name: true, email: true } },
        commercial: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getAllOpDispatches() {
    const samples = await (this.prisma as any).productSample.findMany({
      where: {
        op: { not: null },
      },
      include: {
        materials: {
          include: {
            product: {
              include: { variants: true }
            }
          }
        },
        udp: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' }
    });

    const allDispatches: any[] = [];

    for (const sample of samples) {
      const requirements = (sample.udpRequirements as any) || {};
      const dispatches = Array.isArray(requirements.opDispatches) ? requirements.opDispatches : [];

      if (dispatches.length > 0) {
        dispatches.forEach((disp: any) => {
          allDispatches.push({
            ...disp,
            sampleId: sample.id,
            sampleName: sample.name,
            sampleCode: sample.code,
            op: sample.op,
            productionQuantity: sample.productionQuantity || 1,
            materialReceiptStatus: sample.materialReceiptStatus,
            materialsCount: disp.items?.length || 0,
            udpName: sample.udp?.name || 'UDP',
          });
        });
      } else if (sample.adminOpApprovalStatus === 'APROBADO') {
        allDispatches.push({
          id: `pending_${sample.id}`,
          sampleId: sample.id,
          sampleName: sample.name,
          sampleCode: sample.code,
          op: sample.op,
          productionQuantity: sample.productionQuantity || 1,
          dispatchedAt: null,
          dispatchedByName: null,
          status: 'PENDIENTE_DESCARGA',
          materialReceiptStatus: sample.materialReceiptStatus || 'PENDIENTE_DESCARGA_LOGISTICA',
          items: sample.materials?.map((m: any) => ({
            name: m.product?.name || m.customMaterial || 'Material',
            sku: m.product?.variants?.[0]?.variantSku || m.product?.sku || '',
            quantity: (m.quantity || 1) * (sample.productionQuantity || 1),
            unit: m.product?.unit || 'uds',
          })) || [],
          materialsCount: sample.materials?.length || 0,
          udpName: sample.udp?.name || 'UDP',
        });
      }
    }

    return allDispatches.sort((a, b) => {
      const dateA = a.dispatchedAt ? new Date(a.dispatchedAt).getTime() : 0;
      const dateB = b.dispatchedAt ? new Date(b.dispatchedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async dischargeAndDispatchOpMaterials(
    id: string,
    payload: {
      discharges: Array<{
        variantId: string;
        quantity: number;
        productId?: string;
        name?: string;
        sku?: string;
        color?: string;
        size?: string;
        unit?: string;
        price?: number;
      }>;
      op?: string;
      reason?: string;
      notes?: string;
    },
    userId: string,
    userName?: string
  ) {
    const sample = await this.findOne(id);
    const op = payload.op || sample.op || 'OP';
    const reasonText = payload.reason || `Para Producción de OP ${op}`;

    return await this.prisma.$transaction(async (tx) => {
      const savedItems: any[] = [];

      for (const item of payload.discharges) {
        let variant: any = null;
        if (item.variantId) {
          variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: true }
          });
        }
        
        const qty = Number(item.quantity);
        if (variant) {
          if (variant.stock < qty) {
            throw new BadRequestException(`Stock insuficiente para ${variant.variantSku}. Stock actual: ${variant.stock}`);
          }

          const newStock = variant.stock - qty;

          await tx.movement.create({
            data: {
              type: 'EXIT',
              quantity: qty,
              reason: reasonText,
              previousStock: variant.stock,
              newStock: newStock,
              variantId: variant.id,
              userId: userId,
              reference: `OP ${op}`,
            }
          });

          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: newStock }
          });

          savedItems.push({
            variantId: variant.id,
            productId: variant.productId,
            name: variant.product?.name || item.name || 'Material',
            sku: variant.variantSku || item.sku || '',
            color: variant.color || item.color || 'ÚNICO',
            size: variant.size || item.size || 'ESTÁNDAR',
            quantity: qty,
            unit: variant.product?.unit || item.unit || 'uds',
            price: item.price || variant.product?.purchasePrice || 0,
          });
        } else {
          savedItems.push({
            name: item.name || 'Material',
            sku: item.sku || '',
            color: item.color || 'ÚNICO',
            size: item.size || 'ESTÁNDAR',
            quantity: qty,
            unit: item.unit || 'uds',
            price: item.price || 0,
          });
        }
      }

      const newDispatch = {
        id: `disp_${Date.now()}`,
        op: op,
        sampleId: sample.id,
        sampleName: sample.name,
        sampleCode: sample.code || null,
        productionQuantity: sample.productionQuantity || 1,
        dispatchedAt: new Date().toISOString(),
        dispatchedById: userId,
        dispatchedByName: userName || 'Logística',
        status: 'ENVIADO',
        reason: reasonText,
        items: savedItems,
        notes: payload.notes || null,
        receivedAt: null,
        receivedByName: null,
        rejectionReason: null,
      };

      const existingRequirements = (sample.udpRequirements as any) || {};
      const existingDispatches = Array.isArray(existingRequirements.opDispatches) ? existingRequirements.opDispatches : [];

      const updatedSample = await (tx as any).productSample.update({
        where: { id },
        data: {
          materialReceiptStatus: 'ENVIADO_A_UDP',
          logisticsMaterialDate: new Date(),
          udpRequirements: {
            ...existingRequirements,
            opDispatches: [newDispatch, ...existingDispatches]
          }
        }
      });

      await tx.notification.create({
        data: {
          title: `Materiales enviados para OP ${op}`,
          message: `Logística te envió los materiales para la Orden de Producción ${op} (${sample.name}). Por favor verifica la entrega física para iniciar la auditoría.`,
          type: 'OP_MATERIALS_SENT_TO_UDP',
          referenceId: id,
          targetRole: 'UDP',
          userId: sample.udpId || undefined,
        }
      });

      return {
        success: true,
        dispatch: newDispatch,
        sample: updatedSample
      };
    });
  }

  async confirmOpMaterialsReceipt(id: string, dispatchId?: string, user?: any) {
    const sample = await this.findOne(id);
    const existingRequirements = (sample.udpRequirements as any) || {};
    const existingDispatches = Array.isArray(existingRequirements.opDispatches) ? [...existingRequirements.opDispatches] : [];

    let targetDispatch = existingDispatches.length > 0 ? existingDispatches[0] : null;
    if (dispatchId) {
      const found = existingDispatches.find((d: any) => d.id === dispatchId);
      if (found) targetDispatch = found;
    }

    if (targetDispatch) {
      targetDispatch.status = 'CONFORME';
      targetDispatch.receivedAt = new Date().toISOString();
      targetDispatch.receivedByName = user?.name || 'UDP';
    }

    const updatedSample = await (this.prisma as any).productSample.update({
      where: { id },
      data: {
        materialReceiptStatus: 'RECIBIDO_CONFORME',
        udpMaterialReceivedAt: new Date(),
        udpRequirements: {
          ...existingRequirements,
          opDispatches: existingDispatches
        }
      }
    });

    await this.notifications.create({
      title: `Materiales Recibidos Conforme - OP ${sample.op}`,
      message: `UDP confirmó la recepción física conforme de los materiales para la OP ${sample.op} (${sample.name}). La producción está lista para auditoría.`,
      type: 'OP_MATERIALS_CONFIRMED',
      referenceId: id,
      targetRole: 'LOGISTICA',
    });

    return {
      success: true,
      sample: updatedSample,
      dispatch: targetDispatch
    };
  }

  async rejectOpMaterialsReceipt(id: string, payload: { rejectionReason: string; dispatchId?: string }, user?: any) {
    const sample = await this.findOne(id);
    const existingRequirements = (sample.udpRequirements as any) || {};
    const existingDispatches = Array.isArray(existingRequirements.opDispatches) ? [...existingRequirements.opDispatches] : [];

    let targetDispatch = existingDispatches.length > 0 ? existingDispatches[0] : null;
    if (payload.dispatchId) {
      const found = existingDispatches.find((d: any) => d.id === payload.dispatchId);
      if (found) targetDispatch = found;
    }

    if (targetDispatch) {
      targetDispatch.status = 'RECHAZADO';
      targetDispatch.rejectionReason = payload.rejectionReason;
      targetDispatch.rejectedAt = new Date().toISOString();
      targetDispatch.rejectedByName = user?.name || 'UDP';
    }

    const updatedSample = await (this.prisma as any).productSample.update({
      where: { id },
      data: {
        materialReceiptStatus: 'RECHAZADO_POR_UDP',
        udpRequirements: {
          ...existingRequirements,
          opDispatches: existingDispatches
        }
      }
    });

    await this.notifications.create({
      title: `Materiales Observados/Rechazados - OP ${sample.op}`,
      message: `UDP observó o rechazó los materiales de la OP ${sample.op} (${sample.name}): "${payload.rejectionReason}". Por favor revisa y reenvía.`,
      type: 'OP_MATERIALS_REJECTED',
      referenceId: id,
      targetRole: 'LOGISTICA',
    });

    return {
      success: true,
      sample: updatedSample,
      dispatch: targetDispatch
    };
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

  async remove(id: string, user: any) {
    const sample = await this.findOne(id);
    if (!sample) {
      throw new NotFoundException('Muestra no encontrada');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Delete associated ProcessAudits if any
      const audits = await (tx as any).processAudit.findMany({ where: { sampleId: id } });
      if (audits.length > 0) {
        for (const audit of audits) {
          await (tx as any).auditFinding.deleteMany({ where: { auditId: audit.id } });
        }
        await (tx as any).processAudit.deleteMany({ where: { sampleId: id } });
      }

      // 2. Delete measurements
      await (tx as any).productMeasurement.deleteMany({ where: { sampleId: id } });

      // 3. Delete sample materials
      await (tx as any).sampleMaterial.deleteMany({ where: { sampleId: id } });

      // 4. Delete notifications referencing this sample
      await (tx as any).notification.deleteMany({ where: { referenceId: id } });

      // 5. Delete the sample itself
      await (tx as any).productSample.delete({ where: { id } });

      return { success: true, message: `Muestra ${sample.name} eliminada correctamente` };
    });
  }
}
