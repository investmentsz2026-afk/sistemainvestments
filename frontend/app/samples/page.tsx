'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import {
    Plus,
    Search,
    FileText,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    ArrowRight,
    Camera,
    ClipboardList,
    Beaker
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function SamplesPage() {
    const { user } = useAuth();
    const [samples, setSamples] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSamples();
    }, []);

    const fetchSamples = async () => {
        try {
            const resp = await api.get('/samples');
            setSamples(resp.data || []);
        } catch (error) {
            console.error('Error fetching samples:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = {
        total: samples.length,
        approved: samples.filter((s: any) => s.status === 'APROBADO').length,
        pending: samples.filter((s: any) => s.status === 'PENDIENTE').length,
        observed: samples.filter((s: any) => s.status === 'OBSERVADO').length,
    };

    const filteredSamples = samples.filter((s: any) => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.odp?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const cardClass = "bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20";

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200">
                            <Beaker className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Muestro y Desarrollo</h1>
                            <p className="text-gray-500 font-medium text-lg mt-1">Gestión profesional de prototipos y muestras.</p>
                        </div>
                    </div>
                    {user?.role === 'ODP' && (
                        <Link 
                            href="/samples/new"
                            className="flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl hover:bg-black transition active:scale-95"
                        >
                            <Plus className="w-5 h-5" /> Nueva Muestra
                        </Link>
                    )}
                </div>

                {/* STATS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Prototipos', value: stats.total, color: 'indigo' },
                        { label: 'Aprobados', value: stats.approved, color: 'emerald' },
                        { label: 'Pendientes', value: stats.pending, color: 'amber' },
                        { label: 'Observados', value: stats.observed, color: 'rose' },
                    ].map((stat, i) => (
                        <div key={i} className={`${cardClass} flex flex-col items-center text-center p-6`}>
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                             <h3 className={`text-4xl font-black text-${stat.color}-600`}>{stat.value}</h3>
                        </div>
                    ))}
                </div>

                {/* FILTERS */}
                <div className={`${cardClass} p-4 flex items-center gap-4`}>
                    <div className="flex-1 relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre de muestra o desarrollador..."
                            className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-6 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {isLoading ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                        </div>
                    ) : filteredSamples.length === 0 ? (
                        <div className="col-span-full py-20 text-center opacity-30 italic font-black uppercase tracking-widest text-sm">No se encontraron muestras</div>
                    ) : (
                        filteredSamples.map((sample: any) => (
                            <motion.div 
                                key={sample.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`${cardClass} group hover:border-indigo-200 transition-all duration-300 flex flex-col`}
                            >
                                <div className="aspect-video bg-gray-50 rounded-3xl mb-6 overflow-hidden relative">
                                    {sample.images && sample.images.length > 0 ? (
                                        <img src={sample.images[0]} alt={sample.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-200">
                                            <Camera className="w-12 h-12" />
                                            <span className="text-[10px] font-black uppercase mt-2">Sin Evidencia Visual</span>
                                        </div>
                                    )}
                                    <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${
                                        sample.status === 'APROBADO' ? 'bg-emerald-500 text-white' :
                                        sample.status === 'OBSERVADO' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                                    }`}>
                                        {sample.status}
                                    </div>
                                </div>

                                <h3 className="text-xl font-black text-gray-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">{sample.name}</h3>
                                <p className="text-gray-400 text-sm font-medium line-clamp-2 mb-6 flex-1">{sample.description || 'Sin descripción'}</p>
                                
                                <div className="space-y-4 pt-6 border-t border-gray-50 mt-auto">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <ClipboardList className="w-4 h-4 text-indigo-300" />
                                            <span>Creado por:</span>
                                        </div>
                                        <span className="text-gray-900 uppercase font-black">{sample.odp?.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Clock className="w-4 h-4 text-indigo-300" />
                                            <span>Fecha:</span>
                                        </div>
                                        <span className="text-gray-900">{new Date(sample.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <Link 
                                    href={`/samples/${sample.id}`}
                                    className="mt-8 w-full py-4 bg-gray-50 text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                >
                                    {user?.role === 'COMERCIAL' && sample.status === 'PENDIENTE' ? (
                                        <>Revisar Muestra <ArrowRight className="w-4 h-4" /></>
                                    ) : (
                                        <>Ver Detalles <Eye className="w-4 h-4" /></>
                                    )}
                                </Link>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </Layout>
    );
}
