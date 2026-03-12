// backend/src/modules/purchases/purchases.module.ts
import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { PrismaService } from '../../database/prisma.service';

@Module({
    controllers: [PurchasesController],
    providers: [PurchasesService, PrismaService],
})
export class PurchasesModule { }
