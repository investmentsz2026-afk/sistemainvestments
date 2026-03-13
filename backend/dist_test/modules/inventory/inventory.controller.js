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
exports.InventoryController = void 0;
// backend/src/modules/inventory/inventory.controller.ts
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const inventory_dto_1 = require("./dto/inventory.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let InventoryController = class InventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    registerMovement(req, registerMovementDto) {
        return this.inventoryService.registerMovement(req.user.id, registerMovementDto);
    }
    registerBulkMovements(req, registerBulkMovementDto) {
        return this.inventoryService.registerBulkMovements(req.user.id, registerBulkMovementDto);
    }
    scanAndRegister(req, scanMovementDto) {
        return this.inventoryService.scanAndRegister(req.user.id, scanMovementDto.variantSku, scanMovementDto.quantity, scanMovementDto.reason);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Post)('movements'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, inventory_dto_1.RegisterMovementDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "registerMovement", null);
__decorate([
    (0, common_1.Post)('movements/bulk'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, inventory_dto_1.RegisterBulkMovementDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "registerBulkMovements", null);
__decorate([
    (0, common_1.Post)('scan'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, inventory_dto_1.ScanMovementDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "scanAndRegister", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
