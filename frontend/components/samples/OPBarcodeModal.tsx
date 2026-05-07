// frontend/components/samples/OPBarcodeModal.tsx
'use client';

import { useState } from 'react';
import { X, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductBarcode } from '../products/Barcode';

interface OPBarcodeModalProps {
  sample: any;
  onClose: () => void;
}

export const OPBarcodeModal: React.FC<OPBarcodeModalProps> = ({ sample, onClose }) => {
  const [quantity, setQuantity] = useState(1);

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
      padding: 1mm;
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
      font-size: 5pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-bottom: 0.1mm;
      letter-spacing: 0.1mm;
      -webkit-text-stroke: 0.05pt #000;
    }
    .category {
      font-size: 5pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-bottom: 0.1mm;
      letter-spacing: 0.1mm;
      -webkit-text-stroke: 0.05pt #000;
    }
    .model {
      font-size: 6pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-bottom: 0.1mm;
      line-height: 1.0;
      text-align: center;
      width: 100%;
      letter-spacing: 0.1mm;
      -webkit-text-stroke: 0.05pt #000;
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
      width: 100%;
    }
    .sku-text {
      font-size: 6pt;
      font-family: 'Arial Black', sans-serif;
      font-weight: 900;
      margin-top: 0.1mm;
      text-align: center;
      width: 100%;
      -webkit-text-stroke: 0.05pt #000;
    }
    .barcode-svg {
      display: block;
      max-width: 100%;
      height: auto;
      image-rendering: crisp-edges;
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

    const barcodeValue = sample.barcode;
    const productName = sample.name.toUpperCase();
    const opValue = sample.op;
    const category = "PANTALÓN"; // Default or detect from name

    const items = Array(quantity).fill(0).map((_, index) => {
      return `
        <div class="barcode-label">
          <div class="label-inner">
            <div class="label-header">
              <div class="brand">AMERICAN COLT</div>
              <div class="category">${category}</div>
              <div class="model">${productName}</div>
              <div style="font-size: 5pt; font-weight: 900; margin-bottom: 0.2mm;">OP: ${opValue}</div>
            </div>
            <div class="barcode-section">
              <div class="barcode-wrapper">
                <svg id="barcode-${index}" class="barcode-svg"></svg>
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
          <title>Etiquetas OP - ${opValue}</title>
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
                    width: 2.2,
                    height: 60,
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
        <div className="bg-gray-50 px-8 py-6 flex items-center justify-between border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Etiquetas de Lote (OP)</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Tamaño: 30.2 x 40mm</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-gray-400 hover:text-gray-900">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">Vista Previa Realista</label>
            <div className="flex justify-center">
              {/* Preview mimicking the rotated label */}
              <div className="w-[114px] h-[151px] bg-white border border-gray-200 shadow-xl flex flex-col items-center justify-center overflow-hidden" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                <div className="flex flex-col items-center justify-center p-[1mm] uppercase" style={{ width: '40mm', height: '30.2mm', transform: 'rotate(90deg)' }}>
                  <div className="text-center w-full">
                    <div style={{ fontSize: '5pt' }} className="font-black leading-tight">AMERICAN COLT</div>
                    <div style={{ fontSize: '4.5pt' }} className="font-black text-gray-400 mt-[0.1mm]">PANTALÓN</div>
                    <div style={{ fontSize: '5.5pt' }} className="font-black leading-tight mt-[0.1mm] text-center">{sample.name}</div>
                    <div style={{ fontSize: '5pt' }} className="font-black text-indigo-600 mt-[0.2mm]">OP: {sample.op}</div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center w-full my-[0.2mm]">
                    <div className="flex flex-col items-center justify-center overflow-hidden" style={{ maxWidth: '35mm' }}>
                      <ProductBarcode 
                        value={sample.barcode} 
                        width={1.88}
                        height={50}
                        displayValue={false}
                      />
                      <div style={{ fontSize: '6pt' }} className="font-bold mt-[0.1mm]">{sample.barcode}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
              <span className="text-xs font-black text-indigo-600 uppercase">Zebra TLP2844</span>
            </div>
          </div>

          <button 
            onClick={printBarcodes} 
            className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-base uppercase tracking-widest hover:bg-black transition shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
          >
            <Printer className="w-6 h-6" />
            Imprimir {quantity} Etiquetas
          </button>
        </div>
      </div>
    </div>
  );
};
