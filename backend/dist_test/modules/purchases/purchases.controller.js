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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchasesController = void 0;
// backend/src/modules/purchases/purchases.controller.ts
const common_1 = require("@nestjs/common");
const purchases_service_1 = require("./purchases.service");
const create_purchase_dto_1 = require("./dto/create-purchase.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let PurchasesController = class PurchasesController {
    constructor(purchasesService) {
        this.purchasesService = purchasesService;
    }
    async create(req, dto) {
        try {
            const result = await this.purchasesService.create(req.user.id, dto);
            return { success: true, message: 'Compra registrada exitosamente', data: result };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async findAll() {
        try {
            const result = await this.purchasesService.findAll();
            return { success: true, data: result };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async findOne(id) {
        try {
            const result = await this.purchasesService.findOne(id);
            return { success: true, data: result };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async update(id, dto) {
        try {
            const result = await this.purchasesService.update(id, dto);
            return { success: true, message: 'Compra actualizada exitosamente', data: result };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async remove(id) {
        try {
            await this.purchasesService.remove(id);
            return { success: true, message: 'Compra eliminada exitosamente' };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
};
exports.PurchasesController = PurchasesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('LOGISTICA', 'ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_purchase_dto_1.CreatePurchaseDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('LOGISTICA', 'ADMIN', 'CONTABILIDAD'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('LOGISTICA', 'ADMIN', 'CONTABILIDAD'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('LOGISTICA', 'ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_purchase_dto_1.CreatePurchaseDto]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('LOGISTICA', 'ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PurchasesController.prototype, "remove", null);
exports.PurchasesController = PurchasesController = __decorate([
    (0, common_1.Controller)('purchases'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [purchases_service_1.PurchasesService])
], PurchasesController);
