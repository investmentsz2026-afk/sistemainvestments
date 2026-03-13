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
exports.ReportsController = void 0;
// backend/src/modules/reports/reports.controller.ts
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const reports_dto_1 = require("./dto/reports.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let ReportsController = class ReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    getCurrentStock(filters) {
        return this.reportsService.getCurrentStock(filters);
    }
    getValuedStock(filters) {
        return this.reportsService.getValuedStock(filters);
    }
    getMovementsByDateRange(dateRange) {
        return this.reportsService.getMovementsByDateRange(dateRange);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('stock/current'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.DateRangeDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getCurrentStock", null);
__decorate([
    (0, common_1.Get)('stock/valued'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.DateRangeDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getValuedStock", null);
__decorate([
    (0, common_1.Get)('movements'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.DateRangeDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getMovementsByDateRange", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
