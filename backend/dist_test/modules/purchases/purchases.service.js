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
exports.PurchasesService = void 0;
// backend/src/modules/purchases/purchases.service.ts
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let PurchasesService = class PurchasesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        const { invoiceNumber, op, notes, items, type, supplierId } = dto;
        return this.prisma.$transaction(async (prisma) => {
            const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const purchase = await prisma.purchase.create({
                data: {
                    type: type || 'PURCHASE',
                    invoiceNumber,
                    op,
                    supplierId: supplierId || null,
                    notes,
                    totalAmount,
                    status: 'EN_CALIDAD',
                    userId,
                    items: {
                        create: items.map((item) => ({
                            name: item.name,
                            description: item.description,
                            category: item.category,
                            unit: item.unit,
                            quantity: item.quantity,
                            price: item.price,
                            productId: item.productId || null,
                            variantId: item.variantId || null,
                            status: 'EN_CALIDAD',
                        })),
                    },
                },
                include: {
                    items: true,
                    user: { select: { name: true, email: true } },
                    supplier: true,
                },
            });
            return purchase;
        });
    }
    async findAll() {
        return this.prisma.purchase.findMany({
            include: {
                items: {
                    include: {
                        qualityControl: {
                            include: { confirmedBy: { select: { name: true } } }
                        }
                    }
                },
                user: { select: { name: true, email: true } },
                supplier: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const purchase = await this.prisma.purchase.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        qualityControl: {
                            include: { confirmedBy: { select: { name: true } } }
                        }
                    }
                },
                user: { select: { name: true, email: true } },
                supplier: true,
            },
        });
        if (!purchase)
            throw new common_1.NotFoundException('Compra no encontrada');
        return purchase;
    }
    async update(id, dto) {
        const existing = await this.prisma.purchase.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Compra no encontrada');
        const { invoiceNumber, op, notes, items, type, supplierId } = dto;
        const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return this.prisma.$transaction(async (prisma) => {
            // Delete old items
            await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } });
            // Update purchase and create new items
            const purchase = await prisma.purchase.update({
                where: { id },
                data: {
                    type: type || existing.type,
                    invoiceNumber,
                    op,
                    supplierId: supplierId || null,
                    notes,
                    totalAmount,
                    items: {
                        create: items.map((item) => ({
                            name: item.name,
                            description: item.description,
                            category: item.category,
                            unit: item.unit,
                            quantity: item.quantity,
                            price: item.price,
                            productId: item.productId || null,
                            variantId: item.variantId || null,
                        })),
                    },
                },
                include: {
                    items: true,
                    user: { select: { name: true, email: true } },
                    supplier: true,
                },
            });
            return purchase;
        });
    }
    async remove(id) {
        const existing = await this.prisma.purchase.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Compra no encontrada');
        return this.prisma.$transaction(async (prisma) => {
            await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } });
            await prisma.purchase.delete({ where: { id } });
            return { deleted: true };
        });
    }
};
exports.PurchasesService = PurchasesService;
exports.PurchasesService = PurchasesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PurchasesService);
