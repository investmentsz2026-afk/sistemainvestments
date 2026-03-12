'use client';

import { useState, useEffect, useMemo } from 'react';
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
    ChevronDown,
    MapPin,
    Building2,
    Briefcase,
    Camera
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuditDetailPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const auditId = params.id as string;

    const [audit, setAudit] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchAudit();
    }, [auditId]);

    const fetchAudit = async () => {
        try {
            const resp = await api.get(`/process-audits/${auditId}`);
            setAudit(resp.data);
        } catch (error) {
            console.error('Error fetching audit:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproval = async (status: 'APROBADO' | 'RECHAZADO') => {
        setIsUpdating(true);
        try {
            await api.patch(`/process-audits/${auditId}/approval`, { status });
            fetchAudit();
        } catch (error) {
            console.error('Error updating approval:', error);
            alert('Error al actualizar aprobación');
        } finally {
            setIsUpdating(false);
        }
    };

    const updateActionStatus = async (actionId: string, status: string) => {
        try {
            await api.patch(`/process-audits/corrective-action/${actionId}/status`, { status });
            fetchAudit();
        } catch (error) {
            console.error('Error updating action:', error);
            alert('Error al actualizar estado de la acción');
        }
    };

    const getStatusLabel = (s: string) => {
        if (s === 'CONFORME') return { text: 'CONFORME', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
        if (s === 'OBSERVACION') return { text: 'OBSERVACIÓN', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' };
        return { text: 'NO CONFORME', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' };
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

    return (
        <Layout>
            <div className="max-w-6xl mx-auto pb-20">
                {/* HEADER ACTIONS */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.push('/audit')}
                            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 shadow-sm transition active:scale-90"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reporte #{audit.id.slice(-6).toUpperCase()}</h1>
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${bg} ${color}`}>
                                    {text}
                                </span>
                            </div>
                            <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                                <Truck className="w-4 h-4 text-indigo-500" />
                                Auditoría de {audit.process} • OP: {audit.op}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <button className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition shadow-sm">
                            <Download className="w-5 h-5" /> Descargar PDF
                        </button>
                        
                        {/* COMMERCIAL APPROVAL ACTIONS */}
                        {audit.approvalStatus === 'PENDIENTE' && (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleApproval('APROBADO')}
                                    disabled={isUpdating}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition shadow-xl shadow-emerald-200"
                                >
                                    <CheckCircle2 className="w-5 h-5" /> Aprobar
                                </button>
                                <button 
                                    onClick={() => handleApproval('RECHAZADO')}
                                    disabled={isUpdating}
                                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition shadow-xl shadow-red-200"
                                >
                                    <XCircle className="w-5 h-5" /> Rechazar
                                </button>
                            </div>
                        )}
                        
                        {audit.approvalStatus !== 'PENDIENTE' && (
                            <div className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest ${
                                audit.approvalStatus === 'APROBADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                                {audit.approvalStatus === 'APROBADO' ? <ShieldCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                COMERCIAL: {audit.approvalStatus}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* INFO CARDS */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* RESUMEN DEL PRODUCTO */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center flex-shrink-0">
                                    <Briefcase className="w-10 h-10 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{audit.product?.name}</h2>
                                        <div className="px-4 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-mono font-bold tracking-widest">
                                            {audit.product?.sku}
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
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Resultado</p>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${dot} animate-pulse`} />
                                                <span className={`text-xs font-black uppercase tracking-widest ${color}`}>{text}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* QUANTITIES SUMMARY */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-50">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">1ra (Bueno)</p>
                                            <p className="text-xl font-black text-emerald-700">{audit.quantityGood}</p>
                                        </div>
                                        <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-50">
                                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">En Proceso</p>
                                            <p className="text-xl font-black text-amber-700">{audit.quantityProcess}</p>
                                        </div>
                                        <div className="bg-red-50/30 p-4 rounded-2xl border border-red-50">
                                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">2da (Segunda)</p>
                                            <p className="text-xl font-black text-red-700">{audit.quantitySecond}</p>
                                        </div>
                                        <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Lote</p>
                                            <p className="text-xl font-black text-white">{audit.totalQuantity}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CHECKLIST Y OBSERVACIONES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                                    <CheckSquare className="w-5 h-5 text-emerald-500" /> Checklist Verificado
                                </h3>
                                <div className="space-y-3">
                                    {Object.entries(audit.checklist || {}).map(([item, checked]: [string, any], idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl flex items-center justify-between ${checked ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                                            <span className="text-sm font-bold">{item}</span>
                                            {checked ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-indigo-500" /> Observaciones
                                </h3>
                                <div className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-50 min-h-[140px]">
                                    <p className="text-indigo-900 text-sm font-medium leading-relaxed italic">
                                        "{audit.observations || 'Sin observaciones adicionales registradas.'}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* HALLAZGOS Y ACCIONES */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" /> Hallazgos y Acciones Correctivas
                            </h3>
                            
                            {audit.findings?.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-8 h-8 text-gray-200" />
                                    </div>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No se registraron defectos</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {audit.findings.map((f: any, idx: number) => (
                                        <div key={idx} className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mb-2 ${
                                                        f.severity === 'CRITICO' ? 'bg-red-100 text-red-700' : f.severity === 'ALTO' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        HALLAZGO {f.severity}
                                                    </span>
                                                    <h4 className="text-lg font-bold text-gray-900">{f.description}</h4>
                                                    <p className="text-xs text-gray-400 font-medium">Área responsable: <span className="text-indigo-600 uppercase">{f.responsibleArea}</span></p>
                                                </div>
                                            </div>

                                            {/* ACTIONS LIST */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                                {f.correctiveActions.map((a: any, aIdx: number) => (
                                                    <div key={aIdx} className="bg-gray-50/50 p-5 rounded-3xl border border-gray-50 relative group">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${
                                                                    a.status === 'SOLUCIONADO' ? 'bg-emerald-500' : a.status === 'EN_PROCESO' ? 'bg-amber-500' : 'bg-gray-400'
                                                                }`} />
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan de Acción</span>
                                                            </div>
                                                            <select 
                                                                className={`text-[10px] font-black uppercase tracking-widest bg-white rounded-lg px-2 py-1 outline-none shadow-sm transition-all focus:ring-2 focus:ring-indigo-500 ${
                                                                    a.status === 'SOLUCIONADO' ? 'text-emerald-600' : a.status === 'EN_PROCESO' ? 'text-amber-600' : 'text-gray-500'
                                                                }`}
                                                                value={a.status}
                                                                onChange={(e) => updateActionStatus(a.id, e.target.value)}
                                                            >
                                                                <option value="PENDIENTE">PENDIENTE</option>
                                                                <option value="EN_PROCESO">EN PROCESO</option>
                                                                <option value="SOLUCIONADO">SOLUCIONADO</option>
                                                            </select>
                                                        </div>
                                                        <p className="text-sm font-bold text-gray-800 mb-4">{a.action}</p>
                                                        <div className="flex items-center justify-between pt-4 border-t border-white">
                                                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-500">
                                                                <User className="w-3.5 h-3.5" /> {a.responsibleName}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 font-bold text-xs text-red-400">
                                                                <Clock className="w-3.5 h-3.5" /> {a.deadline ? new Date(a.deadline).toLocaleDateString('es-PE') : 'Sin fecha'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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
                                            Este documento certifica que el lote {audit.op} ha sido inspeccionado bajo los estándares de ODP para el proceso de {audit.process}.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
