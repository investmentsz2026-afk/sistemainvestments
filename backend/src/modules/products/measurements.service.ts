import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export const DEFAULT_OFFICIAL_ENTALLES = [
  {
    name: 'RELAX',
    code: 'ENT-001',
    isCustomCode: false,
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
    code: 'ENT-002',
    isCustomCode: false,
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
    code: 'ENT-003',
    isCustomCode: false,
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
    code: 'ENT-004',
    isCustomCode: false,
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
    code: 'ENT-005',
    isCustomCode: false,
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
    code: 'ENT-006',
    isCustomCode: false,
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
    code: 'ENT-007',
    isCustomCode: false,
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
    code: 'ENT-008',
    isCustomCode: false,
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
    code: 'ENT-009',
    isCustomCode: false,
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


export const DEFAULT_COMPETITION_MEASUREMENTS = [
  {
    competitor: 'ZARA',
    name: 'SLIM FIT DENIM',
    code: 'CMP-001',
    isCustomCode: false,
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
    notes: 'Prenda referencial Zara Mall del Sur, 98% algodón 2% elastano',
    priceRef: '149.00',
  },
  {
    competitor: 'H&M',
    name: 'REGULAR JEANS',
    code: 'CMP-002',
    isCustomCode: false,
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
    notes: 'Denim rígido 100% algodón',
    priceRef: '119.00',
  },
  {
    competitor: 'PIONIER',
    name: 'ROLEX CONFORT',
    code: 'CMP-003',
    isCustomCode: false,
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
    tipoTela: 'CONFORT',
    baseSize: '32',
    notes: 'Tiro medio clásico, pretina anatómica',
    priceRef: '139.00',
  },
  {
    competitor: 'TOPITOP',
    name: 'BASIC STRAIGHT',
    code: 'CMP-004',
    isCustomCode: false,
    cinturaType: 'CINTURA STRAIGHT',
    cintura: '16 3/4 "',
    cadera: '20 1/2 "',
    muslo: '12 3/8 "',
    rodilla: '9 1/4 "',
    botaPie: '7 1/2 "',
    tiroDel: '11 1/2"',
    tiroPos: '15 1/4 "',
    largoTotal: '31 "',
    tela: 'DENIM',
    tipoTela: 'CONFORT',
    baseSize: '32',
    notes: 'Prenda clásica comercial',
    priceRef: '99.00',
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
        return records.map((r, idx) => {
          let extra: any = {};
          try {
            if (r.color && (r.color.startsWith('{') || r.color.startsWith('['))) {
              extra = JSON.parse(r.color);
            }
          } catch (e) {}

          const fallbackCode = `ENT-${String(idx + 1).padStart(3, '0')}`;
          const code = extra.code || fallbackCode;
          const isCustomCode = extra.isCustomCode === true;

          return {
            id: r.id,
            name: r.op || 'SIN_NOMBRE',
            code,
            isCustomCode,
            cinturaType: extra.cinturaType || (typeof r.color === 'string' && !r.color.startsWith('{') ? r.color : 'CINTURA SLIM'),
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
          return parsed.map((item: any, idx: number) => ({
            ...item,
            code: item.code || `ENT-${String(idx + 1).padStart(3, '0')}`,
            isCustomCode: item.isCustomCode === true,
          }));
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
      for (let i = 0; i < entalles.length; i++) {
        const ent = entalles[i];
        if (!ent.name) continue;
        const code = ent.code || `ENT-${String(i + 1).padStart(3, '0')}`;
        const isCustomCode = ent.isCustomCode === true;

        const extraJson = JSON.stringify({
          cinturaType: ent.cinturaType || 'CINTURA SLIM',
          tela: ent.tela || 'DENIM',
          tipoTela: ent.tipoTela || 'CONFORT',
          code,
          isCustomCode,
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


  private getCompetitionStorageFilePath() {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'competition-measurements.json');
  }

  async getCompetitionMeasurements() {
    // 1. DB
    try {
      const records = await this.prisma.productMeasurement.findMany({
        where: { stage: 'SPEC_COMPETENCIA' },
        orderBy: { createdAt: 'asc' },
      });

      if (records && records.length > 0) {
        return records.map((r, idx) => {
          let extra: any = {};
          try {
            if (r.color && (r.color.startsWith('{') || r.color.startsWith('['))) {
              extra = JSON.parse(r.color);
            }
          } catch (e) {}

          const fallbackCode = `CMP-${String(idx + 1).padStart(3, '0')}`;
          const code = extra.code || fallbackCode;
          const isCustomCode = extra.isCustomCode === true;

          return {
            id: r.id,
            competitor: extra.competitor || 'COMPETENCIA',
            name: r.op || 'SIN_NOMBRE',
            code,
            isCustomCode,
            cinturaType: extra.cinturaType || 'CINTURA SLIM',
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
            notes: extra.notes || '',
            priceRef: extra.priceRef || '',
            updatedAt: r.updatedAt,
          };
        });
      }
    } catch (e) {
      console.warn('Could not query ProductMeasurement for SPEC_COMPETENCIA, checking file:', e);
    }

    // 2. File fallback
    try {
      const filePath = this.getCompetitionStorageFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            ...item,
            code: item.code || `CMP-${String(idx + 1).padStart(3, '0')}`,
            isCustomCode: item.isCustomCode === true,
          }));
        }
      }
    } catch (e) {
      console.warn('Error reading competition-measurements.json:', e);
    }

    // 3. Default Seed
    const defaultList = DEFAULT_COMPETITION_MEASUREMENTS.map((d, idx) => ({
      id: `seed-cmp-${idx + 1}`,
      ...d,
      updatedAt: new Date().toISOString(),
    }));

    this.saveCompetitionMeasurementsBulk(defaultList).catch(() => {});
    return defaultList;
  }

  async saveCompetitionMeasurementsBulk(measurements) {
    // 1. Save to JSON backup file
    try {
      const filePath = this.getCompetitionStorageFilePath();
      fs.writeFileSync(filePath, JSON.stringify(measurements, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving to competition-measurements.json:', e);
    }

    // 2. Persist in ProductMeasurement
    try {
      await this.prisma.productMeasurement.deleteMany({
        where: { stage: 'SPEC_COMPETENCIA' },
      });

      for (let i = 0; i < measurements.length; i++) {
        const item = measurements[i];
        if (!item.name && !item.competitor) continue;
        const code = item.code || `CMP-${String(i + 1).padStart(3, '0')}`;
        const isCustomCode = item.isCustomCode === true;

        const extraJson = JSON.stringify({
          competitor: (item.competitor || 'COMPETENCIA').trim().toUpperCase(),
          cinturaType: item.cinturaType || 'CINTURA SLIM',
          tela: item.tela || 'DENIM',
          tipoTela: item.tipoTela || 'CONFORT',
          code,
          isCustomCode,
          notes: item.notes || '',
          priceRef: item.priceRef || '',
        });

        await this.prisma.productMeasurement.create({
          data: {
            op: item.name || `MOD-${i + 1}`,
            stage: 'SPEC_COMPETENCIA',
            size: item.baseSize || '32',
            color: extraJson,
            cintura: item.cintura || null,
            cadera: item.cadera || null,
            muslo: item.muslo || null,
            rodilla: item.rodilla || null,
            botaPie: item.botaPie || null,
            tiroDel: item.tiroDel || null,
            tiroPos: item.tiroPos || null,
            largoTotal: item.largoTotal || null,
          },
        });
      }
    } catch (e) {
      console.warn('Could not persist competition measurements to ProductMeasurement table:', e);
    }

    return measurements;
  }

  async deleteCompetitionMeasurement(idOrName) {
    try {
      await this.prisma.productMeasurement.deleteMany({
        where: {
          stage: 'SPEC_COMPETENCIA',
          OR: [
            { id: idOrName },
            { op: idOrName },
          ],
        },
      });
    } catch (e) {
      console.warn('Could not delete competition measurement from ProductMeasurement table:', e);
    }

    try {
      const filePath = this.getCompetitionStorageFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter(
            (item) =>
              item.id !== idOrName &&
              item.name !== idOrName &&
              item.code !== idOrName
          );
          fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
          return updated;
        }
      }
    } catch (e) {
      console.error('Error updating competition-measurements.json after delete:', e);
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
