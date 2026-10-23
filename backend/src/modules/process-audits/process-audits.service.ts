import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProcessAuditsService {
    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService
    ) { }

    async createAudit(userId: string, data: any) {
        // Enforce unique OP for active audits
        const existingActive = await (this.prisma as any).processAudit.findFirst({
            where: { 
                op: data.op,
                status: 'EN_PROCESO'
            }
        });
        if (existingActive) {
            throw new BadRequestException(`Ya existe una auditoría en proceso para la OP ${data.op}`);
        }

        // Validate that UDP has received materials conforme for this sample
        if (data.sampleId) {
            const sample = await (this.prisma as any).productSample.findUnique({
                where: { id: data.sampleId },
                select: { materialReceiptStatus: true, udpRequirements: true }
            });
            const isConforme = sample?.materialReceiptStatus === 'RECIBIDO_CONFORME' || 
                (sample?.udpRequirements?.opDispatches && sample.udpRequirements.opDispatches.some((d: any) => d.status === 'CONFORME'));
            if (!isConforme) {
                throw new BadRequestException('Falta que logística envíe los materiales para poder hacer la auditoría');
            }
        }

        const audit = await (this.prisma as any).processAudit.create({
            data: {
                productId: data.productId || null,
                sampleId: data.sampleId || null,
                op: data.op,
                process: data.process, // This is currentProcess
                externalCompany: data.externalCompany || null,
                servicePrice: data.servicePrice || 0,
                inspectorId: userId,
                result: 'PENDIENTE',
                status: 'EN_PROCESO',
                quantityGood: 0,
                quantityProcess: 0,
                quantitySecond: 0,
                totalQuantity: data.totalQuantity || 0,
                observations: data.observations || null,
                evidences: data.evidences || [],
                checklist: data.checklist || {},
                processHistory: [
                    {
                        process: data.process,
                        date: new Date(),
                        action: 'INICIO_AUDITORIA',
                        servicePrice: data.servicePrice || 0,
                        externalCompany: data.externalCompany || null,
                        notes: data.servicePurchaseId ? `Auditoría iniciada con servicio vinculado de Logística` : 'Auditoría iniciada'
                    }
                ],
            },
            include: {
                sample: true,
                inspector: { select: { name: true } },
            },
        });

        // If a service purchase was linked, mark it as UTILIZADO with usage metadata
        if (data.servicePurchaseId) {
            try {
                const inspector = await (this.prisma as any).user.findUnique({
                    where: { id: userId },
                    select: { name: true }
                });
                const purchase = await (this.prisma as any).purchase.findUnique({
                    where: { id: data.servicePurchaseId }
                });
                if (purchase) {
                    let metadata: any = {};
                    let userNotes = purchase.notes || '';
                    if (userNotes.includes('__USAGE_METADATA__:')) {
                        const parts = userNotes.split('__USAGE_METADATA__:');
                        userNotes = parts[0].trim();
                        try { metadata = JSON.parse(parts[1]); } catch (e) {}
                    }
                    metadata = {
                        ...metadata,
                        isUsed: true,
                        status: 'UTILIZADO',
                        usedAt: new Date().toISOString(),
                        usedInOp: data.op,
                        usedInAuditId: audit.id,
                        usedProcess: data.process,
                        usedByName: inspector?.name || 'UDP'
                    };
                    const updatedNotes = userNotes 
                        ? `${userNotes}\n\n__USAGE_METADATA__:${JSON.stringify(metadata)}`
                        : `__USAGE_METADATA__:${JSON.stringify(metadata)}`;
                    await (this.prisma as any).purchase.update({
                        where: { id: data.servicePurchaseId },
                        data: {
                            status: 'UTILIZADO',
                            notes: updatedNotes
                        }
                    });
                }
            } catch (err) {
                console.error('Error marking service purchase as used:', err);
            }
        }

        return audit;
    }

    async findAll(query: any) {
        const { productId, op, process, result, adminStatus, status, logisticsStatus } = query;
        const where: any = {};
        if (productId) where.productId = productId;
        if (query.sampleId) where.sampleId = query.sampleId;
        if (op) where.op = { contains: op, mode: 'insensitive' };
        if (process) where.process = process;
        if (result) where.result = result;
        if (adminStatus) where.adminStatus = adminStatus;
        if (status) where.status = status;
        if (logisticsStatus) where.logisticsStatus = logisticsStatus;

        const audits = await (this.prisma as any).processAudit.findMany({
            where,
            include: {
                product: true,
                sample: true,
                inspector: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        // Corrección automática: Si está RECHAZADO, debe mostrarse EN_PROCESO para poder editar
        for (const audit of audits) {
            if (audit.adminStatus === 'RECHAZADO' && audit.status === 'FINALIZADO') {
                await (this.prisma as any).processAudit.update({
                    where: { id: audit.id },
                    data: { status: 'EN_PROCESO' }
                });
                audit.status = 'EN_PROCESO';
            }
        }

        return audits;
    }

    async findOne(id: string) {
        const audit = await (this.prisma as any).processAudit.findUnique({
            where: { id },
            include: {
                product: true,
                sample: true,
                inspector: { select: { name: true } },
                findings: {
                    include: {
                        correctiveActions: true,
                    },
                },
            },
        });
        if (!audit) throw new NotFoundException('Auditoría no encontrada');
        return audit;
    }

    // UDP guarda avance o cambia de proceso
    async updateProgress(id: string, data: any) {
        const audit = await this.findOne(id);
        
        if (audit.logisticsStatus === 'RECIBIDO') {
            throw new BadRequestException('Esta auditoría ya fue recibida en Logística.');
        }

        if (audit.adminStatus === 'APROBADO') {
            throw new BadRequestException('Esta auditoría ya ha sido aprobada y no se puede modificar.');
        }

        const dataToUpdate: any = {
            quantityGood: data.quantityGood !== undefined ? data.quantityGood : audit.quantityGood,
            quantityProcess: data.quantityProcess !== undefined ? data.quantityProcess : audit.quantityProcess,
            quantitySecond: data.quantitySecond !== undefined ? data.quantitySecond : audit.quantitySecond,
            result: data.result || audit.result,
            observations: data.observations !== undefined ? data.observations : audit.observations,
            evidences: data.evidences || audit.evidences,
            checklist: data.checklist || audit.checklist,
            servicePrice: data.servicePrice !== undefined ? data.servicePrice : audit.servicePrice,
            externalCompany: data.externalCompany !== undefined ? data.externalCompany : audit.externalCompany,
        };

        // Si cambia el proceso (paso)
        if (data.nextProcess && data.nextProcess !== audit.process) {
            const history = Array.isArray(audit.processHistory) ? audit.processHistory : [];
            dataToUpdate.process = data.nextProcess;
            dataToUpdate.processHistory = [
                ...history,
                {
                    process: data.nextProcess,
                    date: new Date(),
                    action: 'CAMBIO_PROCESO',
                    previousProcess: audit.process,
                    servicePrice: data.servicePrice !== undefined ? data.servicePrice : 0,
                    externalCompany: data.externalCompany || null,
                    servicePurchaseId: data.servicePurchaseId || null,
                    notes: data.stepNotes || `Paso a ${data.nextProcess}`
                }
            ];
        }

        // Si se vinculó un servicio de compras/servicios de logística:
        if (data.servicePurchaseId) {
            try {
                const purchase = await (this.prisma as any).purchase.findUnique({
                    where: { id: data.servicePurchaseId }
                });
                if (purchase) {
                    let metadata: any = {};
                    let userNotes = purchase.notes || '';
                    if (userNotes.includes('__USAGE_METADATA__:')) {
                        const parts = userNotes.split('__USAGE_METADATA__:');
                        userNotes = parts[0].trim();
                        try { metadata = JSON.parse(parts[1]); } catch (e) {}
                    }
                    metadata = {
                        ...metadata,
                        isUsed: true,
                        status: 'UTILIZADO',
                        usedAt: new Date().toISOString(),
                        usedInOp: audit.op,
                        usedInAuditId: audit.id,
                        usedProcess: data.nextProcess || audit.process,
                        usedByName: audit.inspector?.name || 'UDP'
                    };
                    const updatedNotes = userNotes 
                        ? `${userNotes}\n\n__USAGE_METADATA__:${JSON.stringify(metadata)}`
                        : `__USAGE_METADATA__:${JSON.stringify(metadata)}`;
                    await (this.prisma as any).purchase.update({
                        where: { id: data.servicePurchaseId },
                        data: {
                            status: 'UTILIZADO',
                            notes: updatedNotes
                        }
                    });
                }
            } catch (err) {
                console.error('Error marking service purchase as used in updateProgress:', err);
            }
        }

        if (data.findings) {
            dataToUpdate.findings = {
                deleteMany: {},
                create: (data.findings || []).map((finding: any) => ({
                    description: finding.description,
                    severity: finding.severity,
                    responsibleArea: finding.responsibleArea,
                    correctiveActions: {
                        create: (finding.correctiveActions || []).map((action: any) => ({
                            action: action.action,
                            responsibleName: action.responsibleName,
                            deadline: action.deadline ? new Date(action.deadline) : null,
                        })),
                    },
                })),
            };
        }

        return (this.prisma as any).processAudit.update({
            where: { id },
            data: dataToUpdate,
            include: {
                sample: true,
                inspector: { select: { name: true } },
                findings: { include: { correctiveActions: true } },
            },
        });
    }

    // UDP finaliza auditoría -> Notifica a Admin
    async finalizeAudit(id: string, data: any) {
        const audit = await this.findOne(id);
        
        if (audit.logisticsStatus === 'RECIBIDO') {
            throw new BadRequestException('Esta auditoría ya fue recibida en Logística y no se puede modificar.');
        }

        if (audit.adminStatus === 'APROBADO') {
            throw new BadRequestException('Esta auditoría ya ha sido aprobada por el Administrador.');
        }

        // Si ya está finalizada y esperando revisión (PENDIENTE), bloquear
        if (audit.status === 'FINALIZADO' && audit.adminStatus === 'PENDIENTE') {
            throw new BadRequestException('Esta auditoría ya está pendiente de revisión por el Administrador.');
        }

        // Consolidar registro completo de costos de fabricación del lote
        const processMap: Record<string, { process: string; price: number; company: string; servicePurchaseId?: string | null; date?: any }> = {};
        const history = Array.isArray(audit.processHistory) ? audit.processHistory : [];
        history.forEach((h: any) => {
            if (h.process && (h.servicePrice !== undefined || h.externalCompany)) {
                processMap[h.process] = {
                    process: h.process,
                    price: Number(h.servicePrice) || 0,
                    company: h.externalCompany || '',
                    servicePurchaseId: h.servicePurchaseId || null,
                    date: h.date
                };
            }
        });
        if (audit.process) {
            processMap[audit.process] = {
                process: audit.process,
                price: Number(audit.servicePrice) || processMap[audit.process]?.price || 0,
                company: audit.externalCompany || processMap[audit.process]?.company || '',
                servicePurchaseId: processMap[audit.process]?.servicePurchaseId || null,
                date: processMap[audit.process]?.date || new Date()
            };
        }
        const processesList = Object.values(processMap);
        const totalUnitCost = processesList.reduce((acc, p) => acc + p.price, 0);
        const totalLotCost = totalUnitCost * (audit.totalQuantity || 0);

        // Para cualquier otro caso (EN_PROCESO o RECHAZADO), permitimos finalizar.
        const updated = await (this.prisma as any).processAudit.update({
            where: { id },
            data: {
                status: 'FINALIZADO',
                adminStatus: 'PENDIENTE',
                result: data.result || audit.result,
                quantityGood: data.quantityGood !== undefined ? data.quantityGood : audit.quantityGood,
                quantityProcess: data.quantityProcess !== undefined ? data.quantityProcess : audit.quantityProcess,
                quantitySecond: data.quantitySecond !== undefined ? data.quantitySecond : audit.quantitySecond,
                observations: data.observations || audit.observations,
                qualitySizeData: data.qualitySizeData || audit.qualitySizeData,
                processHistory: [
                   ...history,
                   { 
                       action: 'FINALIZADO_POR_UDP', 
                       date: new Date(),
                       totalUnitCost,
                       totalLotCost,
                       totalQuantity: audit.totalQuantity,
                       manufacturingCosts: processesList
                   }
                ]
            },
            include: { sample: true },
        });

        // Notificar al Admin
        await this.notifications.create({
            title: 'Auditoría Finalizada - Pendiente de Aprobación',
            message: `La OP ${audit.op} de ${updated.sample?.name || 'Muestra'} ha sido finalizada por UDP y espera su revisión.`,
            type: 'AUDIT_FINALIZED',
            referenceId: audit.id,
            targetRole: 'ADMIN',
        });

        return updated;
    }

    // Admin aprueba/rechaza
    async adminReview(id: string, adminId: string, data: { status: string; notes?: string }) {
        const audit = await this.findOne(id);
        if (audit.status !== 'FINALIZADO') {
            throw new BadRequestException('La auditoría debe estar en estado FINALIZADO para ser revisada por el Admin.');
        }

        const updated = await (this.prisma as any).processAudit.update({
            where: { id },
            data: {
                adminStatus: data.status,
                adminNotes: data.notes,
                adminUserId: adminId,
                status: data.status === 'RECHAZADO' ? 'EN_PROCESO' : audit.status,
                processHistory: [
                    ...(Array.isArray(audit.processHistory) ? audit.processHistory : []),
                    { action: `ADMIN_${data.status}`, date: new Date(), notes: data.notes }
                ]
            },
            include: { sample: true },
        });

        // Notificar a UDP/Comercial si fue rechazado
        if (data.status === 'RECHAZADO') {
            await this.notifications.create({
                title: 'Auditoría RECHAZADA por Admin',
                message: `La auditoría de la OP ${audit.op} fue rechazada: ${data.notes || 'Sin notas'}`,
                type: 'AUDIT_REJECTED',
                referenceId: audit.id,
                userId: audit.inspectorId, // Al inspector original
            });
        }

        return updated;
    }

    async updateApprovalStatus(id: string, status: string) {
        return (this.prisma as any).processAudit.update({
            where: { id },
            data: {
                approvalStatus: status,
                approvedAt: status === 'APROBADO' ? new Date() : null,
            },
        });
    }

    async updateCorrectiveAction(actionId: string, status: string) {
        return this.prisma.correctiveAction.update({
            where: { id: actionId },
            data: { status },
        });
    }

    // Logística confirma recibido
    async logisticsConfirm(id: string) {
        const audit = await this.findOne(id);
        if (audit.adminStatus !== 'APROBADO') {
            throw new BadRequestException('Solo se pueden recibir auditorías aprobadas por el administrador.');
        }

        const updatedAudit = await (this.prisma as any).processAudit.update({
            where: { id },
            data: {
                status: 'FINALIZADO',
                logisticsStatus: 'RECIBIDO',
                receivedAt: new Date(),
                processHistory: [
                    ...(Array.isArray(audit.processHistory) ? audit.processHistory : []),
                    { action: 'RECIBIDO_EN_LOGISTICA', date: new Date(), notes: 'Cargado al inventario' }
                ]
            },
        });

        // Si viene de una muestra, marcar la muestra como completada en inventario
        if (audit.sampleId) {
            await (this.prisma as any).productSample.update({
                where: { id: audit.sampleId },
                data: { status: 'COMPLETADO_INVENTARIO' }
            });
        }

        return updatedAudit;
    }

    async getAuditableItems() {
        const samples = await (this.prisma as any).productSample.findMany({
            where: { 
                status: 'APROBADO',
                adminOpApprovalStatus: 'APROBADO',
                processAudits: {
                    none: {
                        OR: [
                            { status: 'EN_PROCESO' },
                            { status: 'FINALIZADO', logisticsStatus: 'PENDIENTE' }
                        ]
                    }
                }
            },
            select: { 
                id: true, 
                name: true, 
                op: true, 
                productionQuantity: true,
                productionColor: true,
                productionSizeData: true,
                materialReceiptStatus: true,
                udpRequirements: true
            },
        });

        return {
            products: [],
            samples: samples.map((s: any) => {
                const isConforme = s.materialReceiptStatus === 'RECIBIDO_CONFORME' || 
                    (s.udpRequirements?.opDispatches && s.udpRequirements.opDispatches.some((d: any) => d.status === 'CONFORME'));
                return {
                    id: s.id,
                    name: s.name,
                    sku: `SAMP-${s.id.slice(-4).toUpperCase()}`,
                    type: 'SAMPLE',
                    op: s.op,
                    productionQuantity: s.productionQuantity,
                    productionColor: s.productionColor,
                    productionSizeData: s.productionSizeData,
                    materialReceiptStatus: s.materialReceiptStatus,
                    materialsReceived: isConforme,
                };
            }),
        };
    }

    // Para Logística: Solo las aprobadas por Admin y que no han sido recibidas
    async getFinalizedAudits() {
        const audits = await (this.prisma as any).processAudit.findMany({
            where: { 
                status: 'FINALIZADO',
                adminStatus: 'APROBADO',
                logisticsStatus: 'PENDIENTE'
            },
            include: {
                sample: true,
                inspector: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return audits.map((a: any) => ({
            id: a.id,
            sampleName: a.sample?.name || 'Desconocido',
            sampleId: a.sampleId,
            op: a.op,
            process: a.process,
            externalCompany: a.externalCompany,
            inspector: a.inspector?.name,
            auditDate: a.auditDate,
            result: a.result,
            quantityGood: a.quantityGood,
            quantityProcess: a.quantityProcess,
            quantitySecond: a.quantitySecond,
            totalQuantity: a.totalQuantity,
            productionColor: a.sample?.productionColor,
            productionSizeData: a.sample?.productionSizeData,
            qualitySizeData: a.qualitySizeData,
            udpRequirements: a.sample?.udpRequirements,
            barcode: a.sample?.barcode,
        }));
    }
}
