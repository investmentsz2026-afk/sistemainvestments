// backend/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('El email ya está registrado');
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

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: { roles: true }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas o cuenta inactiva');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
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
  }  async selectRole(userId: string, roleName: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const hasRole = user.roles.some(r => r.name === roleName);
    if (!hasRole) {
      throw new BadRequestException('El usuario no tiene este rol asignado');
    }

    const token = this.generateToken(user.id, user.email, roleName, user.zone ?? undefined);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: roleName,
        zone: user.zone,
      },
      token,
    };
  }

  async refreshToken(userId: string, currentRole?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const roleToUse = currentRole || (user.roles.length > 0 ? user.roles[0].name : 'USER');
    return this.generateToken(user.id, user.email, roleToUse, user.zone ?? undefined);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Contraseña actual incorrecta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return true;
  }

  async updateProfile(userId: string, data: { name?: string; email?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser) {
        throw new BadRequestException('El email ya está en uso');
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

  async verifyEmail(token: string) {
    return true;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) return true;
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

  async createUserByAdmin(data: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        zone: data.zone,
        roles: {
          connect: data.roles.map(roleName => ({ name: roleName }))
        }
      },
      include: { roles: true }
    });
  }

  async updateUserByAdmin(id: string, data: any) {
    const { roles, password, zone, ...rest } = data;
    const updateData: any = { ...rest, zone };

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

  async toggleUserStatus(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token);
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { password: hashedPassword },
      });
      return true;
    } catch (error) {
      throw new BadRequestException('Token inválido o expirado');
    }
  }

  async deleteUser(id: string) {
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

    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Si el usuario tiene actividad, NO podemos eliminarlo por integridad referencial
    // y perderíamos el historial de quién hizo qué.
    if ((user as any)._count.movements > 0 || (user as any)._count.purchases > 0) {
      throw new BadRequestException('No se puede eliminar porque tiene movimientos o compras asociadas. Se recomienda desactivar la cuenta en su lugar.');
    }

    return this.prisma.user.delete({
      where: { id }
    });
  }

  private generateToken(userId: string, email: string, role: string, zone?: string): string {
    const payload = { sub: userId, email, role, zone };
    return this.jwtService.sign(payload);
  }
}