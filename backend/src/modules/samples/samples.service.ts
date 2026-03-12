import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SamplesService {
  constructor(private prisma: PrismaService) {}

  async create(odpId: string, data: any) {
    const { name, description, characteristics, images } = data;
    return (this.prisma as any).productSample.create({
      data: {
        name,
        description,
        characteristics,
        images: images || [],
        odpId,
      },
      include: {
        odp: { select: { name: true } },
      },
    });
  }

  async findAll() {
    return (this.prisma as any).productSample.findMany({
      include: {
        odp: { select: { name: true } },
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
        odp: { select: { name: true } },
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
    const { status, observations, recommendations, materials } = data;

    const existingSample = await this.findOne(id);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Update status and observations
      const updatedSample = await (tx as any).productSample.update({
        where: { id },
        data: {
          status,
          observations,
          recommendations,
          commercialId,
          approvedAt: status === 'APROBADO' ? new Date() : null,
        },
      });

      // 2. If approved, handle BOM (Materials)
      if (status === 'APROBADO' && materials && materials.length > 0) {
        // Clear old materials if any
        await (tx as any).sampleMaterial.deleteMany({ where: { sampleId: id } });

        // Add new materials
        for (const mat of materials) {
          const product = await tx.product.findUnique({ where: { id: mat.productId } });
          if (!product) throw new BadRequestException(`Material/Insumo no encontrado: ${mat.productId}`);

          await (tx as any).sampleMaterial.create({
            data: {
              sampleId: id,
              productId: mat.productId,
              quantityPerUnit: mat.quantityPerUnit,
              unitPriceAtTime: product.purchasePrice, // Use current price
            },
          });
        }
      }

      return updatedSample;
    });
  }

  async update(id: string, odpId: string, data: any) {
    const sample = await this.findOne(id);
    if (sample.status !== 'PENDIENTE') {
      throw new BadRequestException('No se puede editar una muestra que ya ha sido revisada');
    }
    if ((sample as any).odpId !== odpId) {
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
