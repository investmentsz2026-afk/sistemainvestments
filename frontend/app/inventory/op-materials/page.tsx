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
  ArrowLeft,
  Truck,
  Plus,
  RefreshCw,
  Send,
  Boxes,
  Eye,
  Layers,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function LogisticsOpMaterialsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dispatches, setDispatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [selectedDispatch, setSelectedDispatch] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchDispatches = async () => {
    try {
      setIsLoading(true);
      const resp = await api.get('/samples/op-materials/all-dispatches');
      setDispatches(resp.data || []);
    } catch (err) {
      console.error('Error fetching dispatches for Logistics:', err);
      toast.error('No se pudieron cargar los despachos de materiales');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  // Si viene sampleId en URL, abrir detalle
  useEffect(() => {
    const sampleIdParam = searchParams.get('sampleId');
    if (sampleIdParam && dispatches.length > 0) {
      const found = dispatches.find(d => d.sampleId === sampleIdParam);
      if (found) {
        setSelectedDispatch(found);
        setShowDetailModal(true);
      }
    }
  }, [searchParams, dispatches]);

  // Métricas
  const totalDispatches = dispatches.filter(d => d.status !== 'PENDIENTE_DESCARGA').length;
  const conformesCount = dispatches.filter(d => d.status === 'CONFORME').length;
  const rechazadosCount = dispatches.filter(d => d.status === 'RECHAZADO').length;
  const pendientesUdpCount = dispatches.filter(d => d.status === 'ENVIADO').length;
  const pendientesDescargaCount = dispatches.filter(d => d.status === 'PENDIENTE_DESCARGA').length;

  // Filtrado
  const filteredDispatches = dispatches.filter(d => {
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
                Despacho de Materiales para Producción (Logística)
              </h1>
              <p className="text-gray-500 font-medium text-sm">
                Control de salidas de inventario, envíos a taller y confirmaciones de recepción en UDP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDispatches}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Actualizar
            </button>

            <Link
              href="/inventory/scan?mode=EXIT&reason=Para Producción de OP"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Registrar Salida de OP
            </Link>
          </div>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Despachos</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{totalDispatches}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-emerald-100 bg-emerald-50/20 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Conformes en UDP</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{conformesCount}</p>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-red-100 bg-red-50/20 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-red-600">Rechazados por UDP</p>
              <p className="text-2xl font-black text-red-600 mt-1">{rechazadosCount}</p>
            </div>
            <div className="p-3 bg-red-100 text-red-700 rounded-2xl">
              <XCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-amber-100 bg-amber-50/20 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">En Tránsito (UDP)</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{pendientesUdpCount}</p>
            </div>
            <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-indigo-100 bg-indigo-50/20 shadow-sm flex items-center justify-between col-span-2 md:col-span-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">OPs Pendientes Salida</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{pendientesDescargaCount}</p>
            </div>
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
              <Boxes className="w-5 h-5" />
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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'PENDIENTE_DESCARGA', label: 'Pendientes Salida' },
              { id: 'ENVIADO', label: 'En Tránsito (UDP)' },
              { id: 'CONFORME', label: 'Conformes' },
              { id: 'RECHAZADO', label: 'Rechazados' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === st.id
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-20 text-center text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
              <p className="text-xs font-bold uppercase tracking-wider">Cargando despachos...</p>
            </div>
          ) : filteredDispatches.length === 0 ? (
            <div className="p-20 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-700">No hay registros de despachos para el filtro seleccionado</h3>
              <p className="text-xs text-gray-400 mt-1">Registra la salida de una OP desde el botón &quot;Registrar Salida de OP&quot;.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Orden de Producción</th>
                    <th className="py-4 px-6">Muestra / Prenda</th>
                    <th className="py-4 px-6">Fecha Despacho</th>
                    <th className="py-4 px-6 text-center">Materiales</th>
                    <th className="py-4 px-6">Estado</th>
                    <th className="py-4 px-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDispatches.map((disp) => {
                    const isNotDischarged = disp.status === 'PENDIENTE_DESCARGA';
                    const isPendingUdp = disp.status === 'ENVIADO';
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
                          {disp.dispatchedAt ? new Date(disp.dispatchedAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : 'No descargado'}
                          {disp.dispatchedByName && (
                            <p className="text-[10px] text-gray-400 font-medium">Por: {disp.dispatchedByName}</p>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center font-black text-gray-800">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs">
                            <Layers className="w-3.5 h-3.5 text-gray-500" /> {disp.materialsCount || disp.items?.length || 0} insumos
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {isNotDischarged && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                              <AlertTriangle className="w-3 h-3 text-indigo-600" /> Pendiente Descargar
                            </span>
                          )}
                          {isPendingUdp && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                              <Clock className="w-3 h-3 text-amber-600" /> En Tránsito (UDP)
                            </span>
                          )}
                          {isConforme && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Conforme en UDP
                              </span>
                              {disp.receivedByName && (
                                <p className="text-[9px] text-emerald-700 font-bold mt-1">Recibió: {disp.receivedByName}</p>
                              )}
                            </div>
                          )}
                          {isRechazado && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-800 border border-red-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <XCircle className="w-3 h-3 text-red-600" /> Rechazado por UDP
                              </span>
                              {disp.rejectionReason && (
                                <p className="text-[10px] text-red-600 font-bold mt-1 italic max-w-xs truncate" title={disp.rejectionReason}>
                                  &quot;{disp.rejectionReason}&quot;
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {isNotDischarged && (
                            <Link
                              href={`/inventory/scan?mode=EXIT&sampleId=${disp.sampleId}`}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm inline-flex items-center gap-1.5"
                            >
                              Descargar Salida <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          {isRechazado && (
                            <Link
                              href={`/inventory/scan?mode=EXIT&sampleId=${disp.sampleId}`}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm inline-flex items-center gap-1.5"
                            >
                              Reenviar / Corregir <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          {!isNotDischarged && !isRechazado && (
                            <button
                              onClick={() => {
                                setSelectedDispatch(disp);
                                setShowDetailModal(true);
                              }}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver Detalle
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
        </div>

        {/* MODAL DE DETALLE */}
        <AnimatePresence>
          {showDetailModal && selectedDispatch && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col"
              >
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                        Detalle de Despacho para Producción
                      </h3>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                        OP: {selectedDispatch.op} • {selectedDispatch.sampleName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4 p-4 bg-gray-50 rounded-2xl text-xs">
                  <div>
                    <span className="text-gray-400 font-bold block text-[10px] uppercase">Despachado por:</span>
                    <span className="font-bold text-gray-800">{selectedDispatch.dispatchedByName || 'Logística'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block text-[10px] uppercase">Fecha de Salida:</span>
                    <span className="font-bold text-gray-800">
                      {selectedDispatch.dispatchedAt ? new Date(selectedDispatch.dispatchedAt).toLocaleString('es-PE') : '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block text-[10px] uppercase">Estado en UDP:</span>
                    <span className={`font-black uppercase tracking-wider ${
                      selectedDispatch.status === 'CONFORME' ? 'text-emerald-600' :
                      selectedDispatch.status === 'RECHAZADO' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {selectedDispatch.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block text-[10px] uppercase">Revisado en UDP por:</span>
                    <span className="font-bold text-gray-800">{selectedDispatch.receivedByName || 'Pendiente'}</span>
                  </div>
                </div>

                {selectedDispatch.rejectionReason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl mb-4 text-xs text-red-800">
                    <p className="font-black uppercase tracking-wider mb-1">Observaciones / Motivo de Rechazo de UDP:</p>
                    <p className="italic font-bold">&quot;{selectedDispatch.rejectionReason}&quot;</p>
                  </div>
                )}

                {/* Items List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase font-black text-[10px]">
                        <th className="pb-2">Material / Avío</th>
                        <th className="pb-2">Color / Medida</th>
                        <th className="pb-2">SKU</th>
                        <th className="pb-2 text-right">Cant. Despachada</th>
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
                </div>

                <div className="pt-4 border-t border-gray-100 mt-4 flex justify-between items-center">
                  {selectedDispatch.status === 'RECHAZADO' && (
                    <Link
                      href={`/inventory/scan?mode=EXIT&sampleId=${selectedDispatch.sampleId}`}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-xs tracking-wider transition shadow-md shadow-red-500/20 flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Reenviar / Corregir Insumos
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="ml-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
