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
    MoreHorizontal
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

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
        } catch (error) {
            console.error('Error fetching audit:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateProgress = async (nextProcess?: string) => {
        setIsSaving(true);
        try {
            await api.patch(`/process-audits/${auditId}/progress`, {
                quantityGood: qGood,
                quantityProcess: qProcess,
                quantitySecond: qSecond,
                observations: editObs,
                nextProcess: nextProcess || audit.process,
                stepNotes: nextProcess ? `Pasó de ${audit.process} a ${nextProcess}` : undefined
            });
            toast.success(nextProcess ? `Paso a ${nextProcess} registrado` : 'Avance guardado');
            fetchAudit();
        } catch (error: any) {
            console.error('Error updating progress:', error);
            toast.error(error.response?.data?.message || 'Error al actualizar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalize = async () => {
        setIsUpdating(true);
        try {
            const result = qGood > 0 && qSecond === 0 ? 'CONFORME' : qSecond > 0 ? 'OBSERVACION' : 'PENDIENTE';
            await api.patch(`/process-audits/${auditId}/finalize`, {
                quantityGood: qGood,
                quantityProcess: qProcess,
                quantitySecond: qSecond,
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
    const isFinalized = audit.status === 'FINALIZADO';
    const proc = PROCESS_INFO[audit.process] || { color: 'bg-gray-100 text-gray-700', icon: Box };
    const ProcIcon = proc.icon;

    return (
        <Layout>
            <div className="max-w-6xl mx-auto pb-20">
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
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
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
                            <button
                                onClick={() => setShowFinalizeModal(true)}
                                className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl hover:bg-black transition active:scale-95"
                            >
                                <Flag className="w-6 h-6" /> Finalizar Auditoría
                            </button>
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
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowFinalizeModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">¿Finalizar Auditoría?</h3>
                                <p className="text-gray-500 font-medium mb-6">
                                    Al finalizar, la información se enviará a <strong>Logística</strong> para actualizar el inventario. 
                                    Esta acción <strong>no se puede deshacer</strong>.
                                </p>
                                
                                <div className="bg-gray-50 p-4 rounded-2xl mb-6 text-left space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500 font-bold">1ra Calidad:</span><span className="font-black text-emerald-600">{qGood} uds.</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500 font-bold">En Proceso:</span><span className="font-black text-amber-600">{qProcess} uds.</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500 font-bold">2da Calidad:</span><span className="font-black text-red-600">{qSecond} uds.</span></div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-gray-100"><span className="text-gray-700 font-black">Total:</span><span className="font-black text-gray-900">{qGood + qProcess + qSecond} uds.</span></div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowFinalizeModal(false)}
                                        className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleFinalize}
                                        disabled={isUpdating}
                                        className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Flag className="w-5 h-5" />
                                        {isUpdating ? 'Finalizando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </div>
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
            </AnimatePresence>
        </Layout>
    );
}
