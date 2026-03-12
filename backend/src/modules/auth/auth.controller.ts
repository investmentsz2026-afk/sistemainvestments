// backend/src/modules/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      return {
        success: true,
        message: 'Usuario registrado exitosamente',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al registrar usuario',
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto);
      return {
        success: true,
        message: result.roles.length > 0 ? 'Por favor seleccione un rol' : 'Login exitoso',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Credenciales inválidas',
        statusCode: HttpStatus.UNAUTHORIZED
      };
    }
  }

  @Post('select-role')
  @HttpCode(HttpStatus.OK)
  async selectRole(@Body() body: { userId: string; roleName: string }) {
    try {
      const result = await this.authService.selectRole(body.userId, body.roleName);
      return {
        success: true,
        message: 'Acceso concedido',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al seleccionar rol',
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getProfile(@Request() req) {
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

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Request() req) {
    // El logout se maneja del lado del cliente eliminando el token
    return {
      success: true,
      message: 'Sesión cerrada exitosamente'
    };
  }

  @Post('refresh-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Request() req) {
    try {
      const newToken = await this.authService.refreshToken(req.user.id, req.user.role);
      return {
        success: true,
        data: { token: newToken }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al refrescar token'
      };
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    try {
      await this.authService.changePassword(
        req.user.id,
        body.currentPassword,
        body.newPassword
      );
      return {
        success: true,
        message: 'Contraseña actualizada exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al cambiar contraseña'
      };
    }
  }

  @Post('update-profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req,
    @Body() body: { name?: string; email?: string }
  ) {
    try {
      const result = await this.authService.updateProfile(req.user.id, body);
      return {
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al actualizar perfil'
      };
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: { token: string }) {
    try {
      await this.authService.verifyEmail(body.token);
      return {
        success: true,
        message: 'Email verificado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al verificar email'
      };
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    try {
      await this.authService.forgotPassword(body.email);
      return {
        success: true,
        message: 'Si el email existe, recibirás instrucciones para recuperar tu contraseña'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al procesar solicitud'
      };
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    try {
      await this.authService.resetPassword(body.token, body.newPassword);
      return {
        success: true,
        message: 'Contraseña restablecida exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al restablecer contraseña'
      };
    }
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAllUsers() {
    try {
      const result = await this.authService.getAllUsers();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAllRoles() {
    try {
      const result = await this.authService.getAllRoles();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createUser(@Body() body: any) {
    try {
      const result = await this.authService.createUserByAdmin(body);
      return { success: true, message: 'Usuario creado exitosamente', data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    try {
      const result = await this.authService.updateUserByAdmin(id, body);
      return { success: true, message: 'Usuario actualizado exitosamente', data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('users/:id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async toggleStatus(@Param('id') id: string) {
    try {
      const result = await this.authService.toggleUserStatus(id);
      return { success: true, message: 'Estado actualizado', data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('users/:id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteUser(@Param('id') id: string) {
    try {
      await this.authService.deleteUser(id);
      return { success: true, message: 'Usuario eliminado exitosamente' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al eliminar usuario'
      };
    }
  }
}
