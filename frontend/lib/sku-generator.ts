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
  PIN: 'PN',
  PINES: 'PN',
  CHAPA: 'CP',
  CHAPAS: 'CP',
  CUADERNO: 'CD',
  CUADERNOS: 'CD',
  AGENDA: 'AG',
  AGENDAS: 'AG',
  LAPICERO: 'LP',
  LAPICEROS: 'LP',
  STICKER: 'SK',
  STICKERS: 'SK',
  BANNER: 'BN',
  BANNERS: 'BN',
  POLO: 'PL',
  POLOS: 'PL',
  CASACA: 'CS',
  CASACAS: 'CS',
  CHALECO: 'CH',
  CHALECOS: 'CH',
  REGALO: 'RG',
  REGALOS: 'RG',
  // Materiales y Telas
  TELA: 'TL',
  TELAS: 'TL',
  DENIM: 'DN',
  DRILL: 'DR',
  ALGODON: 'AL',
  PIMA: 'PM',
  LINO: 'LN',
  POPELINA: 'PP',
  FRANELA: 'FN',
  CHALIS: 'CH',
  RIB: 'RB',
  TERRY: 'TR',
  FRENCH: 'FT',
  POLIESTER: 'PE',
  VISCOSA: 'VS',
  SEDA: 'SD',
  GABARDINA: 'GB',
  NYLON: 'NY',
  TASLAN: 'TS',
  POLAR: 'PO',
  SPANDEX: 'SP',
  LYCRA: 'LY',
  ROLLO: 'RL',
  ROLLOS: 'RL',
  STIKER: 'SK',
  STIKERS: 'SK',
  HILAZA: 'HZ',
  HILAZAS: 'HZ',
  CONO: 'CN',
  CONOS: 'CN',
  PELLON: 'PL',
  QUIMICO: 'QM',
  QUIMICOS: 'QM',
  TINTE: 'TT',
  TINTES: 'TT',
  LAVANDERIA: 'LV',
  SUAVIZANTE: 'SV',
  SILICONA: 'SL',
  CAJA: 'CJ',
  CAJAS: 'CJ',
  PLASTICO: 'PT',
  PLASTICOS: 'PT',
  FILM: 'FL',
  INSUMO: 'IN',
  INSUMOS: 'IN',
  MATERIAL: 'MT',
  MATERIALES: 'MT',
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

  return 'MT';
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
  existingSku?: string;
}): string {
  const desc = getAvioPrefix(params.name, params.category);
  
  let corrStr = '';
  if (params.correlative !== undefined && params.correlative !== null && String(params.correlative).trim() !== '') {
    const digits = String(params.correlative).replace(/\D/g, '');
    corrStr = digits.padStart(4, '0').slice(-4) || '0010';
  } else if (params.existingSku) {
    const avioMatch = params.existingSku.match(/^[A-Za-z]{2}(\d{4})/);
    if (avioMatch) {
      corrStr = avioMatch[1];
    } else {
      const digits = params.existingSku.replace(/\D/g, '');
      corrStr = digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, '0') || '0010';
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
