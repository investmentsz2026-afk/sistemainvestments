// backend/src/modules/movements/movements.module.ts
import { Module } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [MovementsController],
  providers: [MovementsService, PrismaService],
  exports: [MovementsService],
})
export class MovementsModule {}