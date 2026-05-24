// backend/src/modules/products/products.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto, UpdateProductDto, CreateVariantDto } from './dto/product.dto';
import { generateSKU, generateVariantSKU } from '../../utils/sku-generator';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  async create(userId: string, createProductDto: CreateProductDto) {
    // Obtener el último contador para generar SKU
    const lastProduct = await this.prisma.product.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    let counter = 1;
    if (lastProduct) {
      const lastSKU = lastProduct.sku;
      const lastCounter = parseInt(lastSKU.slice(-4));
      counter = lastCounter + 1;
    }

    // Generar SKU principal del producto si no se proporciona uno manual
    let sku = createProductDto.sku;
    if (!sku) {
      sku = generateSKU(
        createProductDto.category,
        '00', // SKU base sin talla específica
        '000', // SKU base sin color específico
        counter
      );
    }

    // Crear producto
    const product = await this.prisma.product.create({
      data: {
        sku,
        name: createProductDto.name,
        category: createProductDto.category,
        inventoryType: createProductDto.inventoryType || 'TERMINADOS',
        description: createProductDto.description,
        op: createProductDto.op,
        purchasePrice: createProductDto.purchasePrice,
        sellingPrice: createProductDto.sellingPrice,
        minStock: createProductDto.minStock || 5,
        sizes: createProductDto.sizes || [],
        colors: createProductDto.colors || [],
      },
    });

    // Si viene de una compra, vincular el ítem
    if (createProductDto.purchaseItemId) {
      await this.prisma.purchaseItem.update({
        where: { id: createProductDto.purchaseItemId },
        data: {
          productId: product.id,
          status: 'RECIBIDO', // Marcar como ya inventariado/recibido (Consistente con Quality)
        },
      });
    }

    // Si hay variantes, crearlas
    if (createProductDto.variants && createProductDto.variants.length > 0) {
      const isOnlyVariant = createProductDto.variants.length === 1;
      for (const variant of createProductDto.variants) {
        await this.createVariant(userId, product.id, variant, isOnlyVariant);
      }
    }

    return this.findOne(product.id);
  }

  async createVariant(userId: string, productId: string, createVariantDto: CreateVariantDto, isOnlyVariant = false) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verificar si ya existe la variante
    const existingVariant = await this.prisma.productVariant.findFirst({
      where: {
        productId,
        size: createVariantDto.size,
        color: createVariantDto.color,
      },
    });

    if (existingVariant) {
      throw new BadRequestException('Variant already exists');
    }

    // Generar SKU único para la variante si no se proporciona uno manual
    let variantSku = createVariantDto.variantSku;
    if (!variantSku) {
      if (isOnlyVariant) {
        variantSku = product.sku;
      } else {
        variantSku = generateVariantSKU(
          product.sku,
          createVariantDto.size,
          createVariantDto.color
        );
      }
    }

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        size: createVariantDto.size,
        color: createVariantDto.color,
        stock: createVariantDto.initialStock || 0,
        variantSku,
      },
    });

    // Registrar movimiento si hay stock inicial
    if (createVariantDto.initialStock && createVariantDto.initialStock > 0) {
      await this.prisma.movement.create({
        data: {
          type: 'ENTRY',
          quantity: createVariantDto.initialStock,
          reason: 'STOCK_INICIAL',
          reference: 'INVENTARIO_INICIAL',
          previousStock: 0,
          newStock: createVariantDto.initialStock,
          variantId: variant.id,
          userId,
        },
      });
    }

    return variant;
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySku(sku: string) {
    return this.prisma.product.findUnique({
      where: { sku },
      include: {
        variants: true,
      },
    });
  }

  async findByVariantSku(variantSku: string) {
    return this.prisma.productVariant.findUnique({
      where: { variantSku },
      include: {
        product: true,
      },
    });
  }

  async update(userId: string, id: string, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);

    const { variants, ...productData } = updateProductDto;

    // Actualizar datos del producto
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: productData,
      include: {
        variants: true,
      },
    });

    // Si el SKU cambió, actualizar todos los variantSku de sus variantes
    if (productData.sku && productData.sku !== product.sku) {
      const isOnlyVariant = updatedProduct.variants.length === 1;
      for (const variant of updatedProduct.variants) {
        const variantSku = isOnlyVariant 
          ? productData.sku 
          : generateVariantSKU(
            productData.sku,
            variant.size,
            variant.color
          );
        await this.prisma.productVariant.update({
          where: { id: variant.id },
          data: { variantSku },
        });
      }
    }

    // Manejar variantes si se proporcionan
    if (variants && Array.isArray(variants)) {
      const variantIdsToKeep: string[] = [];

      for (const variant of variants) {
        if (variant.id) {
          // Actualizar variante existente
          const stockValue = variant.stock !== undefined ? variant.stock : variant.initialStock;
          await this.prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              size: variant.size,
              color: variant.color,
              stock: stockValue !== undefined ? stockValue : undefined,
              variantSku: variant.variantSku || undefined,
            },
          });
          variantIdsToKeep.push(variant.id);
        } else {
          // Crear nueva variante
          const stockValue = variant.stock !== undefined ? variant.stock : variant.initialStock;
          const isOnlyVariant = variants.length === 1;
          const newVariant = await this.createVariant(userId, id, {
            size: variant.size,
            color: variant.color,
            variantSku: variant.variantSku,
            initialStock: stockValue || 0,
          }, isOnlyVariant);
          if (newVariant.id) {
            variantIdsToKeep.push(newVariant.id);
          }
        }
      }

      // Eliminar variantes que no están en la nueva lista
      const variantsToDelete = product.variants.filter(
        v => !variantIdsToKeep.includes(v.id)
      );

      for (const variant of variantsToDelete) {
        await this.prisma.productVariant.delete({
          where: { id: variant.id },
        });
      }
    }

    // Retornar producto actualizado con variantes
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);

    // Soft delete
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async searchProducts(query: string) {
    if (!query) return [];
    return this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      include: {
        variants: true,
      },
      take: 10,
    });
  }

  async getLowStockProducts() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        variants: true,
      },
    });

    return products.filter(product =>
      product.variants.some(variant => variant.stock <= product.minStock)
    );
  }

  async getCostBreakdown(sku: string) {
    // 1. Encontrar el producto o variante
    let product = await this.prisma.product.findUnique({
      where: { sku },
      include: { variants: true }
    });

    if (!product) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { variantSku: sku },
        include: { product: { include: { variants: true } } }
      });
      if (variant) {
        product = variant.product;
      }
    }

    // 1.2. Fallback: Buscar por OP en productos
    if (!product) {
      product = await this.prisma.product.findFirst({
        where: { op: sku },
        include: { variants: true }
      });
    }

    // 1.3. Fallback: Buscar por Barcode en Muestras (si el producto aún no existe)
    if (!product) {
      const sample = await this.prisma.productSample.findFirst({
        where: { 
          OR: [
            { barcode: sku },
            { op: sku }
          ]
        }
      });

      if (sample) {
        // Simular un objeto "product" desde la muestra para mostrar costos acumulados
        product = {
          id: 'sample-' + sample.id,
          name: sample.name,
          sku: (sample.barcode || sample.op) as string,
          op: sample.op,
          category: 'Muestra / Lote',
          sellingPrice: 0,
          purchasePrice: 0,
          variants: []
        } as any;
      }
    }

    if (!product) {
      throw new NotFoundException('Producto o variante no encontrado');
    }

    // 2. Si el producto no tiene OP, no podemos jalar costos de producción vinculados
    if (!product.op) {
      return {
        product,
        materials: [],
        services: [],
        totalMaterialCost: 0,
        totalServiceCost: 0,
        totalCost: product.purchasePrice || 0,
        message: 'Este producto no tiene una Orden de Producción (OP) vinculada para desglosar costos.'
      };
    }

    // 3. Buscar todas las compras y servicios vinculados a esta OP
    const relatedPurchases = await this.prisma.purchase.findMany({
      where: { op: product.op },
      include: {
        items: true,
        supplier: true
      }
    });

    const materials: any[] = [];
    const services: any[] = [];
    let totalMaterialCost = 0;
    let totalServiceCost = 0;

    relatedPurchases.forEach(purchase => {
      purchase.items.forEach(item => {
        const costItem = {
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
          supplier: purchase.supplier?.name || 'N/A',
          date: purchase.createdAt
        };

        if (purchase.type === 'SERVICE') {
          services.push(costItem);
          totalServiceCost += costItem.total;
        } else {
          materials.push(costItem);
          totalMaterialCost += costItem.total;
        }
      });
    });

    // 4. Intentar jalar también de SampleMaterials si existe relación
    const sampleMaterials = await this.prisma.sampleMaterial.findMany({
      where: {
        sample: { op: product.op }
      },
      include: {
        product: true
      }
    });

    sampleMaterials.forEach(sm => {
      const costItem = {
        id: sm.id,
        name: sm.product?.name || sm.customMaterial || 'Material de Muestra',
        category: 'Insumo',
        quantity: sm.quantity,
        price: sm.unitPriceAtTime,
        total: sm.quantity * sm.unitPriceAtTime,
        supplier: 'Inventario Interno',
        date: sm.createdAt
      };
      materials.push(costItem);
      totalMaterialCost += costItem.total;
    });
    
    // 5. Jalar costos de Auditoría de Procesos (NUEVO)
    const processAudits = await (this.prisma as any).processAudit.findMany({
      where: { op: product.op },
    });

    processAudits.forEach((pa: any) => {
      const history = Array.isArray(pa.processHistory) ? pa.processHistory : [];
      
      history.forEach((step: any, idx: number) => {
        if (step.servicePrice > 0) {
          const costItem = {
            id: `${pa.id}-${idx}`,
            name: step.process || pa.process,
            category: 'Servicio Producción',
            quantity: pa.totalQuantity || 1,
            price: step.servicePrice,
            total: (pa.totalQuantity || 1) * step.servicePrice,
            supplier: step.externalCompany || pa.externalCompany || 'Taller Interno',
            date: step.date || pa.auditDate
          };
          services.push(costItem);
          totalServiceCost += costItem.total;
        }
      });

      // Fallback: Si no hay historial pero hay precio en el registro principal
      if (history.length === 0 && pa.servicePrice > 0) {
        const costItem = {
          id: pa.id,
          name: pa.process,
          category: 'Servicio Producción',
          quantity: pa.totalQuantity || 1,
          price: pa.servicePrice,
          total: (pa.totalQuantity || 1) * pa.servicePrice,
          supplier: pa.externalCompany || 'Taller Interno',
          date: pa.auditDate
        };
        services.push(costItem);
        totalServiceCost += costItem.total;
      }
    });

    return {
      product,
      op: product.op,
      materials,
      services,
      totalMaterialCost,
      totalServiceCost,
      totalCost: totalMaterialCost + totalServiceCost
    };
  }
}