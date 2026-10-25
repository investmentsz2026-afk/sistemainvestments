import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export const DEFAULT_OFFICIAL_ENTALLES = [
  {
    name: 'RELAX',
    cinturaType: 'CINTURA STRAIGHT',
    cintura: '17 "',
    cadera: '20 3/4 "',
    muslo: '12 3/4 "',
    rodilla: '9 1/2 "',
    botaPie: '7 5/8" (19,5 Cm)',
    tiroDel: '12 "',
    tiroPos: '15 1/2 "',
    largoTotal: '31 1/2 "',
    tela: 'DENIM',
    tipoTela: 'RIGIDO',
    baseSize: '32',
  },
  {
    name: 'BULL DENIM',
    cinturaType: 'CINTURA STRAIGHT',
    cintura: '17 "',
    cadera: '20 3/4 "',
    muslo: '12 3/4 "',
    rodilla: '9 1/2 "',
    botaPie: '7 1/2 "',
    tiroDel: '12 "',
    tiroPos: '15 1/2 "',
    largoTotal: '31 1/2 "',
    tela: 'DENIM PPT',
    tipoTela: 'RIGIDO',
    baseSize: '32',
  },
  {
    name: 'CONFORT',
    cinturaType: 'CINTURA STRAIGHT',
    cintura: '16 3/4 "',
    cadera: '20 1/2 "',
    muslo: '12 3/8 "',
    rodilla: '9 1/4 "',
    botaPie: '7 5/8" (19,5 Cm)',
    tiroDel: '11 1/2"',
    tiroPos: '15 1/4 "',
    largoTotal: '31 1/2 "',
    tela: 'DENIM',
    tipoTela: 'CONFORT',
    baseSize: '32',
  },
  {
    name: 'PARKER',
    cinturaType: 'CINTURA SLIM',
    cintura: '16 3/4 "',
    cadera: '20 1/4 "',
    muslo: '12 1/4 "',
    rodilla: '8 1/2 "',
    botaPie: '7 1/8" (18cm)',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '31 "',
    tela: 'DRILL',
    tipoTela: 'CONFORT',
    baseSize: '32',
  },
  {
    name: 'SONNY',
    cinturaType: 'CINTURA SLIM',
    cintura: '16 3/4 "',
    cadera: '20 1/4 "',
    muslo: '12 1/4 "',
    rodilla: '8 1/2 "',
    botaPie: '7 1/4" (18.5 Cm)',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '31 "',
    tela: 'DENIM',
    tipoTela: 'CONFORT',
    baseSize: '32',
  },
  {
    name: 'SCOOTTER',
    cinturaType: 'CINTURA SKINNY',
    cintura: '16 3/4',
    cadera: '20 1/4 "',
    muslo: '11 3/4"',
    rodilla: '8 "',
    botaPie: '6 "',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '30 "',
    tela: 'DENIM',
    tipoTela: 'CONFORT',
    baseSize: '32',
  },
  {
    name: 'ROLEX',
    cinturaType: 'CINTURA RECTO',
    cintura: '16 3/4 "',
    cadera: '20 3/8 "',
    muslo: '12 1/4 "',
    rodilla: '9 "',
    botaPie: '7 5/8" (19,5 Cm)',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '31 1/2 "',
    tela: 'DRILL',
    tipoTela: 'CONF. PPT',
    baseSize: '32',
  },
  {
    name: 'MORRISON',
    cinturaType: 'CINTURA SLIM',
    cintura: '16 3/4 "',
    cadera: '20 3/8 "',
    muslo: '11 7/8"',
    rodilla: '8 1/2"',
    botaPie: '7 "',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '31',
    tela: 'DRILL',
    tipoTela: 'CONF. PPT',
    baseSize: '32',
  },
  {
    name: 'KING',
    cinturaType: 'CINTURA SKINNY',
    cintura: '16 1/2 "',
    cadera: '20 "',
    muslo: '11 5/8"',
    rodilla: '7 3/4"',
    botaPie: '6 " (15.2 cm)',
    tiroDel: '11 "',
    tiroPos: '15 "',
    largoTotal: '29 1/2 "',
    tela: 'DRILL',
    tipoTela: 'CONFORT',
    baseSize: '32',
  },
];

@Injectable()
export class MeasurementsService {
  constructor(private prisma: PrismaService) {}

