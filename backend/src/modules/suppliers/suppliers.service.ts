import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
    constructor(private prisma: PrismaService) { }

    async create(createSupplierDto: CreateSupplierDto) {
        const existing = await this.prisma.supplier.findUnique({
            where: { documentNumber: createSupplierDto.documentNumber },
        });

        if (existing) {
            throw new BadRequestException('El proveedor con este documento ya existe.');
        }

        return this.prisma.supplier.create({
            data: createSupplierDto,
        });
    }

    async findAll() {
        return this.prisma.supplier.findMany({
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const supplier = await this.prisma.supplier.findUnique({
            where: { id },
        });
        if (!supplier) throw new NotFoundException('Proveedor no encontrado');
        return supplier;
    }

    async update(id: string, updateSupplierDto: UpdateSupplierDto) {
        const existing = await this.prisma.supplier.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Proveedor no encontrado');

        if (updateSupplierDto.documentNumber && updateSupplierDto.documentNumber !== existing.documentNumber) {
            const conflict = await this.prisma.supplier.findUnique({
                where: { documentNumber: updateSupplierDto.documentNumber },
            });
            if (conflict) throw new BadRequestException('Otro proveedor ya usa este documento.');
        }

        return this.prisma.supplier.update({
            where: { id },
            data: updateSupplierDto,
        });
    }

    async remove(id: string) {
        const existing = await this.prisma.supplier.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Proveedor no encontrado');

        // Eliminación física (se podría hacer lógica si se prefiere)
        return this.prisma.supplier.delete({ where: { id } });
    }
}
