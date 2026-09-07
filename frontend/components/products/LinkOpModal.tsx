// frontend/components/products/LinkOpModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Link2, CheckCircle2, AlertTriangle, Layers, DollarSign, Package } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';

interface FirstQualityOp {
  op: string;
  productId: string;
  productName: string;
  category: string;
  inventoryType: string;
  purchasePrice: number;
  sellingPrice: number;
  realPrice?: number;
  totalStock: number;
  variantsCount: number;
  imageUrl?: string;
}

interface LinkOpModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSuccess?: () => void;
}

export const LinkOpModal: React.FC<LinkOpModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const [ops, setOps] = useState<FirstQualityOp[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOp, setSelectedOp] = useState<FirstQualityOp | null>(null);
  const [manualOp, setManualOp] = useState('');
  const [syncPrices, setSyncPrices] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableOps();
      setManualOp(product?.op || '');
      setSelectedOp(null);
    }
  }, [isOpen, product]);

  const fetchAvailableOps = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products/first-quality-ops');
      setOps(response.data || []);
      // If product already has an OP, select it if found
      if (product?.op) {
        const found = (response.data || []).find((o: FirstQualityOp) => o.op === product.op);
        if (found) setSelectedOp(found);
      }
    } catch (error) {
      console.error('Error al cargar OPs:', error);
      toast.error('Error al cargar las OPs disponibles');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const filteredOps = ops.filter(
    (item) =>
      item.op.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeOpString = selectedOp ? selectedOp.op : manualOp.trim();

  const handleConfirmLink = async () => {
    if (!activeOpString) {
      toast.error('Por favor selecciona o ingresa una Orden de Producción (OP)');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/products/${product.id}/link-op`, {
        op: activeOpString,
        syncPrices,
      });

      toast.success(`Producto vinculado exitosamente a la OP ${activeOpString}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error linking OP:', error);
      toast.error(error.response?.data?.message || 'Error al vincular OP al producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 border-b border-gray-100 p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/30">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Prenda de Segunda
                </span>
                {product.op && (
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    OP Actual: {product.op}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mt-1">
                Conectar a OP de Primera Calidad
              </h3>
              <p className="text-xs text-gray-500">
                Producto: <strong className="text-gray-800">{product.name}</strong> ({product.category})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Info Banner */}
          <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-100 flex items-start gap-3 text-xs text-blue-900 leading-relaxed">
            <Layers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-950">
                Trazabilidad con el Lote de Fabricación
              </p>
              <p className="text-blue-700 mt-0.5">
                Al conectar esta prenda de segunda a su <strong>OP de origen</strong>, el sistema asociará automáticamente su costo de fabricación unitario y regenerará los SKUs de las variantes para tener el control de pérdidas y ventas por lote.
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Buscar Orden de Producción (OP de Primera)
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número de OP (ej. 222, OP-050) o nombre de producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* List of Available OPs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                OPs Disponibles ({filteredOps.length})
              </span>
              {loading && <span className="text-xs text-indigo-600 animate-pulse">Cargando OPs...</span>}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredOps.map((opItem) => {
                const isSelected = selectedOp?.op === opItem.op || (!selectedOp && manualOp === opItem.op);
                return (
                  <div
                    key={opItem.op}
                    onClick={() => {
                      setSelectedOp(opItem);
                      setManualOp(opItem.op);
                    }}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100'
                        : 'border-gray-100 hover:border-indigo-200 bg-white hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black font-mono text-sm ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {opItem.op.slice(0, 4)}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-indigo-700">
                            OP {opItem.op}
                          </span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-gray-100 text-gray-600 font-bold truncate">
                            {opItem.category}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-900 truncate mt-0.5">
                          {opItem.productName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-gray-900">
                        Costo: <span className="text-indigo-600">S/ {opItem.purchasePrice?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        P. Venta Primera: S/ {opItem.sellingPrice?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!loading && filteredOps.length === 0 && (
                <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                  <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-600">No se encontraron OPs con esa búsqueda</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Puedes escribir el número de OP manualmente abajo.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Manual OP Input fallback */}
          <div className="pt-3 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              O ingresar OP manualmente:
            </label>
            <input
              type="text"
              placeholder="Ej. OP-104, 222..."
              value={manualOp}
              onChange={(e) => {
                setManualOp(e.target.value.toUpperCase());
                setSelectedOp(null);
              }}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Synchronization options */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={syncPrices}
                onChange={(e) => setSyncPrices(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-bold text-gray-900 block">
                  Sincronizar costo de producción con la OP de primera
                </span>
                <span className="text-gray-500 text-[11px]">
                  {selectedOp
                    ? `Se actualizará el costo unitario de esta prenda a S/ ${selectedOp.purchasePrice?.toFixed(2) || '0.00'} (Costo real del lote).`
                    : 'Actualiza el costo unitario según el producto de primera que tenga esta OP.'}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="text-xs">
            {activeOpString ? (
              <span className="text-gray-700">
                Vinculando a: <strong className="text-indigo-600 font-mono">OP {activeOpString}</strong>
              </span>
            ) : (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Selecciona una OP
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmLink}
              disabled={isSubmitting || !activeOpString}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>Conectando...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Vincular y Sincronizar OP
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