  private getStorageFilePath() {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'official-entalles.json');
  }

  async getOfficialEntalles() {
    // 1. Intentar obtener desde DB (ProductMeasurement con stage = 'SPEC_ENTALLE')
    try {
      const records = await this.prisma.productMeasurement.findMany({
        where: { stage: 'SPEC_ENTALLE' },
        orderBy: { createdAt: 'asc' },
      });

      if (records && records.length > 0) {
        return records.map((r) => {
          let extra: any = {};
          try {
            if (r.color && (r.color.startsWith('{') || r.color.startsWith('['))) {
              extra = JSON.parse(r.color);
            }
          } catch (e) {}

          return {
            id: r.id,
            name: r.op || 'SIN_NOMBRE',
            cinturaType: extra.cinturaType || r.color || 'CINTURA SLIM',
            cintura: r.cintura || '',
            cadera: r.cadera || '',
            muslo: r.muslo || '',
            rodilla: r.rodilla || '',
            botaPie: r.botaPie || '',
            tiroDel: r.tiroDel || '',
            tiroPos: r.tiroPos || '',
            largoTotal: r.largoTotal || '',
            tela: extra.tela || 'DENIM',
            tipoTela: extra.tipoTela || 'CONFORT',
            baseSize: r.size || '32',
            updatedAt: r.updatedAt,
          };
        });
      }
    } catch (e) {
      console.warn('Could not query ProductMeasurement for SPEC_ENTALLE, checking file storage:', e);
    }

    // 2. Fallback a archivo json
    try {
      const filePath = this.getStorageFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading official-entalles.json:', e);
    }

    // 3. Semilla por defecto con los 9 entalles de la hoja Excel
    const defaultList = DEFAULT_OFFICIAL_ENTALLES.map((d, idx) => ({
      id: `seed-${idx + 1}`,
      ...d,
      updatedAt: new Date().toISOString(),
    }));

    // Guardar copia local asíncrona
    this.saveOfficialEntallesBulk(defaultList).catch(() => {});
    return defaultList;
  }

  async saveOfficialEntallesBulk(entalles: any[]) {
    // 1. Guardar en archivo para respaldo inmediato
    try {
      const filePath = this.getStorageFilePath();
      fs.writeFileSync(filePath, JSON.stringify(entalles, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving to official-entalles.json:', e);
    }

    // 2. Persistir en ProductMeasurement
    try {
      for (const ent of entalles) {
        if (!ent.name) continue;
        const extraJson = JSON.stringify({
          cinturaType: ent.cinturaType || 'CINTURA SLIM',
          tela: ent.tela || 'DENIM',
          tipoTela: ent.tipoTela || 'CONFORT',
        });

        const existing = await this.prisma.productMeasurement.findFirst({
          where: {
            op: ent.name,
            stage: 'SPEC_ENTALLE',
          },
        });

        const payload = {
          op: ent.name,
          stage: 'SPEC_ENTALLE',
          size: ent.baseSize || '32',
          color: extraJson,
          cintura: ent.cintura || null,
          cadera: ent.cadera || null,
          muslo: ent.muslo || null,
          rodilla: ent.rodilla || null,
          botaPie: ent.botaPie || null,
          tiroDel: ent.tiroDel || null,
          tiroPos: ent.tiroPos || null,
          largoTotal: ent.largoTotal || null,
        };

        if (existing) {
          await this.prisma.productMeasurement.update({
            where: { id: existing.id },
            data: payload,
          });
        } else {
          await this.prisma.productMeasurement.create({
            data: payload,
          });
        }
      }
    } catch (e) {
      console.warn('Could not persist to ProductMeasurement table:', e);
    }

    return entalles;
  }

  async deleteOfficialEntalle(name: string) {
    try {
      await this.prisma.productMeasurement.deleteMany({
        where: {
          op: name,
          stage: 'SPEC_ENTALLE',
        },
      });
    } catch (e) {
      console.warn('Could not delete from ProductMeasurement table:', e);
    }

    try {
      const filePath = this.getStorageFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((item: any) => item.name !== name && item.id !== name);
          fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
          return updated;
        }
      }
    } catch (e) {
      console.error('Error updating official-entalles.json after delete:', e);
    }

    return { success: true };
  }

  async findMeasurements(query: {
    productId?: string;
    sampleId?: string;
    op?: string;
    size?: string;
    stage?: string;
  }) {
    const where: any = {};
    if (query.productId) where.productId = query.productId;
    if (query.sampleId) where.sampleId = query.sampleId;
    if (query.op) where.op = query.op;
    if (query.size) where.size = query.size;
    if (query.stage) where.stage = query.stage;

    return this.prisma.productMeasurement.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteMeasurement(id: string) {
    return this.prisma.productMeasurement.delete({
      where: { id },
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
