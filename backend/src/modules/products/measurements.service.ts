import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MeasurementsService {
  constructor(private prisma: PrismaService) {}

  async findMeasurements(query: {
    productId?: string;
    sampleId?: string;
    op?: string;
    size?: string;
  }) {
    const where: any = {};
    if (query.productId) where.productId = query.productId;
    if (query.sampleId) where.sampleId = query.sampleId;
    if (query.op) where.op = query.op;
    if (query.size) where.size = query.size;

    return this.prisma.productMeasurement.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async saveMeasurement(data: {
    productId?: string;
    sampleId?: string;
    op?: string;
    size: string;
    color?: string;
    stage: string;
    cintura?: string;
    cadera?: string;
    muslo?: string;
    rodilla?: string;
    botaPie?: string;
    tiroDel?: string;
    tiroPos?: string;
    largoTotal?: string;
  }) {
    // Find if already exists using findFirst (to bypass unique index issues with null values)
    const existing = await this.prisma.productMeasurement.findFirst({
      where: {
        productId: data.productId || null,
        sampleId: data.sampleId || null,
        op: data.op || null,
        size: data.size,
        color: data.color || null,
        stage: data.stage,
      },
    });

    const payload = {
      productId: data.productId || null,
      sampleId: data.sampleId || null,
      op: data.op || null,
      size: data.size,
      color: data.color || null,
      stage: data.stage,
      cintura: data.cintura || null,
      cadera: data.cadera || null,
      muslo: data.muslo || null,
      rodilla: data.rodilla || null,
      botaPie: data.botaPie || null,
      tiroDel: data.tiroDel || null,
      tiroPos: data.tiroPos || null,
      largoTotal: data.largoTotal || null,
    };

    if (existing) {
      return this.prisma.productMeasurement.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      return this.prisma.productMeasurement.create({
        data: payload,
      });
    }
  }
}
