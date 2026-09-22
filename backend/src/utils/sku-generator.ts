// backend/src/utils/sku-generator.ts

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
  MERCHAN: 'MD',
  MERCHANDISING: 'MD',
  DESIGN: 'MD',
  GORRA: 'GO',
  GORRAS: 'GO',
  TAZA: 'TZ',
  TAZAS: 'TZ',
  LLAVERO: 'LL',
  LLAVEROS: 'LL',
  BOLSO: 'BS',
  BOLSOS: 'BS',
  MOCHILA: 'MC',
  MOCHILAS: 'MC',
  TOMATODO: 'TT',
  VASO: 'VS',
  VASOS: 'VS',
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
  const cleanName = name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const cleanCat = category.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  
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
  const clean = color.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
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
  existingSku?: string;
}): string {
  const desc = getAvioPrefix(params.name, params.category);
  
  let corrStr = '';
  if (params.correlative !== undefined && params.correlative !== null && String(params.correlative).trim() !== '') {
    const digits = String(params.correlative).replace(/\D/g, '');
    corrStr = digits.padStart(4, '0').slice(-4) || '0010';
  } else if (params.existingSku) {
    const match = params.existingSku.match(/^[A-Za-z]{2}(\d{4})/);
    if (match) {
      corrStr = match[1];
    } else {
      const digits = params.existingSku.replace(/\D/g, '');
      corrStr = digits.length >= 4 ? digits.slice(0, 4) : '0010';
    }
  } else {
    corrStr = '0010';
  }

  let sizePart = '';
  const rawSize = (params.size || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const cleanSize = rawSize.replace(/[^A-Z0-9]/g, '');
  if (
    cleanSize &&
    cleanSize !== 'ESTANDAR' &&
    cleanSize !== 'STANDARD' &&
    cleanSize !== 'UNICO' &&
    cleanSize !== 'UN' &&
    cleanSize !== 'ST' &&
    cleanSize !== '01'
  ) {
    sizePart = cleanSize.startsWith('T') ? cleanSize : `T${cleanSize}`;
  } else {
    sizePart = 'ST';
  }

  const colorPart = getAvioColorCode(params.color);

  let locPart = (params.location || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
  if (!locPart) {
    locPart = 'A1';
  }

  return `${desc}${corrStr}${sizePart}${colorPart}${locPart}`;
}

export function generateSKU(
  category: string,
  size: string,
  color: string,
  counter: number
): string {
  // Tomar primeras 3 letras de categoría
  const catPart = category.substring(0, 3).toUpperCase().padEnd(3, 'X');
  
  // Formatear talla
  const sizePart = size.replace(/[^a-zA-Z0-9]/g, '').substring(0, 2).toUpperCase().padEnd(2, '0');
  
  // Tomar primeras 3 letras del color
  const colorPart = color.substring(0, 3).toUpperCase().padEnd(3, 'X');
  
  // Número secuencial con padding
  const seqPart = counter.toString().padStart(4, '0');
  
  return `${catPart}${sizePart}${colorPart}${seqPart}`;
}

export function generateVariantSKU(productSKU: string, size: string, color: string): string {
  const sizeCode = size.replace(/[^a-zA-Z0-9]/g, '').substring(0, 2).toUpperCase().padEnd(2, '0');
  const colorCode = color.substring(0, 3).toUpperCase().padEnd(3, 'X');
  return `${productSKU}-${sizeCode}-${colorCode}`;
}