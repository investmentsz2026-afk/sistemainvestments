// frontend/components/samples/OPBarcodeModal.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Printer, ChevronLeft, ChevronRight, Tag, Layers, Check } from 'lucide-react';
import { ProductBarcode } from '../products/Barcode';
import { generateOpGarmentSku } from '../../lib/sku-generator';

interface OPBarcodeModalProps {
  sample: any;
  onClose: () => void;
}

export const OPBarcodeModal: React.FC<OPBarcodeModalProps> = ({ sample, onClose }) => {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Extract variants from productionSizeData
  const variants = useMemo(() => {
    const cleanOp = (sample?.op || '').replace(/\D/g, '') || (sample?.op || '').trim();
    const entalle = sample?.entalle || (Array.isArray(sample?.productionSizeData) ? sample.productionSizeData[0]?.entalle : '') || '';
    const usedSkus = new Set<string>();

    if (Array.isArray(sample?.productionSizeData) && sample.productionSizeData.length > 0) {
      return sample.productionSizeData.map((item: any, idx: number) => {
        let itemSku = item.sku || item.variantSku;
        if (!itemSku || !/^\d{12}$/.test(itemSku) || (cleanOp && !itemSku.endsWith(cleanOp))) {
          itemSku = generateOpGarmentSku(cleanOp, usedSkus);
        } else {
          usedSkus.add(itemSku);
        }

        return {
          id: `var-${idx}`,
          size: item.size || 'ST',
          color: (item.color || sample.productionColor || 'ÚNICO').toUpperCase(),
          quantity: item.quantity || 1,
          salePrice: Number(item.salePrice) || 0,
          entalle: item.entalle || entalle,
          sku: itemSku,
        };
      });
    }

    // Fallback if no detailed size data
    const fallbackSku = sample?.barcode && /^\d{12}$/.test(sample.barcode) && (!cleanOp || sample.barcode.endsWith(cleanOp))
      ? sample.barcode
      : generateOpGarmentSku(cleanOp, usedSkus);

    return [{
      id: 'var-0',
      size: 'ST',
      color: (sample?.productionColor || 'ÚNICO').toUpperCase(),
      quantity: sample?.productionQuantity || 1,
      salePrice: 0,
      entalle: entalle,
      sku: fallbackSku,
    }];
  }, [sample]);

  // Adjust quantity when selecting variant
  useEffect(() => {
    if (variants[selectedVariantIndex]) {
      setQuantity(Math.max(1, Number(variants[selectedVariantIndex].quantity) || 1));
    }
  }, [selectedVariantIndex, variants]);

  const activeVariant = variants[selectedVariantIndex] || variants[0];
  const entalleDisplay = (activeVariant?.entalle || sample?.entalle || '').trim();
  const sampleName = (sample?.name || 'PRENDA').toUpperCase();
  const modelDisplay = `${sampleName}${entalleDisplay ? ' - ' + entalleDisplay.toUpperCase() : ''}`;
  const categoryDisplay = 'PANTALÓN';

  // EXACT same print styling used in Logistics / Inventory BarcodeModal
  const commonStyles = `
    @page {
      size: 30.2mm 40mm;
      margin: 0 !important;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 30.2mm !important;
      height: 40mm !important;
      overflow: hidden;
    }
    .barcode-label {
      width: 30.2mm !important;
      height: 40mm !important;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    .label-inner {
      width: 40mm !important;
      height: 30.2mm !important;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(90deg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0.5mm 1mm;
      background: white;
      text-transform: uppercase;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label-header {
      text-align: center;
      width: 100%;
      line-height: 1.1;
      font-family: Arial, Helvetica, sans-serif;
    }
    .brand {
      font-size: 6.2pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-bottom: 0.1mm;
      letter-spacing: 0.1mm;
      -webkit-text-stroke: 0.05pt #000;
      -webkit-font-smoothing: none;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
    }
    .category {
      font-size: 5pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-bottom: 0.1mm;
      letter-spacing: 0.1mm;
      -webkit-text-stroke: 0.05pt #000;
      -webkit-font-smoothing: none;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
    }
    .model {
      font-size: 6.2pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-bottom: 0.1mm;
      line-height: 1.0;
      text-align: center;
      width: 100%;
      overflow: hidden;
      white-space: normal;
      word-break: break-word;
      letter-spacing: 0.1mm;
      -webkit-text-stroke: 0.05pt #000;
      -webkit-font-smoothing: none;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
    }
    .color-text {
      font-size: 6.2pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-bottom: 0.2mm;
      letter-spacing: 0.1mm;
      -webkit-text-stroke: 0.05pt #000;
      -webkit-font-smoothing: none;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
    }
    .barcode-section {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin-bottom: 0mm;
    }
    .barcode-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 1;
      max-width: 32mm;
    }
    .sku-text {
      font-size: 6.2pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-top: 0.1mm;
      text-align: center;
      width: 100%;
      -webkit-text-stroke: 0.05pt #000;
      -webkit-font-smoothing: none;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
    }
    .barcode-svg {
      display: block;
      max-width: 100%;
      height: auto;
      image-rendering: crisp-edges;
    }
    .size-text {
      font-size: 19pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      line-height: 1;
      margin-left: 2mm;
      flex-shrink: 0;
    }
    .price-text {
      font-size: 6.3pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      width: 100%;
      text-align: left;
      padding-left: 1.5mm;
      white-space: nowrap;
      margin-top: 0mm;
      padding-top: 0mm;
      letter-spacing: 0.1mm;
      -webkit-text-stroke: 0.05pt #000;
      -webkit-font-smoothing: none;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
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

  // Print single variant
  const printSingleVariant = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const variant = activeVariant;
    const vEntalle = (variant.entalle || sample?.entalle || '').trim();
    const vModelDisplay = `${sampleName}${vEntalle ? ' - ' + vEntalle.toUpperCase() : ''}`;
    const hasSize = variant.size && variant.size !== 'N/A' && variant.size !== '-';
    const hasPrice = variant.salePrice > 0;

    const items = Array(quantity).fill(0).map((_, index) => {
      return `
        <div class="barcode-label">
          <div class="label-inner">
            <div class="label-header">
              <div class="brand">AMERICAN COLT</div>
              <div class="category">${categoryDisplay}</div>
              <div class="model">${vModelDisplay}</div>
              <div class="color-text">COLOR: ${variant.color}</div>
            </div>
            <div class="barcode-section">
              <div class="barcode-wrapper">
                <svg id="barcode-${index}-${Date.now()}" class="barcode-svg"></svg>
                <div class="sku-text">${variant.sku}</div>
              </div>
              ${hasSize ? `<div class="size-text">${variant.size}</div>` : ''}
            </div>
            ${hasPrice ? `<div class="price-text">PRECIO SUG. : S/. ${parseFloat(variant.salePrice.toString()).toFixed(2)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Sticker OP - ${sample.op} - Talla ${variant.size}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>${commonStyles}</style>
        </head>
        <body>
          ${items}
          <script>
            setTimeout(() => {
              document.querySelectorAll('.barcode-svg').forEach((el) => {
                try {
                   JsBarcode(el, "${variant.sku}", {
                    format: "CODE128",
                    width: 1.0,
                    height: 35,
                    displayValue: false,
                    margin: 0,
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

  // Print all variants in batch
  const printAllVariants = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const items = variants.flatMap((variant, vIdx) => {
      const vEntalle = (variant.entalle || sample?.entalle || '').trim();
      const vModelDisplay = `${sampleName}${vEntalle ? ' - ' + vEntalle.toUpperCase() : ''}`;
      const hasSize = variant.size && variant.size !== 'N/A' && variant.size !== '-';
      const hasPrice = variant.salePrice > 0;
      const count = Math.max(1, Number(variant.quantity) || 1);

      return Array(count).fill(0).map((_, index) => {
        return `
          <div class="barcode-label">
            <div class="label-inner">
              <div class="label-header">
                <div class="brand">AMERICAN COLT</div>
                <div class="category">${categoryDisplay}</div>
                <div class="model">${vModelDisplay}</div>
                <div class="color-text">COLOR: ${variant.color}</div>
              </div>
              <div class="barcode-section">
                <div class="barcode-wrapper">
                  <svg id="barcode-all-${vIdx}-${index}" class="barcode-svg" data-sku="${variant.sku}"></svg>
                  <div class="sku-text">${variant.sku}</div>
                </div>
                ${hasSize ? `<div class="size-text">${variant.size}</div>` : ''}
              </div>
              ${hasPrice ? `<div class="price-text">PRECIO SUG. : S/. ${parseFloat(variant.salePrice.toString()).toFixed(2)}</div>` : ''}
            </div>
          </div>
        `;
      });
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Stickers Lote Completo OP - ${sample.op}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>${commonStyles}</style>
        </head>
        <body>
          ${items}
          <script>
            setTimeout(() => {
              document.querySelectorAll('.barcode-svg').forEach((el) => {
                const sku = el.getAttribute('data-sku');
                if (sku) {
                  try {
                    JsBarcode(el, sku, {
                      format: "CODE128",
                      width: 1.0,
                      height: 35,
                      displayValue: false,
                      margin: 0,
                      lineColor: "#000000"
                    });
                  } catch (e) {
                    console.error('Error generating barcode:', e);
                  }
                }
              });
              window.print();
              window.close();
            }, 600);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 my-auto border border-gray-100 flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="bg-slate-900 px-6 sm:px-8 py-5 flex items-center justify-between border-b border-slate-800 text-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                OP: {sample.op}
              </span>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                Imprimir Stickers de Producción
              </h2>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-1">
              Formato oficial de almacén (30.2 x 40mm) • Modelo: <strong className="text-white">{modelDisplay}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL CONTENT */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* 1. VARIANT / ITEM SELECTOR (if multiple sizes/colors) */}
          {variants.length > 1 && (
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
                Selecciona la Talla / Prenda a Imprimir
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {variants.map((v, idx) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantIndex(idx)}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      selectedVariantIndex === idx
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-gray-900">Talla {v.size}</span>
                        {selectedVariantIndex === idx && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">
                        Color: {v.color} • {v.quantity} uds.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-100">
                      {v.sku.slice(-6)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. REALISTIC STICKER PREVIEW */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 text-center">
              Vista Previa Real del Sticker (30.2 x 40mm)
            </label>
            <div className="flex justify-center">
              {/* Outer frame: 30.2mm x 40mm proportional scale */}
              <div
                className="w-[124px] h-[164px] bg-white border-2 border-dashed border-gray-300 rounded-lg shadow-xl flex flex-col items-center justify-center overflow-hidden relative"
                style={{ fontFamily: 'Arial Black, sans-serif' }}
              >
                {/* Rotated 90deg inner layout */}
                <div
                  className="flex flex-col items-center justify-center p-[1mm] uppercase text-black"
                  style={{
                    width: '40mm',
                    height: '30.2mm',
                    transform: 'rotate(90deg)',
                    transformOrigin: 'center center'
                  }}
                >
                  <div className="text-center w-full leading-none">
                    <div style={{ fontSize: '5.5pt', letterSpacing: '0.2px' }} className="font-black">
                      AMERICAN COLT
                    </div>
                    <div style={{ fontSize: '4.5pt', color: '#555' }} className="font-black mt-[0.2mm]">
                      {categoryDisplay}
                    </div>
                    <div
                      style={{ fontSize: '5.2pt', lineHeight: 1.0 }}
                      className="font-black mt-[0.3mm] text-center px-1 truncate"
                    >
                      {modelDisplay}
                    </div>
                    <div style={{ fontSize: '4.8pt' }} className="font-bold text-gray-700 mt-[0.2mm]">
                      COLOR: {activeVariant.color}
                    </div>
                  </div>

                  <div className="flex items-center justify-center w-full my-[0.2mm] px-1">
                    <div className="flex flex-col items-center justify-center flex-1 max-w-[28mm]">
                      <ProductBarcode
                        value={activeVariant.sku}
                        width={0.85}
                        height={26}
                        displayValue={false}
                      />
                      <div style={{ fontSize: '5pt', letterSpacing: '0.5px' }} className="font-mono font-bold mt-[0.1mm]">
                        {activeVariant.sku}
                      </div>
                    </div>
                    <div
                      style={{ fontSize: '16pt', lineHeight: 0.9 }}
                      className="font-black ml-1.5 shrink-0"
                    >
                      {activeVariant.size}
                    </div>
                  </div>

                  {activeVariant.salePrice > 0 && (
                    <div
                      style={{ fontSize: '4.8pt' }}
                      className="font-black w-full text-left pl-1 text-gray-800"
                    >
                      PRECIO SUG. : S/. {activeVariant.salePrice.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-center text-gray-400 mt-2 font-medium">
              El SKU numérico (<strong className="font-mono text-gray-700">{activeVariant.sku}</strong>) finaliza con la OP <strong className="text-indigo-600">{sample.op}</strong>
            </p>
          </div>

          {/* 3. QUANTITY CONTROLLER */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                Cantidad a Imprimir para Talla {activeVariant.size}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition shadow-xs flex items-center justify-center font-bold"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center py-2 border border-gray-300 rounded-xl bg-white font-black text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition shadow-xs flex items-center justify-center font-bold"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={() => setQuantity(Number(activeVariant.quantity) || 1)}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase transition"
                  title="Usar cantidad de producción"
                >
                  Cargar Qty ({activeVariant.quantity})
                </button>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-gray-400 font-black uppercase block mb-0.5">Impresora compatible</span>
              <span className="text-xs font-black text-indigo-600 uppercase">Térmica 30.2 x 40mm</span>
            </div>
          </div>

          {/* 4. ACTION BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={printSingleVariant}
              className="py-4 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Imprimir Talla {activeVariant.size} ({quantity} {quantity === 1 ? 'sticker' : 'stickers'})
            </button>

            {variants.length > 1 && (
              <button
                type="button"
                onClick={printAllVariants}
                className="py-4 px-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-95"
                title="Imprime todas las tallas y colores según la cantidad de producción de cada ítem"
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                Imprimir Todas las Tallas ({variants.reduce((acc, v) => acc + (Number(v.quantity) || 1), 0)} stickers)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
