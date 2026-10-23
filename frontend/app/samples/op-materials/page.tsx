'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/axios';
import { 
  Package, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  ArrowLeft,
  Truck,
  Check,
  Send,
  Eye,
  RefreshCw,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function UdpOpMaterialsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dispatches, setDispatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  // Modal de Verificación / Recepción
  const [selectedDispatch, setSelectedDispatch] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [rejectionMode, setRejectionMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDispatches = async () => {
    try {
      setIsLoading(true);
      const resp = await api.get('/samples/op-materials/all-dispatches');
      setDispatches(resp.data || []);
    } catch (err) {
      console.error('Error fetching dispatches for UDP:', err);
      toast.error('No se pudieron cargar los despachos de materiales');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  // Si se pasa un sampleId en URL, abrir automáticamente el modal de recepción
  useEffect(() => {
    const sampleIdParam = searchParams.get('sampleId');
    if (sampleIdParam && dispatches.length > 0) {
      const target = dispatches.find(d => d.sampleId === sampleIdParam);
      if (target) {
        setSelectedDispatch(target);
        setShowReceiptModal(true);
      }
    }
  }, [searchParams, dispatches]);

  // Acciones de Confirmación y Rechazo
  const handleConfirmReceipt = async () => {
    if (!selectedDispatch) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/samples/${selectedDispatch.sampleId}/op-materials/confirm`, {
        dispatchId: selectedDispatch.id
      });
      toast.success('¡Materiales recibidos conforme! Notificación enviada a Logística.');
      setShowReceiptModal(false);
      setSelectedDispatch(null);
      fetchDispatches();
    } catch (err: any) {
      console.error('Error confirming materials receipt:', err);
      toast.error(err.response?.data?.message || 'Error al confirmar la recepción');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectReceipt = async () => {
    if (!selectedDispatch) return;
    if (!rejectionReason.trim()) {
      toast.error('Debes ingresar el motivo del rechazo o los materiales faltantes');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch(`/samples/${selectedDispatch.sampleId}/op-materials/reject`, {
        dispatchId: selectedDispatch.id,
        rejectionReason: rejectionReason.trim()
      });
      toast.success('Rechazo enviado a Logística para su verificación y reenvío');
      setShowReceiptModal(false);
      setRejectionMode(false);
      setRejectionReason('');
      setSelectedDispatch(null);
      fetchDispatches();
    } catch (err: any) {
      console.error('Error rejecting materials receipt:', err);
      toast.error(err.response?.data?.message || 'Error al enviar el rechazo');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Métricas
  const totalReceived = dispatches.filter(d => d.status !== 'PENDIENTE_DESCARGA').length;
  const conformesCount = dispatches.filter(d => d.status === 'CONFORME').length;
  const rechazadosCount = dispatches.filter(d => d.status === 'RECHAZADO').length;
  const pendientesCount = dispatches.filter(d => d.status === 'ENVIADO').length;

  // Filtrado
  const filteredDispatches = dispatches.filter(d => {
    if (d.status === 'PENDIENTE_DESCARGA') return false; // Solo los despachos que Logística ya envió
    const matchesSearch = 
      (d.op || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.sampleName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.dispatchedByName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'TODOS') return true;
    return d.status === statusFilter;
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 shadow-sm transition active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                Recepción de Materiales para Producción (UDP)
              </h1>
              <p className="text-gray-500 font-medium text-sm">
                Compara y confirma la entrega física de avíos y materiales enviados por Logística para cada OP
              </p>
            </div>
          </div>

          <button
            onClick={fetchDispatches}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition shadow-sm flex items-center gap-2 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Despachos</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{totalReceived}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Truck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 bg-emerald-50/20 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Recibidos Conforme</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{conformesCount}</p>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-red-100 bg-red-50/20 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-red-600">Rechazados / Observados</p>
              <p className="text-2xl font-black text-red-600 mt-1">{rechazadosCount}</p>
            </div>
            <div className="p-3 bg-red-100 text-red-700 rounded-2xl">
              <XCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-amber-100 bg-amber-50/20 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Pendientes de Revisión</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{pendientesCount}</p>
            </div>
            <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por OP, prenda o despachador..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {['TODOS', 'ENVIADO', 'CONFORME', 'RECHAZADO'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st === 'TODOS' ? 'Todos' : st === 'ENVIADO' ? 'Pendientes de Revisión' : st === 'CONFORME' ? 'Conformes' : 'Rechazados'}
              </button>
            ))}
          </div>
        </div>

        {/* Dispatches Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-20 text-center text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
              <p className="text-xs font-bold uppercase tracking-wider">Cargando despachos...</p>
            </div>
          ) : filteredDispatches.length === 0 ? (
            <div className="p-20 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-700">No hay despachos de materiales registrados</h3>
              <p className="text-xs text-gray-400 mt-1">Los despachos que envíe Logística para cada OP aparecerán aquí.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Orden de Producción (OP)</th>
                    <th className="py-4 px-6">Muestra / Prenda</th>
                    <th className="py-4 px-6">Fecha de Envío</th>
                    <th className="py-4 px-6 text-center">Materiales</th>
                    <th className="py-4 px-6">Estado</th>
                    <th className="py-4 px-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDispatches.map((disp) => {
                    const isPending = disp.status === 'ENVIADO';
                    const isConforme = disp.status === 'CONFORME';
                    const isRechazado = disp.status === 'RECHAZADO';

                    return (
                      <tr key={disp.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-4 px-6 font-mono font-black text-gray-900 text-sm">
                          OP {disp.op}
                        </td>
                        <td className="py-4 px-6 font-bold text-gray-800">
                          {disp.sampleName}
                          <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                            {disp.productionQuantity} prendas a confeccionar
                          </p>
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {disp.dispatchedAt ? new Date(disp.dispatchedAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '--'}
                          <p className="text-[10px] text-gray-400 font-medium">Por: {disp.dispatchedByName || 'Logística'}</p>
                        </td>
                        <td className="py-4 px-6 text-center font-black text-gray-800">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs">
                            <Layers className="w-3.5 h-3.5 text-gray-500" /> {disp.materialsCount || disp.items?.length || 0} insumos
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                              <Clock className="w-3 h-3 text-amber-600" /> Pendiente de Revisión
                            </span>
                          )}
                          {isConforme && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Recibido Conforme
                              </span>
                              {disp.receivedByName && (
                                <p className="text-[9px] text-emerald-700 font-bold mt-1">Por: {disp.receivedByName}</p>
                              )}
                            </div>
                          )}
                          {isRechazado && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-800 border border-red-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <XCircle className="w-3 h-3 text-red-600" /> Rechazado / Observado
                              </span>
                              {disp.rejectionReason && (
                                <p className="text-[10px] text-red-600 font-medium mt-1 italic max-w-xs truncate" title={disp.rejectionReason}>
                                  &quot;{disp.rejectionReason}&quot;
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              setSelectedDispatch(disp);
                              setRejectionMode(false);
                              setRejectionReason('');
                              setShowReceiptModal(true);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                              isPending
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            {isPending ? 'Verificar Recepción' : 'Ver Detalle'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL DE RECEPCIÓN Y VERIFICACIÓN FÍSICA */}
        <AnimatePresence>
          {showReceiptModal && selectedDispatch && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col"
              >
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                        Recepción Física de Materiales
                      </h3>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                        OP: {selectedDispatch.op} • {selectedDispatch.sampleName} ({selectedDispatch.productionQuantity} prendas)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowReceiptModal(false);
                      setRejectionMode(false);
                      setRejectionReason('');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl my-4 text-xs text-blue-900 font-medium leading-relaxed">
                  Logística envió los siguientes materiales el <strong>{new Date(selectedDispatch.dispatchedAt).toLocaleString('es-PE')}</strong> (Despachado por: {selectedDispatch.dispatchedByName || 'Logística'}). Compara con la entrega física recibida en taller.
                </div>

                {/* Items Table */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase font-black text-[10px]">
                        <th className="pb-2">Material / Avío</th>
                        <th className="pb-2">Color / Medida</th>
                        <th className="pb-2">SKU</th>
                        <th className="pb-2 text-right">Cant. Entregada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(selectedDispatch.items || []).map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="py-2.5 font-bold text-gray-800">{item.name || item.productName}</td>
                          <td className="py-2.5 text-gray-600">{item.color} / {item.size}</td>
                          <td className="py-2.5 font-mono text-blue-600 text-[11px]">{item.sku || '--'}</td>
                          <td className="py-2.5 text-right font-black text-gray-900 text-sm">
                            {item.quantity} {item.unit || 'uds'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {selectedDispatch.status === 'RECHAZADO' && selectedDispatch.rejectionReason && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl mt-4 text-xs text-red-800">
                      <p className="font-black uppercase tracking-wider mb-1">Motivo de Rechazo Anterior:</p>
                      <p className="italic">&quot;{selectedDispatch.rejectionReason}&quot;</p>
                      {selectedDispatch.rejectedAt && (
                        <p className="text-[10px] text-red-500 mt-1">Registrado el {new Date(selectedDispatch.rejectedAt).toLocaleString('es-PE')}</p>
                      )}
                    </div>
                  )}

                  {/* Campo de Rechazo desplegable */}
                  {rejectionMode && (
                    <div className="p-5 bg-red-50 border border-red-200 rounded-2xl mt-4 space-y-3">
                      <label className="block text-xs font-black uppercase tracking-wider text-red-900">
                        Escribe el motivo del rechazo o los materiales faltantes:
                      </label>
                      <textarea
                        rows={3}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Ejemplo: Faltan 5 metros de tela para completar las 50 prendas, o el botón no corresponde al color negro..."
                        className="w-full p-3 bg-white border border-red-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-red-500 text-gray-800"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setRejectionMode(false)}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold"
                        >
                          Cancelar Rechazo
                        </button>
                        <button
                          type="button"
                          onClick={handleRejectReceipt}
                          disabled={isSubmitting}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black uppercase tracking-wider disabled:opacity-50"
                        >
                          {isSubmitting ? 'Enviando...' : 'Confirmar y Enviar a Logística'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                {selectedDispatch.status === 'ENVIADO' && !rejectionMode && (
                  <div className="flex gap-3 pt-6 border-t border-gray-100 mt-4">
                    <button
                      type="button"
                      onClick={() => setRejectionMode(true)}
                      disabled={isSubmitting}
                      className="flex-1 py-3.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold transition text-xs flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Rechazar / Observar Entrega
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReceipt}
                      disabled={isSubmitting}
                      className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> {isSubmitting ? 'Confirmando...' : 'Sí, Recibí Conforme'}
                    </button>
                  </div>
                )}

                {selectedDispatch.status !== 'ENVIADO' && (
                  <div className="pt-4 border-t border-gray-100 mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowReceiptModal(false)}
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
                    >
                      Cerrar
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
