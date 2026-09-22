// frontend/lib/sku-generator.ts

export const AVIO_PREFIXES: Record<string, string> = {
  ETIQUETA: 'ET',
  ETIQUETAS: 'ET',
  BOTON: 'BT',
  BOTONES: 'BT',
  HILO: 'HL',
  HILOS: 'HL',
  CIERRE: 'CR',
  CIERRES: 'CR',
  REMACHE: 'RM',
  REMACHES: 'RM',
  ELASTICO: 'EL',
  ELASTICOS: 'EL',
  BROCHE: 'BR',
  BROCHES: 'BR',
  FORRO: 'FR',
  FORROS: 'FR',
  FUSIBLE: 'EN',
  ENTRETELA: 'EN',
  TAG: 'TG',
  HANGTAG: 'TG',
  BADANA: 'BD',
  CUERO: 'BD',
  BOLSA: 'BL',
  BOLSAS: 'BL',
  CINTA: 'CT',
  CINTAS: 'CT',
  PLAQUETA: 'PL',
  PLAQUETAS: 'PL',
  HEBILLA: 'HB',
  HEBILLAS: 'HB',
  OJALILLO: 'OJ',
  OJALILLOS: 'OJ',
  HANGER: 'HG',
  GANCHO: 'GH',
};

export const COLOR_ABBR: Record<string, string> = {
  PLATA: 'PL',
  PLATEADO: 'PL',
  NEGRO: 'NG',
  BLANCO: 'BL',
  AZUL: 'AZ',
  ROJO: 'RJ',
  DORADO: 'DO',
  ORO: 'OR',
  BEIGE: 'BG',
  COFFEE: 'CF',
  CAFE: 'CF',
  MARRON: 'MR',
  VERDE: 'VD',
  AMARILLO: 'AM',
  GRIS: 'GR',
  BRONCE: 'BR',
  COBRE: 'CB',
  TRANSPARENTE: 'TR',
  PLASTICO: 'PT',
  CELESTE: 'CL',
  ROSADO: 'RS',
  GUINDA: 'GD',
  VINO: 'VN',
  CAMEL: 'CM',
  HABANO: 'HB',
  CRUDO: 'CR',
  MARFIL: 'MF',
  NAVY: 'NV',
  CREMA: 'CR',
  NIGHT: 'NG',
  SKY: 'SK',
  KHAKI: 'KK',
  ICE: 'IC',
  OXFORD: 'OX',
  NICKEL: 'NK',
  ANTIQUE: 'AQ',
  PAVONADO: 'PV',
  GUNMETAL: 'GM',
};

export function getAvioPrefix(name: string = '', category: string = ''): string {
  const cleanName = (name || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const cleanCat = (category || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  
  const words = `${cleanName} ${cleanCat}`.split(/\s+/);
  for (const w of words) {
    if (AVIO_PREFIXES[w]) return AVIO_PREFIXES[w];
  }
  
  const rawLetters = cleanName.replace(/[^A-Z]/g, '');
  if (rawLetters.length >= 2) return rawLetters.substring(0, 2);
  
  const catLetters = cleanCat.replace(/[^A-Z]/g, '');
  if (catLetters.length >= 2) return catLetters.substring(0, 2);

  return 'AV';
}

export function getAvioColorCode(color: string = ''): string {
  if (!color) return 'UN';
  const clean = (color || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (clean === 'UNICO' || clean === 'ÚNICO' || clean === 'ESTANDAR' || clean === 'STANDARD') return 'UN';
  
  if (COLOR_ABBR[clean]) return COLOR_ABBR[clean];
  
  const words = clean.split(/\s+/);
  for (const w of words) {
    if (COLOR_ABBR[w]) return COLOR_ABBR[w];
  }

  const rawLetters = clean.replace(/[^A-Z0-9]/g, '');
  if (rawLetters.length >= 2) return rawLetters.substring(0, 2);
  if (rawLetters.length === 1) return `${rawLetters}0`;
  return 'UN';
}

export function generateAvioSKU(params: {
  name?: string;
  category?: string;
  size?: string;
  color?: string;
  location?: string;
  correlative?: string | number;
}): string {
  const desc = getAvioPrefix(params.name, params.category);
  
  let corrStr = '';
  if (params.correlative !== undefined && params.correlative !== null && params.correlative !== '') {
    corrStr = String(params.correlative).padStart(4, '0').slice(-4);
  } else {
    corrStr = '0010';
  }

  let sizePart = '';
  const cleanSize = (params.size || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
  if (cleanSize && cleanSize !== 'UNICO' && cleanSize !== 'ESTANDAR' && cleanSize !== 'STANDARD') {
    sizePart = `T${cleanSize}`;
  } else {
    sizePart = 'T01';
  }

  const colorPart = getAvioColorCode(params.color);

  let locPart = (params.location || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
  if (!locPart) {
    locPart = 'A1';
  }

  return `${desc}${corrStr}${sizePart}${colorPart}${locPart}`;
}
