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
exports.ScanMovementDto = exports.RegisterBulkMovementDto = exports.BulkMovementItemDto = exports.RegisterMovementDto = exports.MovementType = void 0;
// backend/src/modules/inventory/dto/inventory.dto.ts
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var MovementType;
(function (MovementType) {
    MovementType["ENTRY"] = "ENTRY";
    MovementType["EXIT"] = "EXIT";
})(MovementType || (exports.MovementType = MovementType = {}));
class RegisterMovementDto {
}
exports.RegisterMovementDto = RegisterMovementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterMovementDto.prototype, "variantId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(MovementType),
    __metadata("design:type", String)
], RegisterMovementDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], RegisterMovementDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterMovementDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterMovementDto.prototype, "reference", void 0);
class BulkMovementItemDto {
}
exports.BulkMovementItemDto = BulkMovementItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkMovementItemDto.prototype, "variantId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], BulkMovementItemDto.prototype, "quantity", void 0);
class RegisterBulkMovementDto {
}
exports.RegisterBulkMovementDto = RegisterBulkMovementDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkMovementItemDto),
    __metadata("design:type", Array)
], RegisterBulkMovementDto.prototype, "items", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterBulkMovementDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterBulkMovementDto.prototype, "reference", void 0);
class ScanMovementDto {
}
exports.ScanMovementDto = ScanMovementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScanMovementDto.prototype, "variantSku", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ScanMovementDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScanMovementDto.prototype, "reason", void 0);
