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
exports.AuthController = void 0;
// backend/src/modules/auth/auth.controller.ts
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const auth_dto_1 = require("./dto/auth.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const roles_guard_1 = require("./guards/roles.guard");
const roles_decorator_1 = require("./decorators/roles.decorator");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async register(registerDto) {
        try {
            const result = await this.authService.register(registerDto);
            return {
                success: true,
                message: 'Usuario registrado exitosamente',
                data: result
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Error al registrar usuario',
                statusCode: common_1.HttpStatus.BAD_REQUEST
            };
        }
    }
    async login(loginDto) {
        try {
            const result = await this.authService.login(loginDto);
            return {
                success: true,
                message: result.roles.length > 0 ? 'Por favor seleccione un rol' : 'Login exitoso',
                data: result
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Credenciales inválidas',
                statusCode: common_1.HttpStatus.UNAUTHORIZED
            };
        }
    }
    async selectRole(body) {
        try {
            const result = await this.authService.selectRole(body.userId, body.roleName);
            return {
                success: true,
                message: 'Acceso concedido',
                data: result
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Error al seleccionar rol',
                statusCode: common_1.HttpStatus.BAD_REQUEST
            };
        }
    }
    getProfile(req) {
        return {
            success: true,
            data: {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role
            }
        };
    }
    logout(req) {
        // El logout se maneja del lado del cliente eliminando el token
        return {
            success: true,
            message: 'Sesión cerrada exitosamente'
        };
    }
    async refreshToken(req) {
        try {
            const newToken = await this.authService.refreshToken(req.user.id, req.user.role);
            return {
                success: true,
                data: { token: newToken }
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Error al refrescar token'
            };
        }
    }
    async changePassword(req, body) {
        try {
            await this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
            return {
                success: true,
                message: 'Contraseña actualizada exitosamente'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Error al cambiar contraseña'
            };
        }
    }
    async updateProfile(req, body) {
        try {
            const result = await this.authService.updateProfile(req.user.id, body);
            return {
                success: true,
                message: 'Perfil actualizado exitosamente',
                data: result
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Error al actualizar perfil'
            };
        }
    }
    async verifyEmail(body) {
        try {
            await this.authService.verifyEmail(body.token);
            return {
                success: true,
                message: 'Email verificado exitosamente'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Error al verificar email'
            };
        }
    }
    async forgotPassword(body) {
        try {
            await this.authService.forgotPassword(body.email);
            return {
                success: true,
                message: 'Si el email existe, recibirás instrucciones para recuperar tu contraseña'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Error al procesar solicitud'
            };
        }
    }
    async resetPassword(body) {
        try {
            await this.authService.resetPassword(body.token, body.newPassword);
            return {
                success: true,
                message: 'Contraseña restablecida exitosamente'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Error al restablecer contraseña'
            };
        }
    }
    async getAllUsers() {
        try {
            const result = await this.authService.getAllUsers();
            return { success: true, data: result };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async getAllRoles() {
        try {
            const result = await this.authService.getAllRoles();
            return { success: true, data: result };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async createUser(body) {
        try {
            const result = await this.authService.createUserByAdmin(body);
            return { success: true, message: 'Usuario creado exitosamente', data: result };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async updateUser(id, body) {
        try {
            const result = await this.authService.updateUserByAdmin(id, body);
            return { success: true, message: 'Usuario actualizado exitosamente', data: result };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async toggleStatus(id) {
        try {
            const result = await this.authService.toggleUserStatus(id);
            return { success: true, message: 'Estado actualizado', data: result };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async deleteUser(id) {
        try {
            await this.authService.deleteUser(id);
            return { success: true, message: 'Usuario eliminado exitosamente' };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Error al eliminar usuario'
            };
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('select-role'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "selectRole", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('refresh-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('update-profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Get)('roles'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getAllRoles", null);
__decorate([
    (0, common_1.Post)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createUser", null);
__decorate([
    (0, common_1.Post)('users/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Post)('users/:id/toggle-status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "toggleStatus", null);
__decorate([
    (0, common_1.Post)('users/:id/delete'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "deleteUser", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
