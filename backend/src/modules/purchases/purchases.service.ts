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

            const initialStatus = type === 'SERVICE' ? 'DISPONIBLE' : 'EN_CALIDAD';
            const purchase = await prisma.purchase.create({
                data: {
                    type: type || 'PURCHASE',
                    invoiceNumber,
                    op,
                    supplierId: supplierId || null,
                    notes,
                    totalAmount,
                    status: initialStatus,
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
                            status: initialStatus,
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
        const records = await this.prisma.purchase.findMany({
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

        return records.map((p) => {
            let usageInfo: any = null;
            let displayNotes = p.notes || '';
            if (p.notes && p.notes.includes('__USAGE_METADATA__:')) {
                const parts = p.notes.split('__USAGE_METADATA__:');
                displayNotes = parts[0].trim();
                try {
                    usageInfo = JSON.parse(parts[1]);
                } catch (e) {}
            }
            return {
                ...p,
                notes: displayNotes,
                rawNotes: p.notes,
                usageInfo,
                isUsed: p.status === 'UTILIZADO' || !!usageInfo?.isUsed,
            };
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

        let usageInfo: any = null;
        let displayNotes = purchase.notes || '';
        if (purchase.notes && purchase.notes.includes('__USAGE_METADATA__:')) {
            const parts = purchase.notes.split('__USAGE_METADATA__:');
            displayNotes = parts[0].trim();
            try {
                usageInfo = JSON.parse(parts[1]);
            } catch (e) {}
        }

        return {
            ...purchase,
            notes: displayNotes,
            rawNotes: purchase.notes,
            usageInfo,
            isUsed: purchase.status === 'UTILIZADO' || !!usageInfo?.isUsed,
        };
    }

    async markServiceUsed(id: string, usageData: { op: string; auditId: string; process: string; inspectorName: string }) {
        const purchase = await this.prisma.purchase.findUnique({ where: { id } });
        if (!purchase) throw new NotFoundException('Servicio no encontrado');

        let metadata: any = {};
        let userNotes = purchase.notes || '';
        if (userNotes.includes('__USAGE_METADATA__:')) {
            const parts = userNotes.split('__USAGE_METADATA__:');
            userNotes = parts[0].trim();
            try {
                metadata = JSON.parse(parts[1]);
            } catch (e) {}
        }

        metadata = {
            ...metadata,
            isUsed: true,
            status: 'UTILIZADO',
            usedAt: new Date().toISOString(),
            usedInOp: usageData.op,
            usedInAuditId: usageData.auditId,
            usedProcess: usageData.process,
            usedByName: usageData.inspectorName
        };

        const updatedNotes = userNotes 
            ? `${userNotes}\n\n__USAGE_METADATA__:${JSON.stringify(metadata)}`
            : `__USAGE_METADATA__:${JSON.stringify(metadata)}`;

        return this.prisma.purchase.update({
            where: { id },
            data: {
                status: 'UTILIZADO',
                notes: updatedNotes
            },
            include: {
                items: true,
                supplier: true
            }
        });
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
