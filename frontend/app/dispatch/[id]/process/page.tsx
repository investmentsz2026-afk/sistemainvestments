// frontend/app/dispatch/[id]/process/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '../../../../components/common/Layout';
import { useProducts } from '../../../../hooks/useProducts';
import api from '../../../../lib/axios';
import {
    Barcode,
    Camera,
    Keyboard,
    Package,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Truck,
    Scan,
    Loader2,
    ShoppingBag,
    MapPin,
    Calendar,
    Tag,
    User
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type ScanMode = 'scanner' | 'manual';

interface DispatchItem {
    orderItemId: string;
    modelName: string;
    color: string;
    sizes: {
        field: string;
        label: string;
        ordered: number;
        dispatched: number;
    }[];
    unitPrice: number;
    totalOrdered: number;
    totalDispatched: number;
}

export default function DispatchProcessPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const { products } = useProducts();

    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([]);
    const [scanMode, setScanMode] = useState<ScanMode>('scanner');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [isDispatching, setIsDispatching] = useState(false);
    const [showPartialModal, setShowPartialModal] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    const SIZE_FIELDS = [
        { field: 's28', label: 'S/28' },
        { field: 'm30', label: 'M/30' },
        { field: 'l32', label: 'L/32' },
        { field: 'xl34', label: 'XL/34' },
        { field: 'xxl36', label: 'XXL/36' },
        { field: 'size38', label: '38' },
        { field: 'size40', label: '40' },
        { field: 'size42', label: '42' },
        { field: 'size44', label: '44' },
        { field: 'size46', label: '46' },
    ];

    useEffect(() => {
        if (orderId) fetchOrder();
    }, [orderId]);

    useEffect(() => {
        if (scanMode === 'scanner' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [scanMode, dispatchItems]);

    const fetchOrder = async () => {
        try {
            const resp = await api.get(`/orders/${orderId}`);
            setOrder(resp.data);

            // Build dispatch items from order items
            const items: DispatchItem[] = (resp.data.items || []).map((oi: any) => ({
                orderItemId: oi.id,
                modelName: oi.modelName,
                color: oi.color,
                sizes: SIZE_FIELDS.map(sf => ({
                    field: sf.field,
                    label: sf.label,
                    ordered: oi[sf.field] || 0,
                    dispatched: 0,
                })),
                unitPrice: oi.unitPrice,
                totalOrdered: oi.quantity,
                totalDispatched: 0,
            }));
            setDispatchItems(items);
        } catch (error) {
            console.error('Error fetching order:', error);
            toast.error('No se pudo cargar el pedido');
        } finally {
            setIsLoading(false);
        }
    };

    // Find a variant by SKU
    const findVariantBySku = (sku: string) => {
        if (!products) return null;
        for (const p of products) {
            for (const v of (p.variants || [])) {
                if (v.variantSku === sku) {
                    return { ...v, product: p };
                }
            }
        }
        return null;
    };

    // Match scanned variant to an order item
    const matchVariantToOrderItem = (variant: any) => {
        const productName = variant.product.name.toUpperCase();
        const variantColor = variant.color.toUpperCase();
        const variantSize = variant.size; // e.g. "28", "30", "32", etc.

        // Map size to field
        const sizeFieldMap: Record<string, string> = {
            '28': 's28', 'S': 's28',
            '30': 'm30', 'M': 'm30',
            '32': 'l32', 'L': 'l32',
            '34': 'xl34', 'XL': 'xl34',
            '36': 'xxl36', 'XXL': 'xxl36',
            '38': 'size38',
            '40': 'size40',
            '42': 'size42',
            '44': 'size44',
            '46': 'size46',
        };

        const sizeField = sizeFieldMap[variantSize];
        if (!sizeField) return null;

        // Find matching order item
        for (const di of dispatchItems) {
            const modelMatch = productName.includes(di.modelName.toUpperCase()) || di.modelName.toUpperCase().includes(productName);
            const colorMatch = variantColor.includes(di.color.toUpperCase()) || di.color.toUpperCase().includes(variantColor);

            if (modelMatch && colorMatch) {
                const sizeEntry = di.sizes.find(s => s.field === sizeField);
                if (sizeEntry && sizeEntry.ordered > 0) {
                    return { dispatchItem: di, sizeField, sizeEntry };
                }
            }
        }
        return null;
    };

    const processBarcode = (barcode: string) => {
        const variant = findVariantBySku(barcode);

        if (!variant) {
            toast.error(`Producto no encontrado: ${barcode}`);
            return;
        }

        const match = matchVariantToOrderItem(variant);

        if (!match) {
            toast.error(`Este producto no corresponde a ningún ítem del pedido.`);
            return;
        }

        const { dispatchItem, sizeField, sizeEntry } = match;

        // Validate limit
        if (sizeEntry.dispatched >= sizeEntry.ordered) {
            toast.error(`¡Ya completaste las ${sizeEntry.ordered} unidades de talla ${sizeEntry.label} para ${dispatchItem.modelName} ${dispatchItem.color}!`);
            return;
        }

        // Check stock
        if (variant.stock <= 0) {
            toast.error(`Stock insuficiente para ${variant.product.name} (${variant.size}/${variant.color}). Stock: ${variant.stock}`);
            return;
        }

        // Increment dispatched count
        setDispatchItems(prev => prev.map(di => {
            if (di.orderItemId !== dispatchItem.orderItemId) return di;
            const newSizes = di.sizes.map(s => {
                if (s.field !== sizeField) return s;
                return { ...s, dispatched: s.dispatched + 1 };
            });
            const newTotalDispatched = newSizes.reduce((acc, s) => acc + s.dispatched, 0);
            return { ...di, sizes: newSizes, totalDispatched: newTotalDispatched };
        }));

        const remaining = sizeEntry.ordered - sizeEntry.dispatched - 1;
        toast.success(
            `✅ ${variant.product.name} ${sizeEntry.label} → ${sizeEntry.dispatched + 1}/${sizeEntry.ordered}` +
            (remaining > 0 ? ` (faltan ${remaining})` : ' ¡COMPLETO!')
        );

        setBarcodeInput('');
        if (inputRef.current) inputRef.current.focus();
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (barcodeInput.trim()) {
            processBarcode(barcodeInput.trim());
        }
    };

    // Helper: find variant for a dispatch item + size field
    const findVariantForSize = (di: DispatchItem, sizeField: string) => {
        if (!products) return null;
        const sizeNumMap: Record<string, string> = {
            's28': '28', 'm30': '30', 'l32': '32', 'xl34': '34', 'xxl36': '36',
            'size38': '38', 'size40': '40', 'size42': '42', 'size44': '44', 'size46': '46',
        };
        const sizeNum = sizeNumMap[sizeField];
        if (!sizeNum) return null;

        for (const p of products) {
            const nameMatch = p.name.toUpperCase().includes(di.modelName.toUpperCase()) ||
                              di.modelName.toUpperCase().includes(p.name.toUpperCase());
            if (!nameMatch) continue;

            for (const v of (p.variants || [])) {
                if (v.color.toUpperCase() === di.color.toUpperCase() && v.size === sizeNum) {
                    return { ...v, product: p };
                }
            }
        }
        return null;
    };

    // Manually increment a size — with stock validation
    const manualIncrement = (orderItemId: string, sizeField: string) => {
        const di = dispatchItems.find(d => d.orderItemId === orderItemId);
        if (!di) return;

        const sz = di.sizes.find(s => s.field === sizeField);
        if (!sz) return;

        // Already complete?
        if (sz.dispatched >= sz.ordered) {
            toast.error(`Ya completaste las ${sz.ordered} unidades de talla ${sz.label}`);
            return;
        }

        // Find product variant in inventory
        const variant = findVariantForSize(di, sizeField);

        if (!variant) {
            toast((t) => (
                <div className="flex items-start gap-3" style={{ maxWidth: 340 }}>
                    <div style={{ background: '#FEE2E2', borderRadius: 12, padding: 8, marginTop: 2 }}>
                        <XCircle style={{ width: 20, height: 20, color: '#DC2626' }} />
                    </div>
                    <div>
                        <p style={{ fontWeight: 800, color: '#111', fontSize: 13, marginBottom: 4 }}>
                            Producto no encontrado en inventario
                        </p>
                        <p style={{ color: '#6B7280', fontSize: 11 }}>
                            <strong>{di.modelName} {di.color}</strong> talla <strong>{sz.label}</strong> no existe en el sistema de inventario. No se puede descargar.
                        </p>
                    </div>
                </div>
            ), { duration: 4000, style: { background: '#FFF', border: '2px solid #FCA5A5', borderRadius: 20, padding: '14px 16px' } });
            return;
        }

        // Check real stock — consider how many we've ALREADY dispatched of this variant
        const alreadyDispatched = sz.dispatched;
        const availableStock = variant.stock - alreadyDispatched;

        if (availableStock <= 0) {
            toast((t) => (
                <div className="flex items-start gap-3" style={{ maxWidth: 380 }}>
                    <div style={{ background: '#FEF3C7', borderRadius: 12, padding: 8, marginTop: 2 }}>
                        <AlertCircle style={{ width: 20, height: 20, color: '#D97706' }} />
                    </div>
                    <div>
                        <p style={{ fontWeight: 800, color: '#111', fontSize: 13, marginBottom: 4 }}>
                            Stock insuficiente
                        </p>
                        <p style={{ color: '#6B7280', fontSize: 11 }}>
                            <strong>{di.modelName} {di.color}</strong> talla <strong>{sz.label}</strong> tiene <strong>{variant.stock}</strong> en stock, ya descargaste <strong>{alreadyDispatched}</strong>. No hay más disponible para este pedido.
                        </p>
                        <p style={{ color: '#9CA3AF', fontSize: 10, marginTop: 6 }}>
                            Puedes despachar parcialmente y generar la boleta con menos productos.
                        </p>
                    </div>
                </div>
            ), { duration: 5000, style: { background: '#FFF', border: '2px solid #FDE68A', borderRadius: 20, padding: '14px 16px' } });
            return;
        }

        // All checks passed — increment
        setDispatchItems(prev => prev.map(d => {
            if (d.orderItemId !== orderItemId) return d;
            const newSizes = d.sizes.map(s => {
                if (s.field !== sizeField) return s;
                return { ...s, dispatched: s.dispatched + 1 };
            });
            const newTotalDispatched = newSizes.reduce((acc, s2) => acc + s2.dispatched, 0);
            return { ...d, sizes: newSizes, totalDispatched: newTotalDispatched };
        }));
    };

    // Manually decrement a size
    const manualDecrement = (orderItemId: string, sizeField: string) => {
        setDispatchItems(prev => prev.map(di => {
            if (di.orderItemId !== orderItemId) return di;
            const newSizes = di.sizes.map(s => {
                if (s.field !== sizeField) return s;
                if (s.dispatched <= 0) return s;
                return { ...s, dispatched: s.dispatched - 1 };
            });
            const newTotalDispatched = newSizes.reduce((acc, sz) => acc + sz.dispatched, 0);
            return { ...di, sizes: newSizes, totalDispatched: newTotalDispatched };
        }));
    };

    const totalOrdered = dispatchItems.reduce((acc, di) => acc + di.totalOrdered, 0);
    const totalDispatched = dispatchItems.reduce((acc, di) => acc + di.totalDispatched, 0);
    const progress = totalOrdered > 0 ? Math.round((totalDispatched / totalOrdered) * 100) : 0;
    const isComplete = totalDispatched === totalOrdered && totalOrdered > 0;

    const handleCompleteDispatch = () => {
        if (totalDispatched === 0) {
            toast.error('No has descargado ningún producto.');
            return;
        }

        // Show partial modal if not complete
        if (totalDispatched < totalOrdered) {
            setShowPartialModal(true);
            return;
        }

        executeDispatch();
    };

    const executeDispatch = async () => {
        setShowPartialModal(false);
        setIsDispatching(true);
        try {
            // Build inventory deduction items
            const deductionItems: { variantId: string; quantity: number }[] = [];

            for (const di of dispatchItems) {
                for (const sz of di.sizes) {
                    if (sz.dispatched <= 0) continue;

                    const variant = findVariantForSize(di, sz.field);
                    if (variant) {
                        deductionItems.push({
                            variantId: variant.id,
                            quantity: sz.dispatched,
                        });
                    }
                }
            }

            // Build dispatched quantities per OrderItem (to update the order for invoice)
            const dispatchedOrderItems = dispatchItems.map(di => {
                const sizeData: Record<string, number> = {};
                di.sizes.forEach(sz => {
                    sizeData[sz.field] = sz.dispatched;
                });
                return {
                    orderItemId: di.orderItemId,
                    unitPrice: di.unitPrice,
                    ...sizeData,
                };
            });

            await api.patch(`/orders/${orderId}/dispatch`, { 
                items: deductionItems,
                dispatchedItems: dispatchedOrderItems,
            });
            toast.success('¡Despacho completado exitosamente! Inventario actualizado.');
            router.push('/dispatch');
        } catch (error: any) {
            console.error('Error dispatching order:', error);
            toast.error(error.response?.data?.message || 'Error al completar despacho');
        } finally {
            setIsDispatching(false);
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-96">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!order) {
        return (
            <Layout>
                <div className="text-center py-20">
                    <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold">Pedido no encontrado.</p>
                    <Link href="/dispatch" className="text-indigo-600 font-bold mt-4 inline-block">← Volver a Despacho</Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Link
                            href="/dispatch"
                            className="p-4 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 shadow-sm transition active:scale-90"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                                    Descarga de Inventario
                                </h1>
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg">
                                    #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-gray-400 font-bold">
                                <span className="flex items-center gap-2"><User className="w-4 h-4" /> {order.client?.name}</span>
                                <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-rose-500" /> {order.zone || 'OFICINA'}</span>
                                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${isComplete ? 'bg-emerald-600' : 'bg-indigo-600'} text-white shadow-lg`}>
                                {isComplete ? <CheckCircle2 className="w-7 h-7" /> : <Package className="w-7 h-7" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                                    {isComplete ? '¡Descarga Completa!' : 'Progreso de Descarga'}
                                </h2>
                                <p className="text-gray-400 font-bold text-sm">{totalDispatched} de {totalOrdered} prendas descargadas</p>
                            </div>
                        </div>
                        <span className={`text-5xl font-black ${isComplete ? 'text-emerald-600' : 'text-indigo-600'}`}>{progress}%</span>
                    </div>
                    <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full rounded-full ${isComplete ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Scanner Panel */}
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/10">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6">Escaneo / Ingreso SKU</h3>

                            {/* Scan Mode Toggle */}
                            <div className="flex rounded-2xl bg-gray-100 p-1 mb-6">
                                <button
                                    onClick={() => setScanMode('scanner')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${scanMode === 'scanner' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Barcode className="w-4 h-4" /> Escáner
                                </button>
                                <button
                                    onClick={() => setScanMode('manual')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${scanMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Keyboard className="w-4 h-4" /> Manual
                                </button>
                            </div>

                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                <div className="relative">
                                    <Scan className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={barcodeInput}
                                        onChange={(e) => setBarcodeInput(e.target.value)}
                                        placeholder={scanMode === 'scanner' ? 'Esperando código de barras...' : 'Ingresa el SKU del producto'}
                                        className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none font-bold text-gray-700"
                                        autoFocus
                                    />
                                </div>
                                {scanMode === 'manual' && (
                                    <button
                                        type="submit"
                                        disabled={!barcodeInput.trim()}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95"
                                    >
                                        Agregar Producto
                                    </button>
                                )}
                            </form>

                            <div className="mt-6 p-4 bg-indigo-50 rounded-2xl text-center">
                                <Barcode className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                                <p className="text-xs text-indigo-600 font-bold">
                                    {scanMode === 'scanner'
                                        ? 'Escanea el código de barras del producto y se sumará automáticamente.'
                                        : 'Ingresa el SKU y presiona Enter o el botón para agregar.'}
                                </p>
                            </div>
                        </div>

                        {/* Complete Dispatch Button */}
                        <button
                            onClick={handleCompleteDispatch}
                            disabled={isDispatching || totalDispatched === 0}
                            className={`w-full py-5 rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-40 ${
                                isComplete
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                                    : 'bg-gray-900 hover:bg-black text-white shadow-gray-300'
                            }`}
                        >
                            {isDispatching ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <Truck className="w-6 h-6" />
                                    {isComplete ? 'Completar Despacho' : `Despachar (${totalDispatched}/${totalOrdered})`}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Matrix — Order Items with progress */}
                    <div className="lg:col-span-2 space-y-6">
                        {dispatchItems.map((di, idx) => {
                            const itemProgress = di.totalOrdered > 0 ? Math.round((di.totalDispatched / di.totalOrdered) * 100) : 0;
                            const itemComplete = di.totalDispatched === di.totalOrdered && di.totalOrdered > 0;

                            return (
                                <motion.div
                                    key={di.orderItemId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`bg-white rounded-[2.5rem] border shadow-xl overflow-hidden transition-all ${
                                        itemComplete ? 'border-emerald-200 shadow-emerald-100/50' : 'border-gray-100 shadow-gray-200/10'
                                    }`}
                                >
                                    {/* Item Header */}
                                    <div className={`px-8 py-5 flex items-center justify-between ${itemComplete ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${itemComplete ? 'bg-emerald-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {itemComplete ? <CheckCircle2 className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{di.modelName}</h3>
                                                <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
                                                    <span>{di.color}</span>
                                                    <span>•</span>
                                                    <span>S/ {di.unitPrice?.toFixed(2)} c/u</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-2xl font-black ${itemComplete ? 'text-emerald-600' : 'text-gray-900'}`}>{di.totalDispatched}/{di.totalOrdered}</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prendas</p>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="px-8 pt-2">
                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${itemProgress}%` }}
                                                className={`h-full rounded-full ${itemComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Size Grid */}
                                    <div className="p-8">
                                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                                            {di.sizes.map(sz => {
                                                if (sz.ordered === 0) return (
                                                    <div key={sz.field} className="text-center opacity-20">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{sz.label}</p>
                                                        <div className="w-full aspect-square rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 text-xs">—</div>
                                                    </div>
                                                );

                                                const sizeComplete = sz.dispatched >= sz.ordered;
                                                const variant = findVariantForSize(di, sz.field);
                                                const noStock = !variant || (variant.stock - sz.dispatched) <= 0;
                                                const hasNoInventory = !variant || variant.stock <= 0;

                                                return (
                                                    <div key={sz.field} className="text-center">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{sz.label}</p>
                                                        <button
                                                            onClick={() => {
                                                                if (!sizeComplete) {
                                                                    manualIncrement(di.orderItemId, sz.field);
                                                                }
                                                            }}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                manualDecrement(di.orderItemId, sz.field);
                                                            }}
                                                            className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center font-black text-sm transition-all border-2 active:scale-90 relative ${
                                                                sizeComplete
                                                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                                                                    : hasNoInventory && sz.dispatched === 0
                                                                        ? 'bg-rose-50 border-rose-200 text-rose-400'
                                                                        : noStock && sz.dispatched > 0
                                                                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                                                                            : sz.dispatched > 0
                                                                                ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                                                                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-indigo-300 hover:bg-indigo-50'
                                                            }`}
                                                            title={
                                                                sizeComplete ? '¡Completado!' :
                                                                hasNoInventory && sz.dispatched === 0 ? `Sin stock en inventario` :
                                                                `Clic para +1 | Clic derecho para -1 ${variant ? `(stock: ${variant.stock})` : ''}`
                                                            }
                                                        >
                                                            <span className="text-lg leading-none">{sz.dispatched}</span>
                                                            <span className="text-[8px] opacity-60">/{sz.ordered}</span>
                                                            {hasNoInventory && sz.dispatched === 0 && !sizeComplete && (
                                                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center">
                                                                    <XCircle className="w-3 h-3 text-white" />
                                                                </span>
                                                            )}
                                                        </button>
                                                        {variant && !sizeComplete && !hasNoInventory && (
                                                            <p className="text-[8px] text-gray-400 mt-0.5 font-bold">stk: {variant.stock}</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* Partial Dispatch Confirmation Modal */}
            <AnimatePresence>
                {showPartialModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowPartialModal(false)}
                    >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', duration: 0.5 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden relative"
                        >
                            {/* Warning Header */}
                            <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-8 text-center">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                                    <AlertCircle className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Despacho Parcial</h3>
                            </div>

                            {/* Body */}
                            <div className="p-8 text-center">
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-6">
                                    <p className="text-gray-700 font-bold text-sm mb-3">
                                        Solo descargaste <span className="text-amber-600 text-lg font-black">{totalDispatched}</span> de <span className="text-gray-900 text-lg font-black">{totalOrdered}</span> prendas.
                                    </p>
                                    <p className="text-gray-500 text-xs font-medium">
                                        La boleta/factura se generará con las cantidades despachadas. Las prendas faltantes no se cobrarán.
                                    </p>
                                </div>

                                <p className="text-gray-400 text-xs font-bold mb-6">
                                    ¿Deseas continuar con el despacho parcial?
                                </p>

                                {/* Buttons */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowPartialModal(false)}
                                        className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={executeDispatch}
                                        className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-amber-200 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Truck className="w-4 h-4" /> Sí, Despachar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
