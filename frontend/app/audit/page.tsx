'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import {
    ClipboardCheck,
    Plus,
    Search,
    Filter,
    FileText,
    Calendar,
    Clock,
    User as UserIcon,
    AlertCircle,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Download,
    Eye,
    MoreHorizontal,
    Box,
    CheckSquare,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const PROCESS_INFO = {
    'Corte': { color: 'bg-orange-100 text-orange-700', icon: Box },
    'Confección': { color: 'bg-blue-100 text-blue-700', icon: CheckSquare },
    'Lavado': { color: 'bg-cyan-100 text-cyan-700', icon: Search },
    'Acabados': { color: 'bg-purple-100 text-purple-700', icon: FileText },
};

export default function AuditPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [audits, setAudits] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processFilter, setProcessFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        fetchAudits();
    }, []);

    const fetchAudits = async () => {
        try {
            const resp = await api.get('/process-audits');
            setAudits(resp.data || []);
        } catch (error) {
            console.error('Error fetching audits:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredAudits = useMemo(() => {
        return audits.filter(a => {
            const matchesSearch = 
                a.op.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (a.product?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.sample?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesProcess = processFilter === 'ALL' || a.process === processFilter;
            const matchesStatus = statusFilter === 'ALL' || a.result === statusFilter || a.status === statusFilter;
            return matchesSearch && matchesProcess && matchesStatus;
        });
    }, [audits, searchTerm, processFilter, statusFilter]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CONFORME':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 tracking-wider">CONFORME</span>;
            case 'OBSERVACION':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 tracking-wider">OBSERVACIÓN</span>;
            case 'NO_CONFORME':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 tracking-wider">NO CONFORME</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gray-100 text-gray-700 tracking-wider">{status}</span>;
        }
    };

    const getApprovalStatusBadge = (status: string) => {
        switch (status) {
            case 'APROBADO':
                return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle className="w-3 h-3" /> APROBADO COMERCIAL</span>;
            case 'RECHAZADO':
                return <span className="flex items-center gap-1 text-[10px] font-bold text-red-600"><XCircle className="w-3 h-3" /> RECHAZADO COMERCIAL</span>;
            default:
                return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600"><Clock className="w-3 h-3" /> PENDIENTE APROBACIÓN</span>;
        }
    };

    return (
        <Layout>
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Auditoría de Procesos (UDP)</h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-indigo-500" />
                        Aseguramiento de calidad en línea de producción
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push('/audit/new')}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> Nueva Auditoría
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="relative col-span-1 md:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por OP o Producto..." 
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select 
                        className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none appearance-none font-semibold text-gray-700"
                        value={processFilter}
                        onChange={(e) => setProcessFilter(e.target.value)}
                    >
                        <option value="ALL">Todos los Procesos</option>
                        <option value="Corte">Corte</option>
                        <option value="Confección">Confección</option>
                        <option value="Lavado">Lavado</option>
                        <option value="Acabados">Acabados</option>
                    </select>
                </div>

                <div className="relative">
                    <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select 
                        className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none appearance-none font-semibold text-gray-700"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">Todos los Estados</option>
                        <option value="CONFORME">Conforme</option>
                        <option value="OBSERVACION">Observación</option>
                        <option value="NO_CONFORME">No Conforme</option>
                        <option value="EN_PROCESO">En Proceso</option>
                        <option value="FINALIZADO">Finalizado</option>
                    </select>
                </div>
            </div>

            {/* CONTENT */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-50 animate-pulse rounded-2xl" />)}
                    </div>
                ) : filteredAudits.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ClipboardCheck className="w-12 h-12 text-gray-200" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron auditorías</h3>
                        <p className="text-gray-400 mb-8 max-w-sm mx-auto">Realiza tu primera auditoría de proceso para comenzar a registrar el control de calidad.</p>
                        <button 
                            onClick={() => router.push('/audit/new')}
                            className="bg-gray-900 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-black transition shadow-xl shadow-gray-200"
                        >
                            Comenzar Auditoría
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-gray-400">Proceso / OP</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-gray-400">Producto</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-gray-400">Fecha / Auditor</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-gray-400 text-center">Resultado</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-gray-400 text-center">Estado</th>
                                    <th className="px-8 py-5 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredAudits.map((audit) => {
                                    const proc = PROCESS_INFO[audit.process as keyof typeof PROCESS_INFO] || { color: 'bg-gray-100 text-gray-700', icon: Box };
                                    const Icon = proc.icon;
                                    
                                    return (
                                        <motion.tr 
                                            key={audit.id} 
                                            initial={{ opacity: 0 }} 
                                            animate={{ opacity: 1 }}
                                            className="group hover:bg-gray-50/80 transition-all cursor-pointer"
                                            onClick={() => router.push(`/audit/${audit.id}`)}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl ${proc.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 uppercase">{audit.process}</p>
                                                        <p className="text-xs font-bold text-indigo-600 font-mono tracking-tighter mt-0.5">{audit.op}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="font-bold text-gray-900 text-sm">
                                                    {audit.product?.name || audit.sample?.name || 'Item Desconocido'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">
                                                    {audit.product?.sku || (audit.sample ? `SAMP-${audit.sample.id.slice(-4).toUpperCase()}` : '---')}
                                                    {audit.sample && <span className="ml-2 text-amber-500 bg-amber-50 px-1 rounded">MUESTRA</span>}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-700 font-semibold">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    {new Date(audit.auditDate).toLocaleDateString('es-PE')}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                                                    <UserIcon className="w-3.5 h-3.5" />
                                                    {audit.inspector?.name}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                {getStatusBadge(audit.result)}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider ${
                                                    audit.status === 'FINALIZADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {audit.logisticsStatus === 'RECIBIDO' ? '✅ COMPLETADO' : audit.status === 'FINALIZADO' ? '✅ FINALIZADO' : '🔄 EN PROCESO'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end bg-gray-100/50 w-fit ml-auto p-2 rounded-xl group-hover:bg-indigo-600 transition-colors group-hover:text-white text-gray-400 border border-transparent group-hover:shadow-lg group-hover:shadow-indigo-200">
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
}
