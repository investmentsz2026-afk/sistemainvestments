// backend/src/modules/products/products.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto, UpdateProductDto, CreateVariantDto } from './dto/product.dto';
import { generateSKU, generateVariantSKU } from '../../utils/sku-generator';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  async create(createProductDto: CreateProductDto) {
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
      },
    });

    // Si hay variantes, crearlas
    if (createProductDto.variants && createProductDto.variants.length > 0) {
      for (const variant of createProductDto.variants) {
        await this.createVariant(product.id, variant);
      }
    }

    return this.findOne(product.id);
  }

  async createVariant(productId: string, createVariantDto: CreateVariantDto) {
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
      variantSku = generateVariantSKU(
        product.sku,
        createVariantDto.size,
        createVariantDto.color
      );
    }

    return this.prisma.productVariant.create({
      data: {
        productId,
        size: createVariantDto.size,
        color: createVariantDto.color,
        stock: createVariantDto.initialStock || 0,
        variantSku,
      },
    });
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

  async update(id: string, updateProductDto: UpdateProductDto) {
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
      for (const variant of updatedProduct.variants) {
        const variantSku = generateVariantSKU(
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
          const newVariant = await this.createVariant(id, {
            size: variant.size,
            color: variant.color,
            initialStock: stockValue || 0,
          });
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
}