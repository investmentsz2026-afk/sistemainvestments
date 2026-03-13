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
exports.InventoryService = void 0;
// backend/src/modules/inventory/inventory.service.ts
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const inventory_dto_1 = require("./dto/inventory.dto");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async registerMovement(userId, registerMovementDto) {
        const { variantId, type, quantity, reason, reference } = registerMovementDto;
        return this.prisma.$transaction(async (prisma) => {
            const variant = await prisma.productVariant.findUnique({
                where: { id: variantId },
                include: { product: true },
            });
            if (!variant) {
                throw new common_1.NotFoundException('Product variant not found');
            }
            const previousStock = variant.stock;
            let newStock;
            if (type === 'ENTRY') {
                newStock = previousStock + quantity;
            }
            else {
                if (previousStock < quantity) {
                    throw new common_1.BadRequestException(`Insufficient stock. Available: ${previousStock}, Requested: ${quantity}`);
                }
                newStock = previousStock - quantity;
            }
            await prisma.productVariant.update({
                where: { id: variantId },
                data: { stock: newStock },
            });
            const movement = await prisma.movement.create({
                data: {
                    type,
                    quantity,
                    reason,
                    reference,
                    previousStock,
                    newStock,
                    variantId,
                    userId,
                },
                include: {
                    variant: {
                        include: {
                            product: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return movement;
        });
    }
    async registerBulkMovements(userId, registerBulkMovementDto) {
        const { items, reason, reference } = registerBulkMovementDto;
        return this.prisma.$transaction(async (prisma) => {
            // 🔥 SOLUCIÓN AL ERROR never[]
            const movements = [];
            for (const item of items) {
                const variant = await prisma.productVariant.findUnique({
                    where: { id: item.variantId },
                    include: { product: true },
                });
                if (!variant) {
                    throw new common_1.NotFoundException(`Variant ${item.variantId} not found`);
                }
                if (variant.stock < item.quantity) {
                    throw new common_1.BadRequestException(`Insufficient stock for ${variant.product.name} - ${variant.size} ${variant.color}. ` +
                        `Available: ${variant.stock}, Requested: ${item.quantity}`);
                }
                const previousStock = variant.stock;
                const newStock = previousStock - item.quantity;
                await prisma.productVariant.update({
                    where: { id: item.variantId },
                    data: { stock: newStock },
                });
                const movement = await prisma.movement.create({
                    data: {
                        // 🔥 SOLUCIÓN AL ERROR "EXIT"
                        type: 'EXIT',
                        quantity: item.quantity,
                        reason,
                        reference,
                        previousStock,
                        newStock,
                        variantId: item.variantId,
                        userId,
                    },
                    include: {
                        variant: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });
                movements.push(movement);
            }
            return movements;
        });
    }
    async scanAndRegister(userId, variantSku, quantity, reason) {
        const variant = await this.prisma.productVariant.findUnique({
            where: { variantSku },
            include: { product: true },
        });
        if (!variant) {
            throw new common_1.NotFoundException('Product not found with this barcode');
        }
        return this.registerMovement(userId, {
            variantId: variant.id,
            type: inventory_dto_1.MovementType.EXIT,
            quantity,
            reason,
            reference: 'SCAN',
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
