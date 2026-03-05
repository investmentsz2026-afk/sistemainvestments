// frontend/components/products/BarcodeModal.tsx
'use client';

import { useState } from 'react';
import { X, Download, Printer, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductBarcode } from './Barcode';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

interface BarcodeModalProps {
  product: any;
  onClose: () => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ product, onClose }) => {
  const [selectedVariant, setSelectedVariant] = useState<any>(product.variants[0]);
  const [copied, setCopied] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [copiedVariant, setCopiedVariant] = useState<string | null>(null);

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

  const printBarcodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generar etiquetas individuales para cada variante seleccionada
    const items = Array(quantity).fill(0).map((_, index) => {
      const variant = selectedVariant;
      return `
        <div class="barcode-label">
          <div class="label-content">
            <div class="product-info">
              <strong>${product.name}</strong><br>
              <span class="variant-info">${variant.size} / ${variant.color}</span>
            </div>
            <div class="barcode-container">
              <svg id="barcode-${index}-${Date.now()}" class="barcode-svg"></svg>
            </div>
            <div class="sku">${variant.variantSku}</div>
            <div class="price">$${product.sellingPrice}</div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Etiquetas - ${product.name}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Arial', sans-serif;
              padding: 15px;
              margin: 0;
              background: #f5f5f5;
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              justify-content: flex-start;
            }
            .barcode-label {
              width: 180px;
              height: 120px;
              background: white;
              border: 1px dashed #ccc;
              border-radius: 4px;
              padding: 6px;
              page-break-inside: avoid;
              break-inside: avoid;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .label-content {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
            }
            .product-info {
              font-size: 8px;
              color: #333;
              line-height: 1.2;
              margin-bottom: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .variant-info {
              font-size: 7px;
              color: #666;
            }
            .barcode-container {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 50px;
              margin: 2px 0;
            }
            .barcode-svg {
              max-width: 100%;
              height: 50px !important;
              display: block;
            }
            .sku {
              font-size: 7px;
              color: #666;
              text-align: center;
              font-family: monospace;
              margin: 1px 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .price {
              font-size: 9px;
              font-weight: bold;
              color: #2c3e50;
              text-align: center;
              margin-top: 1px;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .barcode-label {
                border: none;
                box-shadow: none;
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
            @page {
              size: auto;
              margin: 8mm;
            }
          </style>
        </head>
        <body>
          ${items}
          <script>
            setTimeout(() => {
              document.querySelectorAll('.barcode-svg').forEach((el, index) => {
                try {
                  JsBarcode(el, "${selectedVariant.variantSku}", {
                    format: "CODE128",
                    width: 0.6,
                    height: 45,
                    displayValue: false,
                    fontSize: 0,
                    margin: 0,
                    lineColor: "#000000"
                  });
                } catch (e) {
                  console.error('Error generating barcode:', e);
                }
              });
              window.print();
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

    // Generar una etiqueta por cada variante
    const items = product.variants.flatMap((variant: any) => 
      Array(quantity).fill(0).map((_, index) => `
        <div class="barcode-label">
          <div class="label-content">
            <div class="product-info">
              <strong>${product.name}</strong><br>
              <span class="variant-info">${variant.size} / ${variant.color}</span>
            </div>
            <div class="barcode-container">
              <svg id="barcode-${variant.id}-${index}" class="barcode-svg"></svg>
            </div>
            <div class="sku">${variant.variantSku}</div>
            <div class="price">$${product.sellingPrice}</div>
          </div>
        </div>
      `)
    ).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Todas las Variantes - ${product.name}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Arial', sans-serif;
              padding: 15px;
              margin: 0;
              background: #f5f5f5;
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              justify-content: flex-start;
            }
            .barcode-label {
              width: 180px;
              height: 120px;
              background: white;
              border: 1px dashed #ccc;
              border-radius: 4px;
              padding: 6px;
              page-break-inside: avoid;
              break-inside: avoid;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .label-content {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
            }
            .product-info {
              font-size: 8px;
              color: #333;
              line-height: 1.2;
              margin-bottom: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .variant-info {
              font-size: 7px;
              color: #666;
            }
            .barcode-container {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 50px;
              margin: 2px 0;
            }
            .barcode-svg {
              max-width: 100%;
              height: 50px !important;
              display: block;
            }
            .sku {
              font-size: 7px;
              color: #666;
              text-align: center;
              font-family: monospace;
              margin: 1px 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .price {
              font-size: 9px;
              font-weight: bold;
              color: #2c3e50;
              text-align: center;
              margin-top: 1px;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .barcode-label {
                border: none;
                box-shadow: none;
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
            @page {
              size: auto;
              margin: 8mm;
            }
          </style>
        </head>
        <body>
          ${items}
          <script>
            setTimeout(() => {
              document.querySelectorAll('.barcode-svg').forEach((el, index) => {
                try {
                  const variantId = el.id.split('-')[1];
                  const variant = ${JSON.stringify(product.variants)}.find(v => v.id === variantId);
                  JsBarcode(el, variant.variantSku, {
                    format: "CODE128",
                    width: 0.6,
                    height: 45,
                    displayValue: false,
                    fontSize: 0,
                    margin: 0,
                    lineColor: "#000000"
                  });
                } catch (e) {
                  console.error('Error generating barcode:', e);
                }
              });
              window.print();
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
      alert('No se pudo generar el PDF. Por favor inténtalo de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Códigos de Barras</h2>
            <p className="text-sm text-gray-600">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Selector de variante */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Variante
            </label>
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
                  <p className="text-xs text-gray-400 mt-1">Stock: {variant.stock}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Vista previa de la etiqueta seleccionada - MÁS COMPACTA */}
          {selectedVariant && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vista previa de la etiqueta
              </label>
              <div className="flex justify-center">
                <div className="w-[180px] h-[100px] bg-white border-2 border-blue-300 rounded-lg shadow-lg p-2">
                  <div className="w-full h-full flex flex-col">
                    <div className="text-[8px] text-gray-800 leading-tight truncate font-bold">
                      {product.name}
                    </div>
                    <div className="text-[7px] text-gray-600">
                      {selectedVariant.size} / {selectedVariant.color}
                    </div>
                    <div className="flex-1 flex items-center justify-center my-1">
                      <ProductBarcode 
                        value={selectedVariant.variantSku} 
                        width={0.6}
                        height={45}
                        displayValue={false}
                      />
                    </div>
                    <div className="text-[7px] text-gray-500 text-center font-mono truncate">
                      {selectedVariant.variantSku}
                    </div>
                    <div className="text-[9px] font-bold text-gray-800 text-center">
                      ${product.sellingPrice}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Opciones de impresión */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de etiquetas
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-20 text-center px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 ml-2">
                {quantity} {quantity === 1 ? 'etiqueta' : 'etiquetas'}
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-6">
            <button
              onClick={printBarcodes}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir selección
            </button>
            <button
              onClick={printAllVariants}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
            >
              <Printer className="w-4 h-4" />
              Todas las variantes
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>

          {/* Lista de todas las variantes con miniaturas - MÁS COMPACTAS */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-4">Todas las variantes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.variants.map((variant: any) => (
                <div key={variant.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {/* Miniatura de la etiqueta - MÁS PEQUEÑA */}
                  <div className="w-[90px] h-[60px] bg-white border border-gray-200 rounded p-1 flex-shrink-0">
                    <div className="w-full h-full flex flex-col">
                      <div className="text-[6px] text-gray-800 truncate font-bold">{product.name}</div>
                      <div className="text-[5px] text-gray-500">{variant.size}/{variant.color}</div>
                      <div className="flex-1 flex items-center justify-center">
                        <ProductBarcode 
                          value={variant.variantSku} 
                          width={0.6}
                          height={45}
                          displayValue={false}
                        />
                      </div>
                      <div className="text-[5px] text-gray-400 text-center truncate">
                        {variant.variantSku}
                      </div>
                    </div>
                  </div>

                  {/* Información de la variante */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {variant.size} / {variant.color}
                        </p>
                        <p className="text-xs text-gray-500">Stock: {variant.stock}</p>
                        <p className="text-xs text-gray-400 font-mono">{variant.variantSku}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(variant.variantSku, variant.id)}
                        className="p-1.5 text-gray-600 hover:bg-white rounded-lg relative"
                        title="Copiar SKU"
                      >
                        {copiedVariant === variant.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};