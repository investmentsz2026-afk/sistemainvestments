import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductionOrderDto } from './dto/production-order.dto';

@Injectable()
export class ProductionOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createProductionOrderDto: CreateProductionOrderDto) {
    const { opNumber, productId, variants } = createProductionOrderDto;

    // 1. Verificar si el producto existe
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('El producto seleccionado no existe');
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
          productId,
        },
      });
    } else {
      // Si ya existe, actualizamos el productId al producto actual para mantener la referencia
      productionOrder = await this.prisma.productionOrder.update({
        where: { id: existingOp.id },
        data: { productId },
      });
    }

    // Actualizar el campo 'op' del producto principal con este número de OP, y actualizar precios si se definen en alguna de las tallas/variantes
    const updateProductData: any = { op: opNumber };
    const firstWithCost = variants.find(v => v.cost !== undefined && v.cost > 0);
    const firstWithPrice = variants.find(v => v.price !== undefined && v.price > 0);

    if (firstWithCost) {
      updateProductData.purchasePrice = firstWithCost.cost;
    }
    if (firstWithPrice) {
      updateProductData.sellingPrice = firstWithPrice.price;
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: updateProductData,
    });

    // 4. Procesar las combinaciones de tallas y colores para crear/actualizar variantes y SKUs
    for (const vSelection of variants) {
      const { size, colors } = vSelection;

      for (const color of colors) {
        // Generar un SKU único de 12 dígitos basado en la OP
        const variantSku = await this.generateUniqueSku(opNumber);

        // Verificar si la combinación talla/color ya existe para este producto
        const existingVariant = await this.prisma.productVariant.findFirst({
          where: {
            productId,
            size,
            color,
          },
        });

        if (existingVariant) {
          // Si existe, actualizamos su SKU con el nuevo basado en la OP y seteamos la OP
          await this.prisma.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              variantSku,
              op: opNumber,
            },
          });
        } else {
          // Si no existe, creamos la variante con stock inicial 0 y el SKU basado en la OP
          await this.prisma.productVariant.create({
            data: {
              productId,
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
        product: true,
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
