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
exports.ProcessAuditsController = void 0;
const common_1 = require("@nestjs/common");
const process_audits_service_1 = require("./process-audits.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let ProcessAuditsController = class ProcessAuditsController {
    constructor(service) {
        this.service = service;
    }
    async create(req, body) {
        return this.service.createAudit(req.user.id, body);
    }
    async findAll(query) {
        return this.service.findAll(query);
    }
    async findOne(id) {
        return this.service.findOne(id);
    }
    async updateApproval(id, status) {
        return this.service.updateApprovalStatus(id, status);
    }
    async updateCorrectiveAction(id, status) {
        return this.service.updateCorrectiveAction(id, status);
    }
};
exports.ProcessAuditsController = ProcessAuditsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProcessAuditsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProcessAuditsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProcessAuditsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/approval'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProcessAuditsController.prototype, "updateApproval", null);
__decorate([
    (0, common_1.Patch)('corrective-action/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProcessAuditsController.prototype, "updateCorrectiveAction", null);
exports.ProcessAuditsController = ProcessAuditsController = __decorate([
    (0, common_1.Controller)('process-audits'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [process_audits_service_1.ProcessAuditsService])
], ProcessAuditsController);
