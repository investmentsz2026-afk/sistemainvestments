'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import {
    Search,
    Filter,
    ShoppingBag,
    User,
    Calendar,
    ChevronRight,
    ArrowUpRight,
    MapPin,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    Plus,
    Tag,
    CreditCard,
    Truck,
    AlertCircle,
    Pencil
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

import { NotaPedidoModal } from '../../components/orders/NotaPedidoModal';
import { toast } from 'react-hot-toast';

export default function OrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT' | 'VIEW'>('CREATE');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    // Advanced Filter state
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [zoneFilter, setZoneFilter] = useState('ALL');

    // Derive display zone for title and subtitle
    const displayZone = user?.zone || (
        user?.role === 'VENDEDOR_LIMA' ? 'LIMA' : 
        user?.role === 'VENDEDOR_ORIENTE' ? 'ORIENTE' : 'OFICINA'
    );

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const resp = await api.get('/orders');
            setOrders(resp.data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setSelectedOrder(null);
        setModalMode('CREATE');
        setShowModal(true);
    };

    const handleView = (order: any) => {
        setSelectedOrder(order);
        setModalMode('VIEW');
        setShowModal(true);
    };

    const handleEdit = (order: any) => {
        setSelectedOrder(order);
        setModalMode('EDIT');
        setShowModal(true);
    };

    const handleSendToLogistics = async (id: string) => {
        try {
            await api.patch(`/orders/${id}/send-to-logistics`);
            toast.success('Pedido enviado a Logística');
            fetchOrders();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al procesar el envío');
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             o.seller?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
        
        // Advanced filters
        const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
        const matchesStart = !startDate || orderDate >= startDate;
        const matchesEnd = !endDate || orderDate <= endDate;
        const matchesZone = zoneFilter === 'ALL' || o.zone === zoneFilter;

        return matchesSearch && matchesStatus && matchesStart && matchesEnd && matchesZone;
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'ENTREGADO': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'DESPACHADO': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'EN_LOGISTICA': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'ANULADO': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'PENDIENTE': return 'bg-amber-50 text-amber-600 border-amber-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status) {
            case 'ENTREGADO': return <CheckCircle2 className="w-3.5 h-3.5" />;
            case 'DESPACHADO': return <Truck className="w-3.5 h-3.5" />;
            case 'EN_LOGISTICA': return <Truck className="w-3.5 h-3.5" />;
            case 'ANULADO': return <XCircle className="w-3.5 h-3.5" />;
            case 'PENDIENTE': return <Clock className="w-3.5 h-3.5" />;
            default: return <Tag className="w-3.5 h-3.5" />;
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4 uppercase">
                            Notas de Pedido
                            {displayZone !== 'OFICINA' && (
                                <span className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-200">
                                    {displayZone}
                                </span>
                            )}
                        </h1>
                        <p className="text-gray-500 font-medium text-lg mt-1">
                            {user?.role === 'COMERCIAL' 
                             ? 'Gestión y aprobación de pedidos para logística.' 
                             : `Mis pedidos registrados en la zona ${displayZone}.`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/sales"
                            className="flex items-center gap-2 bg-white text-gray-900 px-6 py-3.5 rounded-2xl font-bold border border-gray-100 shadow-sm hover:bg-gray-50 transition"
                        >
                            Ver Ventas
                        </Link>
                        <button 
                            onClick={handleOpenCreate}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition active:scale-95"
                        >
                            <Plus className="w-5 h-5" /> Realizar Pedido
                        </button>
                    </div>
                </div>

                {/* FILTERS */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                        <div className="md:col-span-2 relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Buscar por cliente, OP, vendedor..."
                                className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none text-gray-700 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div>
                            <select 
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-bold text-gray-600 cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">TODOS LOS ESTADOS</option>
                                <option value="PENDIENTE">PENDIENTES</option>
                                <option value="EN_LOGISTICA">ENVIADOS A LOGÍSTICA</option>
                                <option value="DESPACHADO">DESPACHADOS</option>
                                <option value="ENTREGADO">COMPLETADOS</option>
                                <option value="ANULADO">ANULADOS</option>
                            </select>
                        </div>
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className={`flex items-center justify-center gap-2 font-bold rounded-2xl py-4 transition-all ${showAdvanced ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}
                        >
                            <Filter className="w-5 h-5" /> Avanzado
                        </button>
                    </div>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/10"
                            >
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Desde Fecha</label>
                                    <input 
                                        type="date"
                                        className="w-full px-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-gray-600"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Hasta Fecha</label>
                                    <input 
                                        type="date"
                                        className="w-full px-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-gray-600"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                {user?.role === 'COMERCIAL' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Zona</label>
                                        <select 
                                            className="w-full px-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-gray-600"
                                            value={zoneFilter}
                                            onChange={(e) => setZoneFilter(e.target.value)}
                                        >
                                            <option value="ALL">TODAS LAS ZONAS</option>
                                            <option value="LIMA">LIMA</option>
                                            <option value="ORIENTE">ORIENTE</option>
                                            <option value="OFICINA">OFICINA</option>
                                        </select>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* LISTING */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="h-64 bg-white rounded-[2rem] flex items-center justify-center animate-pulse">
                            <ShoppingBag className="w-10 h-10 text-gray-300 animate-bounce" />
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 text-gray-400 font-medium">
                            No se encontraron pedidos con los filtros actuales.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredOrders.map((order, i) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/10 hover:shadow-indigo-100 transition-all group lg:flex items-center justify-between gap-6"
                                >
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                                            <ShoppingBag className="w-8 h-8" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                                                    #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                                                </span>
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(order.status)}`}>
                                                    <StatusIcon status={order.status} />
                                                    {order.status}
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 truncate">
                                                {order.client?.name || 'Cliente sin nombre'}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold text-nowrap">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold whitespace-nowrap">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {order.condition || 'Sin condición'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SELLER / ZONE INFO - EMPHASIS HERE */}
                                    <div className="lg:w-1/4 py-4 lg:py-0 px-4 lg:px-0 lg:border-l lg:border-r border-gray-50 flex flex-col justify-center gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-xs shrink-0">
                                                {order.seller?.name?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Vendedor</p>
                                                <p className="text-sm font-black text-gray-900 truncate">{order.seller?.name || 'Sistema'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                            <span className="text-xs font-black text-gray-600 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-md">
                                                {order.seller?.zone || 'OFICINA'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Monto Total</p>
                                            <p className="text-2xl font-black text-gray-900 uppercase">
                                                S/ {order.totalAmount.toLocaleString()}
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {order.status === 'PENDIENTE' && (user?.role === 'COMERCIAL' || user?.role === 'ADMIN' || order.sellerId === user?.id) && (
                                                <div className="flex items-center gap-2">
                                                    {(user?.role === 'COMERCIAL' || user?.role === 'ADMIN') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleSendToLogistics(order.id); }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-indigo-200 uppercase tracking-tight"
                                                            title="Enviar a Logística"
                                                        >
                                                            <Truck className="w-4 h-4" /> Enviar
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(order); }}
                                                        className="p-3.5 bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white rounded-2xl transition-all shadow-sm"
                                                        title="Editar Pedido"
                                                    >
                                                        <Pencil className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => handleView(order)}
                                                className="p-3.5 bg-gray-50 hover:bg-indigo-600 text-gray-400 hover:text-white rounded-2xl transition-all shadow-sm"
                                                title="Ver Detalles"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
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
                readOnly={modalMode === 'VIEW'}
            />
        </Layout>
    );
}
