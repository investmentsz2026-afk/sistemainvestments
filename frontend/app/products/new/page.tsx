// frontend/app/products/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '../../../hooks/useProducts';
import { Layout } from '../../../components/common/Layout';
import { ProductForm } from '../../../components/products/ProductForm';
import { ArrowLeft, Package, Sparkles, ShoppingCart, Search, X, Calendar, User, Tag, Clock, Plus } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../lib/axios';

export default function NewProductPage() {
  const router = useRouter();
  const { createProduct, isCreating } = useProducts();
  const [error, setError] = useState<string | null>(null);

  // Import from Purchases logic
  const [showImportModal, setShowImportModal] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [initialData, setInitialData] = useState<any>(null);
  const [formKey, setFormKey] = useState(0);

  const fetchPurchases = async () => {
    try {
      setLoadingPurchases(true);
      const resp = await api.get('/purchases');
      setPurchases(resp.data.data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoadingPurchases(false);
    }
  };

  useEffect(() => {
    if (showImportModal) {
      fetchPurchases();
    }
  }, [showImportModal]);

  const handleImportItem = (purchase: any, item: any) => {
    // Map purchase item category to inventory type if possible
    let invType = 'TERMINADOS';
    if (item.category === 'Materiales') invType = 'MATERIALES';
    else if (item.category === 'Maquinaria') invType = 'MAQUINARIA';
    else if (item.category === 'Servicio') invType = 'OTROS';

    const importedData = {
      name: item.name,
      category: item.category,
      inventoryType: invType,
      description: item.description || `Importado de Factura: ${purchase.invoiceNumber || 'Sin Nro.'}`,
      purchasePrice: item.price,
      sellingPrice: item.price * 1.3, // Suggested 30% margin
      minStock: 5,
      variants: [{ size: 'ESTÁNDAR', color: 'ÚNICO', initialStock: item.quantity }]
    };

    setInitialData(importedData);
    setFormKey(prev => prev + 1); // Force re-mount of ProductForm to apply new initialData
    setShowImportModal(false);
  };

  const handleSubmit = async (data: any) => {
    try {
      setError(null);
      await createProduct(data);
      router.push('/products');
    } catch (err: any) {
      setError(err.message || 'Error al crear el producto');
    }
  };

  const filteredPurchases = purchases.filter(p =>
    (p.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.items.some((item: any) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <Link href="/" className="hover:text-blue-600 transition">Dashboard</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-blue-600 transition">Productos</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Nuevo</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Link
              href="/products"
              className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Nuevo Producto</h1>
                  <p className="text-sm text-gray-500">Completa los campos para agregar un producto al inventario</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-100 transition shadow-sm active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              Importar de Compras
            </button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-medium text-indigo-600">Nuevo registro</span>
            </div>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl flex items-center gap-3 shadow-sm"
        >
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-sm font-bold">!</span>
          </div>
          <p className="text-sm font-medium">{error}</p>
        </motion.div>
      )}

      <motion.div
        key={formKey}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ProductForm
          onSubmit={handleSubmit}
          initialData={initialData}
          isLoading={isCreating}
        />
      </motion.div>

      {/* MODAL IMPORTAR DE COMPRAS */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

              <div className="p-6 border-b border-gray-100 bg-amber-50/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
                    <ShoppingCart className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Importar Ítem de Compra</h2>
                    <p className="text-xs text-amber-600 font-medium">Selecciona un producto registrado en tus facturas recientes</p>
                  </div>
                </div>
                <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-white rounded-full transition shadow-sm border border-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por factura o nombre de producto..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 outline-none transition"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingPurchases ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium">Cargando compras...</p>
                  </div>
                ) : filteredPurchases.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center">
                    <ShoppingCart className="w-16 h-16 text-gray-200 mb-4" />
                    <p className="text-gray-500 font-bold">No se encontraron registros</p>
                    <p className="text-gray-400 text-sm">Prueba con otro término de búsqueda</p>
                  </div>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <div key={purchase.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4">
                          <span className="font-black text-gray-400 uppercase tracking-widest">Factura: <span className="text-gray-900">{purchase.invoiceNumber || 'Sin Nro.'}</span></span>
                          <span className="flex items-center gap-1.5 text-gray-500"><Calendar className="w-3.5 h-3.5" /> {new Date(purchase.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1.5 text-gray-500"><User className="w-3.5 h-3.5" /> {purchase.user?.name}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-bold ${purchase.type === 'SERVICE' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {purchase.type === 'SERVICE' ? 'Servicio' : 'Compra'}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {purchase.items.map((item: any, idx: number) => (
                          <div key={idx} className="p-4 flex items-center justify-between hover:bg-amber-50/20 transition group">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-gray-900">{item.name}</h4>
                                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded font-black uppercase">{item.category}</span>
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-1">{item.description || 'Sin descripción'}</p>
                              <div className="flex items-center gap-4 mt-2 text-[11px] font-bold">
                                <span className="text-emerald-600">Cant: {item.quantity} {item.unit}</span>
                                <span className="text-gray-400 text-lg leading-none self-center">•</span>
                                <span className="text-blue-600">Precio: ${item.price.toFixed(2)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleImportItem(purchase, item)}
                              className="px-4 py-2 bg-white border border-amber-200 text-amber-600 rounded-xl text-xs font-black shadow-sm group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 transition-all flex items-center gap-2 translate-x-2 group-hover:translate-x-0"
                            >
                              <Plus className="w-3.5 h-3.5" /> Seleccionar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Se cargarán los datos automáticamente en el formulario</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}