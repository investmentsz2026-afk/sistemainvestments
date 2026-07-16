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
import toast from 'react-hot-toast';
import { Eye, Wallet, FileSpreadsheet, FileText, Send } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import SaleDetailsModal from '../../components/sales/SaleDetailsModal';
import SalePaymentsModal from '../../components/sales/SalePaymentsModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.endsWith('T00:00:00.000Z')) {
        return new Date(dateString).toLocaleDateString('es-PE', { timeZone: 'UTC' });
    }
    return new Date(dateString).toLocaleDateString('es-PE');
};

export default function SalesPage() {
    const { user } = useAuth();
    const [sales, setSales] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [zoneFilter, setZoneFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState<'ACTIVOS' | 'ANULADOS'>('ACTIVOS');

    // Modal state
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);

    const openDetails = (id: string) => {
        setSelectedSaleId(id);
        setIsModalOpen(true);
    };

    const openPayments = (id: string) => {
        setSelectedSaleId(id);
        setIsPaymentsModalOpen(true);
    };

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
    
    const handleSendToSunat = async (id: string) => {
        try {
            toast.loading('Enviando a SUNAT...', { id: 'sunat' });
            await api.post(`/sales/${id}/sunat`);
            toast.success('¡Enviado a SUNAT correctamente!', { id: 'sunat' });
            fetchSales();
        } catch (error: any) {
            console.error('Error sending to SUNAT:', error);
            toast.error(error.response?.data?.message || 'Error al enviar a SUNAT', { id: 'sunat' });
        }
    };

    const filteredSales = sales.filter(s => {
        const matchesSearch = s.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             s.notes?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
        
        const saleDate = new Date(s.createdAt).toISOString().split('T')[0];
        const matchesStart = !startDate || saleDate >= startDate;
        const matchesEnd = !endDate || saleDate <= endDate;
        const activeZone = s.seller?.zone || 'OFICINA';
        const matchesZone = zoneFilter === 'ALL' || activeZone === zoneFilter;

        const matchesViewMode = viewMode === 'ACTIVOS' ? s.status !== 'ANULADO' : s.status === 'ANULADO';

        return matchesSearch && matchesStatus && matchesStart && matchesEnd && matchesZone && matchesViewMode;
    });

    // Stats calculations
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const activeSales = sales.filter(s => s.status !== 'ANULADO');

    const dailyRevenue = activeSales.filter(s => s.createdAt.startsWith(todayStr)).reduce((acc, s) => acc + s.totalAmount, 0);
    const monthlyRevenue = activeSales.filter(s => {
        const d = new Date(s.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((acc, s) => acc + s.totalAmount, 0);
    const annualRevenue = activeSales.filter(s => new Date(s.createdAt).getFullYear() === thisYear).reduce((acc, s) => acc + s.totalAmount, 0);

    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);

    // Dynamic cost: always uses the CURRENT product purchasePrice, not the stored cost
    const calcDynamicCost = (sale: any) => {
        return (sale.items || []).reduce((acc: number, item: any) => {
            const currentCost = item.variant?.product?.purchasePrice || 0;
            return acc + (currentCost * item.quantity);
        }, 0);
    };

    const totalCost = filteredSales.reduce((acc, s) => acc + calcDynamicCost(s), 0);
    const totalProfit = totalRevenue - totalCost;

    const getExportData = () => {
        const isComercial = user?.role === 'ADMIN' || user?.role === 'COMERCIAL';
        const data: any[] = [];
        filteredSales.forEach(sale => {
            const date = formatDate(sale.createdAt);
            const clientName = sale.client?.name || 'Cliente Varios';
            
            if (sale.items && sale.items.length > 0) {
                sale.items.forEach((item: any) => {
                    const row: any = {
                        'Factura/Boleta': sale.invoiceNumber || 'S/N',
                        'Fecha': date,
                        'Cliente': clientName,
                        'Vendedor': sale.seller?.name || 'N/A',
                        'Zona Vendedor': sale.seller?.zone || 'OFICINA',
                        'Modelo': item.variant?.product?.name || 'N/A',
                        'Color': item.variant?.color || 'N/A',
                        'Talla': item.variant?.size || 'N/A',
                        'Cant.': item.quantity,
                        'Precio U.': item.unitPrice,
                        'Subtotal': item.totalPrice,
                    };
                    if (isComercial) {
                        row['Costo U.'] = item.variant?.product?.purchasePrice || 0;
                        row['Costo Total Item'] = (item.variant?.product?.purchasePrice || 0) * item.quantity;
                    }
                    row['Total Factura'] = sale.totalAmount;
                    if (isComercial) {
                        row['Costo Total Factura'] = calcDynamicCost(sale);
                    }
                    row['Estado Factura'] = sale.status;
                    row['Estado Pago'] = sale.paymentStatus || 'PENDIENTE';
                    data.push(row);
                });
            } else {
                const row: any = {
                    'Factura/Boleta': sale.invoiceNumber || 'S/N',
                    'Fecha': date,
                    'Cliente': clientName,
                    'Vendedor': sale.seller?.name || 'N/A',
                    'Zona Vendedor': sale.seller?.zone || 'OFICINA',
                    'Modelo': 'N/A',
                    'Color': 'N/A',
                    'Talla': 'N/A',
                    'Cant.': 0,
                    'Precio U.': 0,
                    'Subtotal': 0,
                };
                if (isComercial) {
                    row['Costo U.'] = 0;
                    row['Costo Total Item'] = 0;
                }
                row['Total Factura'] = sale.totalAmount;
                if (isComercial) {
                    row['Costo Total Factura'] = calcDynamicCost(sale);
                }
                row['Estado Factura'] = sale.status;
                row['Estado Pago'] = sale.paymentStatus || 'PENDIENTE';
                data.push(row);
            }
        });
        return data;
    };

    const getSummaryExportData = () => {
        return filteredSales.map(sale => {
            const date = formatDate(sale.createdAt);
            const doc = sale.invoiceNumber || 'S/N';
            const clientName = sale.client?.name || 'Cliente Varios';
            
            const approvedPayments = (sale.payments || []).filter((p: any) => p.status === 'APROBADO');
            const sortedPayments = [...approvedPayments].sort((a: any, b: any) => 
                new Date(a.paymentDate || a.createdAt).getTime() - new Date(b.paymentDate || b.createdAt).getTime()
            );
            
            const dep1 = sortedPayments[0] ? sortedPayments[0].amount : '';
            const dep2 = sortedPayments[1] ? sortedPayments[1].amount : '';
            
            const totalCobranza = approvedPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
            const saldo = sale.totalAmount - totalCobranza;

            return {
                'F.E.': date,
                'DOC': doc,
                'CLIENTE': clientName,
                'MONTO SEGÚN FACTURA': sale.totalAmount,
                'DEPOSITO 1': dep1,
                'DEPOSITO 2': dep2,
                'TOTAL COBRANZA': totalCobranza,
                'SALDO': saldo
            };
        });
    };

    const exportToExcel = () => {
        const summaryData = getSummaryExportData();
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);

        const detailedData = getExportData();
        const wsDetailed = XLSX.utils.json_to_sheet(detailedData);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsSummary, "General");
        XLSX.utils.book_append_sheet(wb, wsDetailed, "Ventas Detallado");

        XLSX.writeFile(wb, `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = () => {
        const data = getExportData();
        if (data.length === 0) return;
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(14);
        doc.text('Reporte de Ventas Detallado - Investments Z&G', 14, 20);
        
        const tableColumn = Object.keys(data[0]);
        const tableRows = data.map(item => Object.values(item));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows as any[],
            startY: 30,
            styles: { fontSize: 7, cellPadding: 1 },
            headStyles: { fillColor: [79, 70, 229] } // root indigo-600
        });
        
        doc.save(`Reporte_Ventas_${new Date().toISOString().split('T')[0]}.pdf`);
    };

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
                    {(user?.role === 'ADMIN' || user?.role === 'COMERCIAL' || user?.role === 'VENDEDOR_LIMA' || user?.role === 'VENDEDOR_ORIENTE') && (
                        <div className="flex gap-4">
                            <button 
                                onClick={async () => {
                                    try {
                                        toast.loading('Sincronizando pedidos...', { id: 'sync' });
                                        const res = await api.get('/orders/fix-stuck');
                                        toast.success(`Sincronización completada. Pedidos recuperados: ${res.data.fixedCount}`, { id: 'sync' });
                                    } catch (e) {
                                        toast.error('Error al sincronizar', { id: 'sync' });
                                    }
                                }}
                                className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-6 py-4 rounded-2xl font-bold hover:bg-indigo-200 transition active:scale-95"
                            >
                                Sincronizar Pedidos
                            </button>
                            <Link 
                                href="/sales/new"
                                className="flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl hover:bg-black transition active:scale-95"
                            >
                                <Plus className="w-5 h-5" /> Registrar Venta
                            </Link>
                        </div>
                    )}
                </div>

                {/* STATS SUMMARY */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${(user?.role === 'ADMIN' || user?.role === 'COMERCIAL') ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-6`}>
                    <div className={`${cardClass} p-8 flex items-center gap-6`}>
                        <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center">
                            <ArrowUpRight className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Ingresos Totales</p>
                            <h3 className="text-3xl font-black text-gray-900">S/ {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'COMERCIAL') && (
                        <>
                            <div className={`${cardClass} p-8 flex items-center gap-6`}>
                                <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center">
                                    <ArrowUpRight className="w-8 h-8 text-rose-600" style={{ transform: 'rotate(90deg)' }} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Costo Total</p>
                                    <h3 className="text-3xl font-black text-gray-900">S/ {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                </div>
                            </div>
                            <div className={`${cardClass} p-8 flex items-center gap-6`}>
                                <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center">
                                    <ArrowUpRight className="w-8 h-8 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Utilidad Estimada</p>
                                    <h3 className="text-3xl font-black text-gray-900">S/ {totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                </div>
                            </div>
                        </>
                    )}
                    <div className={`${cardClass} p-8 flex items-center gap-6`}>
                        <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Ventas</p>
                            <h3 className="text-3xl font-black text-gray-900">{filteredSales.length}</h3>
                        </div>
                    </div>
                </div>

                {/* TEMPORAL PERFORMANCE CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/5 hover:border-indigo-100 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg">Filtro Hoy</span>
                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Ventas del Día</p>
                        <h4 className="text-2xl font-black text-gray-900">S/ {dailyRevenue.toLocaleString()}</h4>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/5 hover:border-indigo-100 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg">Filtro Mes</span>
                            <ArrowUpRight className="w-4 h-4 text-indigo-500" />
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Ventas del Mes</p>
                        <h4 className="text-2xl font-black text-gray-900">S/ {monthlyRevenue.toLocaleString()}</h4>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/5 hover:border-indigo-100 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-lg">Filtro Año</span>
                            <ArrowUpRight className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Ventas del Año</p>
                        <h4 className="text-2xl font-black text-gray-900">S/ {annualRevenue.toLocaleString()}</h4>
                    </div>
                </div>

                {/* VIEW TABS */}
                <div className="flex bg-gray-100 p-1.5 rounded-2xl w-max shadow-inner">
                    <button
                        onClick={() => setViewMode('ACTIVOS')}
                        className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${viewMode === 'ACTIVOS' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Ventas Activas
                    </button>
                    <button
                        onClick={() => setViewMode('ANULADOS')}
                        className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${viewMode === 'ANULADOS' ? 'bg-white text-rose-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Ventas Anuladas
                    </button>
                </div>

                {/* FILTERS */}
                <div className="space-y-4">
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
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className={`flex items-center justify-center gap-2 font-bold rounded-2xl px-6 py-3.5 transition-all ${showAdvanced ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}
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

                {/* EXPORT BUTTONS */}
                <div className="flex justify-end gap-3 mb-2">
                     <button onClick={exportToExcel} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl font-black text-emerald-600 hover:bg-emerald-100 transition-all shadow-sm text-sm">
                        <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
                     </button>
                     <button onClick={exportToPDF} className="flex items-center gap-2 px-6 py-2.5 bg-red-50 border border-red-100 rounded-xl font-black text-red-600 hover:bg-red-100 transition-all shadow-sm text-sm">
                        <FileText className="w-4 h-4" /> Exportar PDF
                     </button>
                </div>

                {/* SALES LIST */}
                <div className={`${cardClass} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">ID / Factura</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendedor</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Venta</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cobro</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">SUNAT</th>
                                    <th className="px-4 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                                    {(user?.role === 'ADMIN' || user?.role === 'COMERCIAL') && (
                                        <th className="px-4 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={(user?.role === 'ADMIN' || user?.role === 'COMERCIAL') ? 10 : 9} className="px-4 py-20 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : filteredSales.length === 0 ? (
                                    <tr>
                                        <td colSpan={(user?.role === 'ADMIN' || user?.role === 'COMERCIAL') ? 10 : 9} className="px-4 py-20 text-center opacity-50 italic">No se encontraron ventas</td>
                                    </tr>
                                ) : (
                                    filteredSales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-50/50 transition duration-150 group">
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-[10px] font-black text-indigo-600 uppercase">#{sale.id.slice(-6)}</span>
                                                    <span className="text-xs font-bold text-gray-900 mt-0.5">{sale.invoiceNumber || 'Sin Factura'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center font-black text-gray-400 text-[10px]">
                                                        {sale.client?.name?.charAt(0) || 'C'}
                                                    </div>
                                                    <span className="font-bold text-gray-900 text-xs">{sale.client?.name || 'Cliente Varios'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500" suppressHydrationWarning>
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(sale.createdAt)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm font-black text-gray-900">S/ {sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600">
                                                    <User className="w-3 h-3" />
                                                    {sale.seller?.name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-1 rounded border text-[9px] font-black uppercase tracking-widest ${
                                                    sale.status === 'COMPLETADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                                                }`}>
                                                    {sale.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-1 rounded border text-[9px] font-black uppercase tracking-widest ${
                                                    sale.paymentStatus === 'CANCELADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                    sale.paymentStatus === 'PARCIAL' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {sale.paymentStatus || 'PENDIENTE'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    {sale.invoiceNumber ? (
                                                        <>
                                                            <span 
                                                                className={`px-2 py-1 rounded border text-[9px] font-black uppercase tracking-widest cursor-help ${
                                                                    sale.sunatStatus === 'ACEPTADO' || sale.sunatStatus === 'ENVIADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    sale.sunatStatus === 'ERROR' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-400 border-gray-200'
                                                                }`}
                                                                title={sale.sunatResponse || (sale.sunatStatus === 'ERROR' ? 'Error desconocido' : '')}
                                                            >
                                                                {sale.sunatStatus || 'PENDIENTE'}
                                                            </span>
                                                            {(sale.sunatStatus === 'PENDIENTE' || sale.sunatStatus === 'ERROR' || !sale.sunatStatus) && (user?.role === 'ADMIN' || user?.role === 'COMERCIAL') && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSendToSunat(sale.id);
                                                                    }}
                                                                    className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition shadow-sm"
                                                                    title="Enviar a SUNAT"
                                                                >
                                                                    <Send className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                                                            N/A
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => openPayments(sale.id)}
                                                        className="p-1.5 border border-emerald-100 rounded-lg text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-200 shadow-sm transition flex items-center gap-1 px-2 whitespace-nowrap"
                                                    >
                                                        <Wallet className="w-3 h-3" />
                                                        <span className="text-[10px] font-black uppercase">Pagos</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => openDetails(sale.id)}
                                                        className="p-1.5 border border-gray-100 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 shadow-sm transition flex items-center gap-1 px-2"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        <span className="text-[10px] font-black uppercase">Ver</span>
                                                    </button>
                                                </div>
                                            </td>
                                            {(user?.role === 'ADMIN' || user?.role === 'COMERCIAL') && (
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-xs font-black text-rose-500 font-mono">S/ {calcDynamicCost(sale).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {selectedSaleId && (
                <SaleDetailsModal 
                    saleId={selectedSaleId}
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedSaleId(null);
                    }}
                />
            )}

            {selectedSaleId && (
                <SalePaymentsModal 
                    saleId={selectedSaleId}
                    isOpen={isPaymentsModalOpen}
                    onClose={() => {
                        setIsPaymentsModalOpen(false);
                        setSelectedSaleId(null);
                    }}
                    onUpdate={fetchSales}
                />
            )}
        </Layout>
    );
}
