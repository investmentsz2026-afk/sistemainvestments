// frontend/app/products/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '../../../hooks/useProducts';
import { Layout } from '../../../components/common/Layout';
import { ProductForm } from '../../../components/products/ProductForm';
import { ArrowLeft, Package, Sparkles, ShoppingCart, Search, X, Calendar, User, Tag, Clock, Plus, ClipboardCheck, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../lib/axios';
import toast from 'react-hot-toast';
import { useQueryClient } from 'react-query';

export default function NewProductPage() {
  const router = useRouter();
  const { createProduct, isCreating } = useProducts();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Import from Purchases logic
  const [showImportModal, setShowImportModal] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [initialData, setInitialData] = useState<any>(null);
  const [formKey, setFormKey] = useState(0);

  // Import from Audit logic
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showAuditDetailModal, setShowAuditDetailModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [showFinalConfirmModal, setShowFinalConfirmModal] = useState(false);
  const [importedCategories, setImportedCategories] = useState<Record<string, string[]>>({});
  const [finalizedAudits, setFinalizedAudits] = useState<any[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [savedAuditItems, setSavedAuditItems] = useState<string[]>([]); // auditId-type-size
  const [selectedImportSizes, setSelectedImportSizes] = useState<Record<string, boolean>>({});

  // Whenever selectedAudit is set, initialize checked sizes
  useEffect(() => {
    if (selectedAudit) {
      const initialChecked: Record<string, boolean> = {};
      const auditSizes = Array.isArray(selectedAudit.productionSizeData) ? selectedAudit.productionSizeData : [];
      const qualitySizeData = Array.isArray(selectedAudit.qualitySizeData) ? selectedAudit.qualitySizeData : [];

      auditSizes.forEach((sz: any) => {
        // 1RA
        let qGood = sz.quantity;
        const bsz = qualitySizeData.find((b: any) => b.size === sz.size);
        if (bsz) qGood = bsz.qGood;
        const isSaved1RA = savedAuditItems.includes(`${selectedAudit.id}-1RA-${sz.size}`);
        if (qGood > 0 && !isSaved1RA) {
          initialChecked[`1RA-${sz.size}`] = true;
        }

        // 2DA
        let qSecond = 0;
        if (bsz) qSecond = bsz.qSecond;
        const isSaved2DA = savedAuditItems.includes(`${selectedAudit.id}-2DA-${sz.size}`);
        if (qSecond > 0 && !isSaved2DA) {
          initialChecked[`2DA-${sz.size}`] = true;
        }

        // PROCESO
        let qProcess = 0;
        if (bsz) qProcess = bsz.qProcess;
        const isSavedProceso = savedAuditItems.includes(`${selectedAudit.id}-PROCESO-${sz.size}`);
        if (qProcess > 0 && !isSavedProceso) {
          initialChecked[`PROCESO-${sz.size}`] = true;
        }
      });

      setSelectedImportSizes(initialChecked);
    } else {
      setSelectedImportSizes({});
    }
  }, [selectedAudit, savedAuditItems]);

  const fetchPurchases = async () => {    try {
      setLoadingPurchases(true);
      const resp = await api.get('/purchases');
      setPurchases(resp.data.data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const fetchFinalizedAudits = async () => {
    try {
      setLoadingAudits(true);
      const resp = await api.get('/process-audits/finalized-audits');
      setFinalizedAudits(resp.data || []);
    } catch (error) {
      console.error('Error fetching finalized audits:', error);
    } finally {
      setLoadingAudits(false);
    }
  };

  useEffect(() => {
    if (showImportModal) fetchPurchases();
  }, [showImportModal]);

  // Load savedAuditItems on mount
  useEffect(() => {
    const saved = localStorage.getItem('saved_audit_items');
    if (saved) setSavedAuditItems(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (showAuditModal) fetchFinalizedAudits();
  }, [showAuditModal]);

  // Sync savedAuditItems to localStorage
  useEffect(() => {
    localStorage.setItem('saved_audit_items', JSON.stringify(savedAuditItems));
  }, [savedAuditItems]);

  const handleImportItem = (purchase: any, item: any) => {
    let invType = 'TERMINADOS';
    if (item.category === 'Materiales') invType = 'MATERIALES';
    else if (item.category === 'Maquinaria') invType = 'MAQUINARIA';
    else if (item.category === 'Avios') invType = 'AVIOS';
    else if (item.category === 'Servicio') invType = 'OTROS';

    const importedData = {
      name: item.name,
      category: item.category,
      inventoryType: invType,
      description: item.description || `Importado de Factura: ${purchase.invoiceNumber || 'Sin Nro.'}`,
      purchasePrice: item.price,
      sellingPrice: item.price * 1.3,
      minStock: 5,
      variants: [{ size: 'ESTÁNDAR', color: 'ÚNICO', initialStock: item.quantity }],
      purchaseItemId: item.id
    };

    setInitialData(importedData);
    setFormKey(prev => prev + 1);
    setShowImportModal(false);
  };

  const handleImportAudit = (audit: any, type: '1RA' | '2DA' | 'PROCESO', selectedSizes: string[]) => {
    const variants: any[] = [];
    const importedItems: Array<{ size: string; quantity: number }> = [];
    let nameSuffix = '';
    let invType = 'TERMINADOS';

    if (type === '1RA') {
      nameSuffix = '';
      invType = 'TERMINADOS';
    } else if (type === '2DA') {
      nameSuffix = ' - 2DA CALIDAD';
      invType = 'SEGUNDA';
    } else if (type === 'PROCESO') {
      nameSuffix = ' - EN PROCESO';
      invType = 'PROCESO';
    }

    selectedSizes.forEach(size => {
      let qty = 0;
      if (Array.isArray(audit.qualitySizeData)) {
        const sz = audit.qualitySizeData.find((s: any) => s.size === size);
        if (sz) {
          if (type === '1RA') qty = sz.qGood || 0;
          else if (type === '2DA') qty = sz.qSecond || 0;
          else if (type === 'PROCESO') qty = sz.qProcess || 0;
        }
      } else {
        const sz = (audit.productionSizeData || []).find((s: any) => s.size === size);
        if (sz) qty = sz.quantity || 0;
      }
      
      importedItems.push({ size, quantity: qty });
      
      const defaultColor = type === '1RA' ? (audit.productionColor || '1RA CALIDAD') : type === '2DA' ? '2DA CALIDAD' : 'EN PROCESO';
      variants.push({
        size,
        color: defaultColor,
        initialStock: qty
      });
    });

    if (variants.length === 0) {
      toast.error('No se encontraron cantidades para esta selección');
      return;
    }

    // Set prices based on first selected size
    const firstSize = selectedSizes[0];
    let pPrice = 0.1;
    let sPrice = 0.1;

    if (firstSize) {
      const auditSizes = Array.isArray(audit.productionSizeData) ? audit.productionSizeData : [];
      if (audit.udpRequirements?.sizes) {
        const sizeReq = audit.udpRequirements.sizes.find((s: any) => s.size === firstSize);
        if (sizeReq) {
          pPrice = sizeReq.items.reduce((acc: number, item: any) => acc + ((item.price || 0) * (item.consumption || 0)), 0);
        }
      }

      const sizeSaleData = auditSizes.find((s: any) => s.size === firstSize);
      if (sizeSaleData) {
        sPrice = type === '1RA' ? (sizeSaleData.salePrice || 0) : (sizeSaleData.secondSalePrice || 0);
      }
    }

    const importedData = {
      name: (audit.sampleName || 'Producto') + nameSuffix,
      category: 'Prendas',
      inventoryType: invType,
      sku: (() => {
        const cleanOp = audit.op.replace(/\D/g, '');
        const opLen = cleanOp.length;
        const neededRandom = Math.max(0, 12 - opLen);
        let randomPart = '';
        for (let i = 0; i < neededRandom; i++) {
          randomPart += Math.floor(Math.random() * 10).toString();
        }
        return (randomPart + cleanOp).slice(-12);
      })(),
      op: audit.op,
      description: `Importado de OP: ${audit.op}. Calidad: ${type}. Tallas: ${selectedSizes.join(', ')}.`,
      purchasePrice: pPrice || 0.1,
      sellingPrice: sPrice || (type === '1RA' ? pPrice * 1.5 : 0),
      minStock: 5,
      sizes: selectedSizes,
      colors: [type === '1RA' ? (audit.productionColor || 'Negro') : type === '2DA' ? '2da Calidad' : 'En Proceso'],
      importedItems,
      importedQuality: type
    };

    setInitialData(importedData);
    setFormKey(prev => prev + 1);
    setShowAuditDetailModal(false);
    
    // Track categories for this OP
    setImportedCategories(prev => ({
      ...prev,
      [audit.id]: [...(prev[audit.id] || []), type]
    }));

    toast.success(`Datos de ${type} cargados en el formulario`);
  };

  const handleFinalizeAudit = async (auditId: string) => {
    setShowFinalConfirmModal(true);
  };

  const confirmFinalizeAudit = async () => {
    if (!selectedAudit) return;
    try {
      await api.patch(`/process-audits/${selectedAudit.id}/logistics-receive`);
      toast.success('Auditoría finalizada y cerrada con éxito.');
      
      // Clear persistence for this audit
      const newSaved = savedAuditItems.filter(item => !item.startsWith(`${selectedAudit.id}-`));
      setSavedAuditItems(newSaved);
      localStorage.setItem('saved_audit_items', JSON.stringify(newSaved));

      setShowFinalConfirmModal(false);
      setShowAuditDetailModal(false);
      setSelectedAudit(null);
      fetchFinalizedAudits();
    } catch (error) {
      console.error('Error finalizing audit:', error);
      toast.error('Error al finalizar la auditoría');
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      setError(null);
      
      const { opVariants, importedStockQuantities, ...cleanData } = data;
      let createdProduct: any = null;

      if (data.op && data.opVariants) {
        // Build variants array based on the OP configuration
        const finalVariants: any[] = [];
        Object.entries(data.opVariants).forEach(([size, colors]: [string, any]) => {
          colors.forEach((color: string) => {
            const initialStock = data.importedStockQuantities?.[size]?.[color] || 0;
            finalVariants.push({
              size,
              color,
              initialStock
            });
          });
        });

        const productPayload = {
          ...cleanData,
          variants: finalVariants
        };

        // Post product creation directly
        const resp = await api.post('/products', productPayload);
        createdProduct = resp.data;
        queryClient.invalidateQueries('products');
        toast.success('Producto e inventario base registrados correctamente');
      } else {
        // Normal creation flow
        const resp = await api.post('/products', cleanData);
        createdProduct = resp.data;
        queryClient.invalidateQueries('products');
        toast.success('Producto creado exitosamente');
      }

      // If we have OP variants and created the product, register the OP
      if (data.op && data.opVariants && createdProduct) {
        const variantsPayload = Object.entries(data.opVariants)
          .map(([size, colors]: [string, any]) => ({ size, colors }))
          .filter(v => v.colors.length > 0);

        try {
          await api.post('/production-orders', {
            opNumber: data.op.trim(),
            productId: createdProduct.id,
            variants: variantsPayload
          });
          toast.success('Orden de Producción vinculada y SKUs generados exitosamente');
          queryClient.invalidateQueries('products');
        } catch (opErr: any) {
          console.error('Error creating OP after product:', opErr);
          toast.error('Producto creado, pero hubo un error al registrar la OP');
        }
      }

      if (selectedAudit) {
        const type = initialData?.importedQuality || (data.inventoryType === 'TERMINADOS' ? '1RA' : data.inventoryType === 'SEGUNDA' ? '2DA' : 'PROCESO');
        const importedSizes = initialData?.importedItems?.map((item: any) => item.size) || [];
        setSavedAuditItems(prev => {
          const nextSaved = [...prev];
          importedSizes.forEach((size: string) => {
            const itemKey = `${selectedAudit.id}-${type}-${size}`;
            if (!nextSaved.includes(itemKey)) {
              nextSaved.push(itemKey);
            }
          });
          return nextSaved;
        });

        // If we are importing from an audit, return to the modal and reset form for next category
        setInitialData(null);
        setFormKey(prev => prev + 1);
        setShowAuditDetailModal(true);
      } else {
        router.push('/products');
      }
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      setError(err.response?.data?.message || err.message || 'Error al crear el producto');
      toast.error('Error al guardar el producto');
    }
  };

  const filteredPurchases = purchases
    .map(p => ({
      ...p,
      items: p.items.filter((item: any) => !item.productId && item.status === 'RECIBIDO')
    }))
    .filter(p => p.items.length > 0)
    .filter(p =>
      (p.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.items.some((item: any) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const filteredAudits = finalizedAudits.filter(a =>
    a.sampleName.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
    a.op.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
    a.process.toLowerCase().includes(auditSearchTerm.toLowerCase())
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
              onClick={() => setShowAuditModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold hover:bg-emerald-100 transition shadow-sm active:scale-95"
            >
              <ClipboardCheck className="w-4 h-4" />
              Importar de OP
            </button>
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
                                <span className="text-blue-600">Precio: S/ {item.price.toFixed(2)}</span>
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

      {/* MODAL IMPORTAR DE AUDITORÍA (MUESTRAS FINALIZADAS) */}
      <AnimatePresence>
        {showAuditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAuditModal(false)} />

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto max-h-[90vh]">

              {/* HEADER */}
              <div className="p-6 border-b border-gray-100 bg-emerald-50/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 shadow-sm">
                    <ClipboardCheck className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Importar de Orden de Producción (OP)</h2>
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest opacity-70">Lotes auditados listos para inventario</p>
                  </div>
                </div>
                <button onClick={() => setShowAuditModal(false)} className="p-2 hover:bg-white rounded-full transition shadow-sm border border-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              {/* SEARCH */}
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, OP o proceso..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    value={auditSearchTerm}
                    onChange={e => setAuditSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* CONTENT */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingAudits ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium">Cargando auditorías finalizadas...</p>
                  </div>
                ) : filteredAudits.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center">
                    <ClipboardCheck className="w-16 h-16 text-gray-200 mb-4" />
                    <p className="text-gray-500 font-bold">No hay auditorías finalizadas</p>
                    <p className="text-gray-400 text-sm">Las muestras aparecerán aquí cuando UDP finalice la auditoría</p>
                  </div>
                ) : (
                  filteredAudits.map((audit) => (
                    <div key={audit.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group">
                      {/* AUDIT HEADER */}
                      <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4">
                          <span className="font-black text-indigo-600 uppercase tracking-widest font-mono">OP: {audit.op}</span>
                          <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 capitalize">{audit.process}</span>
                          <span className="flex items-center gap-1.5 text-gray-500"><Calendar className="w-3.5 h-3.5" /> {new Date(audit.auditDate).toLocaleDateString('es-PE')}</span>
                          <span className="flex items-center gap-1.5 text-gray-500"><User className="w-3.5 h-3.5" /> {audit.inspector}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          audit.result === 'CONFORME' ? 'bg-emerald-100 text-emerald-700' : 
                          audit.result === 'OBSERVACION' ? 'bg-amber-100 text-amber-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {audit.result === 'CONFORME' ? '✅ Conforme' : audit.result === 'OBSERVACION' ? '⚠️ Observación' : audit.result}
                        </span>
                      </div>
                      
                      {/* AUDIT BODY */}
                      <div className="p-5 flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-black text-gray-900 text-lg">{audit.sampleName}</h4>
                          {audit.externalCompany && (
                            <p className="text-xs text-gray-500 mt-0.5">Empresa: <span className="font-bold text-gray-700">{audit.externalCompany}</span></p>
                          )}
                          
                          {/* QUANTITIES BREAKDOWN */}
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <div>
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">1ra Calidad</p>
                                <p className="text-lg font-black text-emerald-700 leading-tight">{audit.quantityGood}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                              <Clock className="w-4 h-4 text-amber-500" />
                              <div>
                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">En Proceso</p>
                                <p className="text-lg font-black text-amber-700 leading-tight">{audit.quantityProcess}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <div>
                                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">2da Calidad</p>
                                <p className="text-lg font-black text-red-700 leading-tight">{audit.quantitySecond}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 rounded-xl">
                              <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                                <p className="text-lg font-black text-white leading-tight">{audit.totalQuantity}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => { setSelectedAudit(audit); setShowAuditDetailModal(true); setShowAuditModal(false); }}
                          className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-black transition-all flex items-center gap-2 ml-4"
                        >
                          <Eye className="w-4 h-4" /> Ver Detalles
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* FOOTER */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Se cargarán los datos de la muestra y cantidades en el formulario</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuditDetailModal && selectedAudit && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAuditDetailModal(false)} />

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto max-h-[95vh]">
              
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <ClipboardCheck className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase">Detalle de OP: {selectedAudit.op}</h2>
                    <p className="text-sm text-gray-500 font-medium">{selectedAudit.sampleName} • {selectedAudit.process}</p>
                  </div>
                </div>
                <button onClick={() => setShowAuditDetailModal(false)} className="p-3 hover:bg-white rounded-2xl transition shadow-sm border border-gray-100"><X className="w-6 h-6 text-gray-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 text-center scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {/* QUANTITY CARDS */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex flex-col items-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">1ra Calidad</span>
                    <span className="text-3xl font-black text-emerald-900">{selectedAudit.quantityGood}</span>
                  </div>
                  <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex flex-col items-center">
                    <Clock className="w-8 h-8 text-amber-500 mb-2" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">En Proceso</span>
                    <span className="text-3xl font-black text-amber-900">{selectedAudit.quantityProcess}</span>
                  </div>
                  <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex flex-col items-center">
                    <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">2da Calidad</span>
                    <span className="text-3xl font-black text-rose-900">{selectedAudit.quantitySecond}</span>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="space-y-4">
                  {selectedAudit.quantityGood > 0 && (
                    <div className="bg-white border-2 border-emerald-500 rounded-3xl overflow-hidden shadow-sm">
                      <div className="p-6 bg-emerald-50/30 flex items-center justify-between border-b border-emerald-100">
                        <div className="flex items-center gap-4 text-left">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-emerald-500 shadow-lg shadow-emerald-200"><Package className="w-5 h-5" /></div>
                          <div>
                            <h4 className="font-black text-gray-900 text-sm">Subir Productos Terminados (1ra)</h4>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Selecciona las tallas a importar juntas</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Array.isArray(selectedAudit.productionSizeData) ? selectedAudit.productionSizeData : []).map((sz: any) => {
                        const isSaved = savedAuditItems.includes(`${selectedAudit.id}-1RA-${sz.size}`);
                        let exactQty = sz.quantity;
                        if (Array.isArray(selectedAudit.qualitySizeData)) {
                          const bsz = selectedAudit.qualitySizeData.find((b: any) => b.size === sz.size);
                          if (bsz) exactQty = bsz.qGood;
                        }

                        if (exactQty <= 0) return null; // No hay de esta talla

                        const isChecked = !isSaved && !!selectedImportSizes[`1RA-${sz.size}`];

                        return (
                          <div
                            key={sz.size}
                            onClick={() => {
                              if (isSaved) return;
                              setSelectedImportSizes(prev => ({
                                ...prev,
                                [`1RA-${sz.size}`]: !prev[`1RA-${sz.size}`]
                              }));
                            }}
                            className={`flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer select-none relative ${
                              isSaved ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed' :
                              isChecked ? 'bg-emerald-50/50 border-emerald-500 shadow-sm' : 'bg-white border-gray-100 hover:border-emerald-300'
                            }`}
                          >
                            {!isSaved && (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="absolute top-2 right-2 rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 pointer-events-none"
                              />
                            )}
                            <span className="text-[10px] font-black text-gray-400 uppercase">Talla {sz.size}</span>
                            <span className="text-sm font-black text-gray-900 uppercase">{exactQty} uds.</span>
                            <span className="text-[9px] font-bold text-emerald-600 mt-1">{isSaved ? 'AGREGADO' : `S/ ${sz.salePrice || '?' }`}</span>
                          </div>
                        );
                      })}
                      </div>

                      {(() => {
                        const activeSizes = (Array.isArray(selectedAudit.productionSizeData) ? selectedAudit.productionSizeData : [])
                          .filter((sz: any) => {
                            let exactQty = sz.quantity;
                            if (Array.isArray(selectedAudit.qualitySizeData)) {
                              const bsz = selectedAudit.qualitySizeData.find((b: any) => b.size === sz.size);
                              if (bsz) exactQty = bsz.qGood;
                            }
                            const isSaved = savedAuditItems.includes(`${selectedAudit.id}-1RA-${sz.size}`);
                            return exactQty > 0 && !isSaved && !!selectedImportSizes[`1RA-${sz.size}`];
                          });
                        
                        if (activeSizes.length === 0) return null;

                        const totalUnits = activeSizes.reduce((sum: number, sz: any) => {
                          let exactQty = sz.quantity;
                          if (Array.isArray(selectedAudit.qualitySizeData)) {
                            const bsz = selectedAudit.qualitySizeData.find((b: any) => b.size === sz.size);
                            if (bsz) exactQty = bsz.qGood;
                          }
                          return sum + exactQty;
                        }, 0);

                        return (
                          <div className="p-4 bg-emerald-50/20 border-t border-emerald-100 flex justify-end">
                            <button
                              onClick={() => handleImportAudit(selectedAudit, '1RA', activeSizes.map(s => s.size))}
                              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition active:scale-95"
                            >
                              <Plus className="w-4 h-4" /> Importar {activeSizes.length} Tallas ({totalUnits} uds.)
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {selectedAudit.quantitySecond > 0 && (
                    <div className="bg-white border-2 border-rose-500 rounded-3xl overflow-hidden shadow-sm">
                      <div className="p-6 bg-rose-50/30 flex items-center justify-between border-b border-rose-100">
                        <div className="flex items-center gap-4 text-left">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-rose-500 shadow-lg shadow-rose-200"><AlertCircle className="w-5 h-5" /></div>
                          <div>
                            <h4 className="font-black text-gray-900 text-sm">Subir Productos de Segunda</h4>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Selecciona las tallas a importar juntas</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Array.isArray(selectedAudit.productionSizeData) ? selectedAudit.productionSizeData : []).map((sz: any) => {
                        const isSaved = savedAuditItems.includes(`${selectedAudit.id}-2DA-${sz.size}`);
                        let exactQty = 0;
                        if (Array.isArray(selectedAudit.qualitySizeData)) {
                          const bsz = selectedAudit.qualitySizeData.find((b: any) => b.size === sz.size);
                          if (bsz) exactQty = bsz.qSecond;
                        }

                        if (exactQty <= 0) return null;

                        const isChecked = !isSaved && !!selectedImportSizes[`2DA-${sz.size}`];

                        return (
                          <div
                            key={sz.size}
                            onClick={() => {
                              if (isSaved) return;
                              setSelectedImportSizes(prev => ({
                                ...prev,
                                [`2DA-${sz.size}`]: !prev[`2DA-${sz.size}`]
                              }));
                            }}
                            className={`flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer select-none relative ${
                              isSaved ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed' :
                              isChecked ? 'bg-rose-50/50 border-rose-500 shadow-sm' : 'bg-white border-gray-100 hover:border-rose-300'
                            }`}
                          >
                            {!isSaved && (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="absolute top-2 right-2 rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 pointer-events-none"
                              />
                            )}
                            <span className="text-[10px] font-black text-gray-400 uppercase">Talla {sz.size}</span>
                            <span className="text-sm font-black text-gray-900 uppercase">{exactQty} uds.</span>
                            <span className="text-[9px] font-bold text-rose-600 mt-1">{isSaved ? 'AGREGADO' : `S/ ${sz.secondSalePrice || '?' }`}</span>
                          </div>
                        );
                      })}
                      </div>

                      {(() => {
                        const activeSizes = (Array.isArray(selectedAudit.productionSizeData) ? selectedAudit.productionSizeData : [])
                          .filter((sz: any) => {
                            let exactQty = 0;
                            if (Array.isArray(selectedAudit.qualitySizeData)) {
                              const bsz = selectedAudit.qualitySizeData.find((b: any) => b.size === sz.size);
                              if (bsz) exactQty = bsz.qSecond;
                            }
                            const isSaved = savedAuditItems.includes(`${selectedAudit.id}-2DA-${sz.size}`);
                            return exactQty > 0 && !isSaved && !!selectedImportSizes[`2DA-${sz.size}`];
                          });
                        
                        if (activeSizes.length === 0) return null;

                        const totalUnits = activeSizes.reduce((sum: number, sz: any) => {
                          let exactQty = 0;
                          if (Array.isArray(selectedAudit.qualitySizeData)) {
                            const bsz = selectedAudit.qualitySizeData.find((b: any) => b.size === sz.size);
                            if (bsz) exactQty = bsz.qSecond;
                          }
                          return sum + exactQty;
                        }, 0);

                        return (
                          <div className="p-4 bg-rose-50/20 border-t border-rose-100 flex justify-end">
                            <button
                              onClick={() => handleImportAudit(selectedAudit, '2DA', activeSizes.map(s => s.size))}
                              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition active:scale-95"
                            >
                              <Plus className="w-4 h-4" /> Importar {activeSizes.length} Tallas ({totalUnits} uds.)
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {selectedAudit.quantityProcess > 0 && (
                    <div className="bg-white border-2 border-amber-500 rounded-3xl overflow-hidden shadow-sm">
                      <div className="p-6 bg-amber-50/30 flex items-center justify-between border-b border-amber-100">
                        <div className="flex items-center gap-4 text-left">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-amber-500 shadow-lg shadow-amber-200"><Clock className="w-5 h-5" /></div>
                          <div>
                            <h4 className="font-black text-gray-900 text-sm italic uppercase">Subir Productos en Proceso</h4>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Selecciona las tallas a importar juntas</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Array.isArray(selectedAudit.productionSizeData) ? selectedAudit.productionSizeData : []).map((sz: any) => {
                        const isSaved = savedAuditItems.includes(`${selectedAudit.id}-PROCESO-${sz.size}`);
                        let exactQty = 0;
                        if (Array.isArray(selectedAudit.qualitySizeData)) {
                          const bsz = selectedAudit.qualitySizeData.find((b: any) => b.size === sz.size);
                          if (bsz) exactQty = bsz.qProcess;
                        }

                        if (exactQty <= 0) return null;

                        const isChecked = !isSaved && !!selectedImportSizes[`PROCESO-${sz.size}`];

                        return (
                          <div
                            key={sz.size}
                            onClick={() => {
                              if (isSaved) return;
                              setSelectedImportSizes(prev => ({
                                ...prev,
                                [`PROCESO-${sz.size}`]: !prev[`PROCESO-${sz.size}`]
                              }));
                            }}
                            className={`flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer select-none relative ${
                              isSaved ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed' :
                              isChecked ? 'bg-amber-50/50 border-amber-500 shadow-sm' : 'bg-white border-gray-100 hover:border-amber-300'
                            }`}
                          >
                            {!isSaved && (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="absolute top-2 right-2 rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 pointer-events-none"
                              />
                            )}
                            <span className="text-[10px] font-black text-gray-400 uppercase font-mono italic">Talla {sz.size}</span>
                            <span className="text-sm font-black text-gray-900 uppercase italic">{exactQty} uds.</span>
                            <span className="text-[9px] font-bold text-amber-600 mt-1">{isSaved ? 'AGREGADO' : ''}</span>
                          </div>
                        );
                      })}
                      </div>

                      {(() => {
                        const activeSizes = (Array.isArray(selectedAudit.productionSizeData) ? selectedAudit.productionSizeData : [])
                          .filter((sz: any) => {
                            let exactQty = 0;
                            if (Array.isArray(selectedAudit.qualitySizeData)) {
                              const bsz = selectedAudit.qualitySizeData.find((b: any) => b.size === sz.size);
                              if (bsz) exactQty = bsz.qProcess;
                            }
                            const isSaved = savedAuditItems.includes(`${selectedAudit.id}-PROCESO-${sz.size}`);
                            return exactQty > 0 && !isSaved && !!selectedImportSizes[`PROCESO-${sz.size}`];
                          });
                        
                        if (activeSizes.length === 0) return null;

                        const totalUnits = activeSizes.reduce((sum: number, sz: any) => {
                          let exactQty = 0;
                          if (Array.isArray(selectedAudit.qualitySizeData)) {
                            const bsz = selectedAudit.qualitySizeData.find((b: any) => b.size === sz.size);
                            if (bsz) exactQty = bsz.qProcess;
                          }
                          return sum + exactQty;
                        }, 0);

                        return (
                          <div className="p-4 bg-amber-50/20 border-t border-amber-100 flex justify-end">
                            <button
                              onClick={() => handleImportAudit(selectedAudit, 'PROCESO', activeSizes.map(s => s.size))}
                              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition active:scale-95"
                            >
                              <Plus className="w-4 h-4" /> Importar {activeSizes.length} Tallas ({totalUnits} uds.)
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <button 
                    onClick={() => handleFinalizeAudit(selectedAudit.id)}
                    className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-lg uppercase tracking-tight flex items-center justify-center gap-3 shadow-2xl hover:bg-black transition active:scale-95"
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" /> Confirmar Inventariado Completo
                  </button>
                  <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">
                    Al confirmar, la OP se cerrará y aparecerá como "Completada" en UDP
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN FINAL MODERNA */}
      <AnimatePresence>
        {showFinalConfirmModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/80 backdrop-blur-md" onClick={() => setShowFinalConfirmModal(false)} />

            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center">
              
              <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-rose-600" />
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">¿Estás seguro?</h3>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                Vas a marcar la <span className="text-indigo-600 font-black">OP: {selectedAudit?.op}</span> como <span className="font-bold text-gray-900">COMPLETADA e INVENTARIADA</span>. 
                Esta acción cerrará el lote permanentemente en UDP.
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmFinalizeAudit}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition transform active:scale-95 shadow-xl"
                >
                  Sí, Confirmar y Cerrar
                </button>
                <button 
                  onClick={() => setShowFinalConfirmModal(false)}
                  className="w-full py-4 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-50 hover:text-gray-600 transition"
                >
                  No, Volver atrás
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}