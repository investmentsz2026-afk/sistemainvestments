// frontend/components/products/Barcode.tsx
import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  format?: string;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
}

export const ProductBarcode: React.FC<BarcodeProps> = ({
  value,
  width = 0.6, // narrower modules to reduce horizontal length
  height = 45, // taller bars so the barcode looks more square
  format = 'CODE128',
  displayValue = false, // Cambiado a false por defecto
  fontSize = 0, // keep no text inside barcode (we show SKU separately)
  margin = 0 // reduced margin
}) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          margin,
          lineColor: '#000000',
          background: '#ffffff'
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value, width, height, format, displayValue, fontSize, margin]);

  return (
    <svg ref={barcodeRef} className="max-w-full h-auto" />
  );
};