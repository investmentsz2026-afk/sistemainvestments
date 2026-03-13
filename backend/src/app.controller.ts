import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // Endpoint raíz para verificar que el backend está corriendo
  @Get()
  root() {
    return { status: 'ok', message: 'Backend running' };
  }
}
