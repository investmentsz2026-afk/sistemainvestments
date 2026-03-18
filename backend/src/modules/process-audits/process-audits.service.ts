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

        return (this.prisma as any).processAudit.create({
            data: {
                productId: data.productId || null,
                sampleId: data.sampleId || null,
                op: data.op,
                process: data.process, // This is currentProcess
                externalCompany: data.externalCompany || null,
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
                        notes: 'Auditoría iniciada'
                    }
                ],
            },
            include: {
                sample: true,
                inspector: { select: { name: true } },
            },
        });
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

        return (this.prisma as any).processAudit.findMany({
            where,
            include: {
                product: true,
                sample: true,
                inspector: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
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
        if (audit.status !== 'EN_PROCESO') {
            throw new BadRequestException('Esta auditoría ya no está en proceso.');
        }

        const dataToUpdate: any = {
            quantityGood: data.quantityGood !== undefined ? data.quantityGood : audit.quantityGood,
            quantityProcess: data.quantityProcess !== undefined ? data.quantityProcess : audit.quantityProcess,
            quantitySecond: data.quantitySecond !== undefined ? data.quantitySecond : audit.quantitySecond,
            result: data.result || audit.result,
            observations: data.observations !== undefined ? data.observations : audit.observations,
            evidences: data.evidences || audit.evidences,
            checklist: data.checklist || audit.checklist,
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
                    notes: data.stepNotes || `Paso a ${data.nextProcess}`
                }
            ];
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
        if (audit.status !== 'EN_PROCESO') {
            throw new BadRequestException('Esta auditoría ya fue finalizada.');
        }

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
                processHistory: [
                   ...(Array.isArray(audit.processHistory) ? audit.processHistory : []),
                   { action: 'FINALIZADO_POR_UDP', date: new Date() }
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
                adminOpApprovalStatus: 'APROBADO'
            },
            select: { 
                id: true, 
                name: true, 
                op: true, 
                productionQuantity: true,
                productionColor: true,
                productionSizeData: true
            },
        });

        return {
            products: [],
            samples: samples.map((s: any) => ({
                id: s.id,
                name: s.name,
                sku: `SAMP-${s.id.slice(-4).toUpperCase()}`,
                type: 'SAMPLE',
                op: s.op,
                productionQuantity: s.productionQuantity,
                productionColor: s.productionColor,
                productionSizeData: s.productionSizeData,
            })),
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
            udpRequirements: a.sample?.udpRequirements,
        }));
    }
}
