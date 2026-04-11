// frontend/app/dispatch/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
    Calendar,
    Eye,
    ShoppingCart,
    Tag
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/axios';
import { useAuth } from '../../hooks/useAuth';
import { NotaPedidoModal } from '../../components/orders/NotaPedidoModal';

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.endsWith('T00:00:00.000Z')) {
        return new Date(dateString).toLocaleDateString('es-PE', { timeZone: 'UTC' });
    }
    return new Date(dateString).toLocaleDateString('es-PE');
};

export default function DispatchPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const resp = await api.get('/orders');
            // Logistics should only see what is sent to them or completed
            const allOrders = resp.data || [];
            setOrders(allOrders);
        } catch (error) {
            console.error('Error fetching orders for dispatch:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleView = (order: any) => {
        setSelectedOrder(order);
        setShowModal(true);
    };

    const dispatchOrders = orders
        .filter(o => 
            (o.status === 'EN_LOGISTICA' || o.status === 'DESPACHADO' || o.status === 'COMPLETADO') &&
            (o.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
             o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const stats = [
        { 
            label: 'Por Despachar', 
            value: orders.filter(o => o.status === 'EN_LOGISTICA').length.toString(), 
            icon: Clock, 
            color: 'text-amber-600', 
            bg: 'bg-amber-100' 
        },
        { 
            label: 'Despachados', 
            value: orders.filter(o => o.status === 'DESPACHADO').length.toString(), 
            icon: Truck, 
            color: 'text-blue-600', 
            bg: 'bg-blue-100' 
        },
        { 
            label: 'Completados', 
            value: orders.filter(o => o.status === 'COMPLETADO').length.toString(), 
            icon: CheckCircle, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-100' 
        },
        { 
            label: 'Total Recibidos', 
            value: dispatchOrders.length.toString(), 
            icon: Package, 
            color: 'text-indigo-600', 
            bg: 'bg-indigo-100' 
        },
    ];

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200">
                                <Truck className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Módulo de Despacho</h1>
                        </div>
                        <p className="text-gray-500 font-medium text-lg">Pedidos aprobados por Comercial listos para salida de almacén.</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-200/20 border border-gray-100 hover:shadow-indigo-100 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-4 ${stat.bg} rounded-2xl ${stat.color} group-hover:scale-110 transition-transform`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-gray-900">{stat.value}</span>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-tight">Pedidos</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="bg-white p-4 rounded-[2rem] shadow-xl shadow-gray-200/20 border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, pedido o Nro Nota..."
                            className="w-full pl-16 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all font-medium text-gray-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-sm font-black text-gray-600 transition-all uppercase tracking-widest">
                            <Filter className="w-5 h-5" /> Filtros
                        </button>
                    </div>
                </div>

                {/* Orders List */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="h-64 bg-white rounded-[2rem] flex items-center justify-center animate-pulse">
                            <Package className="w-10 h-10 text-gray-200 animate-bounce" />
                        </div>
                    ) : dispatchOrders.length === 0 ? (
                        <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-gray-100 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShoppingCart className="w-10 h-10 text-gray-200" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Sin pedidos para despacho</h3>
                            <p className="text-gray-400 font-medium max-w-xs mx-auto">
                                No hay pedidos pendientes de despacho en este momento.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {dispatchOrders.map((order, i) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/10 hover:shadow-indigo-100 transition-all group flex flex-col lg:flex-row items-center justify-between gap-6"
                                >
                                    <div className="flex items-center gap-6 flex-1 min-w-0">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${order.status === 'DESPACHADO' || order.status === 'COMPLETADO' ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                            <Package className="w-8 h-8" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                                                    #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                                                </span>
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                    order.status === 'DESPACHADO' ? 'border-blue-100 text-blue-600 bg-blue-50' :
                                                    order.status === 'COMPLETADO' ? 'border-emerald-100 text-emerald-600 bg-emerald-50' : 
                                                    'border-amber-100 text-amber-600 bg-amber-50'
                                                }`}>
                                                    {order.status === 'DESPACHADO' ? <Truck className="w-3.5 h-3.5" /> : order.status === 'COMPLETADO' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                                    {order.status === 'DESPACHADO' ? 'DESPACHADO' : order.status === 'COMPLETADO' ? 'ENTREGADO' : 'POR DESPACHAR'}
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 truncate uppercase tracking-tight">
                                                {order.client?.name}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-6 mt-2">
                                                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                                                    <MapPin className="w-4 h-4 text-rose-500" />
                                                    {order.zone || 'OFICINA'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(order.createdAt)}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-indigo-500 font-black">
                                                    <Tag className="w-4 h-4" />
                                                    {order.totalQuantity} PRENDAS
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                                        <div className="text-right hidden xl:block mr-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pedido</p>
                                            <p className="text-xl font-black text-gray-900">S/ {order.totalAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleView(order)}
                                                className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl transition-all shadow-sm"
                                                title="Ver Detalles"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            
                                            {order.status === 'EN_LOGISTICA' && (
                                                <Link 
                                                    href={`/dispatch/${order.id}/process`}
                                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 uppercase tracking-widest scale-up active:scale-95"
                                                >
                                                    <Truck className="w-4 h-4" /> Procesar Despacho
                                                </Link>
                                            )}

                                            {order.status === 'DESPACHADO' && (
                                                <Link 
                                                    href={`/dispatch/${order.id}/invoice`}
                                                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-emerald-100 flex items-center gap-2 uppercase tracking-widest scale-up active:scale-95"
                                                >
                                                    <FileText className="w-4 h-4" /> Generar Boleta
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <NotaPedidoModal 
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={fetchOrders}
                user={user}
                initialOrder={selectedOrder}
                readOnly={true}
            />
        </Layout>
    );
}
