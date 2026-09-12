// frontend/utils/units.ts

export const getUnitSymbol = (unit?: string): string => {
  if (!unit) return 'uni.';
  const u = unit.toUpperCase().trim();
  switch (u) {
    case 'METROS':
    case 'METRO':
    case 'MTR':
    case 'M':
      return 'm.';
    case 'ROLLOS':
    case 'ROLLO':
      return 'rollos';
    case 'CONOS':
    case 'CONO':
      return 'conos';
    case 'KILOS':
    case 'KILO':
    case 'KG':
      return 'kg.';
    case 'YARDAS':
    case 'YARDA':
    case 'YD':
      return 'yd.';
    case 'MILLAR':
    case 'MIL':
      return 'mil';
    case 'DOCENA':
    case 'DOCENAS':
    case 'DOC':
      return 'doc.';
    case 'PAQUETES':
    case 'PAQUETE':
    case 'PQT':
      return 'pqt.';
    case 'UND':
    case 'UNIDADES':
    case 'UNIDAD':
    case 'UDS':
    default:
      return 'uni.';
  }
};

export const getUnitFullLabel = (unit?: string): string => {
  if (!unit) return 'UNIDADES';
  const u = unit.toUpperCase().trim();
  switch (u) {
    case 'METROS':
    case 'METRO':
    case 'MTR':
    case 'M':
      return 'METROS';
    case 'ROLLOS':
    case 'ROLLO':
      return 'ROLLOS';
    case 'CONOS':
    case 'CONO':
      return 'CONOS';
    case 'KILOS':
    case 'KILO':
    case 'KG':
      return 'KILOS';
    case 'YARDAS':
    case 'YARDA':
    case 'YD':
      return 'YARDAS';
    case 'MILLAR':
    case 'MIL':
      return 'MILLARES';
    case 'DOCENA':
    case 'DOCENAS':
    case 'DOC':
      return 'DOCENAS';
    case 'PAQUETES':
    case 'PAQUETE':
    case 'PQT':
      return 'PAQUETES';
    case 'UND':
    case 'UNIDADES':
    case 'UNIDAD':
    case 'UDS':
    default:
      return 'UNIDADES';
  }
};
