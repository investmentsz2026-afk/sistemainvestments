// backend/src/modules/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
        message: 'Login exitoso',
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
      const newToken = await this.authService.refreshToken(req.user.id);
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
}