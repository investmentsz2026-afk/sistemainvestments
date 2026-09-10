// frontend/components/samples/SampleBarcodeModal.tsx
'use client';

import { useState } from 'react';
import { X, Printer, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { ProductBarcode } from '../products/Barcode';

interface SampleBarcodeModalProps {
  sample: any;
  onClose: () => void;
}

export const SampleBarcodeModal: React.FC<SampleBarcodeModalProps> = ({ sample, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  const barcodeValue = sample.barcode || '775000000000';
  const sampleName = (sample.name || 'MUESTRA').toUpperCase();
  const sampleCode = sample.code ? sample.code.toUpperCase() : '';
  const categoryDisplay = 'MUESTRA / PROTOTIPO';
  const udpCreator = sample.udp?.name ? sample.udp.name.toUpperCase() : 'DESARROLLO UDP';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      padding: 1.5mm 1mm;
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
      font-size: 5.5pt;
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
      font-size: 6.5pt;
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
    .sub-text {
      font-size: 5.2pt;
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
      margin-top: 0.5mm;
    }
    .barcode-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 1;
      max-width: 36mm;
    }
    .sku-text {
      font-size: 6.5pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-top: 0.2mm;
      text-align: center;
      width: 100%;
      letter-spacing: 0.2mm;
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
    @media print {
      html, body {
        width: 100mm;
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
      return `
        <div class="barcode-label">
          <div class="label-inner">
            <div class="label-header">
              <div class="brand">AMERICAN COLT</div>
              <div class="category">${categoryDisplay}</div>
              <div class="model">${sampleName}${sampleCode ? ' - ' + sampleCode : ''}</div>
              <div class="sub-text">RESP: ${udpCreator}</div>
            </div>
            <div class="barcode-section">
              <div class="barcode-wrapper">
                <svg id="barcode-${index}-${Date.now()}" class="barcode-svg"></svg>
                <div class="sku-text">${barcodeValue}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Sticker Muestra - ${sampleName}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>${commonStyles}</style>
        </head>
        <body>
          ${items}
          <script>
            setTimeout(() => {
              document.querySelectorAll('.barcode-svg').forEach((el) => {
                try {
                   JsBarcode(el, "${barcodeValue}", {
                    format: "CODE128",
                    width: 1.2,
                    height: 38,
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[2.5rem] max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gray-50 px-8 py-6 flex items-center justify-between border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Sticker de Muestra Aprobada</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Formato Térmico: 30.2 x 40mm</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-gray-400 hover:text-gray-900"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Label Preview */}
          <div className="mb-8">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">
              Vista Previa de Etiqueta de Muestra
            </label>
            <div className="flex justify-center">
              <div 
                className="w-[124px] h-[164px] bg-white border border-gray-300 shadow-2xl flex flex-col items-center justify-center overflow-hidden rounded-lg p-1"
                style={{ fontFamily: 'Arial Black, sans-serif' }}
              >
                <div 
                  className="flex flex-col items-center justify-center p-[1mm] uppercase text-black text-center" 
                  style={{ width: '40mm', height: '30.2mm', transform: 'rotate(90deg)' }}
                >
                  <div className="text-center w-full">
                    <div style={{ fontSize: '5.5pt' }} className="font-black leading-tight text-black">AMERICAN COLT</div>
                    <div style={{ fontSize: '4.8pt' }} className="font-black text-gray-600 mt-[0.1mm]">{categoryDisplay}</div>
                    <div style={{ fontSize: '5.5pt' }} className="font-black leading-tight mt-[0.2mm] truncate text-black">{sampleName}</div>
                    <div style={{ fontSize: '4.5pt' }} className="font-bold text-gray-500 mt-[0.1mm]">{udpCreator}</div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center w-full my-[0.3mm]">
                    <div className="flex flex-col items-center justify-center overflow-hidden" style={{ maxWidth: '36mm' }}>
                      <ProductBarcode 
                        value={barcodeValue} 
                        width={1.2}
                        height={34}
                        displayValue={false}
                      />
                      <div style={{ fontSize: '6.5pt' }} className="font-black tracking-widest mt-[0.2mm] text-black">
                        {barcodeValue}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SKU Info Card */}
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 mb-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">SKU Numérico de Muestra</span>
              <span className="font-mono font-black text-indigo-900 text-lg">{barcodeValue}</span>
            </div>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 shadow-sm hover:bg-indigo-600 hover:text-white transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          {/* Quantity Controls */}
          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between mb-8">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cantidad a Imprimir</label>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                  className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <input 
                  type="number" 
                  min="1" 
                  value={quantity} 
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} 
                  className="w-20 text-center py-3 border border-gray-200 rounded-xl bg-white font-black text-lg" 
                />
                <button 
                  onClick={() => setQuantity(quantity + 1)} 
                  className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-gray-400 font-black uppercase block mb-1">Impresora sugerida</span>
              <span className="text-xs font-black text-indigo-600 uppercase">Zebra Térmica (100x40mm / 30.2x40mm)</span>
            </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={printBarcodes} 
            className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-base uppercase tracking-widest hover:bg-black transition shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
          >
            <Printer className="w-6 h-6" />
            Imprimir {quantity} {quantity === 1 ? 'Sticker de Muestra' : 'Stickers de Muestra'}
          </button>
        </div>
      </div>
    </div>
  );
};
