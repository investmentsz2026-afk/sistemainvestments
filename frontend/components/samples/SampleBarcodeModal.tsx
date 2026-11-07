// frontend/components/samples/SampleBarcodeModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Printer, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { ProductBarcode } from '../products/Barcode';

interface SampleBarcodeModalProps {
  sample: any;
  onClose: () => void;
}

export const SampleBarcodeModal: React.FC<SampleBarcodeModalProps> = ({ sample, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  // 1. Barcode and SKU strictly based on Sample Code (e.g. SON-8088)
  const sampleCode = (
    sample?.code ||
    sample?.barcode ||
    (sample?.id ? `SMP-${sample.id.slice(-6).toUpperCase()}` : 'MUESTRA')
  ).trim().toUpperCase();

  const barcodeValue = sampleCode;
  const sampleName = (sample?.name || 'MUESTRA').toUpperCase();

  // Extract entalle if available
  const entalle = (
    sample?.entalle ||
    sample?.udpRequirements?.entalle ||
    (sample?.productionSizeData && Array.isArray(sample.productionSizeData) && sample.productionSizeData[0]?.entalle) ||
    sample?.characteristics?.match(/Entalle Oficial:\s*(\[[^\]]+\]\s*)?([^\n•(]+)/i)?.[2] ||
    ''
  ).trim();

  const modelDisplay = `${sampleName}${entalle ? ' - ' + entalle.toUpperCase() : ''}`;

  // Base size or standard 'ST'
  const baseSize = (
    sample?.baseSize ||
    sample?.udpRequirements?.baseSize ||
    (sample?.productionSizeData && Array.isArray(sample.productionSizeData) && sample.productionSizeData[0]?.size) ||
    sample?.characteristics?.match(/Base:\s*Talla\s*(\d+|ST)/i)?.[1] ||
    'ST'
  ).toString().toUpperCase();

  const categoryDisplay = 'MUESTRA / PROTOTIPO';
  const udpCreator = (sample?.udp?.name || 'DESARROLLO UDP').toUpperCase();
  const statusDisplay = (sample?.status || 'PENDIENTE').toUpperCase();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // EXACT same print styling used in OPBarcodeModal & BarcodeModal (Zebra 100x40mm, 3 columns 30.2x40mm)
  const commonStyles = `
    @page {
      size: 100mm 40mm;
      margin: 0;
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
      color: #000 !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff;
      color: #000;
      width: 100mm !important;
      height: auto !important;
      overflow: visible !important;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      display: grid !important;
      grid-template-columns: repeat(3, 30.2mm) !important;
      gap: 3mm !important;
      justify-content: start !important;
      align-content: start !important;
    }
    .barcode-label {
      width: 30.2mm;
      height: 40mm;
      display: flex;
      align-items: center;
      justify-content: center;
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
      justify-content: flex-start;
      padding: 1mm 1mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
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
    .model {
      font-size: 7.2pt;
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

  const printBarcodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printCount = Math.max(1, quantity);
    const items = Array(printCount).fill(0).map((_, index) => {
      return `
        <div class="barcode-label">
          <div class="label-inner">
            <div class="label-header">
              <div class="brand">AMERICAN COLT</div>
              <div class="category">${categoryDisplay}</div>
              <div class="model">${modelDisplay}</div>
              <div class="color-text">CÓD: ${sampleCode} • ${udpCreator}</div>
            </div>
            <div class="barcode-section">
              <div class="barcode-wrapper">
                <svg id="barcode-${index}-${Date.now()}" class="barcode-svg" data-sku="${barcodeValue}"></svg>
                <div class="sku-text">${barcodeValue}</div>
              </div>
              <div class="size-text">${baseSize}</div>
            </div>
            <div class="price-text">ESTADO: ${statusDisplay} • MUESTRA UDP</div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Sticker Muestra - ${sampleCode} - ${sampleName}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>${commonStyles}</style>
        </head>
        <body>
          ${items}
          <script>
            setTimeout(() => {
              document.querySelectorAll('.barcode-svg').forEach((el) => {
                const sku = el.getAttribute('data-sku') || "${barcodeValue}";
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 my-auto border border-gray-100 flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="bg-slate-900 px-6 sm:px-8 py-5 flex items-center justify-between border-b border-slate-800 text-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                CÓD: {sampleCode}
              </span>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                Sticker de Muestra
              </h2>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-1">
              Formato oficial térmico (30.2 x 40mm) • Modelo: <strong className="text-white">{modelDisplay}</strong>
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
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          {/* REALISTIC ROTATED PREVIEW (Identical to OPBarcodeModal) */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 text-center">
              Vista Previa Real del Sticker de Muestra (30.2 x 40mm)
            </label>
            <div className="flex justify-center">
              <div
                className="w-[124px] h-[164px] bg-white border-2 border-dashed border-gray-300 rounded-lg shadow-xl flex flex-col items-center justify-center overflow-hidden relative"
                style={{ fontFamily: 'Arial Black, sans-serif' }}
              >
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
                    <div style={{ fontSize: '4.8pt' }} className="font-bold text-gray-700 mt-[0.2mm] truncate">
                      CÓD: {sampleCode} • {udpCreator}
                    </div>
                  </div>

                  <div className="flex items-center justify-center w-full my-[0.2mm] px-1">
                    <div className="flex flex-col items-center justify-center flex-1 max-w-[28mm]">
                      <ProductBarcode
                        value={barcodeValue}
                        width={0.85}
                        height={26}
                        displayValue={false}
                        format="CODE128"
                      />
                      <div style={{ fontSize: '5pt', letterSpacing: '0.5px' }} className="font-mono font-bold mt-[0.1mm]">
                        {barcodeValue}
                      </div>
                    </div>
                    <div
                      style={{ fontSize: '16pt', lineHeight: 0.9 }}
                      className="font-black ml-1.5 shrink-0"
                    >
                      {baseSize}
                    </div>
                  </div>

                  <div
                    style={{ fontSize: '4.8pt' }}
                    className="font-black w-full text-left pl-1 text-gray-800"
                  >
                    ESTADO: {statusDisplay} • MUESTRA UDP
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-center text-gray-400 mt-2 font-medium">
              SKU generado a partir del Código de Muestra: <strong className="font-mono text-indigo-700">{barcodeValue}</strong>
            </p>
          </div>

          {/* SKU INFO CARD */}
          <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">
                SKU / Código de Muestra
              </span>
              <span className="font-mono font-black text-indigo-900 text-lg">{barcodeValue}</span>
            </div>
            <button
              type="button"
              onClick={copyToClipboard}
              className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 shadow-xs hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          {/* QUANTITY CONTROLLER */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                Cantidad a Imprimir
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
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setQuantity(isNaN(val) ? 1 : Math.max(1, val));
                  }}
                  className="w-20 text-center py-2 border border-gray-300 rounded-xl bg-white font-black text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition shadow-xs flex items-center justify-center font-bold"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-black uppercase block mb-0.5">Formato Térmico</span>
              <span className="text-xs font-black text-indigo-600 uppercase">3 Columnas (100 x 40mm)</span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTON (Sticky Footer) */}
        <div className="p-4 sm:p-6 bg-white border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={printBarcodes}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Imprimir {quantity} {quantity === 1 ? 'Sticker de Muestra' : 'Stickers de Muestra'}
          </button>
        </div>
      </div>
    </div>
  );
};
