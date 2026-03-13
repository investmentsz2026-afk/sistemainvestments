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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let SalesService = class SalesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createSale(userId, data) {
        const { clientId, items, paymentMethod, notes, invoiceNumber } = data;
        if (!items || items.length === 0) {
            throw new common_1.BadRequestException('La venta debe tener al menos un producto');
        }
        return await this.prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            // 1. Validate stock and calculate total
            for (const item of items) {
                const variant = await tx.productVariant.findUnique({
                    where: { id: item.variantId },
                    include: { product: true },
                });
                if (!variant) {
                    throw new common_1.NotFoundException(`Variante de producto no encontrada: ${item.variantId}`);
                }
                if (variant.stock < item.quantity) {
                    throw new common_1.BadRequestException(`Stock insuficiente para ${variant.product.name} (${variant.size}/${variant.color}). Disponible: ${variant.stock}`);
                }
                const itemTotal = item.quantity * (item.unitPrice || variant.product.sellingPrice);
                totalAmount += itemTotal;
            }
            // 2. Create Sale
            const sale = await tx.sale.create({
                data: {
                    invoiceNumber,
                    clientId,
                    paymentMethod,
                    totalAmount,
                    notes,
                    sellerId: userId,
                    items: {
                        create: items.map((item) => ({
                            variantId: item.variantId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.quantity * item.unitPrice,
                        })),
                    },
                },
                include: {
                    items: true,
                },
            });
            // 3. Update stock and create movements
            for (const item of items) {
                const variant = await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: {
                        stock: { decrement: item.quantity },
                    },
                });
                await tx.movement.create({
                    data: {
                        type: 'EXIT',
                        quantity: item.quantity,
                        reason: `VENTA - Ref: ${sale.id}`,
                        reference: sale.invoiceNumber || sale.id,
                        previousStock: variant.stock + item.quantity,
                        newStock: variant.stock,
                        variantId: item.variantId,
                        userId: userId,
                    },
                });
            }
            return sale;
        });
    }
    async findAll(query) {
        const { startDate, endDate, clientId, sellerId, status } = query;
        const where = {};
        if (clientId)
            where.clientId = clientId;
        if (sellerId)
            where.sellerId = sellerId;
        if (status)
            where.status = status;
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }
        return this.prisma.sale.findMany({
            where,
            include: {
                client: true,
                seller: { select: { name: true } },
                items: {
                    include: {
                        variant: {
                            include: { product: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const sale = await this.prisma.sale.findUnique({
            where: { id },
            include: {
                client: true,
                seller: { select: { name: true } },
                items: {
                    include: {
                        variant: {
                            include: { product: true },
                        },
                    },
                },
            },
        });
        if (!sale)
            throw new common_1.NotFoundException('Venta no encontrada');
        return sale;
    }
    // Clients
    async createClient(data) {
        return this.prisma.client.create({ data });
    }
    async findAllClients() {
        return this.prisma.client.findMany({
            orderBy: { name: 'asc' },
        });
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalesService);
