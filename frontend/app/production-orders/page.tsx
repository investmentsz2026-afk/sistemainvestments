'use client';

import { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import {
  Plus, Search, X, Loader2, ClipboardCheck, Tag, Palette, Ruler, 
  Eye, CheckCircle2, AlertCircle, Calendar, Hash, ArrowRight, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useQueryClient } from 'react-query';

export default function ProductionOrdersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOp, setSelectedOp] = useState<any>(null);

  // Form State
  const [opNumber, setOpNumber] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productsFound, setProductsFound] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Combinations for OP
  // Format: { [size]: string[] } (array of colors checked for this size)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string[]>>({});
  const [opPrice, setOpPrice] = useState<number>(0);
  const [opCost, setOpCost] = useState<number>(0);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProductionOrders();
  }, []);

  // Handle clicking outside product search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProductionOrders = async () => {
    try {
      setIsLoading(true);
      const resp = await api.get('/production-orders');
      setProductionOrders(resp.data || []);
    } catch (error) {
      console.error('Error fetching production orders:', error);
      toast.error('Error al cargar las órdenes de producción');
    } finally {
      setIsLoading(false);
    }
  };

  // Search products handler
  const handleProductSearchChange = async (val: string) => {
    setProductSearch(val);
    if (val.trim().length < 2) {
      setProductsFound([]);
      setShowDropdown(false);
      return;
    }

    setIsSearchingProduct(true);
    try {
      const resp = await api.get(`/products/search?q=${encodeURIComponent(val)}`);
      setProductsFound(resp.data || []);
      setShowDropdown(true);
      setActiveSearchIndex(-1);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setIsSearchingProduct(false);
    }
  };

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setProductSearch(product.name);
    setShowDropdown(false);
    
    // Initialize variant selection mapping
    const initialMap: Record<string, string[]> = {};
    if (product.sizes && product.sizes.length > 0) {
      product.sizes.forEach((size: string) => {
        initialMap[size] = []; // Start with no colors selected
      });
    }
    setSelectedVariants(initialMap);
    if (product.op) {
      setOpPrice(0);
      setOpCost(0);
    } else {
      setOpPrice(product.sellingPrice || 0);
      setOpCost(product.purchasePrice || 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || productsFound.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSearchIndex(prev => (prev + 1) % productsFound.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSearchIndex(prev => (prev - 1 + productsFound.length) % productsFound.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSearchIndex >= 0 && activeSearchIndex < productsFound.length) {
        handleProductSelect(productsFound[activeSearchIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleToggleColorForSize = (size: string, color: string) => {
    setSelectedVariants(prev => {
      const colorsForSize = prev[size] || [];
      const updatedColors = colorsForSize.includes(color)
        ? colorsForSize.filter(c => c !== color)
        : [...colorsForSize, color];
      return {
        ...prev,
        [size]: updatedColors
      };
    });
  };

  const handleToggleAllColorsForSize = (size: string) => {
    if (!selectedProduct) return;
    const colorsForSize = selectedVariants[size] || [];
    const allColors = selectedProduct.colors || [];

    setSelectedVariants(prev => ({
      ...prev,
      [size]: colorsForSize.length === allColors.length ? [] : [...allColors]
    }));
  };

  const resetForm = () => {
    setOpNumber('');
    setProductSearch('');
    setSelectedProduct(null);
    setProductsFound([]);
    setSelectedVariants({});
    setOpPrice(0);
    setOpCost(0);
    setShowDropdown(false);
    setActiveSearchIndex(-1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Debe seleccionar un producto válido');
      return;
    }
    if (!opNumber.trim()) {
      toast.error('Debe ingresar un número de OP');
      return;
    }

    // Map variants into payload
    const variantsPayload = Object.entries(selectedVariants)
      .map(([size, colors]) => ({ size, colors }))
      .filter(v => v.colors.length > 0);

    if (variantsPayload.length === 0) {
      toast.error('Debe seleccionar al menos una combinación de talla y color');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/production-orders', {
        opNumber: opNumber.trim(),
        productId: selectedProduct.id,
        variants: variantsPayload,
        price: opPrice,
        cost: opCost
      });
      toast.success('Orden de Producción registrada y variantes generadas exitosamente');
      queryClient.invalidateQueries('products');
      setShowFormModal(false);
      resetForm();
      fetchProductionOrders();
    } catch (error: any) {
      console.error('Error creating OP:', error);
      const msg = error.response?.data?.message || 'Error al guardar la orden de producción';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = async (op: any) => {
    try {
      const resp = await api.get(`/production-orders/${op.id}`);
      setSelectedOp(resp.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching OP details:', error);
      toast.error('Error al cargar detalles de la OP');
    }
  };

  const filteredOPs = productionOrders.filter(op =>
    op.opNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.product?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Órdenes de Producción (OP)</h1>
          <p className="text-gray-500 mt-1 font-medium flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-blue-500" />
            Crea OPs y autogenera SKUs únicos de 12 dígitos por variantes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por OP o producto..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {(user?.role === 'ADMIN' || user?.role === 'LOGISTICA') && (
            <button
              onClick={() => { resetForm(); setShowFormModal(true); }}
              className="flex items-center gap-2 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-lg active:scale-95 bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 whitespace-nowrap"
            >
              <Plus className="w-5 h-5 text-blue-200" /> Registrar OP
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />
            ))}
          </div>
        ) : filteredOPs.length === 0 ? (
          <div className="text-center py-24 px-6">
            <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <ClipboardCheck className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No se encontraron Órdenes de Producción</h3>
            <p className="text-gray-500 mb-8 max-w-xs mx-auto font-medium">Registra tu primera OP para vincular productos y generar sus SKUs de variantes.</p>
            {(user?.role === 'ADMIN' || user?.role === 'LOGISTICA') && (
              <button
                onClick={() => { resetForm(); setShowFormModal(true); }}
                className="px-8 py-3.5 text-white rounded-2xl font-bold transition bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30"
              >
                Registrar OP
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[11px] uppercase font-black text-gray-400 tracking-[0.1em]">Número de OP</th>
                  <th className="px-8 py-5 text-[11px] uppercase font-black text-gray-400 tracking-[0.1em]">Producto</th>
                  <th className="px-8 py-5 text-[11px] uppercase font-black text-gray-400 tracking-[0.1em]">Fecha de Creación</th>
                  <th className="px-8 py-5 text-center text-[11px] uppercase font-black text-gray-400 tracking-[0.1em]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOPs.map((op, idx) => (
                  <motion.tr 
                    key={op.id} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-blue-50/30 transition-all group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 font-bold group-hover:scale-105 transition-transform">
                          <Hash className="w-5 h-5" />
                        </div>
                        <span className="font-mono text-base font-black text-gray-900">{op.opNumber}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="font-bold text-gray-800">{op.product?.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-gray-500 font-medium text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(op.createdAt).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleOpenDetail(op)} 
                          className="p-2.5 rounded-xl hover:bg-blue-50 text-blue-500 transition shadow-sm hover:shadow-blue-200/50 flex items-center gap-1.5 font-bold text-xs" 
                          title="Ver Variantes"
                        >
                          <Eye className="w-4 h-4" /> Ver SKUs
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== REGISTRAR OP MODAL ===== */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
              onClick={() => setShowFormModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden max-h-[90vh] flex flex-col border border-white"
            >
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">Registrar OP</h2>
                  <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-widest">
                    Vincular Producto y Autogenerar SKUs
                  </p>
                </div>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition shadow-xl shadow-gray-200/30"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8">
                {/* OP Number */}
                <div>
                  <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">
                    Número de OP (12 dígitos o identificador)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Hash className="h-5 w-5 text-blue-500" />
                    </div>
                    <input
                      required
                      type="text"
                      className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-mono font-bold text-gray-900"
                      placeholder="Ej: 100245 (Los últimos dígitos de los SKUs)"
                      value={opNumber}
                      onChange={e => setOpNumber(e.target.value)}
                    />
                  </div>
                </div>

                {/* Cost and Selling Price for the OP */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">
                      Costo de Prod. (S/)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-gray-900"
                      placeholder="0.00"
                      value={opCost || ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setOpCost(isNaN(val) ? 0 : val);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">
                      Precio de Venta (S/)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-gray-900"
                      placeholder="0.00"
                      value={opPrice || ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setOpPrice(isNaN(val) ? 0 : val);
                      }}
                    />
                  </div>
                </div>

                {/* Product Autocomplete Search */}
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">
                    Buscar Producto
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-14 pr-12 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-gray-900"
                      placeholder="Escribe el nombre del producto..."
                      value={productSearch}
                      onChange={e => handleProductSearchChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    {isSearchingProduct && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Autocomplete Dropdown List */}
                  {showDropdown && productsFound.length > 0 && (
                    <div className="absolute z-[110] w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto">
                      {productsFound.map((p, idx) => (
                        <div
                          key={p.id}
                          onClick={() => handleProductSelect(p)}
                          className={`px-5 py-4 cursor-pointer transition-colors flex items-center justify-between ${
                            idx === activeSearchIndex ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-gray-50 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Package className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-bold">{p.name}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-black">{p.category} · Ref: {p.sku}</p>
                            </div>
                          </div>
                          <span className="text-xs text-blue-500 font-bold">Seleccionar</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Product Variants Mapping UI */}
                {selectedProduct && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center"><Ruler className="w-5 h-5" /></div>
                      <div>
                        <h4 className="font-bold text-gray-900">{selectedProduct.name}</h4>
                        <p className="text-xs text-gray-500 font-medium">Asigna qué colores se producen por cada talla para esta OP</p>
                      </div>
                    </div>

                    {selectedProduct.sizes && selectedProduct.sizes.length > 0 ? (
                      <div className="space-y-4 divide-y divide-gray-100">
                        {selectedProduct.sizes.map((size: string) => {
                          const sizeColors = selectedVariants[size] || [];
                          const allProductColors = selectedProduct.colors || [];

                          return (
                            <div key={size} className="pt-4 first:pt-0 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-gray-700 bg-gray-100 px-3 py-1 rounded-xl">Talla {size}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAllColorsForSize(size)}
                                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                                >
                                  {sizeColors.length === allProductColors.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {allProductColors.map((color: string) => {
                                  const isChecked = sizeColors.includes(color);
                                  return (
                                    <button
                                      key={color}
                                      type="button"
                                      onClick={() => handleToggleColorForSize(size, color)}
                                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                        isChecked
                                          ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                      }`}
                                    >
                                      {color}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 font-bold">Este producto no tiene tallas ni colores registrados.</p>
                        <p className="text-xs text-gray-400 mt-1">Edita el producto primero para definir las tallas y colores disponibles.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Form Buttons */}
                <div className="pt-10 flex items-center justify-end gap-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-8 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition tracking-widest uppercase text-xs"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition shadow-2xl shadow-blue-500/40 tracking-widest uppercase text-xs active:scale-95 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
                      </>
                    ) : (
                      'Registrar OP'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== DETALLE DE SKUs / OP MODAL ===== */}
      <AnimatePresence>
        {showDetailModal && selectedOp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
              onClick={() => setShowDetailModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden max-h-[90vh] flex flex-col border border-white"
            >
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">OP: {selectedOp.opNumber}</h2>
                  <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-widest">
                    SKUs de Variantes Generados
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition shadow-xl shadow-gray-200/30"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-6">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Producto</span>
                  <h3 className="text-xl font-bold text-gray-900">{selectedOp.product?.name}</h3>
                  <p className="text-xs text-gray-500 font-medium">Categoría: {selectedOp.product?.category}</p>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Detalle de Variantes</h4>
                  
                  {selectedOp.product?.variants && selectedOp.product.variants.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOp.product.variants.map((v: any) => (
                        <div 
                          key={v.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-blue-50/20 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm min-w-[70px]">
                              <span className="text-[9px] font-black text-gray-400 uppercase">Talla</span>
                              <span className="text-base font-black text-gray-800">{v.size}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-gray-400 uppercase">Color</span>
                              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                                <Palette className="w-4 h-4 text-violet-500" /> {v.color}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Código SKU generado</span>
                            <p className="font-mono text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100 mt-1">
                              {v.variantSku}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-medium">Esta OP no tiene variantes asociadas.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-8 py-3.5 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition text-xs uppercase tracking-widest active:scale-95"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
