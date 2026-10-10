// frontend/utils/inventoryAuditReport.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface AuditReportItem {
  variantSku: string;
  productName: string;
  size?: string;
  color?: string;
  location?: string;
  systemStock: number;
  countedStock?: number;
  difference?: number;
  isChecked?: boolean;
  observation?: string;
}

export interface AuditReportData {
  id?: string;
  period: string;
  inventoryType: string;
  status?: string;
  userName?: string;
  createdAt?: string;
  closedAt?: string;
  notes?: string;
  appliedAdjustment?: boolean;
  totalItems: number;
  matchedItems: number;
  mismatchedItems: number;
  totalDifference: number;
  items: AuditReportItem[];
}

/**
 * Genera la planilla imprimible en PDF para realizar el conteo físico en almacén
 */
export function printAuditBlankSheet(data: {
  period: string;
  inventoryType: string;
  items: AuditReportItem[];
}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const now = new Date();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('INVESTMENTS Z&G S.A.', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('RUC: 20608547441 | Almacén y Control de Existencias', 14, 21);

  // Recuadro del Documento
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(pageWidth - 85, 10, 71, 16, 2, 2, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('PLANILLA DE CONTEO FÍSICO', pageWidth - 80, 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Periodo: ${data.period} | ${format(now, 'dd/MM/yyyy')}`, pageWidth - 80, 22);

  // Metadatos
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Tipo de Inventario: ${data.inventoryType}`, 14, 30);
  doc.text(`Total Ítems a Contar: ${data.items.length}`, 95, 30);
  doc.text(`Fecha Emisión: ${format(now, "dd/MM/yyyy HH:mm")}`, pageWidth - 70, 30);

  // Tabla para conteo manual
  const tableRows = data.items.map((item, index) => [
    (index + 1).toString(),
    item.location || 'A1',
    item.variantSku || '-',
    item.productName || '-',
    `${item.size || 'EST'} / ${item.color || 'ÚNICO'}`,
    item.systemStock.toString(),
    '', // Para anotar a mano
    '[  ]', // Casilla check
    item.observation || ''
  ]);

  autoTable(doc, {
    head: [[
      'N°',
      'Ubic.',
      'SKU',
      'Producto / Descripción',
      'Talla/Color',
      'Stock Sis.',
      'Conteo Físico',
      'OK',
      'Observaciones / Notas'
    ]],
    body: tableRows,
    startY: 34,
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 28, fontStyle: 'bold' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 26 },
      5: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 22, halign: 'center' }, // Cuadro en blanco
      7: { cellWidth: 10, halign: 'center' }, // Check
      8: { cellWidth: 32 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 25 },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${data.pageNumber}`, pageWidth - 25, pageHeight - 8);
    }
  });

  // Espacio para firmas al final
  const finalY = Math.min((doc as any).lastAutoTable?.finalY + 12 || 240, 260);
  if (finalY < 265) {
    doc.setDrawColor(148, 163, 184);
    doc.line(20, finalY + 12, 85, finalY + 12);
    doc.line(125, finalY + 12, 190, finalY + 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Responsable de Conteo Físico', 30, finalY + 17);
    doc.text('Supervisor / Jefe de Almacén', 137, finalY + 17);
  }

  doc.autoPrint();
  const pdfUrl = doc.output('bloburl');
  window.open(pdfUrl, '_blank');
}

/**
 * Exporta la planilla en Excel con formato limpio
 */
export function exportAuditToExcel(data: {
  period: string;
  inventoryType: string;
  items: AuditReportItem[];
}) {
  const rows = data.items.map((item, idx) => ({
    'N°': idx + 1,
    'Ubicación': item.location || 'A1',
    'SKU': item.variantSku,
    'Producto': item.productName,
    'Talla': item.size || 'ESTÁNDAR',
    'Color': item.color || 'ÚNICO',
    'Stock en Sistema': item.systemStock,
    'Conteo Físico': item.countedStock !== undefined ? item.countedStock : item.systemStock,
    'Diferencia': (item.countedStock !== undefined ? item.countedStock : item.systemStock) - item.systemStock,
    'Conforme': item.isChecked ? 'SÍ' : 'NO',
    'Observaciones': item.observation || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 20 },
    { wch: 35 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Conteo Físico');
  XLSX.writeFile(wb, `CONTEO_INVENTARIO_${data.inventoryType}_${data.period}.xlsx`);
}

/**
 * Imprime el Acta Oficial de Auditoría y Ajuste de Inventario finalizado
 */
export function printFinalAuditReport(audit: AuditReportData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('INVESTMENTS Z&G S.A.', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('RUC: 20608547441 | Sistema de Control de Inventarios', 14, 21);

  // Recuadro del Acta
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(pageWidth - 90, 10, 76, 18, 2, 2, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text('ACTA DE AUDITORÍA Y AJUSTE', pageWidth - 85, 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(21, 128, 61);
  doc.text(`Periodo: ${audit.period} | ID: ${audit.id || 'N/A'}`, pageWidth - 85, 21);
  doc.text(`Estado: CERRADO Y REGISTRADO`, pageWidth - 85, 25);

  // Resumen ejecutivo
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 32, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Tipo de Inventario: ${audit.inventoryType}`, 18, 38);
  doc.text(`Responsable: ${audit.userName || 'Administrador'}`, 18, 44);
  doc.text(`Fecha Cierre: ${audit.closedAt ? format(new Date(audit.closedAt), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm')}`, 18, 50);

  doc.text(`Total Ítems: ${audit.totalItems}`, 105, 38);
  doc.setTextColor(16, 185, 129);
  doc.text(`Conformes (100% OK): ${audit.matchedItems}`, 105, 44);
  doc.setTextColor(audit.mismatchedItems > 0 ? 225 : 51, audit.mismatchedItems > 0 ? 29 : 65, audit.mismatchedItems > 0 ? 72 : 85);
  doc.text(`Con Discrepancia: ${audit.mismatchedItems}`, 105, 50);

  doc.setTextColor(51, 65, 85);
  doc.text(`Diferencia Neta: ${audit.totalDifference > 0 ? '+' : ''}${audit.totalDifference} uds`, pageWidth - 65, 38);
  doc.text(`Ajuste Kardex: ${audit.appliedAdjustment ? 'APLICADO' : 'SOLO REGISTRO'}`, pageWidth - 65, 44);

  // Tabla con los ítems (mostrando todos o destacando los descuadrados)
  const tableRows = audit.items.map((item, index) => {
    const diff = Number(item.difference || 0);
    const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0';
    return [
      (index + 1).toString(),
      item.location || 'A1',
      item.variantSku || '-',
      item.productName || '-',
      `${item.size || 'EST'} / ${item.color || 'ÚNICO'}`,
      item.systemStock.toString(),
      (item.countedStock !== undefined ? item.countedStock : item.systemStock).toString(),
      diffStr,
      item.observation || (diff === 0 ? 'Conforme' : '')
    ];
  });

  autoTable(doc, {
    head: [[
      'N°',
      'Ubic.',
      'SKU',
      'Producto',
      'Talla/Color',
      'Sistema',
      'Físico',
      'Dif.',
      'Observaciones'
    ]],
    body: tableRows,
    startY: 58,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 26, fontStyle: 'bold' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 25 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 35 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 25 },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${data.pageNumber}`, pageWidth - 25, pageHeight - 8);
    }
  });

  // Firmas al pie de página
  const finalY = Math.min((doc as any).lastAutoTable?.finalY + 15 || 240, 260);
  if (finalY < 265) {
    doc.setDrawColor(148, 163, 184);
    doc.line(25, finalY + 12, 85, finalY + 12);
    doc.line(125, finalY + 12, 185, finalY + 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Firma Encargado de Auditoría', 30, finalY + 17);
    doc.text('Firma Gerencia / Almacén', 133, finalY + 17);
  }

  doc.autoPrint();
  const pdfUrl = doc.output('bloburl');
  window.open(pdfUrl, '_blank');
}
