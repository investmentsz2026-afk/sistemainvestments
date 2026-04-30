// frontend/components/products/BarcodeModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Download, Printer, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductBarcode } from './Barcode';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

interface BarcodeModalProps {
  product: any;
  onClose: () => void;
  selectedVariant?: any;
  isOpen?: boolean;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ product, onClose, selectedVariant: propSelectedVariant, isOpen }) => {
  const [selectedVariant, setSelectedVariant] = useState<any>(propSelectedVariant || product.variants[0]);
  const [copied, setCopied] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [copiedVariant, setCopiedVariant] = useState<string | null>(null);

  // Sync selected variant when it changes from props
  useEffect(() => {
    if (propSelectedVariant) {
      setSelectedVariant(propSelectedVariant);
    }
  }, [propSelectedVariant]);

  const copyToClipboard = (text: string, variantId?: string) => {
    navigator.clipboard.writeText(text);
    if (variantId) {
      setCopiedVariant(variantId);
      setTimeout(() => setCopiedVariant(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const commonStyles = `
    @page {
      size: 30.2mm 40mm;
      margin: 0;
      padding: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      text-transform: uppercase;
      -webkit-font-smoothing: none;
      -moz-osx-font-smoothing: grayscale;
      font-smoothing: none;
      text-rendering: crispEdges;
    }
    html, body {
      width: 30.2mm;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
    }
    .barcode-label {
      width: 30.2mm;
      height: 40mm;
      display: flex;
      align-items: center;
      justify-content: center;
      page-break-after: always;
      page-break-inside: avoid;
      background: white;
      overflow: hidden;
    }
    .label-inner {
      width: 40mm;
      height: 30.2mm;
      transform: rotate(90deg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1mm 2mm;
      image-rendering: pixelated;
    }
    .barcode-label:last-child {
      page-break-after: auto;
    }
    .label-header {
      text-align: center;
      width: 100%;
      line-height: 1.1;
    }
    .brand {
      font-size: 7pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-bottom: 0.2mm;
      letter-spacing: 0.2mm;
    }
    .category {
      font-size: 7pt;
      font-weight: bold;
      margin-bottom: 0.3mm;
      letter-spacing: 0.1mm;
    }
    .model {
      font-size: 9pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-bottom: 0.3mm;
      line-height: 1.1;
      text-align: center;
      width: 100%;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      letter-spacing: 0.2mm;
    }
    .color-text {
      font-size: 8pt;
      font-weight: bold;
      margin-bottom: 0.5mm;
      letter-spacing: 0.1mm;
    }
    .barcode-section {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin-bottom: 0.5mm;
    }
    .barcode-wrapper {
      display: flex;
      justify-content: center;
      flex-shrink: 1;
      overflow: hidden;
      max-width: 32mm;
    }
    .barcode-svg {
      display: block;
      max-width: 100%;
      height: auto;
      image-rendering: crisp-edges;
      image-rendering: pixelated;
    }
    .size-text {
      font-size: 18pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      line-height: 1;
      margin-left: 2mm;
      flex-shrink: 0;
    }
    .price-text {
      font-size: 6pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      width: 100%;
      text-align: center;
      border-top: 0.5mm solid #000;
      padding-top: 0.3mm;
      letter-spacing: 0.1mm;
    }
    @media print {
      html, body {
        width: 30.2mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .barcode-label {
        border: none;
      }
    }
  `;

  const printBarcodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const items = Array(quantity).fill(0).map((_, index) => {
      const variant = selectedVariant;
      const modelDisplay = `${product.name}${product.op ? ' - ' + product.op : ''}`;
      const hasSize = variant.size && variant.size !== 'N/A' && variant.size !== '-';
      const hasPrice = parseFloat(product.sellingPrice) > 0;

      return `
        <div class="barcode-label">
          <div class="label-inner">
            <div class="label-header">
              <div class="brand">AMERICAN COLT</div>
              <div class="category">${product.category || 'PANTALÓN CABALLERO'}</div>
              <div class="model">${modelDisplay}</div>
              <div class="color-text">COLOR: ${variant.color}</div>
            </div>
            <div class="barcode-section">
              <div class="barcode-wrapper">
                <svg id="barcode-${index}-${Date.now()}" class="barcode-svg"></svg>
              </div>
              ${hasSize ? `<div class="size-text">${variant.size}</div>` : ''}
            </div>
            ${hasPrice ? `<div class="price-text">PRECIO SUG. : S/. ${parseFloat(product.sellingPrice).toFixed(2)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Etiquetas - ${product.name}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>${commonStyles}</style>
        </head>
        <body>
          ${items}
          <script>
            setTimeout(() => {
              document.querySelectorAll('.barcode-svg').forEach((el, index) => {
                try {
                   JsBarcode(el, "${selectedVariant.variantSku}", {
                    format: "CODE128",
                    width: 1.3,
                    height: 30,
                    displayValue: true,
                    fontSize: 8,
                    margin: 0,
                    textMargin: 1,
                    lineColor: "#000000"
                  });
                } catch (e) {
                  console.error('Error generating barcode:', e);
                }
              });
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printAllVariants = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const items = product.variants.flatMap((variant: any) => 
      Array(quantity).fill(0).map((_, index) => {
        const modelDisplay = `${product.name}${product.op ? ' - ' + product.op : ''}`;
        const hasSize = variant.size && variant.size !== 'N/A' && variant.size !== '-';
        const hasPrice = parseFloat(product.sellingPrice) > 0;

        return `
          <div class="barcode-label">
            <div class="label-inner">
              <div class="label-header">
                <div class="brand">AMERICAN COLT</div>
                <div class="category">${product.category || 'PANTALÓN CABALLERO'}</div>
                <div class="model">${modelDisplay}</div>
                <div class="color-text">COLOR: ${variant.color}</div>
              </div>
              <div class="barcode-section">
                <div class="barcode-wrapper">
                  <svg id="barcode-${variant.id}-${index}" class="barcode-svg"></svg>
                </div>
                ${hasSize ? `<div class="size-text">${variant.size}</div>` : ''}
              </div>
              ${hasPrice ? `<div class="price-text">PRECIO SUG. : S/. ${parseFloat(product.sellingPrice).toFixed(2)}</div>` : ''}
            </div>
          </div>
        `;
      })
    ).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Todas las Variantes - ${product.name}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>${commonStyles}</style>
        </head>
        <body>
          ${items}
          <script>
            setTimeout(() => {
              const variants = ${JSON.stringify(product.variants)};
              document.querySelectorAll('.barcode-svg').forEach((el, index) => {
                try {
                  const variantId = el.id.split('-')[1];
                  const variant = variants.find(v => v.id === variantId);
                   JsBarcode(el, variant.variantSku, {
                    format: "CODE128",
                    width: 1.3,
                    height: 30,
                    displayValue: true,
                    fontSize: 8,
                    margin: 0,
                    textMargin: 1,
                    lineColor: "#000000"
                  });
                } catch (e) {
                  console.error('Error generating barcode:', e);
                }
              });
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportToExcel = () => {
    const data = product.variants.map((v: any) => ({
      'Producto': product.name,
      'SKU Producto': product.sku,
      'SKU Variante': v.variantSku,
      'Talla': v.size,
      'Color': v.color,
      'Código Barras': v.variantSku,
      'Precio': product.sellingPrice
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Códigos de Barras');
    XLSX.writeFile(wb, `codigos-${product.sku}.xlsx`);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.text(`Códigos de Barras - ${product.name}`, 14, 15);
      doc.text(`SKU: ${product.sku}`, 14, 25);
      doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 35);

      const tableColumn = ['Talla', 'Color', 'SKU', 'Código'];
      const tableRows = product.variants.map((v: any) => [
        v.size,
        v.color,
        v.variantSku,
        v.variantSku
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] }
      });

      doc.save(`codigos-${product.sku}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('No se pudo generar el PDF.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configuración de Etiquetas (30.2 x 40mm)</h2>
            <p className="text-sm text-gray-600">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Variante</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {product.variants.map((variant: any) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`p-3 border rounded-lg text-left transition ${
                    selectedVariant?.id === variant.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-gray-900">{variant.size}</p>
                  <p className="text-sm text-gray-600">{variant.color}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedVariant && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-4 text-center">Vista Previa - Realista (30.2mm x 40mm)</label>
              <div className="flex justify-center">
                <div className="w-[114px] h-[151px] bg-white border border-gray-300 shadow-2xl flex flex-col items-center justify-center overflow-hidden" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                  <div className="flex flex-col items-center justify-center p-[2mm] uppercase" style={{ width: '40mm', height: '30.2mm', transform: 'rotate(90deg)' }}>
                    <div className="text-center w-full">
                      <div style={{ fontSize: '7pt' }} className="font-black leading-tight">AMERICAN COLT</div>
                      <div style={{ fontSize: '7pt' }} className="font-black text-slate-600 mt-[0.2mm]">{product.category || 'PANTALÓN CABALLERO'}</div>
                      <div style={{ fontSize: '9pt' }} className="font-black leading-tight mt-[0.3mm] overflow-hidden text-center whitespace-nowrap">{product.name}{product.op ? ` - ${product.op}` : ''}</div>
                      <div style={{ fontSize: '8pt' }} className="font-black text-slate-700 mt-[0.5mm]">COLOR: {selectedVariant.color}</div>
                    </div>
                    
                    <div className="flex items-center justify-center w-full my-[0.5mm]">
                      <div className="flex justify-center overflow-hidden" style={{ maxWidth: '32mm' }}>
                        <ProductBarcode 
                          value={selectedVariant.variantSku} 
                          width={1.3}
                          height={30}
                          displayValue={true}
                          fontSize={8}
                        />
                      </div>
                      {selectedVariant.size && selectedVariant.size !== 'N/A' && selectedVariant.size !== '-' && (
                        <div style={{ fontSize: '18pt' }} className="font-black leading-none ml-[2mm]">
                          {selectedVariant.size}
                        </div>
                      )}
                    </div>
                    
                    {parseFloat(product.sellingPrice) > 0 && (
                      <div style={{ fontSize: '6pt' }} className="font-black w-full text-center border-t-2 border-black pt-[0.3mm]">
                        PRECIO SUG. : S/. {parseFloat(product.sellingPrice).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">Cantidad por etiqueta</label>
              <div className="flex items-center gap-3 mt-1">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 border bg-white rounded-lg hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-16 text-center py-2 border rounded-lg bg-white" />
                <button onClick={() => setQuantity(quantity + 1)} className="p-2 border bg-white rounded-lg hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block mb-1">Impresora sugerida:</span>
              <span className="text-sm font-semibold text-blue-600">Zebra TLP2844</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <button onClick={printBarcodes} className="flex flex-col items-center justify-center p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
              <Printer className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Imprimir Selección</span>
            </button>
            <button onClick={printAllVariants} className="flex flex-col items-center justify-center p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
              <Printer className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Todas Variantes</span>
            </button>
            <button onClick={exportToExcel} className="flex flex-col items-center justify-center p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition">
              <Download className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Excel</span>
            </button>
            <button onClick={exportToPDF} className="flex flex-col items-center justify-center p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
              <Download className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};