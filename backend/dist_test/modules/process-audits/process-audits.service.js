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
exports.ProcessAuditsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let ProcessAuditsService = class ProcessAuditsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createAudit(userId, data) {
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
                    create: (data.findings || []).map((finding) => ({
                        description: finding.description,
                        severity: finding.severity,
                        responsibleArea: finding.responsibleArea,
                        correctiveActions: {
                            create: (finding.correctiveActions || []).map((action) => ({
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
    async findAll(query) {
        const { productId, op, process, result, approvalStatus } = query;
        const where = {};
        if (productId)
            where.productId = productId;
        if (op)
            where.op = { contains: op, mode: 'insensitive' };
        if (process)
            where.process = process;
        if (result)
            where.result = result;
        if (approvalStatus)
            where.approvalStatus = approvalStatus;
        return this.prisma.processAudit.findMany({
            where,
            include: {
                product: true,
                inspector: { select: { name: true } },
            },
            orderBy: { auditDate: 'desc' },
        });
    }
    async findOne(id) {
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
        if (!audit)
            throw new common_1.NotFoundException('Auditoría no encontrada');
        return audit;
    }
    async updateApprovalStatus(id, status) {
        return this.prisma.processAudit.update({
            where: { id },
            data: {
                approvalStatus: status,
                approvedAt: status === 'APROBADO' ? new Date() : null,
            },
        });
    }
    async updateCorrectiveAction(actionId, status) {
        return this.prisma.correctiveAction.update({
            where: { id: actionId },
            data: { status },
        });
    }
};
exports.ProcessAuditsService = ProcessAuditsService;
exports.ProcessAuditsService = ProcessAuditsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProcessAuditsService);
