'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import {
    ShieldCheck, Search, CheckCircle, XCircle, Info,
    Truck, Package, AlertTriangle, MessageSquare, User,
    Clock, Calendar, ChevronRight, Filter, Briefcase,
    FileDown, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';

export default function QualityPage() {
    const { user } = useAuth();
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [processedItems, setProcessedItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'PENDING' | 'PROCESSED'>('PENDING');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'PURCHASE' | 'SERVICE'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [qualityForm, setQualityForm] = useState({
        status: 'RECIBIDO' as 'RECIBIDO' | 'RECHAZADO',
        observations: '',
        rejectionReason: '',
        condition: 'BUEN_ESTADO' as 'BUEN_ESTADO' | 'MAL_ESTADO' | 'NO_LLEGO'
    });

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchData();
    }, [view]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const endpoint = view === 'PENDING' ? '/quality/pending' : '/quality/processed';
            const resp = await api.get(endpoint);
            const data = Array.isArray(resp.data) ? resp.data : (resp.data.data || []);

            if (view === 'PENDING') {
                setPendingItems(data);
            } else {
                setProcessedItems(data);
            }
        } catch (error) {
            console.error('Error fetching quality items:', error);
            showToast('Error al cargar datos', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenProcess = (item: any) => {
        setSelectedItem(item);
        setQualityForm({
            status: 'RECIBIDO',
            observations: '',
            rejectionReason: '',
            condition: 'BUEN_ESTADO'
        });
    };

    const handleAcknowledge = async (itemId: string) => {
        try {
            await api.post(`/quality/acknowledge/${itemId}`);
            showToast('Item recibido en proceso de verificación', 'success');
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al recibir', 'error');
        }
    };

    const handleConfirmProcess = async () => {
        if (!selectedItem) return;

        const isRejected = qualityForm.condition !== 'BUEN_ESTADO' || qualityForm.status === 'RECHAZADO';

        if (isRejected && !qualityForm.rejectionReason) {
            showToast('Debe indicar un motivo de rechazo', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            await api.post(`/quality/process/${selectedItem.id}`, {
                status: isRejected ? 'RECHAZADO' : 'RECIBIDO',
                observations: qualityForm.observations,
                rejectionReason: isRejected ? qualityForm.rejectionReason : undefined
            });
            showToast('Registro de calidad confirmado', 'success');
            setSelectedItem(null);
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al procesar', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // ========== EXPORT PDF ==========
    const exportPDF = async () => {
        try {
            const jsPDFModule = await import('jspdf');
            const jsPDF = jsPDFModule.default;
            const { default: autoTable } = await import('jspdf-autotable') as any;

            const doc = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const title = 'HISTORIAL DE CONTROL DE CALIDAD (UDP)';

            // Header
            doc.setFillColor(37, 99, 235); // Blue 600
            doc.rect(0, 0, pageWidth, 28, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 14, 14);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`, 14, 22);
            doc.text(`Total de registros: ${filteredItems.length}`, pageWidth - 60, 14);

            autoTable(doc, {
                startY: 40,
                head: [['Nro', 'Producto/Servicio', 'Tipo', 'Estado', 'Factura/Ref', 'Cantidad', 'Fecha/Hora Revisión', 'Revisado por', 'Observaciones']],
                body: filteredItems.map((item, i) => {
                    const qc = item.qualityControl;
                    const d = qc?.createdAt ? new Date(qc.createdAt) : new Date(item.createdAt);
                    return [
                        i + 1,
                        item.name,
                        item.purchase?.type === 'SERVICE' ? 'Servicio' : 'Compra',
                        item.status === 'RECIBIDO' ? 'APROBADO' : 'RECHAZADO',
                        item.purchase?.invoiceNumber || '-',
                        `${item.quantity} ${item.unit || ''}`,
                        `${d.toLocaleDateString('es-PE')} ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`,
                        qc?.confirmedBy?.name || '-',
                        qc?.rejectionReason || qc?.observations || '-'
                    ];
                }),
                theme: 'grid',
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 7 },
                bodyStyles: { fontSize: 7 },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                margin: { left: 10, right: 10 },
            });

            doc.save(`Reporte_Calidad_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('PDF exportado correctamente', 'success');
        } catch (error) {
            console.error('Error al exportar PDF:', error);
            showToast('Error al generar el PDF', 'error');
        }
    };

    // ========== EXPORT EXCEL ==========
    const exportExcel = async () => {
        try {
            const XLSX = await import('xlsx');
            const data = filteredItems.map((item, i) => {
                const qc = item.qualityControl;
                const d = qc?.createdAt ? new Date(qc.createdAt) : new Date(item.createdAt);
                return {
                    'Nro': i + 1,
                    'Producto/Servicio': item.name,
                    'Tipo': item.purchase?.type === 'SERVICE' ? 'Servicio' : 'Compra',
                    'Estado': item.status === 'RECIBIDO' ? 'APROBADO' : 'RECHAZADO',
                    'Factura/Ref': item.purchase?.invoiceNumber || '-',
                    'Cantidad': item.quantity,
                    'Unidad': item.unit || '',
                    'Fecha Revisión': d.toLocaleDateString('es-PE'),
                    'Hora Revisión': d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
                    'Revisado por': qc?.confirmedBy?.name || '-',
                    'Observaciones': qc?.observations || '',
                    'Motivo Rechazo': qc?.rejectionReason || ''
                };
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Historial_Calidad');
            XLSX.writeFile(wb, `Historial_Calidad_${new Date().toISOString().split('T')[0]}.xlsx`);
            showToast('Excel exportado correctamente', 'success');
        } catch (error) {
            console.error('Error al exportar Excel:', error);
            showToast('Error al generar el Excel', 'error');
        }
    };

    const filteredItems = (view === 'PENDING' ? pendingItems : processedItems).filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.purchase?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.purchase?.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        const itemType = item.purchase?.type || 'PURCHASE'; // Default to 'PURCHASE' if type is not specified
        const matchesType = typeFilter === 'ALL' || itemType === typeFilter;

        return matchesSearch && matchesType;
    });

    const fmtDate = (s: string) => new Date(s).toLocaleDateString('es-PE');

    return (
        <Layout>
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-xl border flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                        {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                        <span className="font-semibold text-sm">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 uppercase tracking-tight">
                        <ShieldCheck className="w-10 h-10 text-blue-600" />
                        Módulo de Calidad <span className="text-blue-600">(UDP)</span>
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium italic">Confirma la recepción de compras y evalúa su estado.</p>
                </div>

                <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner">
                    <button onClick={() => setView('PENDING')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${view === 'PENDING' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>
                        <Clock className="w-4 h-4" /> Pendientes
                    </button>
                    <button onClick={() => setView('PROCESSED')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${view === 'PROCESSED' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>
                        <CheckCircle className="w-4 h-4" /> Historial
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="bg-gray-100 p-1 rounded-2xl flex items-center shadow-inner self-start">
                    <button onClick={() => setTypeFilter('ALL')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${typeFilter === 'ALL' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>
                        Todos
                    </button>
                    <button onClick={() => setTypeFilter('PURCHASE')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-2 ${typeFilter === 'PURCHASE' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>
                        <Package className="w-3.5 h-3.5" /> Compras
                    </button>
                    <button onClick={() => setTypeFilter('SERVICE')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-2 ${typeFilter === 'SERVICE' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>
                        <Briefcase className="w-3.5 h-3.5" /> Servicios
                    </button>
                </div>

                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="Buscar por producto, factura o proveedor..."
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>

                {view === 'PROCESSED' && filteredItems.length > 0 && (
                    <div className="flex items-center gap-2">
                        <button onClick={exportPDF}
                            className="p-3.5 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition shadow-sm border border-red-100 flex items-center gap-2 font-bold text-xs">
                            <FileDown className="w-4 h-4" /> PDF
                        </button>
                        <button onClick={exportExcel}
                            className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition shadow-sm border border-emerald-100 flex items-center gap-2 font-bold text-xs">
                            <FileSpreadsheet className="w-4 h-4" /> Excel
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-400 font-bold uppercase tracking-wider shadow-sm">
                    <Filter className="w-4 h-4" /> {filteredItems.length} Registros
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-3xl" />)}
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-20 text-center shadow-sm">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="w-12 h-12 text-gray-300" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">No se encontraron registros</h3>
                    <p className="text-gray-500 max-w-xs mx-auto font-medium">No hay compras {view === 'PENDING' ? 'pendientes de revisión' : 'procesadas'} en este momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map((item, idx) => (
                        <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group border-b-4 border-b-blue-500/10">

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col gap-2">
                                        <div className={`p-3 rounded-2xl self-start ${item.status === 'RECIBIDO' ? 'bg-emerald-50 text-emerald-600' : item.status === 'RECHAZADO' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {item.purchase?.type === 'SERVICE' ? <Briefcase className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter w-fit ${item.purchase?.type === 'SERVICE' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {item.purchase?.type === 'SERVICE' ? 'Servicio' : 'Compra'}
                                        </span>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'RECIBIDO' ? 'bg-emerald-100 text-emerald-700' :
                                        item.status === 'RECHAZADO' ? 'bg-red-100 text-red-700' :
                                            item.status === 'RECIBIDO_EN_PROCESO' ? 'bg-orange-100 text-orange-700' :
                                                'bg-blue-100 text-blue-700'
                                        }`}>
                                        {item.status === 'RECIBIDO_EN_PROCESO' ? 'Verificando' : item.status}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xl font-black text-gray-900 leading-tight truncate">{item.name}</h3>
                                    <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
                                        <Truck className="w-4 h-4" /> {item.purchase?.supplier?.name || 'Compra Externa'}
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-gray-50 p-3 rounded-2xl">
                                            <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Cantidad</p>
                                            <p className="font-black text-gray-900">{item.quantity} <span className="text-xs font-bold text-gray-500">{item.unit}</span></p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-2xl">
                                            <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Factura</p>
                                            <p className="font-black text-gray-900 truncate">{item.purchase?.invoiceNumber || '-'}</p>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                            <Calendar className="w-3 h-3" /> {fmtDate(item.createdAt)}
                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <User className="w-3 h-3" /> {item.purchase?.user?.name || 'Logística'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                {view === 'PENDING' ? (
                                    item.status === 'EN_CALIDAD' ? (
                                        <button onClick={() => handleAcknowledge(item.id)}
                                            className="w-full py-3 bg-orange-500 text-white rounded-2xl font-black text-sm hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2">
                                            <Clock className="w-4 h-4" /> Recibir en Proceso
                                        </button>
                                    ) : (
                                        <button onClick={() => handleOpenProcess(item)}
                                            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2">
                                            <ShieldCheck className="w-4 h-4" /> Finalizar Revisión <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )
                                ) : (
                                    <div className="w-full flex flex-col gap-2">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-gray-400 uppercase">Revisado por:</span>
                                            <span className="text-blue-600">{item.qualityControl?.confirmedBy?.name || '-'}</span>
                                        </div>
                                        {item.qualityControl?.rejectionReason && (
                                            <div className="bg-red-100 p-2 rounded-xl text-[11px] text-red-700 font-medium">
                                                <span className="font-black">RECHAZO:</span> {item.qualityControl.rejectionReason}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal de Procesamiento */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedItem(null)} />

                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col">

                            <div className="p-8 bg-blue-600 text-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                        <ShieldCheck className="w-8 h-8 text-white" />
                                    </div>
                                    <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/10 rounded-full transition">
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                                <h2 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">
                                    {selectedItem.purchase?.type === 'SERVICE' ? 'Concluir Servicio' : 'Evaluar Recepción'}
                                </h2>
                                <p className="text-blue-100 font-medium">{selectedItem.name} · {selectedItem.quantity} {selectedItem.unit}</p>
                            </div>

                            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                                <div className="space-y-4">
                                    <label className="block text-sm font-black text-gray-400 uppercase tracking-widest">
                                        {selectedItem.purchase?.type === 'SERVICE' ? '¿Se realizó el servicio?' : '¿Llegó el producto?'}
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button onClick={() => setQualityForm({ ...qualityForm, condition: 'BUEN_ESTADO', status: 'RECIBIDO' })}
                                            className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${qualityForm.condition === 'BUEN_ESTADO' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 hover:border-blue-200 text-gray-400'}`}>
                                            <CheckCircle className="w-6 h-6" />
                                            <span className="text-[10px] font-black uppercase">{selectedItem.purchase?.type === 'SERVICE' ? 'Realizado' : 'Recibido OK'}</span>
                                        </button>
                                        <button onClick={() => setQualityForm({ ...qualityForm, condition: 'MAL_ESTADO', status: 'RECHAZADO' })}
                                            className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${qualityForm.condition === 'MAL_ESTADO' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 hover:border-blue-200 text-gray-400'}`}>
                                            <AlertTriangle className="w-6 h-6" />
                                            <span className="text-[10px] font-black uppercase">{selectedItem.purchase?.type === 'SERVICE' ? 'Incompleto' : 'Mal Estado'}</span>
                                        </button>
                                        <button onClick={() => setQualityForm({ ...qualityForm, condition: 'NO_LLEGO', status: 'RECHAZADO' })}
                                            className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${qualityForm.condition === 'NO_LLEGO' ? 'border-gray-600 bg-gray-50 text-gray-700' : 'border-gray-100 hover:border-blue-200 text-gray-400'}`}>
                                            <XCircle className="w-6 h-6" />
                                            <span className="text-[10px] font-black uppercase">No se hizo</span>
                                        </button>
                                    </div>
                                </div>

                                {qualityForm.condition !== 'BUEN_ESTADO' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                                        <label className="block text-sm font-black text-red-500 uppercase tracking-widest">Motivo de Rechazo *</label>
                                        <textarea value={qualityForm.rejectionReason} onChange={(e) => setQualityForm({ ...qualityForm, rejectionReason: e.target.value })}
                                            placeholder="Describa el problema detalladamente..."
                                            className="w-full px-5 py-4 bg-red-50 border-2 border-red-100 rounded-3xl text-sm focus:outline-none focus:border-red-500 transition-all font-medium text-red-900"
                                            rows={3} />
                                    </motion.div>
                                )}

                                <div className="space-y-2">
                                    <label className="block text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-blue-500" /> Observaciones (Opcional)
                                    </label>
                                    <textarea value={qualityForm.observations} onChange={(e) => setQualityForm({ ...qualityForm, observations: e.target.value })}
                                        placeholder="Alguna nota adicional sobre la entrega..."
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm focus:outline-none focus:border-blue-500 transition-all font-medium"
                                        rows={2} />
                                </div>
                            </div>

                            <div className="p-8 bg-gray-50/50 flex gap-4">
                                <button onClick={() => setSelectedItem(null)}
                                    className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-100 transition shadow-sm">
                                    Cancelar
                                </button>
                                <button onClick={handleConfirmProcess} disabled={isProcessing}
                                    className={`flex-[2] py-4 text-white rounded-2xl font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 ${qualityForm.condition === 'BUEN_ESTADO' ? 'bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700' : 'bg-red-600 shadow-red-500/20 hover:bg-red-700'
                                        }`}>
                                    {isProcessing ? 'Procesando...' : (
                                        <>
                                            {qualityForm.condition === 'BUEN_ESTADO' ? 'Confirmar Recibo OK' : 'Confirmar Rechazo'}
                                            <ChevronRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
