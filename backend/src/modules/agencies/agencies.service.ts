import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAgencyDto, UpdateAgencyDto } from './dto/agency.dto';

@Injectable()
export class AgenciesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createAgencyDto: CreateAgencyDto, user: any) {
    const agencyData = {
      ...createAgencyDto,
      createdById: user.id,
    };

    const agency = await this.prisma.agency.create({
      data: agencyData,
    });

    // If a vendor (Lima or Oriente) adds an agency, notify Comercial
    const isVendor = user.role.startsWith('VENDEDOR');
    
    if (isVendor) {
      const now = new Date();
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString();
      const userZone = user.zone || (user.role === 'VENDEDOR_LIMA' ? 'LIMA' : 'ORIENTE');

      await this.notificationsService.create({
        title: 'Nueva Agencia Agregada',
        message: `${user.name} de la zona ${userZone} agregó la agencia "${agency.name}" el ${dateStr} a las ${timeStr}`,
        type: 'AGENCY_ADDED',
        referenceId: agency.id,
        targetRole: 'COMERCIAL',
      });
    }

    return agency;
  }

  async findAll(user: any, filterZone?: string) {
    const where: any = {};

    // Logic: 
    // - Vendedores can only see agencies in their zone.
    // - Comercial/Admin can see everything and can filter by zone.
    
    const isComercialOrAdmin = ['COMERCIAL', 'ADMIN', 'LOGISTICA'].includes(user.role);

    if (!isComercialOrAdmin) {
      // Vendedores see only their zone
      const userZone = user.zone || (user.role === 'VENDEDOR_LIMA' ? 'LIMA' : 'ORIENTE');
      where.zone = userZone;
    } else if (filterZone) {
      // Comercial filter
      where.zone = filterZone;
    }

    return this.prisma.agency.findMany({
      where,
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!agency) {
      throw new NotFoundException('Agencia no encontrada');
    }

    return agency;
  }

  async update(id: string, updateAgencyDto: UpdateAgencyDto) {
    return this.prisma.agency.update({
      where: { id },
      data: updateAgencyDto,
    });
  }

  async remove(id: string) {
    return this.prisma.agency.delete({
      where: { id },
    });
  }
}
