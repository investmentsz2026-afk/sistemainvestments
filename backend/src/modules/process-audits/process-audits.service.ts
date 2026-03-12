import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProcessAuditsService {
    constructor(private prisma: PrismaService) { }

    async createAudit(userId: string, data: any) {
        return this.prisma.processAudit.create({
            data: {
                productId: data.productId,
                op: data.op,
                process: data.process,
                inspectorId: userId,
                result: data.result,
                quantityGood: data.quantityGood || 0,
                quantityProcess: data.quantityProcess || 0,
                quantitySecond: data.quantitySecond || 0,
                totalQuantity: data.totalQuantity || 0,
                observations: data.observations,
                evidences: data.evidences || [],
                checklist: data.checklist || {},
                findings: {
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
                },
            },
            include: {
                findings: {
                    include: {
                        correctiveActions: true,
                    },
                },
            },
        });
    }

    async findAll(query: any) {
        const { productId, op, process, result, approvalStatus } = query;
        const where: any = {};
        if (productId) where.productId = productId;
        if (op) where.op = { contains: op, mode: 'insensitive' };
        if (process) where.process = process;
        if (result) where.result = result;
        if (approvalStatus) where.approvalStatus = approvalStatus;

        return this.prisma.processAudit.findMany({
            where,
            include: {
                product: true,
                inspector: { select: { name: true } },
            },
            orderBy: { auditDate: 'desc' },
        });
    }

    async findOne(id: string) {
        const audit = await this.prisma.processAudit.findUnique({
            where: { id },
            include: {
                product: true,
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

    async updateApprovalStatus(id: string, status: string) {
        return this.prisma.processAudit.update({
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
}
