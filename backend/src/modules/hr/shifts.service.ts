import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShiftDto, BatchShiftsDto } from './dto/shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShiftDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId }
    });
    if (!employee) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) {
      throw new Error('La hora de salida debe ser posterior a la hora de entrada');
    }
    const hoursWorked = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    const totalPayment = parseFloat((hoursWorked * employee.hourlyRate).toFixed(2));

    return this.prisma.workShift.create({
      data: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        startTime: start,
        endTime: end,
        hoursWorked,
        totalPayment,
        status: 'ASISTIO'
      }
    });
  }

  async saveBatch(dto: BatchShiftsDto) {
    const parts = dto.date.split('T')[0].split('-');
    const targetDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0));

    const savedShifts: any[] = [];

    for (const shiftItem of dto.shifts) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: shiftItem.employeeId }
      });
      if (!employee) continue;

      let hoursWorked = 0;
      let totalPayment = 0;
      let startTime = targetDate;
      let endTime = targetDate;

      if (shiftItem.status === 'ASISTIO' && shiftItem.startTime && shiftItem.endTime) {
        startTime = new Date(shiftItem.startTime);
        endTime = new Date(shiftItem.endTime);
        const diffMs = endTime.getTime() - startTime.getTime();
        if (diffMs > 0) {
          hoursWorked = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
          totalPayment = parseFloat((hoursWorked * employee.hourlyRate).toFixed(2));
        }
      }

      const existing = await this.prisma.workShift.findFirst({
        where: {
          employeeId: shiftItem.employeeId,
          date: targetDate
        }
      });

      const data = {
        employeeId: shiftItem.employeeId,
        date: targetDate,
        startTime,
        endTime,
        hoursWorked,
        totalPayment,
        status: shiftItem.status
      };

      let result;
      if (existing) {
        result = await this.prisma.workShift.update({
          where: { id: existing.id },
          data
        });
      } else {
        result = await this.prisma.workShift.create({
          data
        });
      }
      savedShifts.push(result);
    }

    return savedShifts;
  }

  async findAll(employeeId?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    return this.prisma.workShift.findMany({
      where,
      include: {
        employee: true
      },
      orderBy: { date: 'desc' }
    });
  }

  async findGroupedDays() {
    const shifts = await this.prisma.workShift.findMany({
      include: {
        employee: true
      },
      orderBy: { date: 'desc' }
    });

    const groups: Record<string, { date: string; shiftsCount: number; presentCount: number; totalHours: number; totalPayment: number; shifts: any[] }> = {};
    
    for (const shift of shifts) {
      const y = shift.date.getUTCFullYear();
      const m = String(shift.date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(shift.date.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      if (!groups[dateStr]) {
        groups[dateStr] = {
          date: dateStr,
          shiftsCount: 0,
          presentCount: 0,
          totalHours: 0,
          totalPayment: 0,
          shifts: []
        };
      }
      groups[dateStr].shiftsCount += 1;
      if (shift.status === 'ASISTIO') {
        groups[dateStr].presentCount += 1;
      }
      groups[dateStr].totalHours += shift.hoursWorked;
      groups[dateStr].totalPayment += shift.totalPayment;
      groups[dateStr].shifts.push(shift);
    }

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getWeeklyReport(employeeId: string, startDateStr: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId }
    });
    if (!employee) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    const parts = startDateStr.split('T')[0].split('-');
    const weekStart = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0));

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

    const shifts = await this.prisma.workShift.findMany({
      where: {
        employeeId,
        date: {
          gte: weekStart,
          lt: weekEnd
        }
      },
      orderBy: { date: 'asc' }
    });

    const totalHours = shifts.reduce((acc, s) => acc + s.hoursWorked, 0);
    const totalPayment = shifts.reduce((acc, s) => acc + s.totalPayment, 0);

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        documentNumber: employee.documentNumber,
        hourlyRate: employee.hourlyRate
      },
      weekStart: weekStart.toLocaleDateString(),
      weekEnd: new Date(weekEnd.getTime() - 1000).toLocaleDateString(),
      shifts,
      totalHours: parseFloat(totalHours.toFixed(2)),
      totalPayment: parseFloat(totalPayment.toFixed(2))
    };
  }

  async remove(id: string) {
    const shift = await this.prisma.workShift.findUnique({
      where: { id }
    });
    if (!shift) {
      throw new NotFoundException('Turno no encontrado');
    }
    return this.prisma.workShift.delete({
      where: { id }
    });
  }

  async removeDay(dateStr: string) {
    const parts = dateStr.split('T')[0].split('-');
    const targetDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0));
    const nextDate = new Date(targetDate);
    nextDate.setUTCDate(targetDate.getUTCDate() + 1);

    return this.prisma.workShift.deleteMany({
      where: {
        date: {
          gte: targetDate,
          lt: nextDate
        }
      }
    });
  }
}
