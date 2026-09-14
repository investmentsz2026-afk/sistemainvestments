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
    Tag,
    XCircle,
    FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/axios';
import { useAuth } from '../../hooks/useAuth';
import { NotaPedidoModal } from '../../components/orders/NotaPedidoModal';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useProducts } from '../../hooks/useProducts';

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.endsWith('T00:00:00.000Z')) {
        return new Date(dateString).toLocaleDateString('es-PE', { timeZone: 'UTC' });
    }
    return new Date(dateString).toLocaleDateString('es-PE');
};

export default function DispatchPage() {
    const { user } = useAuth();
    const { products } = useProducts();
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'POR_DESPACHAR' | 'DESPACHADOS' | 'COMPLETADOS' | 'ANULADOS' | 'TODOS'>('POR_DESPACHAR');
    
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
            console.error('Error fetching orders:', error);
            toast.error('Error al cargar pedidos');
        } finally {
            setIsLoading(false);
        }
    };

    const executeCancelDispatch = async (orderId: string) => {
        try {
            toast.loading('Anulando despacho y devolviendo productos al inventario...', { id: 'cancelDispatch' });
            await api.patch(`/orders/${orderId}/cancel-dispatch`);
            toast.success('Despacho anulado correctamente', { id: 'cancelDispatch' });
            fetchOrders();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al anular despacho', { id: 'cancelDispatch' });
        }
    };

    const handleCancelDispatch = (orderId: string) => {
        toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-3xl pointer-events-auto flex flex-col p-6 border border-gray-100`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">Anular Despacho</h3>
                </div>
                <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
                    ¿Está seguro de anular el despacho? Todos los productos volverán al inventario y el pedido quedará listo para ser despachado nuevamente.
                </p>
                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={() => toast.dismiss(t.id)} 
                        className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-gray-200 transition"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => {
                            toast.dismiss(t.id);
                            executeCancelDispatch(orderId);
                        }} 
                        className="px-5 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-rose-700 transition shadow-lg shadow-rose-200"
                    >
                        Sí, Anular
                    </button>
                </div>
            </div>
        ), { duration: Infinity });
    };


    const handleView = (order: any) => {
        setSelectedOrder(order);
        setShowModal(true);
    };

    const exportToExcel = () => {
        const activeLabelMap: Record<string, string> = {
            'POR_DESPACHAR': 'Por Despachar',
            'DESPACHADOS': 'Despachados',
            'COMPLETADOS': 'Boletas Generadas',
            'ANULADOS': 'Anulados',
            'TODOS': 'Todos'
        };
        const activeLabel = activeLabelMap[viewMode] || 'Despacho';
        const cleanLabel = activeLabel.toLowerCase().replace(/\s+/g, '_');

        // Build fast lookup maps from products catalog
        const variantMap = new Map<string, any>();
        const productByNameMap = new Map<string, any>();

        (products || []).forEach((p: any) => {
            if (p.name) {
                productByNameMap.set(p.name.trim().toUpperCase(), p);
            }
            (p.variants || []).forEach((v: any) => {
                variantMap.set(v.id, { ...v, product: p });
                if (v.variantSku) {
                    variantMap.set(v.variantSku.trim().toUpperCase(), { ...v, product: p });
                }
            });
        });

        // ── HOJA 1: RESUMEN GENERAL DE DESPACHOS ──
        const summaryData = dispatchOrders.map(order => {
            const qty = (order.status === 'DESPACHADO' || order.status === 'ENTREGADO' || order.status === 'COMPLETADO') && Array.isArray(order.dispatchDetails) && order.dispatchDetails.length > 0 
                ? order.dispatchDetails.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
                : order.totalQuantity;

            const total = (order.status === 'DESPACHADO' || order.status === 'ENTREGADO' || order.status === 'COMPLETADO') && Array.isArray(order.items) && order.items.length > 0
                ? order.items.reduce((sum: number, item: any) => sum + ((item.dispQuantity || 0) * (item.unitPrice || 0)), 0)
                : order.totalAmount;

            let statusText = 'POR DESPACHAR';
            if (order.status === 'DESPACHADO') statusText = 'DESPACHADO';
            else if (order.status === 'COMPLETADO' || order.status === 'ENTREGADO') statusText = 'COMPLETADO / ENTREGADO';
            else if (order.status === 'ANULADO') statusText = 'ANULADO';

            return {
                'Nro Pedido': `#${order.orderNumber || order.id.slice(-6).toUpperCase()}`,
                'Fecha de Aprobación': order.createdAt ? formatDate(order.createdAt) : '--',
                'Cliente': order.client?.name || '--',
                'Zona': order.client?.zone || order.zone || 'OFICINA',
                'Dirección de Entrega': order.deliveryAddress || order.client?.address || '--',
                'Estado': statusText,
                'Cantidad Prendas': Number(qty || 0),
                'Total Pedido': Number(total || 0)
            };
        });

        const ws1 = XLSX.utils.json_to_sheet(summaryData.length > 0 ? summaryData : [{
            'Nro Pedido': '--',
            'Fecha de Aprobación': '--',
            'Cliente': '--',
            'Zona': '--',
            'Dirección de Entrega': '--',
            'Estado': '--',
            'Cantidad Prendas': 0,
            'Total Pedido': 0
        }]);

        // Column widths for sheet 1
        ws1['!cols'] = [
            { wch: 15 }, // Nro Pedido
            { wch: 22 }, // Fecha de Aprobación
            { wch: 32 }, // Cliente
            { wch: 16 }, // Zona
            { wch: 45 }, // Dirección
            { wch: 25 }, // Estado
            { wch: 18 }, // Cantidad Prendas
            { wch: 18 }  // Total Pedido
        ];

        const range1 = XLSX.utils.decode_range(ws1['!ref'] || 'A1:A1');
        ws1['!autofilter'] = { ref: XLSX.utils.encode_range(range1) };

        ws1['!views'] = [
            {
                state: 'frozen',
                ySplit: 1,
                xSplit: 0,
                topLeftCell: 'A2',
                activePane: 'bottomLeft'
            }
        ];

        for (const cellAddress in ws1) {
            if (cellAddress.startsWith('!')) continue;
            const cell = ws1[cellAddress];
            const decoded = XLSX.utils.decode_cell(cellAddress);
            const colIndex = decoded.c;
            const rowIndex = decoded.r;

            if (rowIndex === 0) continue;

            // Cantidad Prendas (col 6) -> Integer
            if (colIndex === 6) {
                cell.t = 'n';
                cell.z = '#,##0';
            }

            // Total Pedido (col 7) -> Currency (S/)
            if (colIndex === 7) {
                cell.t = 'n';
                cell.z = '"S/"#,##0.00';
            }
        }

        // ── HOJA 2: DETALLE DE PRENDAS Y OP POR PEDIDO ──
        const detailRows: any[] = [];

        dispatchOrders.forEach(order => {
            const orderNum = `#${order.orderNumber || order.id.slice(-6).toUpperCase()}`;
            const orderDate = order.createdAt ? formatDate(order.createdAt) : '--';
            const clientName = order.client?.name || '--';
            const clientZone = order.client?.zone || order.zone || 'OFICINA';
            
            let statusText = 'POR DESPACHAR';
            if (order.status === 'DESPACHADO') statusText = 'DESPACHADO';
            else if (order.status === 'COMPLETADO' || order.status === 'ENTREGADO') statusText = 'COMPLETADO / ENTREGADO';
            else if (order.status === 'ANULADO') statusText = 'ANULADO';

            const dispatchDetails = Array.isArray(order.dispatchDetails) ? order.dispatchDetails : [];

            if (dispatchDetails.length > 0) {
                // Exact scanned/dispatched items from dispatchDetails
                dispatchDetails.forEach((dd: any) => {
                    const qty = Number(dd.quantity || 0);
                    if (qty <= 0) return;

                    const matchedVariant = variantMap.get(dd.variantId);
                    const prod = matchedVariant?.product || (dd.productName ? productByNameMap.get(dd.productName.trim().toUpperCase()) : null);

                    // Find corresponding order item price
                    let unitPrice = 0;
                    if (Array.isArray(order.items)) {
                        const oi = order.items.find((item: any) => {
                            const nameMatch = prod?.name && item.modelName && 
                                (prod.name.trim().toUpperCase() === item.modelName.trim().toUpperCase() ||
                                 prod.name.trim().toUpperCase().includes(item.modelName.trim().toUpperCase()) ||
                                 item.modelName.trim().toUpperCase().includes(prod.name.trim().toUpperCase()));
                            const colorMatch = (matchedVariant?.color || dd.color) && item.color &&
                                (matchedVariant?.color || dd.color).trim().toUpperCase() === item.color.trim().toUpperCase();
                            return nameMatch && colorMatch;
                        });
                        if (oi) {
                            unitPrice = Number(oi.unitPrice || 0);
                        }
                    }
                    if (unitPrice === 0) {
                        unitPrice = Number(dd.unitPrice || prod?.sellingPrice || prod?.purchasePrice || 0);
                    }

                    const opVal = dd.op || matchedVariant?.op || matchedVariant?.product?.op || prod?.op || '--';
                    const productNameVal = dd.productName || matchedVariant?.product?.name || prod?.name || '--';
                    const colorVal = dd.color || matchedVariant?.color || '--';
                    const sizeVal = dd.size || matchedVariant?.size || '--';
                    const skuVal = dd.sku || matchedVariant?.variantSku || prod?.sku || '--';

                    detailRows.push({
                        'Nro Pedido': orderNum,
                        'Fecha': orderDate,
                        'Cliente': clientName,
                        'Zona': clientZone,
                        'OP': opVal,
                        'Prenda / Modelo': productNameVal,
                        'Color': colorVal,
                        'Talla': sizeVal,
                        'SKU': skuVal,
                        'Cantidad': qty,
                        'Precio Unit.': unitPrice,
                        'Total': qty * unitPrice,
                        'Estado Pedido': statusText
                    });
                });
            } else if (Array.isArray(order.items) && order.items.length > 0) {
                // Pending or legacy orders: extract breakdown from order.items
                order.items.forEach((oi: any) => {
                    const prod = productByNameMap.get((oi.modelName || '').trim().toUpperCase());
                    const unitPrice = Number(oi.unitPrice || prod?.sellingPrice || 0);
                    const isDispatched = order.status === 'DESPACHADO' || order.status === 'COMPLETADO' || order.status === 'ENTREGADO';

                    const sizeFields = [
                        { key: '28', disp: oi.dispS28, ord: oi.s28 },
                        { key: '30', disp: oi.dispM30, ord: oi.m30 },
                        { key: '32', disp: oi.dispL32, ord: oi.l32 },
                        { key: '34', disp: oi.dispXL34, ord: oi.xl34 },
                        { key: '36', disp: oi.dispXXL36, ord: oi.xxl36 },
                        { key: '38', disp: oi.dispSize38, ord: oi.size38 },
                        { key: '40', disp: oi.dispSize40, ord: oi.size40 },
                        { key: '42', disp: oi.dispSize42, ord: oi.size42 },
                        { key: '44', disp: oi.dispSize44, ord: oi.size44 },
                        { key: '46', disp: oi.dispSize46, ord: oi.size46 },
                        { key: '48', disp: oi.dispSize48, ord: oi.size48 },
                        { key: '50', disp: oi.dispSize50, ord: oi.size50 },
                        { key: '52', disp: oi.dispSize52, ord: oi.size52 },
                    ];

                    let hasSizeRows = false;

                    sizeFields.forEach(sf => {
                        const qty = isDispatched && (oi.dispQuantity !== undefined && oi.dispQuantity > 0)
                            ? Number(sf.disp || 0)
                            : Number(sf.ord || 0);

                        if (qty > 0) {
                            hasSizeRows = true;
                            // Match variant
                            const matchedVariant = (prod?.variants || []).find((v: any) => 
                                v.size.toString().trim() === sf.key && 
                                v.color.trim().toUpperCase() === (oi.color || '').trim().toUpperCase()
                            );

                            const opVal = matchedVariant?.op || prod?.op || '--';
                            const skuVal = matchedVariant?.variantSku || prod?.sku || '--';

                            detailRows.push({
                                'Nro Pedido': orderNum,
                                'Fecha': orderDate,
                                'Cliente': clientName,
                                'Zona': clientZone,
                                'OP': opVal,
                                'Prenda / Modelo': oi.modelName || '--',
                                'Color': oi.color || '--',
                                'Talla': sf.key,
                                'SKU': skuVal,
                                'Cantidad': qty,
                                'Precio Unit.': unitPrice,
                                'Total': qty * unitPrice,
                                'Estado Pedido': statusText
                            });
                        }
                    });

                    // If no individual size breakdown had quantity > 0 but total quantity > 0
                    if (!hasSizeRows) {
                        const fallbackQty = isDispatched && oi.dispQuantity ? Number(oi.dispQuantity) : Number(oi.quantity || 0);
                        if (fallbackQty > 0) {
                            const matchedVariant = (prod?.variants || []).find((v: any) => 
                                v.color.trim().toUpperCase() === (oi.color || '').trim().toUpperCase()
                            );

                            detailRows.push({
                                'Nro Pedido': orderNum,
                                'Fecha': orderDate,
                                'Cliente': clientName,
                                'Zona': clientZone,
                                'OP': matchedVariant?.op || prod?.op || '--',
                                'Prenda / Modelo': oi.modelName || '--',
                                'Color': oi.color || '--',
                                'Talla': 'ESTÁNDAR',
                                'SKU': matchedVariant?.variantSku || prod?.sku || '--',
                                'Cantidad': fallbackQty,
                                'Precio Unit.': unitPrice,
                                'Total': fallbackQty * unitPrice,
                                'Estado Pedido': statusText
                            });
                        }
                    }
                });
            }
        });

        const ws2 = XLSX.utils.json_to_sheet(detailRows.length > 0 ? detailRows : [{
            'Nro Pedido': '--',
            'Fecha': '--',
            'Cliente': '--',
            'Zona': '--',
            'OP': '--',
            'Prenda / Modelo': '--',
            'Color': '--',
            'Talla': '--',
            'SKU': '--',
            'Cantidad': 0,
            'Precio Unit.': 0,
            'Total': 0,
            'Estado Pedido': '--'
        }]);

        // Column widths for sheet 2
        ws2['!cols'] = [
            { wch: 15 }, // Nro Pedido
            { wch: 14 }, // Fecha
            { wch: 32 }, // Cliente
            { wch: 14 }, // Zona
            { wch: 16 }, // OP
            { wch: 32 }, // Prenda / Modelo
            { wch: 16 }, // Color
            { wch: 10 }, // Talla
            { wch: 22 }, // SKU
            { wch: 12 }, // Cantidad
            { wch: 16 }, // Precio Unit.
            { wch: 16 }, // Total
            { wch: 22 }  // Estado Pedido
        ];

        const range2 = XLSX.utils.decode_range(ws2['!ref'] || 'A1:A1');
        ws2['!autofilter'] = { ref: XLSX.utils.encode_range(range2) };

        ws2['!views'] = [
            {
                state: 'frozen',
                ySplit: 1,
                xSplit: 0,
                topLeftCell: 'A2',
                activePane: 'bottomLeft'
            }
        ];

        for (const cellAddress in ws2) {
            if (cellAddress.startsWith('!')) continue;
            const cell = ws2[cellAddress];
            const decoded = XLSX.utils.decode_cell(cellAddress);
            const colIndex = decoded.c;
            const rowIndex = decoded.r;

            if (rowIndex === 0) continue;

            // Cantidad (col 9) -> Integer
            if (colIndex === 9) {
                cell.t = 'n';
                cell.z = '#,##0';
            }

            // Precio Unit. (col 10) -> Currency (S/)
            if (colIndex === 10) {
                cell.t = 'n';
                cell.z = '"S/"#,##0.00';
            }

            // Total (col 11) -> Currency (S/)
            if (colIndex === 11) {
                cell.t = 'n';
                cell.z = '"S/"#,##0.00';
            }
        }

        // ── CREAR Y DESCARGAR ARCHIVO EXCEL MULTI-HOJA ──
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Despachos');
        XLSX.utils.book_append_sheet(wb, ws2, 'Detalle de Prendas');
        
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '') + '_' + new Date().toTimeString().slice(0, 5).replace(/:/g, '');
        XLSX.writeFile(wb, `DESPACHOS_${cleanLabel.toUpperCase()}_${timestamp}.xlsx`);
    };

    const dispatchOrders = orders
        .filter(o => {
            const matchesSearch = o.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            if (viewMode === 'POR_DESPACHAR') {
                return o.status === 'EN_LOGISTICA';
            } else if (viewMode === 'DESPACHADOS') {
                return o.status === 'DESPACHADO';
            } else if (viewMode === 'COMPLETADOS') {
                return o.status === 'COMPLETADO' || o.status === 'ENTREGADO';
            } else if (viewMode === 'ANULADOS') {
                return o.status === 'ANULADO';
            } else {
                return true; // TODOS
            }
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const stats = [
        { 
            label: 'Por Despachar', 
            value: orders.filter(o => o.status === 'EN_LOGISTICA').length.toString(), 
            icon: Clock, 
            color: 'text-amber-600', 
            bg: 'bg-amber-100',
            mode: 'POR_DESPACHAR' as const
        },
        { 
            label: 'Despachados', 
            value: orders.filter(o => o.status === 'DESPACHADO').length.toString(), 
            icon: Truck, 
            color: 'text-blue-600', 
            bg: 'bg-blue-100',
            mode: 'DESPACHADOS' as const
        },
        { 
            label: 'Completados', 
            value: orders.filter(o => o.status === 'ENTREGADO' || o.status === 'COMPLETADO').length.toString(), 
            icon: CheckCircle, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-100',
            mode: 'COMPLETADOS' as const
        },
        { 
            label: 'Anulados', 
            value: orders.filter(o => o.status === 'ANULADO').length.toString(), 
            icon: XCircle, 
            color: 'text-rose-600', 
            bg: 'bg-rose-100',
            mode: 'ANULADOS' as const
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
                    {stats.map((stat, idx) => {
                        const isActive = viewMode === stat.mode;
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => setViewMode(stat.mode)}
                                className={`p-6 rounded-[2rem] border transition-all duration-350 cursor-pointer flex flex-col justify-between group ${
                                    isActive
                                        ? 'bg-indigo-50/40 border-indigo-200 shadow-xl shadow-indigo-100/50 ring-1 ring-indigo-500/10'
                                        : 'bg-white border-gray-100 shadow-xl shadow-gray-200/20 hover:shadow-indigo-100/50'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-4 ${stat.bg} rounded-2xl ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-gray-900">{stat.value}</span>
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-tight">Pedidos</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap border-b border-gray-100 gap-y-2">
                    <button
                        onClick={() => setViewMode('POR_DESPACHAR')}
                        className={`px-6 py-3.5 font-black text-sm uppercase tracking-wider border-b-2 transition-all ${
                            viewMode === 'POR_DESPACHAR'
                                ? 'border-amber-500 text-amber-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Por Despachar ({orders.filter(o => o.status === 'EN_LOGISTICA').length})
                    </button>
                    <button
                        onClick={() => setViewMode('DESPACHADOS')}
                        className={`px-6 py-3.5 font-black text-sm uppercase tracking-wider border-b-2 transition-all ${
                            viewMode === 'DESPACHADOS'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Despachados ({orders.filter(o => o.status === 'DESPACHADO').length})
                    </button>
                    <button
                        onClick={() => setViewMode('COMPLETADOS')}
                        className={`px-6 py-3.5 font-black text-sm uppercase tracking-wider border-b-2 transition-all ${
                            viewMode === 'COMPLETADOS'
                                ? 'border-emerald-500 text-emerald-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Boletas Generadas ({orders.filter(o => o.status === 'ENTREGADO' || o.status === 'COMPLETADO').length})
                    </button>
                    <button
                        onClick={() => setViewMode('ANULADOS')}
                        className={`px-6 py-3.5 font-black text-sm uppercase tracking-wider border-b-2 transition-all ${
                            viewMode === 'ANULADOS'
                                ? 'border-rose-500 text-rose-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Anulados ({orders.filter(o => o.status === 'ANULADO').length})
                    </button>
                    <button
                        onClick={() => setViewMode('TODOS')}
                        className={`px-6 py-3.5 font-black text-sm uppercase tracking-wider border-b-2 transition-all ${
                            viewMode === 'TODOS'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Todos ({orders.length})
                    </button>
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
                        <button 
                            onClick={exportToExcel}
                            disabled={dispatchOrders.length === 0}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:hover:bg-emerald-50 rounded-2xl text-sm font-black text-emerald-600 transition-all uppercase tracking-widest"
                            title="Exportar listado a Excel"
                        >
                            <FileSpreadsheet className="w-5 h-5" /> Exportar Excel
                        </button>
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
                                                    order.status === 'COMPLETADO' || order.status === 'ENTREGADO' ? 'border-emerald-100 text-emerald-600 bg-emerald-50' : 
                                                    order.status === 'ANULADO' ? 'border-rose-100 text-rose-600 bg-rose-50' :
                                                    'border-amber-100 text-amber-600 bg-amber-50'
                                                }`}>
                                                    {order.status === 'DESPACHADO' ? <Truck className="w-3.5 h-3.5" /> : 
                                                     order.status === 'COMPLETADO' || order.status === 'ENTREGADO' ? <CheckCircle className="w-3.5 h-3.5" /> : 
                                                     order.status === 'ANULADO' ? <AlertCircle className="w-3.5 h-3.5" /> : 
                                                     <Clock className="w-3.5 h-3.5" />}
                                                    {order.status === 'DESPACHADO' ? 'DESPACHADO' : 
                                                     order.status === 'COMPLETADO' || order.status === 'ENTREGADO' ? 'ENTREGADO' : 
                                                     order.status === 'ANULADO' ? 'ANULADO' : 
                                                     'POR DESPACHAR'}
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 truncate uppercase tracking-tight">
                                                {order.client?.name}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-6 mt-2">
                                                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                                                    <MapPin className="w-4 h-4 text-rose-500" />
                                                    {order.client?.zone || order.zone || 'OFICINA'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(order.createdAt)}
                                                </div>
                                                <div className={`flex items-center gap-2 text-xs font-black ${order.status === 'DESPACHADO' || order.status === 'ENTREGADO' || order.status === 'COMPLETADO' ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                                    <Tag className="w-4 h-4" />
                                                    {(order.status === 'DESPACHADO' || order.status === 'ENTREGADO' || order.status === 'COMPLETADO') && Array.isArray(order.dispatchDetails) && order.dispatchDetails.length > 0 
                                                        ? order.dispatchDetails.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
                                                        : order.totalQuantity} PRENDAS
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                                        <div className="text-right hidden xl:block mr-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pedido</p>
                                            <p className={`text-xl font-black ${order.status === 'DESPACHADO' || order.status === 'ENTREGADO' || order.status === 'COMPLETADO' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                S/ {(order.status === 'DESPACHADO' || order.status === 'ENTREGADO' || order.status === 'COMPLETADO') && Array.isArray(order.items) && order.items.length > 0
                                                    ? order.items.reduce((sum: number, item: any) => sum + ((item.dispQuantity || 0) * (item.unitPrice || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
                                                    : order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
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
                                                <>
                                                    <button 
                                                        onClick={() => handleCancelDispatch(order.id)}
                                                        className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-600 text-[10px] sm:text-xs font-black rounded-xl transition-all shadow-sm shadow-rose-100/50 flex items-center gap-1.5 uppercase tracking-widest scale-up active:scale-95 whitespace-nowrap"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" /> Anular Despacho
                                                    </button>
                                                    <Link 
                                                        href={`/dispatch/${order.id}/invoice`}
                                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-xs font-black rounded-xl transition-all shadow-md shadow-emerald-100 flex items-center gap-1.5 uppercase tracking-widest scale-up active:scale-95 whitespace-nowrap"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" /> Generar Boleta
                                                    </Link>
                                                </>
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
