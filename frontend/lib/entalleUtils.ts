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

export function stripEntalleFromText(text: string): string {
  if (!text) return '';
  return text
    .replace(/⚠️ NOTA INFORMATIVA:[\s\S]*?(?=\n\n[^\s•\-⚠️📐]|$)/gi, '')
    .replace(/📐 ESPECIFICACIONES DEL ENTALLE ENLAZADO:[\s\S]*?(?=\n\n[^\s•\-⚠️📐]|$)/gi, '')
    .replace(/(?:•\s*)?Entalle Oficial:[^\n•]*(?:•[^\n•]*)*(?:\n|$)/gi, '')
    .replace(/•\s*Entalle Oficial:.*$/gi, '')
    .replace(/Entalle Oficial:.*$/gi, '')
    .trim();
}

export function formatCharacteristicsDisplay(text: string | null | undefined): string {
  if (!text) return '';
  if (text.includes('NOTA INFORMATIVA')) return text;

  const legacyMatch = text.match(/Entalle Oficial:\s*(\[[^\]]*\]\s*)?([^(•]+)\s*\(([^)]+)\)\s*•\s*Base:\s*Talla\s*([^•]+)\s*•\s*Cintura:\s*([^•]+)\s*•\s*Cadera:\s*([^•]+)\s*•\s*Muslo:\s*([^•]+)\s*•\s*Rodilla:\s*([^•]+)\s*•\s*Botapie:\s*([^•]+)\s*•\s*Largo:\s*([^•\n]+)/i);

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

    return text.replace(fullMatch, formattedBlock).trim();
  }

  return text;
}
