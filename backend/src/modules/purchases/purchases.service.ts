// backend/src/modules/purchases/purchases.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, dto: CreatePurchaseDto) {
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

    async findOne(id: string) {
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
        if (!purchase) throw new NotFoundException('Compra no encontrada');
        return purchase;
    }

    async update(id: string, dto: CreatePurchaseDto) {
        const existing = await this.prisma.purchase.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Compra no encontrada');

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

    async remove(id: string) {
        const existing = await this.prisma.purchase.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Compra no encontrada');

        return this.prisma.$transaction(async (prisma) => {
            await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } });
            await prisma.purchase.delete({ where: { id } });
            return { deleted: true };
        });
    }
}
