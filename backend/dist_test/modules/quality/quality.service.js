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
exports.QualityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let QualityService = class QualityService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPendingItems() {
        return this.prisma.purchaseItem.findMany({
            where: {
                status: {
                    in: ['EN_CALIDAD', 'RECIBIDO_EN_PROCESO'],
                },
            },
            include: {
                purchase: {
                    include: {
                        supplier: true,
                        user: { select: { name: true } },
                    },
                },
                variant: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async getProcessedItems() {
        return this.prisma.purchaseItem.findMany({
            where: {
                status: {
                    in: ['RECIBIDO', 'RECHAZADO'],
                },
            },
            include: {
                purchase: {
                    include: {
                        supplier: true,
                    },
                },
                qualityControl: {
                    include: {
                        confirmedBy: { select: { name: true } },
                    },
                },
                variant: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async acknowledgeItem(itemId) {
        const item = await this.prisma.purchaseItem.findUnique({
            where: { id: itemId },
        });
        if (!item)
            throw new common_1.NotFoundException('Item no encontrado');
        if (item.status !== 'EN_CALIDAD') {
            throw new common_1.BadRequestException('El item ya no está pendiente de recepción');
        }
        return this.prisma.$transaction(async (prisma) => {
            const updated = await prisma.purchaseItem.update({
                where: { id: itemId },
                data: { status: 'RECIBIDO_EN_PROCESO' },
            });
            // Update purchase status too if it was EN_CALIDAD
            const purchase = await prisma.purchase.findUnique({
                where: { id: item.purchaseId },
            });
            if (purchase?.status === 'EN_CALIDAD') {
                await prisma.purchase.update({
                    where: { id: item.purchaseId },
                    data: { status: 'RECIBIDO_EN_PROCESO' },
                });
            }
            return updated;
        });
    }
    async processItem(userId, itemId, data) {
        const item = await this.prisma.purchaseItem.findUnique({
            where: { id: itemId },
            include: { purchase: true },
        });
        if (!item)
            throw new common_1.NotFoundException('Item de compra no encontrado');
        if (!['EN_CALIDAD', 'RECIBIDO_EN_PROCESO'].includes(item.status)) {
            throw new common_1.BadRequestException('Este item ya ha sido procesado por calidad');
        }
        return this.prisma.$transaction(async (prisma) => {
            // 1. Create or Update Quality Control record
            await prisma.qualityControl.upsert({
                where: { purchaseItemId: itemId },
                create: {
                    purchaseItemId: itemId,
                    status: data.status,
                    observations: data.observations,
                    rejectionReason: data.rejectionReason,
                    confirmedById: userId,
                },
                update: {
                    status: data.status,
                    observations: data.observations,
                    rejectionReason: data.rejectionReason,
                    confirmedById: userId,
                }
            });
            // 2. Update Item Status
            const updatedItem = await prisma.purchaseItem.update({
                where: { id: itemId },
                data: { status: data.status },
            });
            // 3. If RECEIVED and has variantId, update stock
            if (data.status === 'RECIBIDO' && item.variantId) {
                const variant = await prisma.productVariant.findUnique({
                    where: { id: item.variantId },
                });
                if (variant) {
                    const previousStock = variant.stock;
                    const newStock = previousStock + item.quantity;
                    await prisma.productVariant.update({
                        where: { id: item.variantId },
                        data: { stock: newStock },
                    });
                    await prisma.movement.create({
                        data: {
                            type: 'ENTRY',
                            quantity: item.quantity,
                            reason: `Calidad Confirmada - Factura: ${item.purchase.invoiceNumber || 'N/A'}`,
                            reference: item.purchaseId,
                            previousStock,
                            newStock,
                            variantId: item.variantId,
                            userId,
                        },
                    });
                }
            }
            // 4. Check if all items in the purchase are done to update Purchase overall status
            const allItems = await prisma.purchaseItem.findMany({
                where: { purchaseId: item.purchaseId },
            });
            const pendingTotal = allItems.filter((i) => ['EN_CALIDAD', 'RECIBIDO_EN_PROCESO'].includes(i.status)).length;
            const rejectedCount = allItems.filter((i) => i.status === 'RECHAZADO').length;
            if (pendingTotal === 0) {
                // All processed
                let finalStatus = 'RECIBIDO';
                if (rejectedCount === allItems.length) {
                    finalStatus = 'RECHAZADO';
                }
                else if (rejectedCount > 0) {
                    finalStatus = 'RECIBIDO'; // Or PARTIAL
                }
                await prisma.purchase.update({
                    where: { id: item.purchaseId },
                    data: { status: finalStatus },
                });
            }
            else {
                // Still some pending, but maybe we should ensure purchase is RECIBIDO_EN_PROCESO if at least one is
                await prisma.purchase.update({
                    where: { id: item.purchaseId },
                    data: { status: 'RECIBIDO_EN_PROCESO' },
                });
            }
            return updatedItem;
        });
    }
};
exports.QualityService = QualityService;
exports.QualityService = QualityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QualityService);
