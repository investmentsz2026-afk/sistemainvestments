import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { documentNumber: dto.documentNumber }
    });
    if (existing) {
      throw new BadRequestException('Ya existe un trabajador con este documento');
    }
    return this.prisma.employee.create({
      data: dto
    });
  }

  async findAll() {
    return this.prisma.employee.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { shifts: true }
    });
    if (!employee) {
      throw new NotFoundException('Trabajador no encontrado');
    }
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    if (dto.documentNumber) {
      const existing = await this.prisma.employee.findFirst({
        where: { documentNumber: dto.documentNumber, NOT: { id } }
      });
      if (existing) {
        throw new BadRequestException('Ya existe otro trabajador con este documento');
      }
    }
    return this.prisma.employee.update({
      where: { id },
      data: dto
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.employee.delete({
      where: { id }
    });
  }
}
