'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/axios';
import {
    ArrowLeft,
    Download,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Calendar,
    Box,
    CheckSquare,
    Search,
    FileText,
    AlertTriangle,
    MessageSquare,
    ShieldCheck,
    Truck,
    Info,
    Check,
    Camera,
    Building2,
    Save,
    Flag,
    ListTodo,
    History,
    MoreHorizontal,
    Barcode,
    Printer,
    DollarSign,
    X
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { OPBarcodeModal } from '../../../components/samples/OPBarcodeModal';

const PROCESS_INFO: Record<string, { color: string; icon: any }> = {
    'Corte': { color: 'bg-orange-100 text-orange-700', icon: Box },
    'Confección': { color: 'bg-blue-100 text-blue-700', icon: CheckSquare },
    'Lavado': { color: 'bg-cyan-100 text-cyan-700', icon: Search },
    'Acabados': { color: 'bg-purple-100 text-purple-700', icon: FileText },
};

export default function AuditDetailPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const auditId = params.id as string;

    const [audit, setAudit] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Editable progress fields
    const [qGood, setQGood] = useState(0);
    const [qProcess, setQProcess] = useState(0);
    const [qSecond, setQSecond] = useState(0);
    const [editObs, setEditObs] = useState('');
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [showAdminReviewModal, setShowAdminReviewModal] = useState(false);
    const [adminReviewStatus, setAdminReviewStatus] = useState<'APROBADO' | 'RECHAZADO' | null>(null);
    const [sizeBreakdown, setSizeBreakdown] = useState<any[]>([]);
    const [showBreakdownModal, setShowBreakdownModal] = useState(false);
    
    // Process change cost modal
    const [showCostModal, setShowCostModal] = useState(false);
    const [pendingProcess, setPendingProcess] = useState('');
    const [newProcessCost, setNewProcessCost] = useState<number>(0);
    const [newExternalCompany, setNewExternalCompany] = useState('');
    const [showBarcode, setShowBarcode] = useState(false);

    useEffect(() => {
        fetchAudit();
    }, [auditId]);

    const fetchAudit = async () => {
        try {
            const resp = await api.get(`/process-audits/${auditId}`);
            const a = resp.data;
            setAudit(a);
            setQGood(a.quantityGood || 0);
            setQProcess(a.quantityProcess || 0);
            setQSecond(a.quantitySecond || 0);
            setEditObs(a.observations || '');

            // Initialize size breakdown
            if (a.qualitySizeData) {
                setSizeBreakdown(a.qualitySizeData);
            } else if (a.sample?.productionSizeData) {
                setSizeBreakdown(a.sample.productionSizeData.map((sz: any) => ({
                    size: sz.size,
                    color: sz.color || 'ÚNICO',
                    qGood: sz.quantity || 0, // Default all to good
                    qProcess: 0,
                    qSecond: 0,
                    total: sz.quantity || 0
                })));
            }
        } catch (error) {
            console.error('Error fetching audit:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateProgress = async (nextProcess?: string, cost?: number, company?: string) => {
        // Enforce cost on process change
        if (nextProcess && nextProcess !== audit.process && !cost && !showCostModal) {
            setPendingProcess(nextProcess);
            setNewExternalCompany(audit.externalCompany || '');
            setShowCostModal(true);
            return;
        }

        setIsSaving(true);
        try {
            await api.patch(`/process-audits/${auditId}/progress`, {
                quantityGood: qGood,
                quantityProcess: qProcess,
                quantitySecond: qSecond,
                observations: editObs,
                nextProcess: nextProcess || audit.process,
                servicePrice: cost !== undefined ? cost : undefined,
                externalCompany: company !== undefined ? company : undefined,
                stepNotes: nextProcess && nextProcess !== audit.process 
                    ? `Pasó de ${audit.process} a ${nextProcess}${cost ? ` (Costo: S/. ${cost})` : ''}` 
                    : undefined
            });
            toast.success(nextProcess && nextProcess !== audit.process ? `Paso a ${nextProcess} registrado` : 'Avance guardado');
            setShowCostModal(false);
            setNewProcessCost(0);
            fetchAudit();
        } catch (error: any) {
            console.error('Error updating progress:', error);
            toast.error(error.response?.data?.message || 'Error al actualizar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalize = async () => {
        const totalAudited = qGood + qProcess + qSecond;
        if (totalAudited !== audit.totalQuantity) {
            toast.error(`Debes asignar el estado a la totalidad del lote (${audit.totalQuantity} uds.) antes de finalizar. Actualmente tienes ${totalAudited} uds.`);
            return;
        }

        setIsUpdating(true);
        try {
            const result = qGood > 0 && qSecond === 0 ? 'CONFORME' : qSecond > 0 ? 'OBSERVACION' : 'PENDIENTE';
            await api.patch(`/process-audits/${auditId}/finalize`, {
                quantityGood: qGood,
                quantityProcess: qProcess,
                quantitySecond: qSecond,
                qualitySizeData: sizeBreakdown,
                observations: editObs,
                result,
            });
            toast.success('✅ Auditoría finalizada. Notificación enviada al Administrador.');
            setShowFinalizeModal(false);
            fetchAudit();
        } catch (error: any) {
            console.error('Error finalizing audit:', error);
            toast.error(error.response?.data?.message || 'Error al finalizar');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAdminReview = async () => {
        if (!adminReviewStatus) return;
        setIsUpdating(true);
        try {
            await api.patch(`/process-audits/${auditId}/admin-review`, {
                status: adminReviewStatus,
                notes: adminNotes
            });
            toast.success(adminReviewStatus === 'APROBADO' ? 'Auditoría aprobada' : 'Auditoría rechazada');
            setShowAdminReviewModal(false);
            fetchAudit();
        } catch (error) {
            console.error('Error during admin review:', error);
            toast.error('Error al enviar revisión');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogisticsReceive = async () => {
        setIsUpdating(true);
        try {
            await api.patch(`/process-audits/${auditId}/logistics-receive`);
            toast.success('Pedido recibido en almacén');
            fetchAudit();
        } catch (error) {
            console.error('Error in logistics receive:', error);
            toast.error('Error al confirmar recepción');
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusLabel = (s: string) => {
        if (s === 'CONFORME') return { text: 'CONFORME', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
        if (s === 'OBSERVACION') return { text: 'OBSERVACIÓN', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' };
        if (s === 'NO_CONFORME') return { text: 'NO CONFORME', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' };
        return { text: 'PENDIENTE', color: 'text-gray-500', bg: 'bg-gray-50', dot: 'bg-gray-400' };
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
            </Layout>
        );
    }

    if (!audit) {
        return (
            <Layout>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-gray-900">Auditoría no encontrada</h2>
                    <button onClick={() => router.push('/audit')} className="mt-4 text-indigo-600 font-bold hover:underline">Volver al listado</button>
                </div>
            </Layout>
        );
    }

    const { text, color, bg, dot } = getStatusLabel(audit.result);
    const isFinalized = audit.status === 'FINALIZADO' && audit.adminStatus !== 'RECHAZADO';
    const proc = PROCESS_INFO[audit.process] || { color: 'bg-gray-100 text-gray-700', icon: Box };
    const ProcIcon = proc.icon;

    return (
        <Layout>
            <div className="max-w-6xl mx-auto pb-20">
                {/* BANNER DE RECHAZO */}
                {audit.adminStatus === 'RECHAZADO' && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-[2rem] flex items-center gap-4 shadow-xl shadow-red-200/20"
                    >
                        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">Auditoría Rechazada por Admin</h3>
                            <p className="text-red-700 font-medium">Motivo: <span className="font-bold italic">"{audit.adminNotes || 'Sin notas adicionales'}"</span></p>
                            <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-1">Por favor, corrige los datos y finaliza nuevamente.</p>
                        </div>
                    </motion.div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.push('/audit')}
                            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 shadow-sm transition active:scale-90"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Auditoría #{audit.id.slice(-6).toUpperCase()}</h1>
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${bg} ${color}`}>
                                    {text}
                                </span>
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isFinalized ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {audit.logisticsStatus === 'RECIBIDO' ? '✅ COMPLETADO' : isFinalized ? '✅ FINALIZADO' : '🔄 EN PROCESO'}
                                </span>
                            </div>
                            <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                                <Truck className="w-4 h-4 text-indigo-500" />
                                {audit.process} • OP: {audit.op} • {audit.sample?.name || 'N/A'}
                                {audit.externalCompany && <span className="text-gray-400">• Empresa: {audit.externalCompany}</span>}
                                {audit.servicePrice > 0 && <span className="text-emerald-500 font-bold ml-2">• S/. {audit.servicePrice.toFixed(2)} / ud.</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* BARCODE BUTTON */}
                        {audit.sample?.barcode && (
                            <button 
                                onClick={() => setShowBarcode(true)}
                                className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-900 rounded-2xl font-bold hover:bg-gray-50 transition shadow-sm"
                            >
                                <Barcode className="w-5 h-5 text-indigo-500" /> Etiquetas OP
                            </button>
                        )}
                        {/* ADMIN REVIEW BUTTONS */}
                        {user?.role === 'ADMIN' && isFinalized && audit.adminStatus === 'PENDIENTE' && (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => { setAdminReviewStatus('APROBADO'); setShowAdminReviewModal(true); }}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition shadow-xl shadow-emerald-200"
                                >
                                    <CheckCircle2 className="w-5 h-5" /> Aprobar Auditoría
                                </button>
                                <button 
                                    onClick={() => { setAdminReviewStatus('RECHAZADO'); setShowAdminReviewModal(true); }}
                                    className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition shadow-xl shadow-rose-200"
                                >
                                    <XCircle className="w-5 h-5" /> Rechazar
                                </button>
                            </div>
                        )}

                        {/* LOGISTICS RECEIVE BUTTON */}
                        {user?.role === 'LOGISTICA' && audit.adminStatus === 'APROBADO' && audit.logisticsStatus === 'PENDIENTE' && (
                            <button 
                                onClick={handleLogisticsReceive}
                                disabled={isUpdating}
                                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition shadow-xl shadow-indigo-200"
                            >
                                <Truck className="w-5 h-5" /> Confirmar Recepción
                            </button>
                        )}
                        
                        {/* LOGISTICS RECEIVED STATUS */}
                        {audit.logisticsStatus === 'RECIBIDO' && (
                            <div className="flex items-center gap-2 px-6 py-3 bg-emerald-100 text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest border border-emerald-200">
                                <Box className="w-4 h-4" /> RECIBIDO EN ALMACÉN
                            </div>
                        )}

                        {/* ADMIN APPROVAL DISPLAY (for others) */}
                        {isFinalized && audit.adminStatus !== 'PENDIENTE' && (
                            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border-2 ${
                                audit.adminStatus === 'APROBADO' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 
                                audit.adminStatus === 'RECHAZADO' ? 'bg-rose-50 border-rose-500 text-rose-700' : 
                                'bg-indigo-50 border-indigo-200 text-indigo-700'
                            }`}>
                                <ShieldCheck className="w-5 h-5" />
                                {audit.adminStatus === 'APROBADO' ? 'Auditoría Aprobada' : 'Auditoría Rechazada'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* LEFT COLUMN - MAIN CONTENT */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* PRODUCT/SAMPLE SUMMARY */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                            <div className="flex items-center gap-6">
                                <div className={`w-20 h-20 ${proc.color} rounded-3xl flex items-center justify-center flex-shrink-0`}>
                                    <ProcIcon className="w-10 h-10" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                                            {audit.sample?.name || audit.product?.name || 'Item Desconocido'}
                                        </h2>
                                        <div className="px-4 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-mono font-bold tracking-widest">
                                            {audit.product?.sku || (audit.sample ? `SAMP-${audit.sample.id.slice(-4).toUpperCase()}` : '---')}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Orden Prod.</p>
                                            <p className="font-bold text-indigo-600 uppercase font-mono">{audit.op}</p>
                                        </div>
                                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fecha Auditoría</p>
                                            <div className="flex items-center gap-1.5 font-bold text-gray-900">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(audit.auditDate).toLocaleDateString('es-PE')}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inspector</p>
                                            <div className="flex items-center gap-1.5 font-bold text-gray-900">
                                                <User className="w-4 h-4 text-gray-400" />
                                                {audit.inspector?.name}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Lote</p>
                                            <p className="font-black text-gray-900 text-xl">{audit.totalQuantity}</p>
                                        </div>
                                    </div>
                                    {audit.externalCompany && (
                                        <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50/50 rounded-2xl border border-blue-50">
                                            <Building2 className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm font-bold text-blue-800">Empresa Externa: {audit.externalCompany}</span>
                                        </div>
                                    )}

                                    {audit.sample?.productionSizeData && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Plan de Producción Detallado</span>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {Array.isArray(audit.sample.productionSizeData) ? (
                                                        (audit.sample.productionSizeData as any[]).map((item, i) => (
                                                            <div key={i} className="bg-white border border-gray-100 px-3 py-2 rounded-xl shadow-sm flex items-center justify-between text-[11px] font-bold">
                                                                <div className="flex flex-col">
                                                                    <span>Talla: <span className="text-indigo-600">{item.size}</span></span>
                                                                    <span className="text-[9px] text-gray-400 uppercase">{item.color}</span>
                                                                </div>
                                                                <span className="text-emerald-600">{item.quantity} uds.</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        Object.entries(audit.sample.productionSizeData || {}).map(([size, qty]) => (
                                                            <div key={size} className="bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2 text-[11px]">
                                                                <span className="text-[9px] font-black text-indigo-500 uppercase">{size}:</span>
                                                                <span className="font-black text-gray-900">{qty as number}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* QUANTITIES - EDITABLE (if not finalized) */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                    <CheckSquare className="w-5 h-5 text-emerald-500" /> Control de Cantidades
                                </h3>
                                {!isFinalized && (
                                    <div className="flex items-center gap-3">
                                        <select 
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={audit.process}
                                            onChange={(e) => handleUpdateProgress(e.target.value)}
                                        >
                                            {Object.keys(PROCESS_INFO).map(p => (
                                                <option key={p} value={p}>Cambiar a {p}</option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={() => handleUpdateProgress()}
                                            disabled={isSaving}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-black transition shadow-lg shadow-indigo-200 disabled:opacity-50"
                                        >
                                            <Save className="w-4 h-4" />
                                            {isSaving ? 'Guardando...' : 'Guardar Avance'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100">
                                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 block">1ra Calidad (Bueno)</label>
                                    {isFinalized ? (
                                        <p className="text-2xl font-black text-emerald-700">{audit.quantityGood}</p>
                                    ) : (
                                        <input 
                                            type="number" 
                                            className="w-full bg-transparent text-2xl font-black text-emerald-700 outline-none" 
                                            value={qGood} 
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (val + qProcess + qSecond > audit.totalQuantity) {
                                                    toast.error(`No puedes exceder el total del lote (${audit.totalQuantity})`);
                                                    return;
                                                }
                                                setQGood(val);
                                            }} 
                                        />
                                    )}
                                </div>
                                <div className="bg-amber-50/30 p-5 rounded-2xl border border-amber-100">
                                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 block">En Proceso</label>
                                    {isFinalized ? (
                                        <p className="text-2xl font-black text-amber-700">{audit.quantityProcess}</p>
                                    ) : (
                                        <input 
                                            type="number" 
                                            className="w-full bg-transparent text-2xl font-black text-amber-700 outline-none" 
                                            value={qProcess} 
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (qGood + val + qSecond > audit.totalQuantity) {
                                                    toast.error(`No puedes exceder el total del lote (${audit.totalQuantity})`);
                                                    return;
                                                }
                                                setQProcess(val);
                                            }} 
                                        />
                                    )}
                                </div>
                                <div className="bg-red-50/30 p-5 rounded-2xl border border-red-100">
                                    <label className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 block">2da Calidad (Segunda)</label>
                                    {isFinalized ? (
                                        <p className="text-2xl font-black text-red-700">{audit.quantitySecond}</p>
                                    ) : (
                                        <input 
                                            type="number" 
                                            className="w-full bg-transparent text-2xl font-black text-red-700 outline-none" 
                                            value={qSecond} 
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (qGood + qProcess + val > audit.totalQuantity) {
                                                    toast.error(`No puedes exceder el total del lote (${audit.totalQuantity})`);
                                                    return;
                                                }
                                                setQSecond(val);
                                            }} 
                                        />
                                    )}
                                </div>
                                <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Total Auditado</label>
                                    <p className="text-2xl font-black text-white">{isFinalized ? (audit.quantityGood + audit.quantityProcess + audit.quantitySecond) : (qGood + qProcess + qSecond)}</p>
                                </div>
                            </div>

                            {/* PROGRESS BAR */}
                            {audit.totalQuantity > 0 && (
                                <div className="mt-6 pt-4 border-t border-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progreso del Lote</span>
                                        <span className="text-sm font-black text-gray-700">
                                            {isFinalized ? (audit.quantityGood + audit.quantityProcess + audit.quantitySecond) : (qGood + qProcess + qSecond)} / {audit.totalQuantity}
                                        </span>
                                    </div>
                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                        {(() => {
                                            const total = audit.totalQuantity;
                                            const good = isFinalized ? audit.quantityGood : qGood;
                                            const proc = isFinalized ? audit.quantityProcess : qProcess;
                                            const second = isFinalized ? audit.quantitySecond : qSecond;
                                            return (
                                                <div className="h-full flex">
                                                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(good / total) * 100}%` }} />
                                                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${(proc / total) * 100}%` }} />
                                                    <div className="bg-red-500 h-full transition-all" style={{ width: `${(second / total) * 100}%` }} />
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[9px] font-bold text-gray-400">1ra</span></div>
                                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[9px] font-bold text-gray-400">En Proceso</span></div>
                                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[9px] font-bold text-gray-400">2da</span></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SIZE BREAKDOWN DISPLAY (IF FINALIZED) */}
                        {isFinalized && audit.qualitySizeData && (
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                                    <ListTodo className="w-5 h-5 text-emerald-500" /> Desglose por Talla
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-50">
                                                <th className="py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest">Talla</th>
                                                <th className="py-3 font-black text-[10px] text-emerald-600 uppercase tracking-widest">1ra Calidad</th>
                                                <th className="py-3 font-black text-[10px] text-amber-600 uppercase tracking-widest">En Proceso</th>
                                                <th className="py-3 font-black text-[10px] text-red-600 uppercase tracking-widest">2da Calidad</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {(Array.isArray(audit.qualitySizeData) ? audit.qualitySizeData : []).map((sz: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="py-4 font-black text-gray-900">{sz.size}</td>
                                                    <td className="py-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-black ${sz.qGood > 0 ? 'bg-emerald-50 text-emerald-700' : 'text-gray-300'}`}>
                                                            {sz.qGood} uds.
                                                        </span>
                                                    </td>
                                                    <td className="py-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-black ${sz.qProcess > 0 ? 'bg-amber-50 text-amber-700' : 'text-gray-300'}`}>
                                                            {sz.qProcess} uds.
                                                        </span>
                                                    </td>
                                                    <td className="py-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-black ${sz.qSecond > 0 ? 'bg-red-50 text-red-700' : 'text-gray-300'}`}>
                                                            {sz.qSecond} uds.
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* OBSERVACIONES */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-indigo-500" /> Observaciones
                            </h3>
                            {isFinalized ? (
                                <div className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-50 min-h-[100px]">
                                    <p className="text-indigo-900 text-sm font-medium leading-relaxed italic">
                                        "{audit.observations || 'Sin observaciones registradas.'}"
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Detallar aquí desglose final de 1ra, 2da y proceso por Talla/Color</p>
                                    <textarea
                                        className="w-full p-6 bg-gray-50 border-none rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-800 text-sm h-40 resize-none transition leading-relaxed"
                                        placeholder="Ejemplo: &#10;- Talla S (Blanco): 18 en 1ra, 2 en 2da.&#10;- Talla M (Negro): Todo conforme.&#10;- El resto se mantiene en proceso..."
                                        value={editObs}
                                        onChange={(e) => setEditObs(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* FINALIZE BUTTON */}
                        {!isFinalized && (
                            <div className="space-y-4">
                                {(qGood + qProcess + qSecond) !== audit.totalQuantity && (
                                    <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-bold">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                        <span>Debes asignar las {audit.totalQuantity} unidades del lote antes de finalizar. (Auditado: {qGood + qProcess + qSecond})</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        if ((qGood + qProcess + qSecond) !== audit.totalQuantity) {
                                            toast.error(`Debes completar las ${audit.totalQuantity} unidades del lote.`);
                                            return;
                                        }
                                        setShowFinalizeModal(true);
                                    }}
                                    className={`w-full py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl transition active:scale-95 ${
                                        (qGood + qProcess + qSecond) === audit.totalQuantity 
                                        ? 'bg-gray-900 text-white hover:bg-black' 
                                        : 'bg-gray-200 text-gray-400'
                                    }`}
                                >
                                    <Flag className="w-6 h-6" /> Finalizar Auditoría
                                </button>
                            </div>
                        )}

                        {/* PROCESS HISTORY (TIMELINE) */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center gap-2">
                                <History className="w-5 h-5 text-indigo-500" /> Historial de Auditoría
                            </h3>
                            <div className="space-y-6 relative ml-4 border-l-2 border-gray-50 pl-8">
                                {(audit.processHistory || []).map((step: any, idx: number) => (
                                    <div key={idx} className="relative group">
                                        <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-white border-4 border-indigo-500 group-last:bg-indigo-500 transition-colors" />
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded uppercase tracking-widest">
                                                    {step.action || 'PASO'}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400">
                                                    {new Date(step.date).toLocaleString('es-PE')}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900">{step.notes || `Proceso: ${step.process}`}</p>
                                            {step.previousProcess && (
                                                <p className="text-[11px] text-gray-500 mt-0.5">De {step.previousProcess} ➔ {step.process}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(audit.processHistory || []).length === 0 && (
                                    <p className="text-center text-gray-300 font-bold uppercase tracking-widest text-[10px]">No hay historial registrado</p>
                                )}
                            </div>
                        </div>

                        {/* FINALIZED INFO */}
                        {isFinalized && (
                            <div className={`p-8 rounded-[2rem] border ${audit.adminStatus === 'APROBADO' ? 'bg-emerald-50 border-emerald-100' : audit.adminStatus === 'RECHAZADO' ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <CheckCircle2 className={`w-6 h-6 ${audit.adminStatus === 'APROBADO' ? 'text-emerald-600' : 'text-gray-400'}`} />
                                    <h3 className={`text-lg font-black uppercase tracking-tight ${audit.adminStatus === 'APROBADO' ? 'text-emerald-900' : 'text-gray-900'}`}>
                                        Auditoría Finalizada {audit.adminStatus === 'APROBADO' ? 'y Aprobada' : audit.adminStatus === 'RECHAZADO' ? 'y Rechazada' : 'en Revisión'}
                                    </h3>
                                </div>
                                <p className="text-gray-600 font-medium text-sm mb-4">
                                    {audit.adminStatus === 'PENDIENTE' ? 'Esperando aprobación del administrador para registro en inventario.' : 
                                     audit.adminStatus === 'APROBADO' ? 'Lote aprobado para ingreso a inventario por logística.' : 
                                     'El administrador ha rechazado esta auditoría. Ver notas arriba.'}
                                </p>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded-2xl text-center shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">1ra Calidad</p>
                                        <p className="text-2xl font-black text-emerald-700">{audit.quantityGood}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl text-center shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">En Proceso</p>
                                        <p className="text-2xl font-black text-amber-700">{audit.quantityProcess}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl text-center shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">2da Calidad</p>
                                        <p className="text-2xl font-black text-red-700">{audit.quantitySecond}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: EVIDENCES */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 sticky top-24">
                            <h3 className="text-md font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                                <Camera className="w-5 h-5 text-gray-400" /> Evidencias ({(audit.evidences || []).length})
                            </h3>
                            
                            {(audit.evidences || []).length === 0 ? (
                                <div className="text-center py-10 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Sin evidencia visual</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {audit.evidences.map((url: string, i: number) => (
                                        <div key={i} className="aspect-square bg-gray-100 rounded-xl overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                                            <img src={url} alt={`Evidencia ${i+1}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-50">
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-xs font-black text-blue-900 uppercase mb-1">Nota de Auditoría</h4>
                                        <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                                            Lote {audit.op} inspeccionado bajo estándares UDP para {audit.process}.
                                            {isFinalized ? ' Auditoría completada.' : ' Auditoría en proceso.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {/* FINALIZE CONFIRMATION MODAL */}
                {showFinalizeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowFinalizeModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] p-8 max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Finalizar Auditoría</h3>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Desglose final de unidades por talla</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowFinalizeModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition"><X className="w-6 h-6 text-gray-400" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Total 1ra</p>
                                        <p className="text-xl font-black text-emerald-900">{sizeBreakdown.reduce((acc, curr) => acc + (Number(curr.qGood) || 0), 0)}</p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                                        <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Total Proceso</p>
                                        <p className="text-xl font-black text-amber-900">{sizeBreakdown.reduce((acc, curr) => acc + (Number(curr.qProcess) || 0), 0)}</p>
                                    </div>
                                    <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-center">
                                        <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Total 2da</p>
                                        <p className="text-xl font-black text-rose-900">{sizeBreakdown.reduce((acc, curr) => acc + (Number(curr.qSecond) || 0), 0)}</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-3xl overflow-hidden border border-gray-100">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100/50">
                                            <tr>
                                                <th className="px-4 py-3 font-black text-gray-500 uppercase text-[10px]">Talla</th>
                                                <th className="px-4 py-3 font-black text-emerald-600 uppercase text-[10px]">1ra Calidad</th>
                                                <th className="px-4 py-3 font-black text-amber-600 uppercase text-[10px]">En Proceso</th>
                                                <th className="px-4 py-3 font-black text-rose-600 uppercase text-[10px]">2da Calidad</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {sizeBreakdown.map((sz, idx) => (
                                                <tr key={idx} className="hover:bg-white transition-colors">
                                                    <td className="px-4 py-3 font-black text-gray-900">{sz.size}</td>
                                                    <td className="px-2 py-3">
                                                        <div className="w-full px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl font-black text-emerald-700 text-center">
                                                            {sz.qGood}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            max={sz.total - sz.qSecond}
                                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-amber-700 focus:ring-2 focus:ring-amber-500 outline-none transition"
                                                            value={sz.qProcess}
                                                            onChange={(e) => {
                                                                const val = Math.max(0, Number(e.target.value));
                                                                const newB = [...sizeBreakdown];
                                                                const row = newB[idx];
                                                                
                                                                // Ensure we don't exceed total
                                                                const finalProcess = Math.min(val, row.total - row.qSecond);
                                                                row.qProcess = finalProcess;
                                                                row.qGood = row.total - finalProcess - row.qSecond;
                                                                
                                                                setSizeBreakdown(newB);
                                                                setQGood(newB.reduce((acc, curr) => acc + (Number(curr.qGood) || 0), 0));
                                                                setQProcess(newB.reduce((acc, curr) => acc + (Number(curr.qProcess) || 0), 0));
                                                                setQSecond(newB.reduce((acc, curr) => acc + (Number(curr.qSecond) || 0), 0));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            max={sz.total - sz.qProcess}
                                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-rose-700 focus:ring-2 focus:ring-rose-500 outline-none transition"
                                                            value={sz.qSecond}
                                                            onChange={(e) => {
                                                                const val = Math.max(0, Number(e.target.value));
                                                                const newB = [...sizeBreakdown];
                                                                const row = newB[idx];
                                                                
                                                                // Ensure we don't exceed total
                                                                const finalSecond = Math.min(val, row.total - row.qProcess);
                                                                row.qSecond = finalSecond;
                                                                row.qGood = row.total - row.qProcess - finalSecond;
                                                                
                                                                setSizeBreakdown(newB);
                                                                setQGood(newB.reduce((acc, curr) => acc + (Number(curr.qGood) || 0), 0));
                                                                setQProcess(newB.reduce((acc, curr) => acc + (Number(curr.qProcess) || 0), 0));
                                                                setQSecond(newB.reduce((acc, curr) => acc + (Number(curr.qSecond) || 0), 0));
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Observaciones Finales</label>
                                    <textarea 
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                                        rows={3}
                                        placeholder="Escribe aquí cualquier observación sobre el estado del lote..."
                                        value={editObs}
                                        onChange={(e) => setEditObs(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 mt-6 flex gap-3">
                                <button
                                    onClick={() => setShowFinalizeModal(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleFinalize}
                                    disabled={isUpdating || (qGood + qProcess + qSecond) !== audit.totalQuantity}
                                    className="flex-1 py-4 bg-gray-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-black transition shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Flag className="w-5 h-5" />
                                    {isUpdating ? 'Finalizando...' : 'Confirmar Auditoría'}
                                </button>
                            </div>
                            
                            {(qGood + qProcess + qSecond) !== audit.totalQuantity && (
                                <p className="text-center text-[10px] text-red-500 font-bold mt-3 uppercase tracking-tight">
                                    ⚠️ La suma de unidades ({qGood + qProcess + qSecond}) debe ser igual al total del lote ({audit.totalQuantity})
                                </p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
                {/* ADMIN REVIEW MODAL */}
                {showAdminReviewModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAdminReviewModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Revisión de Auditoría</h3>
                            <p className="text-gray-500 font-medium mb-6">
                                Estás a punto de {adminReviewStatus === 'APROBADO' ? 'aprobar' : 'rechazar'} la auditoría #{audit.id.slice(-6).toUpperCase()}.
                            </p>
                            
                            <div className="mb-6">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Cuentanos por qué (Opcional)</label>
                                <textarea
                                    className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-800 text-sm h-32 resize-none"
                                    placeholder="Agrega notas o instrucciones para UDP..."
                                    value={adminNotes}
                                    onChange={e => setAdminNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAdminReviewModal(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAdminReview}
                                    disabled={isUpdating}
                                    className={`flex-1 py-4 text-white rounded-2xl font-bold transition shadow-xl disabled:opacity-50 ${
                                        adminReviewStatus === 'APROBADO' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                                    }`}
                                >
                                    Confirmar {adminReviewStatus === 'APROBADO' ? 'Aprobación' : 'Rechazo'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                {/* COST CHANGE MODAL */}
                {showCostModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowCostModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                                <DollarSign className="w-32 h-32 text-gray-900" />
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-3xl font-black text-gray-900 mb-2 leading-tight">Costo de {pendingProcess}</h3>
                                <p className="text-gray-500 font-medium mb-8">
                                    Antes de cambiar a <strong>{pendingProcess}</strong>, debes ingresar el costo del servicio y la empresa responsable.
                                </p>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5" /> Empresa del Proceso
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="Nombre del taller o empresa..."
                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900 transition shadow-inner"
                                            value={newExternalCompany}
                                            onChange={(e) => setNewExternalCompany(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <span className="text-emerald-500 font-black">S/.</span> Costo Unitario (por prenda)
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            placeholder="Ej: 2.50"
                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-black text-gray-900 text-2xl transition shadow-inner"
                                            value={newProcessCost || ''}
                                            onChange={(e) => setNewProcessCost(parseFloat(e.target.value) || 0)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-10">
                                    <button
                                        onClick={() => setShowCostModal(false)}
                                        className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition"
                                    >
                                        Atrás
                                    </button>
                                    <button
                                        onClick={() => handleUpdateProgress(pendingProcess, newProcessCost, newExternalCompany)}
                                        disabled={!newProcessCost || isSaving}
                                        className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition shadow-xl shadow-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-5 h-5" />
                                        {isSaving ? 'Actualizando...' : 'Confirmar Cambio'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* BARCODE MODAL */}
                {showBarcode && audit.sample && (
                    <OPBarcodeModal 
                        onClose={() => setShowBarcode(false)}
                        sample={audit.sample}
                    />
                )}
            </AnimatePresence>
        </Layout>
    );
}
