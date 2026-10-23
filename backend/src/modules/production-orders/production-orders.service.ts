import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductionOrderDto } from './dto/production-order.dto';

@Injectable()
export class ProductionOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createProductionOrderDto: CreateProductionOrderDto) {
    const { opNumber, productId, variants, price, cost, realPrice } = createProductionOrderDto;

    // 1. Verificar si el producto existe
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('El producto seleccionado no existe');
    }

    let targetProductId = productId;

    // Buscar si existe una muestra o auditoría para esta OP donde Comercial haya definido los SKUs
    const cleanOp = opNumber.replace(/\D/g, '');
    const sample = await this.prisma.productSample.findFirst({
      where: {
        OR: [
          { op: opNumber },
          { op: opNumber.trim() },
          ...(cleanOp ? [{ op: cleanOp }] : []),
          ...(cleanOp ? [{ barcode: { endsWith: cleanOp } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    const audit = await (this.prisma as any).processAudit.findFirst({
      where: {
        OR: [
          { op: opNumber },
          { op: opNumber.trim() },
          ...(cleanOp ? [{ op: cleanOp }] : []),
        ],
      },
      include: { sample: true },
      orderBy: { createdAt: 'desc' },
    });

    const effectiveSample = sample || audit?.sample;

    if (product.op && product.op !== opNumber) {
      // Si el producto ya tiene una OP registrada, creamos un clon para el nuevo lote/OP
      let newProductSku = '';
      let attempts = 0;
      const opLen = cleanOp.length;
      const neededRandom = Math.max(0, 12 - opLen);
      
      while (attempts < 100) {
        let randomPart = '';
        for (let i = 0; i < neededRandom; i++) {
          randomPart += Math.floor(Math.random() * 10).toString();
        }
        const candidateSku = (randomPart + cleanOp).slice(-12);

        // Verificar que no exista en Product
        const existsProd = await this.prisma.product.findUnique({
          where: { sku: candidateSku },
        });
        if (!existsProd) {
          newProductSku = candidateSku;
          break;
        }
        attempts++;
      }

      if (!newProductSku) {
        throw new BadRequestException('No se pudo generar un SKU único para el nuevo producto clonado.');
      }

      const clonedProduct = await this.prisma.product.create({
        data: {
          name: product.name,
          category: product.category,
          inventoryType: product.inventoryType,
          description: product.description,
          sku: newProductSku,
          op: opNumber,
          purchasePrice: cost !== undefined && cost > 0 ? cost : product.purchasePrice,
          sellingPrice: price !== undefined && price > 0 ? price : product.sellingPrice,
          realPrice: realPrice !== undefined && realPrice > 0 ? realPrice : product.realPrice,
          minStock: product.minStock,
          sizes: product.sizes,
          colors: product.colors,
        },
      });
      targetProductId = clonedProduct.id;
    }

    // 2. Verificar si la OP ya existe en la base de datos
    const existingOp = await this.prisma.productionOrder.findUnique({
      where: { opNumber },
    });

    let productionOrder = existingOp;

    if (!existingOp) {
      // 3. Crear el registro de la OP
      productionOrder = await this.prisma.productionOrder.create({
        data: {
          opNumber,
          productId: targetProductId,
        },
      });
    } else {
      // Si ya existe, actualizamos el productId al producto actual para mantener la referencia
      productionOrder = await this.prisma.productionOrder.update({
        where: { id: existingOp.id },
        data: { productId: targetProductId },
      });
    }

    // Actualizar el campo 'op' del producto principal con este número de OP, y actualizar precios si se definen a nivel de OP
    const updateProductData: any = { op: opNumber };

    if (cost !== undefined && cost > 0) {
      updateProductData.purchasePrice = cost;
    }
    if (price !== undefined && price > 0) {
      updateProductData.sellingPrice = price;
    }
    if (realPrice !== undefined && realPrice > 0) {
      updateProductData.realPrice = realPrice;
    }

    await this.prisma.product.update({
      where: { id: targetProductId },
      data: updateProductData,
    });

    // 4. Procesar las combinaciones de tallas y colores para crear/actualizar variantes y SKUs
    for (const vSelection of variants) {
      const { size, colors } = vSelection;

      for (const color of colors) {
        // Obtener el SKU definido en Comercial para esta OP/variante
        let variantSku = '';

        // 1. Buscar en effectiveSample.productionSizeData (definido en Comercial al crear la OP)
        const prodSizes = ((effectiveSample as any)?.productionSizeData as any[]) || [];
        if (Array.isArray(prodSizes) && prodSizes.length > 0) {
          const found = prodSizes.find((p: any) =>
            String(p.size).trim().toUpperCase() === String(size).trim().toUpperCase() &&
            (!p.color || String(p.color).trim().toUpperCase() === String(color).trim().toUpperCase())
          ) || prodSizes.find((p: any) =>
            String(p.size).trim().toUpperCase() === String(size).trim().toUpperCase()
          );

          if (found) {
            const foundSku = String(found.sku || found.variantSku || '').trim();
            if (/^\d{12}$/.test(foundSku)) variantSku = foundSku;
          }

          if (!variantSku && prodSizes.length === 1) {
            const single = prodSizes[0];
            const singleSku = String(single?.sku || single?.variantSku || '').trim();
            if (/^\d{12}$/.test(singleSku)) variantSku = singleSku;
          }
        }

        // 2. Buscar en audit.qualitySizeData
        const auditQualityData = ((audit as any)?.qualitySizeData as any[]) || [];
        if (!variantSku && Array.isArray(auditQualityData) && auditQualityData.length > 0) {
          const found = auditQualityData.find((p: any) =>
            String(p.size).trim().toUpperCase() === String(size).trim().toUpperCase() &&
            (!p.color || String(p.color).trim().toUpperCase() === String(color).trim().toUpperCase())
          ) || auditQualityData.find((p: any) =>
            String(p.size).trim().toUpperCase() === String(size).trim().toUpperCase()
          );

          if (found) {
            const foundSku = String(found.sku || found.variantSku || '').trim();
            if (/^\d{12}$/.test(foundSku)) variantSku = foundSku;
          }

          if (!variantSku && auditQualityData.length === 1) {
            const single = auditQualityData[0];
            const singleSku = String(single?.sku || single?.variantSku || '').trim();
            if (/^\d{12}$/.test(singleSku)) variantSku = singleSku;
          }
        }

        // 3. Fallback de Comercial: barcode de la muestra o de la auditoría (e.g. 775153521289)
        if (!variantSku && (effectiveSample?.barcode || (audit as any)?.barcode)) {
          const b = String(effectiveSample?.barcode || (audit as any)?.barcode || '').trim();
          if (/^\d{12}$/.test(b)) {
            variantSku = b;
          }
        }

        // 4. Si no tiene SKU de Comercial, generar uno único basado en la OP
        if (!variantSku) {
          variantSku = await this.generateUniqueSku(opNumber);
        }

        // Verificar si la combinación talla/color ya existe para este producto
        const existingVariant = await this.prisma.productVariant.findFirst({
          where: {
            productId: targetProductId,
            size,
            color,
          },
        });

        // Verificar si otra variante ya tiene ese variantSku
        const otherWithSameSku = await this.prisma.productVariant.findUnique({
          where: { variantSku },
        });

        if (existingVariant) {
          if (otherWithSameSku && otherWithSameSku.id !== existingVariant.id) {
            // Liberar variantSku en la otra variante para evitar colisión @unique
            await this.prisma.productVariant.update({
              where: { id: otherWithSameSku.id },
              data: { variantSku: `${otherWithSameSku.variantSku}-DUP-${Date.now()}` },
            });
          }
          await this.prisma.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              variantSku,
              op: opNumber,
            },
          });
        } else if (otherWithSameSku) {
          await this.prisma.productVariant.update({
            where: { id: otherWithSameSku.id },
            data: {
              productId: targetProductId,
              size,
              color,
              op: opNumber,
            },
          });
        } else {
          await this.prisma.productVariant.create({
            data: {
              productId: targetProductId,
              size,
              color,
              stock: 0,
              variantSku,
              op: opNumber,
            },
          });
        }
      }
    }

    // Retornar la OP creada con los detalles
    return this.prisma.productionOrder.findUnique({
      where: { id: productionOrder.id },
      include: {
        product: {
          include: {
            variants: {
              where: {
                op: opNumber
              }
            }
          }
        }
      }
    });
  }

  async findAll() {
    return this.prisma.productionOrder.findMany({
      include: {
        product: {
          include: {
            variants: true
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const op = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            variants: true
          }
        },
      },
    });
    if (!op) {
      throw new NotFoundException('Orden de Producción no encontrada');
    }
    return op;
  }

  /**
   * Genera un SKU de 12 dígitos único donde los últimos dígitos son la OP y los anteriores son aleatorios.
   */
  private async generateUniqueSku(opNumber: string): Promise<string> {
    const cleanOp = opNumber.replace(/\D/g, ''); // Solo dígitos
    const opLen = cleanOp.length;

    let attempts = 0;
    while (attempts < 100) {
      const neededRandom = Math.max(0, 12 - opLen);
      let randomPart = '';
      for (let i = 0; i < neededRandom; i++) {
        randomPart += Math.floor(Math.random() * 10).toString();
      }
      const candidateSku = (randomPart + cleanOp).slice(-12);

      // Verificar que no exista en ProductVariant ni en Product
      const existsVar = await this.prisma.productVariant.findUnique({
        where: { variantSku: candidateSku },
      });
      const existsProd = await this.prisma.product.findUnique({
        where: { sku: candidateSku },
      });

      if (!existsVar && !existsProd) {
        return candidateSku;
      }
      attempts++;
    }

    throw new BadRequestException('No se pudo generar un SKU único para la variante después de 100 intentos.');
  }
}
