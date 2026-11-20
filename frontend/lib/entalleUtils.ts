export function buildEntalleFormattedText(found: any): string {
  if (!found) return '';
  const codeText = found.code ? `[${found.code}] ` : '';
  const lines = [
    `⚠️ NOTA INFORMATIVA:`,
    `Estas medidas que salen aquí son medidas referenciales del ENTALLE ENLAZADO, más no son medidas de la muestra. Las medidas oficiales de la muestra salen en "Ver Medidas" donde puede visualizarlas y gestionarlas.`,
    ``,
    `📐 ESPECIFICACIONES DEL ENTALLE ENLAZADO:`,
    `• Entalle Oficial: ${codeText}${found.name} (${found.cinturaType || 'CINTURA STANDARD'})`,
    `• Talla Base: ${found.baseSize || '32'}${found.tela ? ` • Tela: ${found.tela}${found.tipoTela ? ` (${found.tipoTela})` : ''}` : ''}`,
    `• Medidas de Referencia:`,
    `  - Cintura: ${found.cintura || '-'}`,
    `  - Cadera: ${found.cadera || '-'}`,
    `  - Muslo: ${found.muslo || '-'}`,
    `  - Rodilla: ${found.rodilla || '-'}`,
    `  - Bota Pie: ${found.botaPie || '-'}`,
    ...(found.tiroDel ? [`  - Tiro Delantero: ${found.tiroDel}`] : []),
    ...(found.tiroPos ? [`  - Tiro Posterior: ${found.tiroPos}`] : []),
    `  - Largo Total: ${found.largoTotal || '-'}`
  ];
  return lines.join('\n');
}

export function cleanDirtyEntallePrefix(text: string): string {
  if (!text) return '';
  let res = text;
  for (let i = 0; i < 5; i++) {
    res = res.replace(/(?:•\s*)?Base:\s*Talla\s*[^•\n]+(?:•\s*(?:Cintura|Cadera|Muslo|Rodilla|Bota\s*pie|Botapie|Largo|Tiro)[^•\n]*)+(?:\s*•\s*)?/gi, '');
  }
  return res.replace(/^\s*•\s*/, '').trim();
}

export function stripEntalleFromText(text: string): string {
  if (!text) return '';
  let res = cleanDirtyEntallePrefix(text);
  return res
    .replace(/⚠️ NOTA INFORMATIVA:[\s\S]*?(?=(?:\n\n[^\s•\-⚠️📐💧🌊]|\n\n💧|\n\n🌊|$))/gi, '')
    .replace(/📐 ESPECIFICACIONES DEL ENTALLE ENLAZADO:[\s\S]*?(?=(?:\n\n[^\s•\-⚠️📐💧🌊]|\n\n💧|\n\n🌊|$))/gi, '')
    .replace(/(?:•\s*)?Entalle Oficial:[^\n•]*(?:•[^\n•]*)*(?:\n|$)/gi, '')
    .replace(/•\s*Entalle Oficial:.*$/gi, '')
    .replace(/Entalle Oficial:.*$/gi, '')
    .trim();
}

export function stripWashMeasurementsFromText(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:💧|🌊)?\s*MEDIDAS DESPUÉS DE LAVAR(?:\s*\(ACABADO\))?:[\s\S]*?(?=(?:\n\n[^\s•\-💧🌊⚠️📐]|\n\n⚠️|\n\n📐|$))/gi, '')
    .trim();
}

export function buildWashMeasurementsFormattedText(washMeasurements: any[]): string {
  if (!washMeasurements || washMeasurements.length === 0) return '';
  
  const sorted = [...washMeasurements].sort((a, b) => {
    const numA = parseFloat(a.size);
    const numB = parseFloat(b.size);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a.size || '').localeCompare(String(b.size || ''));
  });

  const lines = [
    `💧 MEDIDAS DESPUÉS DE LAVAR (ACABADO):`
  ];

  sorted.forEach(m => {
    lines.push(`• Talla ${m.size || '32'}:`);
    if (m.cintura) lines.push(`  - Cintura: ${m.cintura}`);
    if (m.cadera) lines.push(`  - Cadera: ${m.cadera}`);
    if (m.muslo) lines.push(`  - Muslo: ${m.muslo}`);
    if (m.rodilla) lines.push(`  - Rodilla: ${m.rodilla}`);
    if (m.botaPie) lines.push(`  - Bota Pie: ${m.botaPie}`);
    if (m.tiroDel) lines.push(`  - Tiro Delantero: ${m.tiroDel}`);
    if (m.tiroPos) lines.push(`  - Tiro Posterior: ${m.tiroPos}`);
    if (m.largoTotal) lines.push(`  - Largo Total: ${m.largoTotal}`);
  });

  return lines.join('\n');
}

export function formatCharacteristicsDisplay(text: string | null | undefined, washMeasurements?: any[]): string {
  if (!text && (!washMeasurements || washMeasurements.length === 0)) return '';

  let formatted = text || '';

  // Clean any unformatted / repeating Base: Talla... residue
  formatted = cleanDirtyEntallePrefix(formatted);

  // If text has legacy one-line entalle without NOTA INFORMATIVA, reformat it nicely
  if (!formatted.includes('NOTA INFORMATIVA')) {
    const legacyMatch = formatted.match(/Entalle Oficial:\s*(\[[^\]]*\]\s*)?([^(•]+)\s*\(([^)]+)\)\s*•\s*Base:\s*Talla\s*([^•]+)\s*•\s*Cintura:\s*([^•]+)\s*•\s*Cadera:\s*([^•]+)\s*•\s*Muslo:\s*([^•]+)\s*•\s*Rodilla:\s*([^•]+)\s*•\s*Botapie:\s*([^•]+)\s*•\s*Largo:\s*([^•\n]+)/i);

    if (legacyMatch) {
      const [fullMatch, code = '', name = '', cinturaType = '', baseSize = '', cintura = '', cadera = '', muslo = '', rodilla = '', botapie = '', largo = ''] = legacyMatch;
      const formattedBlock = [
        `⚠️ NOTA INFORMATIVA:`,
        `Estas medidas que salen aquí son medidas referenciales del ENTALLE ENLAZADO, más no son medidas de la muestra. Las medidas oficiales de la muestra salen en "Ver Medidas" donde puede visualizarlas y gestionarlas.`,
        ``,
        `📐 ESPECIFICACIONES DEL ENTALLE ENLAZADO:`,
        `• Entalle Oficial: ${code.trim() ? `${code.trim()} ` : ''}${name.trim()} (${cinturaType.trim()})`,
        `• Talla Base: ${baseSize.trim()}`,
        `• Medidas de Referencia:`,
        `  - Cintura: ${cintura.trim()}`,
        `  - Cadera: ${cadera.trim()}`,
        `  - Muslo: ${muslo.trim()}`,
        `  - Rodilla: ${rodilla.trim()}`,
        `  - Bota Pie: ${botapie.trim()}`,
        `  - Largo Total: ${largo.trim()}`,
      ].join('\n');

      formatted = formatted.replace(fullMatch, formattedBlock).trim();
    }
  }

  // Handle post-wash measurements if provided
  if (washMeasurements && washMeasurements.length > 0) {
    const validWash = washMeasurements.filter(m => m.stage === 'DESPUES_LAVAR' || !m.stage);
    if (validWash.length > 0) {
      formatted = stripWashMeasurementsFromText(formatted);
      const washBlock = buildWashMeasurementsFormattedText(validWash);
      formatted = formatted ? `${formatted}\n\n${washBlock}` : washBlock;
    }
  }

  return formatted.trim();
}
