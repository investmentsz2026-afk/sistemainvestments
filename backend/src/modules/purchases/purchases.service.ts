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

    private formatPurchaseRecord(p: any) {
        let usageInfo: any = null;
        let displayNotes = p.notes || '';
        if (p.notes && p.notes.includes('__USAGE_METADATA__:')) {
            const parts = p.notes.split('__USAGE_METADATA__:');
            displayNotes = parts[0].trim();
            try {
                usageInfo = JSON.parse(parts[1]);
            } catch (e) {}
        }

        const rawFinance = usageInfo?.financeInfo || null;
        const installments = Array.isArray(rawFinance?.installments) ? rawFinance.installments : [];
        const paymentsHistory = Array.isArray(rawFinance?.paymentsHistory) ? rawFinance.paymentsHistory : [];

        let paidAmount = 0;
        if (rawFinance?.paymentCondition === 'LETRAS' && installments.length > 0) {
            paidAmount = Math.round(
                installments
                    .filter((inst: any) => inst.status === 'PAGADO')
                    .reduce((acc: number, inst: any) => acc + (Number(inst.amount) || 0), 0) * 100
            ) / 100;
        } else if (rawFinance?.paymentCondition === 'CONTADO' && rawFinance?.paymentStatus === 'PAGADO') {
            paidAmount = p.totalAmount;
        } else if (paymentsHistory.length > 0) {
            paidAmount = Math.round(
                paymentsHistory.reduce((acc: number, pay: any) => acc + (Number(pay.amount) || 0), 0) * 100
            ) / 100;
        } else if (typeof rawFinance?.paidAmount === 'number') {
            paidAmount = rawFinance.paidAmount;
        }

        const pendingAmount = Math.max(0, Math.round((p.totalAmount - paidAmount) * 100) / 100);
        let paymentStatus: 'PAGADO' | 'PARCIAL' | 'PENDIENTE' = 'PENDIENTE';
        if (pendingAmount <= 0.01 && p.totalAmount > 0 && paidAmount > 0) {
            paymentStatus = 'PAGADO';
        } else if (paidAmount > 0.01) {
            paymentStatus = 'PARCIAL';
        }

        const financeInfo = {
            isConfigured: Boolean(rawFinance?.isConfigured),
            paymentCondition: rawFinance?.paymentCondition || 'PENDIENTE', // 'CONTADO' | 'CREDITO' | 'LETRAS' | 'PENDIENTE'
            paymentStatus,
            paidAmount,
            pendingAmount,
            dueDate: rawFinance?.dueDate || null,
            paymentMethod: rawFinance?.paymentMethod || 'TRANSFERENCIA',
            operationNumber: rawFinance?.operationNumber || '',
            voucherUrl: rawFinance?.voucherUrl || '',
            paymentDate: rawFinance?.paymentDate || null,
            accountingNotes: rawFinance?.accountingNotes || '',
            taxType: rawFinance?.taxType || 'CON_IGV', // 'CON_IGV' | 'SIN_IGV'
            mermaPercent: Number(rawFinance?.mermaPercent) || 0,
            expenseCategory: rawFinance?.expenseCategory || (p.type === 'SERVICE' ? 'SERVICIO_CONFECCION' : 'MATERIA_PRIMA'),
            installments,
            paymentsHistory,
            updatedAt: rawFinance?.updatedAt || null,
        };

        return {
            ...p,
            notes: displayNotes,
            rawNotes: p.notes,
            usageInfo,
            financeInfo,
            isUsed: p.status === 'UTILIZADO' || !!usageInfo?.isUsed,
        };
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

        return records.map((p) => this.formatPurchaseRecord(p));
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

        return this.formatPurchaseRecord(purchase);
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

    private extractNotesAndMetadata(rawNotes?: string | null): { userNotes: string; metadata: any } {
        let metadata: any = {};
        let userNotes = rawNotes || '';
        if (userNotes.includes('__USAGE_METADATA__:')) {
            const parts = userNotes.split('__USAGE_METADATA__:');
            userNotes = parts[0].trim();
            try {
                metadata = JSON.parse(parts[1]);
            } catch (e) {}
        }
        return { userNotes, metadata };
    }

    private combineNotesAndMetadata(userNotes: string, metadata: any): string {
        if (!metadata || Object.keys(metadata).length === 0) {
            return userNotes;
        }
        return userNotes
            ? `${userNotes}\n\n__USAGE_METADATA__:${JSON.stringify(metadata)}`
            : `__USAGE_METADATA__:${JSON.stringify(metadata)}`;
    }

    async configureFinancePlan(id: string, planData: any) {
        const purchase = await this.prisma.purchase.findUnique({ where: { id } });
        if (!purchase) throw new NotFoundException('Registro de compra/servicio no encontrado');

        const { userNotes, metadata } = this.extractNotesAndMetadata(purchase.notes);
        const existingFinance = metadata.financeInfo || {};

        const condition = planData.paymentCondition || existingFinance.paymentCondition || 'CONTADO';
        let installments = Array.isArray(planData.installments)
            ? planData.installments.map((inst: any, idx: number) => ({
                  id: inst.id || `L-${idx + 1}`,
                  number: Number(inst.number) || idx + 1,
                  uniqueCode: inst.uniqueCode || '',
                  amount: Math.round((Number(inst.amount) || 0) * 100) / 100,
                  dueDate: inst.dueDate || new Date().toISOString().split('T')[0],
                  status: inst.status === 'PAGADO' ? 'PAGADO' : 'PENDIENTE',
                  paymentDate: inst.paymentDate || null,
                  paymentMethod: inst.paymentMethod || 'TRANSFERENCIA',
                  operationNumber: inst.operationNumber || '',
                  voucherUrl: inst.voucherUrl || '',
                  notes: inst.notes || '',
              }))
            : existingFinance.installments || [];

        let paymentsHistory = Array.isArray(planData.paymentsHistory)
            ? planData.paymentsHistory
            : existingFinance.paymentsHistory || [];

        let paidAmount = 0;
        let paymentStatus: 'PAGADO' | 'PARCIAL' | 'PENDIENTE' = 'PENDIENTE';

        if (condition === 'CONTADO') {
            paidAmount = purchase.totalAmount;
            paymentStatus = 'PAGADO';
            paymentsHistory = [
                {
                    id: `PAY-${Date.now()}`,
                    amount: purchase.totalAmount,
                    paymentDate: planData.paymentDate || new Date().toISOString().split('T')[0],
                    paymentMethod: planData.paymentMethod || 'TRANSFERENCIA',
                    operationNumber: planData.operationNumber || '',
                    voucherUrl: planData.voucherUrl || '',
                    notes: planData.accountingNotes || 'Pago al contado',
                },
            ];
        } else if (condition === 'LETRAS') {
            paidAmount = Math.round(
                installments
                    .filter((i: any) => i.status === 'PAGADO')
                    .reduce((acc: number, i: any) => acc + (Number(i.amount) || 0), 0) * 100
            ) / 100;
            if (paidAmount >= purchase.totalAmount - 0.01 && purchase.totalAmount > 0) {
                paymentStatus = 'PAGADO';
            } else if (paidAmount > 0.01) {
                paymentStatus = 'PARCIAL';
            } else {
                paymentStatus = 'PENDIENTE';
            }
        } else {
            // CREDITO
            paidAmount = Math.round(
                paymentsHistory.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0) * 100
            ) / 100;
            if (paidAmount >= purchase.totalAmount - 0.01 && purchase.totalAmount > 0) {
                paymentStatus = 'PAGADO';
            } else if (paidAmount > 0.01) {
                paymentStatus = 'PARCIAL';
            } else {
                paymentStatus = 'PENDIENTE';
            }
        }

        const pendingAmount = Math.max(0, Math.round((purchase.totalAmount - paidAmount) * 100) / 100);

        metadata.financeInfo = {
            ...existingFinance,
            isConfigured: true,
            paymentCondition: condition,
            paymentStatus,
            paidAmount,
            pendingAmount,
            dueDate: planData.dueDate || existingFinance.dueDate || null,
            paymentMethod: planData.paymentMethod || existingFinance.paymentMethod || 'TRANSFERENCIA',
            operationNumber: planData.operationNumber ?? existingFinance.operationNumber ?? '',
            voucherUrl: planData.voucherUrl ?? existingFinance.voucherUrl ?? '',
            paymentDate: planData.paymentDate || existingFinance.paymentDate || new Date().toISOString().split('T')[0],
            accountingNotes: planData.accountingNotes ?? existingFinance.accountingNotes ?? '',
            taxType: planData.taxType || existingFinance.taxType || 'CON_IGV',
            mermaPercent: planData.mermaPercent !== undefined ? Number(planData.mermaPercent) : (existingFinance.mermaPercent || 0),
            expenseCategory: planData.expenseCategory || existingFinance.expenseCategory || (purchase.type === 'SERVICE' ? 'SERVICIO_CONFECCION' : 'MATERIA_PRIMA'),
            installments,
            paymentsHistory,
            updatedAt: new Date().toISOString(),
        };

        const updatedNotes = this.combineNotesAndMetadata(userNotes, metadata);

        const updated = await this.prisma.purchase.update({
            where: { id },
            data: { notes: updatedNotes },
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

        return this.formatPurchaseRecord(updated);
    }

    async payInstallment(id: string, installmentNumber: number, payData: any) {
        const purchase = await this.prisma.purchase.findUnique({ where: { id } });
        if (!purchase) throw new NotFoundException('Registro de compra/servicio no encontrado');

        const { userNotes, metadata } = this.extractNotesAndMetadata(purchase.notes);
        const existingFinance = metadata.financeInfo || {};
        const installments = Array.isArray(existingFinance.installments) ? [...existingFinance.installments] : [];

        const targetIdx = installments.findIndex((inst: any) => Number(inst.number) === Number(installmentNumber));
        if (targetIdx === -1) {
            throw new NotFoundException(`No se encontró la Letra / Cuota N° ${installmentNumber}`);
        }

        installments[targetIdx] = {
            ...installments[targetIdx],
            status: 'PAGADO',
            paymentDate: payData.paymentDate || new Date().toISOString().split('T')[0],
            paymentMethod: payData.paymentMethod || 'TRANSFERENCIA',
            operationNumber: payData.operationNumber || '',
            voucherUrl: payData.voucherUrl || installments[targetIdx].voucherUrl || '',
            notes: payData.notes || '',
        };

        const paidAmount = Math.round(
            installments
                .filter((i: any) => i.status === 'PAGADO')
                .reduce((acc: number, i: any) => acc + (Number(i.amount) || 0), 0) * 100
        ) / 100;
        const pendingAmount = Math.max(0, Math.round((purchase.totalAmount - paidAmount) * 100) / 100);
        const paymentStatus = pendingAmount <= 0.01 ? 'PAGADO' : paidAmount > 0.01 ? 'PARCIAL' : 'PENDIENTE';

        metadata.financeInfo = {
            ...existingFinance,
            isConfigured: true,
            paymentCondition: 'LETRAS',
            paymentStatus,
            paidAmount,
            pendingAmount,
            installments,
            updatedAt: new Date().toISOString(),
        };

        const updatedNotes = this.combineNotesAndMetadata(userNotes, metadata);

        const updated = await this.prisma.purchase.update({
            where: { id },
            data: { notes: updatedNotes },
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

        return this.formatPurchaseRecord(updated);
    }

    async registerDirectPayment(id: string, payData: any) {
        const purchase = await this.prisma.purchase.findUnique({ where: { id } });
        if (!purchase) throw new NotFoundException('Registro de compra/servicio no encontrado');

        const { userNotes, metadata } = this.extractNotesAndMetadata(purchase.notes);
        const existingFinance = metadata.financeInfo || {};
        const paymentsHistory = Array.isArray(existingFinance.paymentsHistory) ? [...existingFinance.paymentsHistory] : [];

        const amountToPay = Math.round((Number(payData.amount) || 0) * 100) / 100;
        paymentsHistory.push({
            id: `PAY-${Date.now()}`,
            amount: amountToPay,
            paymentDate: payData.paymentDate || new Date().toISOString().split('T')[0],
            paymentMethod: payData.paymentMethod || 'TRANSFERENCIA',
            operationNumber: payData.operationNumber || '',
            voucherUrl: payData.voucherUrl || '',
            notes: payData.notes || 'Abono a proveedor',
        });

        const paidAmount = Math.min(
            purchase.totalAmount,
            Math.round(paymentsHistory.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0) * 100) / 100
        );
        const pendingAmount = Math.max(0, Math.round((purchase.totalAmount - paidAmount) * 100) / 100);
        const paymentStatus = pendingAmount <= 0.01 ? 'PAGADO' : paidAmount > 0.01 ? 'PARCIAL' : 'PENDIENTE';

        metadata.financeInfo = {
            ...existingFinance,
            isConfigured: true,
            paymentCondition: existingFinance.paymentCondition === 'LETRAS' ? 'CREDITO' : (existingFinance.paymentCondition || 'CREDITO'),
            paymentStatus,
            paidAmount,
            pendingAmount,
            paymentMethod: payData.paymentMethod || existingFinance.paymentMethod || 'TRANSFERENCIA',
            operationNumber: payData.operationNumber || existingFinance.operationNumber || '',
            voucherUrl: payData.voucherUrl || existingFinance.voucherUrl || '',
            paymentDate: payData.paymentDate || new Date().toISOString().split('T')[0],
            paymentsHistory,
            updatedAt: new Date().toISOString(),
        };

        const updatedNotes = this.combineNotesAndMetadata(userNotes, metadata);

        const updated = await this.prisma.purchase.update({
            where: { id },
            data: { notes: updatedNotes },
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

        return this.formatPurchaseRecord(updated);
    }

    async getCostSummary() {
        const [allPurchases, processAudits, products] = await Promise.all([
            this.findAll(),
            this.prisma.processAudit.findMany({
                include: { product: true, sample: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.product.findMany({
                include: { variants: true, productionOrders: true },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const opMap = new Map<string, any>();

        const ensureOp = (opCode: string) => {
            const cleanOp = (opCode || 'SIN-OP').trim().toUpperCase();
            if (!opMap.has(cleanOp)) {
                opMap.set(cleanOp, {
                    op: cleanOp,
                    productName: '',
                    sku: '',
                    sellingPrice: 0,
                    materialsCost: 0,
                    aviosCost: 0,
                    chemicalsCost: 0,
                    servicesCost: 0,
                    totalCost: 0,
                    totalProducedUnits: 0,
                    goodUnits: 0,
                    secondUnits: 0,
                    mermaUnits: 0,
                    mermaPercent: 0,
                    unitCost: 0,
                    unitProfit: 0,
                    marginPercent: 0,
                    items: [],
                    audits: [],
                });
            }
            return opMap.get(cleanOp);
        };

        // 1. Map products with OPs
        for (const prod of products) {
            const ops: string[] = [];
            if (prod.op) ops.push(prod.op);
            if (Array.isArray((prod as any).productionOrders)) {
                for (const po of (prod as any).productionOrders) {
                    if (po.opNumber) ops.push(po.opNumber);
                }
            }
            for (const opCode of ops) {
                const entry = ensureOp(opCode);
                if (!entry.productName) entry.productName = prod.name;
                if (!entry.sku) entry.sku = prod.sku;
                if (!entry.sellingPrice && prod.sellingPrice) entry.sellingPrice = prod.sellingPrice;
                const variantStock = (prod.variants || []).reduce((s: number, v: any) => s + (Number(v.stock) || 0), 0);
                if (entry.totalProducedUnits === 0 && variantStock > 0) {
                    entry.totalProducedUnits = variantStock;
                    entry.goodUnits = variantStock;
                }
            }
        }

        // 2. Map Purchases & Services
        for (const pur of allPurchases) {
            if (pur.type !== 'PURCHASE' && pur.type !== 'SERVICE') continue;
            const opCode = pur.op || pur.usageInfo?.usedInOp || 'GENERAL';
            const entry = ensureOp(opCode);

            if (pur.financeInfo?.mermaPercent > 0 && entry.mermaPercent === 0) {
                entry.mermaPercent = pur.financeInfo.mermaPercent;
            }

            for (const item of pur.items || []) {
                const itemTotal = Math.round((Number(item.quantity) || 0) * (Number(item.price) || 0) * 100) / 100;
                const cat = (item.category || '').toUpperCase();
                if (pur.type === 'SERVICE' || cat.includes('SERVICIO')) {
                    entry.servicesCost += itemTotal;
                } else if (cat.includes('AVIO') || cat.includes('AVÍO')) {
                    entry.aviosCost += itemTotal;
                } else if (cat.includes('QUIMIC') || cat.includes('QUÍMIC')) {
                    entry.chemicalsCost += itemTotal;
                } else {
                    entry.materialsCost += itemTotal;
                }
                entry.items.push({
                    id: item.id,
                    purchaseId: pur.id,
                    invoiceNumber: pur.invoiceNumber,
                    supplierName: pur.supplier?.name || 'Proveedor',
                    name: item.name,
                    category: item.category,
                    quantity: item.quantity,
                    unit: item.unit,
                    price: item.price,
                    total: itemTotal,
                    type: pur.type,
                    date: pur.createdAt,
                });
            }
        }

        // 3. Map Process Audits (Confección, Lavandería, Corte, Acabado, Mermas y Segunda)
        for (const aud of processAudits) {
            if (!aud.op) continue;
            const entry = ensureOp(aud.op);
            if (!entry.productName && (aud.product?.name || aud.sample?.name)) {
                entry.productName = aud.product?.name || aud.sample?.name || '';
            }
            if (!entry.sellingPrice && aud.product?.sellingPrice) {
                entry.sellingPrice = aud.product.sellingPrice;
            }

            const totalQty = Number(aud.totalQuantity) || 0;
            const goodQty = Number(aud.quantityGood) || 0;
            const secondQty = Number(aud.quantitySecond) || 0;
            const processQty = Number(aud.quantityProcess) || 0;

            if (totalQty > entry.totalProducedUnits) {
                entry.totalProducedUnits = totalQty;
                entry.goodUnits = goodQty > 0 ? goodQty : totalQty;
                entry.secondUnits = secondQty;
                entry.mermaUnits = secondQty + processQty;
            }

            const srvPrice = Number(aud.servicePrice) || 0;
            if (srvPrice > 0) {
                // If servicePrice is unit price (< 100) and totalQty > 1, or total cost
                const auditCost = srvPrice < 150 && totalQty > 1 ? Math.round(srvPrice * totalQty * 100) / 100 : srvPrice;
                // Only add if not already covered by a linked SERVICE purchase for the same auditId
                const alreadyInPurchase = allPurchases.some((p: any) => p.usageInfo?.usedInAuditId === aud.id);
                if (!alreadyInPurchase) {
                    entry.servicesCost += auditCost;
                }
            }

            entry.audits.push({
                id: aud.id,
                process: aud.process,
                externalCompany: aud.externalCompany,
                totalQuantity: totalQty,
                quantityGood: goodQty,
                quantitySecond: secondQty,
                servicePrice: srvPrice,
                date: aud.auditDate,
            });
        }

        // 4. Finalize Unit Cost Calculations
        const list = Array.from(opMap.values()).map((entry) => {
            entry.materialsCost = Math.round(entry.materialsCost * 100) / 100;
            entry.aviosCost = Math.round(entry.aviosCost * 100) / 100;
            entry.chemicalsCost = Math.round(entry.chemicalsCost * 100) / 100;
            entry.servicesCost = Math.round(entry.servicesCost * 100) / 100;
            entry.totalCost = Math.round((entry.materialsCost + entry.aviosCost + entry.chemicalsCost + entry.servicesCost) * 100) / 100;

            if (entry.totalProducedUnits > 0 && entry.mermaUnits > 0 && entry.mermaPercent === 0) {
                entry.mermaPercent = Math.round((entry.mermaUnits / entry.totalProducedUnits) * 1000) / 10;
            }

            const effectiveUnits = entry.goodUnits > 0 ? entry.goodUnits : (entry.totalProducedUnits > 0 ? entry.totalProducedUnits : 1);
            entry.unitCost = Math.round((entry.totalCost / effectiveUnits) * 100) / 100;

            if (entry.sellingPrice > 0) {
                entry.unitProfit = Math.round((entry.sellingPrice - entry.unitCost) * 100) / 100;
                entry.marginPercent = Math.round(((entry.sellingPrice - entry.unitCost) / entry.sellingPrice) * 1000) / 10;
            }

            return entry;
        }).filter((e) => e.totalCost > 0 || e.totalProducedUnits > 0);

        return list;
    }

    async update(id: string, dto: CreatePurchaseDto) {
        const existing = await this.prisma.purchase.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Compra no encontrada');

        const { invoiceNumber, op, notes, items, type, supplierId } = dto;
        const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        const { metadata } = this.extractNotesAndMetadata(existing.notes);
        const cleanIncomingNotes = notes ? this.extractNotesAndMetadata(notes).userNotes : '';
        const finalNotes = this.combineNotesAndMetadata(cleanIncomingNotes, metadata);

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
                    notes: finalNotes,
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

            return this.formatPurchaseRecord(purchase);
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
