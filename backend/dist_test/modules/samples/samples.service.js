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
exports.SamplesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let SamplesService = class SamplesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(odpId, data) {
        const { name, description, characteristics, images } = data;
        return this.prisma.productSample.create({
            data: {
                name,
                description,
                characteristics,
                images: images || [],
                odpId,
            },
            include: {
                odp: { select: { name: true } },
            },
        });
    }
    async findAll() {
        return this.prisma.productSample.findMany({
            include: {
                odp: { select: { name: true } },
                commercial: { select: { name: true } },
                materials: {
                    include: { product: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const sample = await this.prisma.productSample.findUnique({
            where: { id },
            include: {
                odp: { select: { name: true } },
                commercial: { select: { name: true } },
                materials: {
                    include: { product: true }
                }
            },
        });
        if (!sample)
            throw new common_1.NotFoundException('Muestra no encontrada');
        return sample;
    }
    async updateReview(id, commercialId, data) {
        const { status, observations, recommendations, materials } = data;
        const existingSample = await this.findOne(id);
        return await this.prisma.$transaction(async (tx) => {
            // 1. Update status and observations
            const updatedSample = await tx.productSample.update({
                where: { id },
                data: {
                    status,
                    observations,
                    recommendations,
                    commercialId,
                    approvedAt: status === 'APROBADO' ? new Date() : null,
                },
            });
            // 2. If approved, handle BOM (Materials)
            if (status === 'APROBADO' && materials && materials.length > 0) {
                // Clear old materials if any
                await tx.sampleMaterial.deleteMany({ where: { sampleId: id } });
                // Add new materials
                for (const mat of materials) {
                    const product = await tx.product.findUnique({ where: { id: mat.productId } });
                    if (!product)
                        throw new common_1.BadRequestException(`Material/Insumo no encontrado: ${mat.productId}`);
                    await tx.sampleMaterial.create({
                        data: {
                            sampleId: id,
                            productId: mat.productId,
                            quantityPerUnit: mat.quantityPerUnit,
                            unitPriceAtTime: product.purchasePrice, // Use current price
                        },
                    });
                }
            }
            return updatedSample;
        });
    }
    async update(id, odpId, data) {
        const sample = await this.findOne(id);
        if (sample.status !== 'PENDIENTE') {
            throw new common_1.BadRequestException('No se puede editar una muestra que ya ha sido revisada');
        }
        if (sample.odpId !== odpId) {
            throw new common_1.BadRequestException('No tienes permiso para editar esta muestra');
        }
        const { name, description, characteristics, images } = data;
        return this.prisma.productSample.update({
            where: { id },
            data: {
                name,
                description,
                characteristics,
                images: images || [],
            },
        });
    }
};
exports.SamplesService = SamplesService;
exports.SamplesService = SamplesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SamplesService);
