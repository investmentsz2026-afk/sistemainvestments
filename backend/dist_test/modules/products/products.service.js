"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
// backend/src/modules/products/products.service.ts
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const sku_generator_1 = require("../../utils/sku-generator");
let ProductsService = class ProductsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createProductDto) {
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
        // Generar SKU principal del producto
        const sku = (0, sku_generator_1.generateSKU)(createProductDto.category, '00', // SKU base sin talla específica
        '000', // SKU base sin color específico
        counter);
        // Crear producto
        const product = await this.prisma.product.create({
            data: {
                sku,
                name: createProductDto.name,
                category: createProductDto.category,
                inventoryType: createProductDto.inventoryType || 'TERMINADOS',
                description: createProductDto.description,
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
    async createVariant(productId, createVariantDto) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
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
            throw new common_1.BadRequestException('Variant already exists');
        }
        // Generar SKU único para la variante
        const variantSku = (0, sku_generator_1.generateVariantSKU)(product.sku, createVariantDto.size, createVariantDto.color);
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
    async findOne(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                variants: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async findBySku(sku) {
        return this.prisma.product.findUnique({
            where: { sku },
            include: {
                variants: true,
            },
        });
    }
    async findByVariantSku(variantSku) {
        return this.prisma.productVariant.findUnique({
            where: { variantSku },
            include: {
                product: true,
            },
        });
    }
    async update(id, updateProductDto) {
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
        // Manejar variantes si se proporcionan
        if (variants && Array.isArray(variants)) {
            const variantIdsToKeep = [];
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
                        },
                    });
                    variantIdsToKeep.push(variant.id);
                }
                else {
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
            const variantsToDelete = product.variants.filter(v => !variantIdsToKeep.includes(v.id));
            for (const variant of variantsToDelete) {
                await this.prisma.productVariant.delete({
                    where: { id: variant.id },
                });
            }
        }
        // Retornar producto actualizado con variantes
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        // Soft delete
        return this.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async getLowStockProducts() {
        const products = await this.prisma.product.findMany({
            where: { isActive: true },
            include: {
                variants: true,
            },
        });
        return products.filter(product => product.variants.some(variant => variant.stock <= product.minStock));
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
