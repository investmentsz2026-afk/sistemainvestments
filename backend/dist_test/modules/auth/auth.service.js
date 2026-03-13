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
exports.AuthService = void 0;
// backend/src/modules/auth/auth.service.ts
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../database/prisma.service");
const bcrypt = require("bcrypt");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(registerDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });
        if (existingUser) {
            throw new common_1.BadRequestException('El email ya está registrado');
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                name: registerDto.name,
                password: hashedPassword,
                roles: {
                    connect: { name: 'ADMIN' } // Default to user or as needed
                }
            },
            include: { roles: true }
        });
        const token = this.generateToken(user.id, user.email, 'ADMIN');
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: 'ADMIN',
            },
            token,
        };
    }
    async login(loginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: loginDto.email },
            include: { roles: true }
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Credenciales inválidas o cuenta inactiva');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            roles: user.roles.map(r => r.name),
            tempToken: this.jwtService.sign({ sub: user.id, type: 'TEMP_ROLE_SELECTION' }, { expiresIn: '5m' })
        };
    }
    async selectRole(userId, roleName) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: true }
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const hasRole = user.roles.some(r => r.name === roleName);
        if (!hasRole) {
            throw new common_1.BadRequestException('El usuario no tiene este rol asignado');
        }
        const token = this.generateToken(user.id, user.email, roleName);
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: roleName,
            },
            token,
        };
    }
    async refreshToken(userId, currentRole) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: true }
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Usuario no encontrado');
        }
        const roleToUse = currentRole || (user.roles.length > 0 ? user.roles[0].name : 'USER');
        return this.generateToken(user.id, user.email, roleToUse);
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new common_1.BadRequestException('Contraseña actual incorrecta');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        return true;
    }
    async updateProfile(userId, data) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        if (data.email && data.email !== user.email) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: data.email },
            });
            if (existingUser) {
                throw new common_1.BadRequestException('El email ya está en uso');
            }
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data,
        });
        return {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
        };
    }
    async verifyEmail(token) {
        // Implementar lógica de verificación de email
        // Por ahora solo retornamos true
        return true;
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            // Por seguridad, no revelamos si el email existe o no
            return true;
        }
        // Aquí implementarías el envío de email con el token
        // const resetToken = this.generateToken(user.id, user.email, user.role);
        // Enviar email con el token
        return true;
    }
    async getAllUsers() {
        return this.prisma.user.findMany({
            include: { roles: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAllRoles() {
        return this.prisma.role.findMany();
    }
    async createUserByAdmin(data) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new common_1.BadRequestException('El email ya está registrado');
        }
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                password: hashedPassword,
                roles: {
                    connect: data.roles.map(roleName => ({ name: roleName }))
                }
            },
            include: { roles: true }
        });
    }
    async updateUserByAdmin(id, data) {
        const { roles, password, ...rest } = data;
        const updateData = { ...rest };
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        if (roles) {
            updateData.roles = {
                set: [], // Clear previous roles
                connect: roles.map(roleName => ({ name: roleName }))
            };
        }
        return this.prisma.user.update({
            where: { id },
            data: updateData,
            include: { roles: true }
        });
    }
    async toggleUserStatus(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return this.prisma.user.update({
            where: { id },
            data: { isActive: !user.isActive },
        });
    }
    async resetPassword(token, newPassword) {
        try {
            const payload = this.jwtService.verify(token);
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await this.prisma.user.update({
                where: { id: payload.sub },
                data: { password: hashedPassword },
            });
            return true;
        }
        catch (error) {
            throw new common_1.BadRequestException('Token inválido o expirado');
        }
    }
    async deleteUser(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        movements: true,
                        purchases: true
                    }
                }
            }
        });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        // Si el usuario tiene actividad, NO podemos eliminarlo por integridad referencial
        // y perderíamos el historial de quién hizo qué.
        if (user._count.movements > 0 || user._count.purchases > 0) {
            throw new common_1.BadRequestException('No se puede eliminar porque tiene movimientos o compras asociadas. Se recomienda desactivar la cuenta en su lugar.');
        }
        return this.prisma.user.delete({
            where: { id }
        });
    }
    generateToken(userId, email, role) {
        const payload = { sub: userId, email, role };
        return this.jwtService.sign(payload);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
