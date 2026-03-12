'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, FileSearch, AlertTriangle, CheckCircle, Activity, BarChart2, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import { useState, useEffect } from 'react';
import api from '../../lib/axios';

export const ODPDashboard = () => {
    const { user } = useAuth();
    const [pendingCount, setPendingCount] = useState<number | string>('-');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const resp = await api.get('/quality/pending');
                const items = Array.isArray(resp.data) ? resp.data : (resp.data.data || []);
                setPendingCount(items.length);
            } catch (error) {
                console.error('Error fetching ODP stats:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const activityData: any[] = [];
    const recentInspections: any[] = [];

    const cardClass = "bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300";

    return (
        <div className="space-y-8">
            {/* Header específico de ODP */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Panel de ODP, <span className="text-indigo-600">{user?.name}</span> 👋
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Monitoreo en tiempo real de Calidad y Auditorías de Producción.
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Sistema Operativo
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: 'Inspecciones Hoy', value: '-', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50', gradient: 'from-blue-500 to-blue-600' },
                    { title: 'Calidad Pendiente', value: pendingCount, icon: FileSearch, color: 'text-indigo-600', bg: 'bg-indigo-50', gradient: 'from-indigo-500 to-indigo-600' },
                    { title: 'Alertas Críticas', value: '-', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', gradient: 'from-rose-500 to-rose-600' },
                    { title: 'Lotes Aprobados', value: '-', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-500 to-emerald-600' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`${cardClass} group`}
                        whileHover={{ y: -5 }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                        <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Calidad */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className={`${cardClass} lg:col-span-2`}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-500" /> Tasa de Aprobación Semanal
                            </h2>
                            <p className="text-sm text-gray-500">Lotes aprobados vs mermas / rechazos</p>
                        </div>
                    </div>
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl mx-6 mb-6">
                        {activityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={activityData}>
                                    <defs>
                                        <linearGradient id="colorAprobados" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorRechazados" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                                    <XAxis dataKey="name" stroke="#9CA3AF" axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} />
                                    <RechartsTooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="aprobados" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorAprobados)" />
                                    <Area type="monotone" dataKey="rechazados" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRechazados)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center p-6">
                                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-semibold mb-1">Sin datos de calidad</p>
                                <p className="text-xs text-gray-400">Registra inspecciones para visualizar la curva.</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Inspecciones Recientes */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className={cardClass}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" /> Últimas Evaluaciones
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {recentInspections.length > 0 ? recentInspections.map((ins, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${ins.status === 'Aprobado' ? 'bg-emerald-500' : ins.status === 'Rechazado' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">{ins.id}</p>
                                        <p className="text-xs font-mono text-gray-500">{ins.op}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs font-bold ${ins.status === 'Aprobado' ? 'text-emerald-600' : ins.status === 'Rechazado' ? 'text-rose-600' : 'text-amber-600'}`}>{ins.status}</p>
                                    <p className="text-[10px] text-gray-400">{ins.time}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-6">
                                <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm font-semibold">Cero Evaluaciones</p>
                                <p className="text-xs text-gray-400 mt-1">Aún no tienes inspecciones registradas.</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <Link href="/quality" className="text-indigo-600 text-sm font-bold flex items-center justify-center gap-1 hover:text-indigo-700">
                            Ver todas las inspecciones <BarChart2 className="w-4 h-4" />
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Acciones Rápidas */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <h2 className="text-lg font-bold text-gray-900 mb-4">🚀 Accesos Directos ODP</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/quality" className="group flex items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-lg hover:shadow-blue-100/50 hover:border-blue-200 transition-all">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Control de Calidad</h3>
                            <p className="text-sm text-gray-500">Registrar nuevas inspecciones y pruebas</p>
                        </div>
                    </Link>
                    <Link href="/audit" className="group flex items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-lg hover:shadow-indigo-100/50 hover:border-indigo-200 transition-all">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileSearch className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Auditoría</h3>
                            <p className="text-sm text-gray-500">Revisar flujos y auditar OP</p>
                        </div>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};
