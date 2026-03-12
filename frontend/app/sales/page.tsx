'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import {
    Plus,
    Search,
    Filter,
    ArrowUpRight,
    ShoppingBag,
    Calendar,
    User,
    ChevronRight,
    ArrowDown,
    ArrowUp,
    Download,
    CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function SalesPage() {
    const { user } = useAuth();
    const [sales, setSales] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const resp = await api.get('/sales');
            setSales(resp.data || []);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSales = sales.filter(s => {
        const matchesSearch = s.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             s.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);

    const cardClass = "bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20";

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Módulo de Ventas</h1>
                        <p className="text-gray-500 font-medium text-lg mt-1">Historial de transacciones y facturación.</p>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'COMERCIAL') && (
                        <Link 
                            href="/sales/new"
                            className="flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl hover:bg-black transition active:scale-95"
                        >
                            <Plus className="w-5 h-5" /> Registrar Venta
                        </Link>
                    )}
                </div>

                {/* STATS SUMMARY */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`${cardClass} p-8 flex items-center gap-6`}>
                        <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center">
                            <ArrowUpRight className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Ingresos Totales</p>
                            <h3 className="text-3xl font-black text-gray-900">${totalRevenue.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className={`${cardClass} p-8 flex items-center gap-6`}>
                        <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Pedidos</p>
                            <h3 className="text-3xl font-black text-gray-900">{filteredSales.length}</h3>
                        </div>
                    </div>
                    <div className={`${cardClass} p-8 flex items-center gap-6`}>
                        <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center">
                            <CreditCard className="w-8 h-8 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Ticket Promedio</p>
                            <h3 className="text-3xl font-black text-gray-900">
                                ${filteredSales.length > 0 ? (totalRevenue / filteredSales.length).toFixed(2) : '0'}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* FILTERS */}
                <div className={`${cardClass} p-4 flex flex-wrap items-center gap-4`}>
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por cliente, nro factura o ID..."
                            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                         <Filter className="w-5 h-5 text-gray-400" />
                         <select 
                            className="bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-gray-700 outline-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                         >
                            <option value="ALL">Todos los Estados</option>
                            <option value="COMPLETADO">Completado</option>
                            <option value="ANULADO">Anulado</option>
                         </select>
                    </div>
                </div>

                {/* SALES LIST */}
                <div className={`${cardClass} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">ID / Factura</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendedor</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-20 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : filteredSales.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-20 text-center opacity-50 italic">No se encontraron ventas</td>
                                    </tr>
                                ) : (
                                    filteredSales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-50/50 transition duration-150 group">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs font-black text-indigo-600 uppercase">#{sale.id.slice(-6)}</span>
                                                    <span className="text-sm font-bold text-gray-900 mt-0.5">{sale.invoiceNumber || 'Sin Factura'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-black text-gray-400 text-xs">
                                                        {sale.client?.name?.charAt(0) || 'C'}
                                                    </div>
                                                    <span className="font-bold text-gray-900">{sale.client?.name || 'Cliente Varios'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(sale.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-lg font-black text-gray-900">${sale.totalAmount.toLocaleString()}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                                    <User className="w-4 h-4" />
                                                    {sale.seller?.name}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                    sale.status === 'COMPLETADO' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {sale.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition group-hover:scale-110">
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                     <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition">
                        <Download className="w-5 h-5" /> Exportar Reporte de Ventas
                     </button>
                </div>
            </div>
        </Layout>
    );
}
