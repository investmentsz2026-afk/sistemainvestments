// frontend/components/inventory/ProductExchangeModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  RefreshCw,
  Package,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Printer,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  User,
  Calendar,
  Check,
  RotateCcw
} from 'lucide-react';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import { printExchangeCargo, ExchangeCargoData } from '../../utils/exchangeCargo';

interface ScannedItem {
  id: string;
  variantSku: string;
  productName: string;
  size: string;
  color: string;
  stock: number;
  unit?: string;
  quantity: number;
  price: number;
}

interface ProductExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  outItems: ScannedItem[];
  onSuccess: () => void;
}

export default function ProductExchangeModal({
  isOpen,
  onClose,
  outItems,
  onSuccess,
}: ProductExchangeModalProps) {
  // Sales search state
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState<any[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  // Sale items details state
  const [saleDetails, setSaleDetails] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Return items selection: map of saleItemId -> quantity
  const [selectedReturns, setSelectedReturns] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('Cambio de producto solicitado por el cliente');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success result state
  const [completedExchange, setCompletedExchange] = useState<ExchangeCargoData | null>(null);

  const totalOutQty = outItems.reduce((acc, item) => acc + item.quantity, 0);

  // Fetch sales when search term changes or modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSales();
    } else {
      // Reset state on close
      setSelectedSale(null);
      setSaleDetails(null);
      setSelectedReturns({});
      setSearchTerm('');
      setCompletedExchange(null);
      setNotes('Cambio de producto solicitado por el cliente');
    }
  }, [isOpen]);

  const fetchSales = async (query = '') => {
    setIsLoadingSales(true);
    try {
      const resp = await api.get('/sales');
      setSales(resp.data || []);
    } catch (error) {
      console.error('Error fetching sales for exchange:', error);
      toast.error('Error al cargar la lista de ventas');
    } finally {
      setIsLoadingSales(false);
    }
  };

  const handleSelectSale = async (sale: any) => {
    setSelectedSale(sale);
    setSelectedReturns({});
    setIsLoadingDetails(true);
    try {
      const resp = await api.get(`/sales/${sale.id}`);
      setSaleDetails(resp.data);

      // Auto-suggest: if there is only 1 item in the sale, select it with totalOutQty
      if (resp.data?.items && resp.data.items.length === 1) {
        const item = resp.data.items[0];
        const defaultQty = Math.min(item.quantity, totalOutQty);
        setSelectedReturns({ [item.id]: defaultQty });
      }
    } catch (error) {
      console.error('Error fetching sale details:', error);
      toast.error('Error al obtener los productos de la factura');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleToggleItem = (itemId: string, maxQty: number) => {
    setSelectedReturns(prev => {
      const copy = { ...prev };
      if (copy[itemId] !== undefined) {
        delete copy[itemId];
      } else {
        copy[itemId] = Math.min(maxQty, totalOutQty || 1);
      }
      return copy;
    });
  };

  const handleQtyChange = (itemId: string, qty: number, maxQty: number) => {
    if (isNaN(qty) || qty <= 0) {
      setSelectedReturns(prev => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
      return;
    }
    const safeQty = Math.min(maxQty, qty);
    setSelectedReturns(prev => ({
      ...prev,
      [itemId]: safeQty
    }));
  };

  const totalInQty = Object.values(selectedReturns).reduce((acc, qty) => acc + qty, 0);

  const filteredSales = sales.filter(s => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const inv = s.invoiceNumber ? s.invoiceNumber.toLowerCase() : '';
    const client = s.client?.name ? s.client.name.toLowerCase() : '';
    const id = s.id ? s.id.toLowerCase() : '';
    return inv.includes(term) || client.includes(term) || id.includes(term);
  }).slice(0, 8);

  const handleConfirmExchange = async () => {
    if (!selectedSale || !saleDetails) {
      toast.error('Selecciona una factura de referencia');
      return;
    }

    if (totalInQty === 0) {
      toast.error('Selecciona al menos una prenda a devolver');
      return;
    }

    // Build inItems array
    const inItems: any[] = [];
    Object.entries(selectedReturns).forEach(([saleItemId, qty]) => {
      const saleItem = saleDetails.items?.find((i: any) => i.id === saleItemId);
      if (saleItem && qty > 0) {
        inItems.push({
          variantId: saleItem.variantId,
          quantity: qty,
          productName: saleItem.variant?.product?.name || 'Prenda',
          size: saleItem.variant?.size || '-',
          color: saleItem.variant?.color || '-',
          sku: saleItem.variant?.variantSku || saleItem.variant?.product?.sku || '-'
        });
      }
    });

    const payload = {
      saleId: selectedSale.id,
      invoiceNumber: selectedSale.invoiceNumber || 'S/N',
      clientName: selectedSale.client?.name || 'Cliente Varios',
      clientDocument: selectedSale.client?.documentNumber || '',
      outItems: outItems.map(i => ({
        variantId: i.id,
        quantity: i.quantity,
        productName: i.productName,
        size: i.size,
        color: i.color,
        sku: i.variantSku
      })),
      inItems,
      notes: notes.trim() || 'Cambio de producto solicitado por el cliente'
    };

    setIsSubmitting(true);
    try {
      const resp = await api.post('/inventory/exchange', payload);
      toast.success('¡Cambio de producto registrado correctamente!');

      const cargoData: ExchangeCargoData = {
        exchangeId: resp.data.exchangeId,
        invoiceNumber: payload.invoiceNumber,
        clientName: payload.clientName,
        clientDocument: payload.clientDocument,
        date: resp.data.date || new Date().toISOString(),
        notes: payload.notes,
        outItems: payload.outItems,
        inItems: payload.inItems
      };

      setCompletedExchange(cargoData);
      onSuccess();
    } catch (error: any) {
      console.error('Error processing exchange:', error);
      toast.error(error.response?.data?.message || 'Error al procesar el cambio de inventario');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isSubmitting) onClose();
          }}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100"
        >
          {/* HEADER */}
          <div className="bg-slate-950 text-white p-5 sm:p-6 relative flex justify-between items-start shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                    Logística & Inventarios
                  </span>
                  <span className="bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                    Canje de Prendas
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white mt-1">
                  Cambio de Producto por Factura
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">
                  Salida de nueva prenda y reingreso de la prenda devuelta al inventario
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (!isSubmitting) onClose();
              }}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50">
            {completedExchange ? (
              /* PANTALLA DE ÉXITO Y CARGO DE CAMBIO */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl mx-auto py-8 text-center space-y-6"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                </div>

                <div>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    Canje Registrado en Sistema
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mt-2">
                    ¡Cambio de Producto Exitoso!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Se registró la salida del nuevo producto y la entrada de la prenda devuelta en el Kardex.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-left shadow-sm space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">N° de Cargo de Canje:</span>
                    <span className="text-sm font-black font-mono text-indigo-600">{completedExchange.exchangeId}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Factura de Referencia:</span>
                    <span className="text-xs font-bold text-slate-800">{completedExchange.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Cliente:</span>
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[280px]">{completedExchange.clientName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                      <p className="text-[8px] font-black uppercase tracking-widest text-purple-700">Prenda Entrante</p>
                      <p className="text-xs font-bold text-purple-900 mt-0.5">
                        {completedExchange.inItems.reduce((acc, i) => acc + i.quantity, 0)} ud(s) ingresadas
                      </p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <p className="text-[8px] font-black uppercase tracking-widest text-emerald-700">Prenda Saliente</p>
                      <p className="text-xs font-bold text-emerald-900 mt-0.5">
                        {completedExchange.outItems.reduce((acc, i) => acc + i.quantity, 0)} ud(s) entregadas
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    onClick={() => printExchangeCargo(completedExchange)}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition active:scale-95"
                  >
                    <Printer className="w-4 h-4" /> Imprimir / Descargar Cargo (PDF)
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition"
                  >
                    Cerrar y Continuar
                  </button>
                </div>
              </motion.div>
            ) : (
              /* FORMULARIO DE CAMBIO */
              <>
                {/* 1. PRODUCTOS ESCANEADOS (SALIDA) */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        1. Prenda que se entrega al Cliente (Salida de Almacén)
                      </h3>
                    </div>
                    <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      {totalOutQty} {totalOutQty === 1 ? 'Unidad' : 'Unidades'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {outItems.map((item) => (
                      <div
                        key={item.variantSku}
                        className="bg-emerald-50/40 border border-emerald-200/60 p-3 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900">{item.productName}</p>
                          <p className="text-[10px] font-bold text-slate-500">
                            Talla: <span className="text-emerald-700 font-black">{item.size}</span> • Color:{' '}
                            <span className="text-emerald-700 font-black">{item.color}</span>
                          </p>
                          <p className="text-[8px] font-mono text-slate-400 mt-0.5">SKU: {item.variantSku}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-700 font-mono">
                            {item.quantity} {item.unit || 'ud(s)'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. BÚSQUEDA DE FACTURA */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        2. Factura de Compra del Cliente
                      </h3>
                    </div>
                    {selectedSale && (
                      <button
                        onClick={() => {
                          setSelectedSale(null);
                          setSaleDetails(null);
                          setSelectedReturns({});
                        }}
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 underline"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Elegir otra factura
                      </button>
                    )}
                  </div>

                  {!selectedSale ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar por número de factura (ej. F001-000042) o nombre del cliente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                        />
                      </div>

                      {isLoadingSales ? (
                        <div className="py-6 flex justify-center items-center gap-2 text-xs text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Cargando ventas...
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                          {filteredSales.length === 0 ? (
                            <p className="text-center py-6 text-xs text-slate-400 italic">
                              No se encontraron facturas con ese criterio.
                            </p>
                          ) : (
                            filteredSales.map((sale) => (
                              <div
                                key={sale.id}
                                onClick={() => handleSelectSale(sale)}
                                className="p-3 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition cursor-pointer flex items-center justify-between group"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-indigo-600 font-mono">
                                      {sale.invoiceNumber || 'SIN FACTURA'}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400">
                                      {new Date(sale.createdAt).toLocaleDateString('es-PE')}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-800">
                                    {sale.client?.name || 'Cliente Varios'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-black font-mono text-slate-700">
                                    S/ {sale.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                  <button className="px-3 py-1 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white rounded-lg text-[9px] font-black uppercase transition">
                                    Seleccionar
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* FACTURA SELECCIONADA BANNER */
                    <div className="bg-indigo-50/60 border border-indigo-200/80 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black font-mono text-indigo-700">
                            {selectedSale.invoiceNumber || 'SIN FACTURA'}
                          </span>
                          <span className="text-[9px] font-bold text-indigo-500">
                            • {new Date(selectedSale.createdAt).toLocaleDateString('es-PE')}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">
                          {selectedSale.client?.name || 'Cliente Varios'}
                          {selectedSale.client?.documentNumber && (
                            <span className="text-slate-400 font-normal ml-2">
                              ({selectedSale.client?.documentType || 'DOC'}: {selectedSale.client?.documentNumber})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Total Factura:</span>
                        <span className="text-xs font-black font-mono text-slate-900">
                          S/ {selectedSale.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. PRODUCTOS DE LA FACTURA (ENTRADA / DEVOLUCIÓN) */}
                {selectedSale && (
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4 text-purple-600" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          3. Selecciona la Prenda a Devolver (Entrada a Almacén)
                        </h3>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          totalInQty === totalOutQty
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {totalInQty} de {totalOutQty} prendas seleccionadas
                      </span>
                    </div>

                    {isLoadingDetails ? (
                      <div className="py-8 flex justify-center items-center gap-2 text-xs text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> Cargando prendas de la factura...
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[8px] font-black uppercase tracking-wider text-slate-400">
                              <th className="p-3 w-10 text-center">Elegir</th>
                              <th className="p-3">Prenda / Modelo</th>
                              <th className="p-3 text-center">Talla</th>
                              <th className="p-3 text-center">Color</th>
                              <th className="p-3 text-center">Cant. Facturada</th>
                              <th className="p-3 text-right">Cant. a Devolver</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {saleDetails?.items?.map((item: any) => {
                              const isSelected = selectedReturns[item.id] !== undefined;
                              const currentQty = selectedReturns[item.id] || 0;
                              return (
                                <tr
                                  key={item.id}
                                  className={`transition ${
                                    isSelected ? 'bg-purple-50/50' : 'hover:bg-slate-50/60'
                                  }`}
                                >
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleItem(item.id, item.quantity)}
                                      className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-3 font-bold text-slate-900">
                                    {item.variant?.product?.name || 'Prenda'}
                                    <p className="text-[8px] font-mono text-slate-400">
                                      SKU: {item.variant?.variantSku || '-'}
                                    </p>
                                  </td>
                                  <td className="p-3 text-center font-black text-slate-700">
                                    {item.variant?.size || '-'}
                                  </td>
                                  <td className="p-3 text-center font-medium text-slate-600">
                                    {item.variant?.color || '-'}
                                  </td>
                                  <td className="p-3 text-center font-mono font-bold text-slate-500">
                                    {item.quantity}
                                  </td>
                                  <td className="p-3 text-right">
                                    {isSelected ? (
                                      <div className="inline-flex items-center gap-1.5 justify-end">
                                        <input
                                          type="number"
                                          min="1"
                                          max={item.quantity}
                                          value={currentQty}
                                          onChange={(e) =>
                                            handleQtyChange(item.id, parseInt(e.target.value) || 0, item.quantity)
                                          }
                                          className="w-16 px-2 py-1 bg-white border border-purple-300 rounded-lg text-xs font-black font-mono text-center outline-none focus:border-purple-600"
                                        />
                                        <span className="text-[9px] font-bold text-slate-400">uds</span>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleToggleItem(item.id, item.quantity)}
                                        className="text-[9px] font-black uppercase text-purple-600 hover:text-purple-800 underline"
                                      >
                                        Seleccionar
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {totalInQty !== totalOutQty && totalInQty > 0 && (
                      <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[9px] text-amber-700 font-bold leading-normal">
                          Aviso: Estás entregando {totalOutQty} prenda(s) y recibiendo {totalInQty} prenda(s). Asegúrate de que las cantidades coincidan con el acuerdo del cambio con el cliente.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. MOTIVO / OBSERVACIONES */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                    4. Motivo / Observación del Cambio
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Cambio de talla solicitado por el cliente..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>
              </>
            )}
          </div>

          {/* FOOTER */}
          {!completedExchange && (
            <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>Resumen:</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-black">
                  Sale: {totalOutQty} ud(s)
                </span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-black">
                  Entra: {totalInQty} ud(s)
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExchange}
                  disabled={isSubmitting || !selectedSale || totalInQty === 0}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Confirmar y Procesar Cambio
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
