// frontend/app/dispatch/page.tsx
'use client';

import React from 'react';
import { Layout } from '../../components/common/Layout';
import {
    Truck,
    Package,
    Search,
    Filter,
    Download,
    FileText,
    Clock,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    User,
    MapPin,
    Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DispatchPage() {
    const [searchTerm, setSearchTerm] = React.useState('');

    const stats = [
        { label: 'Pendientes', value: '0', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
        { label: 'En Camino', value: '0', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Entregados', value: '0', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { label: 'Incidencias', value: '0', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-100' },
    ];

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-600 rounded-xl">
                            <Truck className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Módulo de Despacho</h1>
                    </div>
                    <p className="text-gray-500">Gestión de logística, envíos y descarga de comprobantes para el personal de almacén.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {stats.map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 ${stat.bg} rounded-xl ${stat.color}`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-gray-900">{stat.value}</span>
                                <span className="text-xs text-gray-400 font-medium">Pedidos</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, pedido o factura..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
                            <Filter className="w-4 h-4" />
                            Filtros
                        </button>
                        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20">
                            <Download className="w-4 h-4" />
                            Exportar
                        </button>
                    </div>
                </div>

                {/* Placeholder Table / Content */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative min-h-[400px]">
                    {/* Transparent Overlay for "Coming Soon" */}
                    <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/40 rotate-12">
                            <Package className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Módulo en Desarrollo</h2>
                        <p className="text-gray-500 max-w-md mx-auto mb-8 font-medium">
                            Esta sección estará activa próximamente cuando se habilite el <span className="text-indigo-600 font-bold">Módulo Comercial</span> para registrar ventas y pedidos de clientes.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                                <FileText className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold text-gray-700">Descarga de Facturas</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-gray-700">Rutas de Envío</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                                <Calendar className="w-4 h-4 text-purple-500" />
                                <span className="text-xs font-bold text-gray-700">Programación de Carga</span>
                            </div>
                        </div>
                    </div>

                    {/* Dummy Table Data (Blurred behind overlay) */}
                    <div className="p-6 opacity-30 select-none pointer-events-none">
                        <div className="flex justify-between items-center mb-6">
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-xl"></div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-40 bg-gray-200 rounded"></div>
                                            <div className="h-3 w-24 bg-gray-100 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 bg-gray-50 rounded-lg"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
