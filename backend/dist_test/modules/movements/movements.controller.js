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
exports.MovementsController = void 0;
// backend/src/modules/movements/movements.controller.ts
const common_1 = require("@nestjs/common");
const movements_service_1 = require("./movements.service");
const movement_dto_1 = require("./dto/movement.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let MovementsController = class MovementsController {
    constructor(movementsService) {
        this.movementsService = movementsService;
    }
    async findAll(filters) {
        return this.movementsService.findAll(filters);
    }
    async findByProduct(productId) {
        return this.movementsService.findByProduct(productId);
    }
    async findByVariant(variantId) {
        return this.movementsService.findByVariant(variantId);
    }
    async getKardex(variantId) {
        return this.movementsService.getKardex(variantId);
    }
};
exports.MovementsController = MovementsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [movement_dto_1.MovementFiltersDto]),
    __metadata("design:returntype", Promise)
], MovementsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('product/:productId'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MovementsController.prototype, "findByProduct", null);
__decorate([
    (0, common_1.Get)('variant/:variantId'),
    __param(0, (0, common_1.Param)('variantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MovementsController.prototype, "findByVariant", null);
__decorate([
    (0, common_1.Get)('kardex/:variantId'),
    __param(0, (0, common_1.Param)('variantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MovementsController.prototype, "getKardex", null);
exports.MovementsController = MovementsController = __decorate([
    (0, common_1.Controller)('movements'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [movements_service_1.MovementsService])
], MovementsController);
