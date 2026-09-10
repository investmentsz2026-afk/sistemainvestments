'use client';

import React from 'react';
import { X, Layers, CheckCircle2, Box, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { getImageUrl } from '../../lib/imageUrl';

interface SelectVariantModalProps {
  product: any;
  onSelectVariant: (variant: any) => void;
  onClose: () => void;
}

export function SelectVariantModal({
  product,
  onSelectVariant,
  onClose,
}: SelectVariantModalProps) {
  if (!product) return null;

  const variants = product.variants || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col my-auto animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-indigo-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 overflow-hidden">
              {product.imageUrl ? (
                <img src={getImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Box className="w-7 h-7" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-black uppercase">
                  {product.sku}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  {product.category || 'Avíos / Material'}
                </span>
              </div>
              <h3 className="text-xl font-black uppercase text-white truncate mt-0.5">
                {product.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 bg-white/10 hover:bg-rose-500 text-white rounded-2xl transition active:scale-95 shrink-0 ml-3"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Selecciona la Variante / Color
              </h4>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {variants.length} variantes disponibles
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium mt-1">
              Este insumo tiene varias opciones registradas. Elige la variante exacta requerida para asegurar el descuento correcto de inventario.
            </p>
          </div>

          {variants.length === 0 ? (
            <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-xs font-bold text-gray-400 uppercase">Sin variantes específicas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {variants.map((v: any) => {
                const colorLabel = v.color && v.color !== 'ÚNICO' ? v.color : 'Estándar / Único';
                const hasSize = v.size && v.size !== 'ESTÁNDAR';
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSelectVariant(v)}
                    className="w-full p-4 rounded-2xl border border-gray-100 hover:border-indigo-400 bg-gray-50/50 hover:bg-indigo-50/40 transition-all flex items-center justify-between text-left group active:scale-98 shadow-sm hover:shadow-md"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-white border border-gray-200 group-hover:border-indigo-200 rounded-xl text-xs font-black uppercase text-gray-900 shadow-sm">
                          🎨 {colorLabel}
                        </span>
                        {hasSize && (
                          <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold">
                            Talla: {v.size}
                          </span>
                        )}
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg ${
                          v.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          Stock: {v.stock || 0} {product.unit || 'uds'}
                        </span>
                      </div>

                      <p className="text-[11px] font-mono text-gray-400 group-hover:text-indigo-600 transition-colors font-bold">
                        SKU: {v.variantSku || product.sku}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {product.purchasePrice !== undefined && (
                        <span className="text-xs font-black text-gray-700">
                          S/ {product.purchasePrice}
                        </span>
                      )}
                      <div className="w-9 h-9 rounded-xl bg-white group-hover:bg-indigo-600 text-gray-400 group-hover:text-white border border-gray-200 group-hover:border-indigo-600 flex items-center justify-center transition shadow-sm">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition uppercase"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
