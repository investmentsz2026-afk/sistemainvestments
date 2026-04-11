// frontend/app/dispatch/[id]/invoice/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '../../../../components/common/Layout';
import api from '../../../../lib/axios';
import {
    FileText,
    ArrowLeft,
    Printer,
    Package,
    User,
    MapPin,
    Calendar,
    CreditCard,
    Truck,
    Loader2,
    Building2,
    Hash,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.endsWith('T00:00:00.000Z')) {
        return new Date(dateString).toLocaleDateString('es-PE', { timeZone: 'UTC' });
    }
    return new Date(dateString).toLocaleDateString('es-PE');
};

type DocumentType = 'BOLETA' | 'FACTURA';

export default function InvoicePage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [docType, setDocType] = useState<DocumentType>('BOLETA');
    const [docNumber, setDocNumber] = useState('');
    const [igv, setIgv] = useState(18);
    const [isCompleting, setIsCompleting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('TRANSFERENCIA');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        if (orderId) fetchOrder();
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            const resp = await api.get(`/orders/${orderId}`);
            setOrder(resp.data);
            if (resp.data.client?.documentType === 'RUC') {
                setDocType('FACTURA');
            }
        } catch (error) {
            console.error('Error fetching order:', error);
            toast.error('No se pudo cargar el pedido');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteOrder = async () => {
        if (!docNumber) {
            toast.error('Por favor ingresa el número de comprobante');
            return;
        }

        setShowConfirmModal(true);
    };

    const executeCompleteOrder = async () => {
        setShowConfirmModal(false);
        setIsCompleting(true);
        try {
            await api.patch(`/orders/${orderId}/complete`, {
                docNumber,
                docType,
                paymentMethod,
                igv
            });
            toast.success('¡Pedido finalizado con éxito! La venta ha sido registrada.');
            router.push('/dispatch');
        } catch (error: any) {
            console.error('Error completing order:', error);
            toast.error(error.response?.data?.message || 'Error al finalizar pedido');
        } finally {
            setIsCompleting(false);
        }
    };

    const SIZE_FIELDS = [
        { field: 's28', dispField: 'dispS28', label: 'S/28' },
        { field: 'm30', dispField: 'dispM30', label: 'M/30' },
        { field: 'l32', dispField: 'dispL32', label: 'L/32' },
        { field: 'xl34', dispField: 'dispXL34', label: 'XL/34' },
        { field: 'xxl36', dispField: 'dispXXL36', label: 'XXL/36' },
        { field: 'size38', dispField: 'dispSize38', label: '38' },
        { field: 'size40', dispField: 'dispSize40', label: '40' },
        { field: 'size42', dispField: 'dispSize42', label: '42' },
        { field: 'size44', dispField: 'dispSize44', label: '44' },
        { field: 'size46', dispField: 'dispSize46', label: '46' },
    ];

    // Filter size fields that have dispatched data
    const activeSizes = SIZE_FIELDS.filter(sf => 
        order?.items?.some((it: any) => (it[sf.dispField] || 0) > 0)
    );

    const subtotal = order?.items?.reduce((acc: number, it: any) => acc + (it.dispQuantity * it.unitPrice), 0) || 0;
    const igvAmount = subtotal * (igv / 100);
    const total = subtotal + igvAmount;

    const handlePrint = () => {
        if (!order) return;

        const docTitle = docType === 'BOLETA' ? 'Boleta de Venta' : 'Factura';
        const docNum = docNumber || (docType === 'BOLETA' ? 'B001-XXXXXX' : 'F001-XXXXXX');
        const today = new Date().toLocaleDateString('es-PE');
        const pedidoDate = formatDate(order.createdAt);

        // Build size columns header
        const sizeHeaders = activeSizes.map(sf => 
            `<th style="text-align:center;padding:6px 4px;font-size:10px;font-weight:800;border-bottom:2px solid #111;text-transform:uppercase;">${sf.label}</th>`
        ).join('');

        // Build item rows
        const itemRows = (order.items || []).filter((it: any) => it.dispQuantity > 0).map((item: any) => {
            const sizeCells = activeSizes.map(sf => {
                const val = item[sf.dispField] || 0;
                return `<td style="text-align:center;padding:8px 4px;font-size:11px;font-weight:600;color:#555;border-bottom:1px solid #eee;">${val > 0 ? val : '—'}</td>`;
            }).join('');
            const itemTotal = item.dispQuantity * item.unitPrice;
            return `
                <tr>
                    <td style="padding:8px 4px;border-bottom:1px solid #eee;">
                        <div style="font-weight:800;color:#111;font-size:12px;text-transform:uppercase;">${item.modelName}</div>
                        <div style="font-size:10px;color:#888;font-weight:600;">${item.color}</div>
                    </td>
                    ${sizeCells}
                    <td style="text-align:center;padding:8px 4px;font-weight:800;color:#111;font-size:12px;border-bottom:1px solid #eee;">${item.dispQuantity}</td>
                    <td style="text-align:right;padding:8px 4px;font-weight:600;color:#555;font-size:11px;border-bottom:1px solid #eee;">S/ ${item.unitPrice?.toFixed(2)}</td>
                    <td style="text-align:right;padding:8px 4px;font-weight:800;color:#111;font-size:12px;border-bottom:1px solid #eee;">S/ ${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        const printContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${docTitle} ${docNum}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, sans-serif; color: #111; }
        @page { size: A4; margin: 12mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
</head>
<body>
    <div style="max-width: 780px; margin: 0 auto;">
        <!-- HEADER -->
        <div style="background:#111;color:#fff;padding:28px 32px;border-radius:16px;margin-bottom:0;">
            <table style="width:100%;">
                <tr>
                    <td style="vertical-align:top;">
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                            <div style="width:44px;height:44px;background:#6366f1;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                            </div>
                            <div>
                                <div style="font-size:18px;font-weight:900;letter-spacing:-0.5px;">INVESTMENTS Z & G S.A.C.</div>
                                <div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;">Fabricación de Prendas de Vestir</div>
                            </div>
                        </div>
                        <div style="font-size:10px;color:#9ca3af;margin-top:10px;line-height:1.6;">
                            <div>RUC: 20611188715</div>
                            <div>Mza. E Lote. 11 Dpto. 201</div>
                            <div>Cnd. Las Praderas (Block 18)</div>
                            <div>Lima - Lima - Comas</div>
                        </div>
                    </td>
                    <td style="text-align:right;vertical-align:top;">
                        <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:14px;padding:16px 24px;display:inline-block;text-align:center;">
                            <div style="font-size:9px;font-weight:800;color:#818cf8;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">${docTitle}</div>
                            <div style="font-size:20px;font-weight:900;color:#fff;">${docNum}</div>
                            <div style="font-size:10px;color:#9ca3af;margin-top:6px;">Fecha: ${today}</div>
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- CLIENT INFO -->
        <div style="padding:20px 28px;border:1px solid #e5e7eb;border-top:none;background:#fafafa;">
            <table style="width:100%;">
                <tr>
                    <td style="vertical-align:top;width:50%;padding-right:20px;">
                        <div style="font-size:8px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Datos del Cliente</div>
                        <div style="font-size:13px;font-weight:800;color:#111;text-transform:uppercase;margin-bottom:4px;">${order.client?.name || ''}</div>
                        <div style="font-size:11px;color:#555;font-weight:600;margin-bottom:2px;">${order.client?.documentType || 'DNI'}: ${order.client?.documentNumber || ''}</div>
                        <div style="font-size:11px;color:#555;font-weight:600;">${order.client?.address || 'Sin dirección'}</div>
                    </td>
                    <td style="vertical-align:top;width:50%;padding-left:20px;">
                        <div style="font-size:8px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Datos del Pedido</div>
                        <div style="font-size:11px;color:#555;font-weight:600;margin-bottom:2px;">Nota de Pedido: <span style="color:#6366f1;font-weight:800;">#${order.orderNumber || order.id?.slice(-6) || ''}</span></div>
                        <div style="font-size:11px;color:#555;font-weight:600;margin-bottom:2px;">Fecha Pedido: ${pedidoDate}</div>
                        <div style="font-size:11px;color:#555;font-weight:600;margin-bottom:2px;">Condición: ${order.condition || '—'}</div>
                        ${order.agency ? `<div style="font-size:11px;color:#555;font-weight:600;">Agencia: ${order.agency}</div>` : ''}
                    </td>
                </tr>
            </table>
        </div>

        <!-- ITEMS TABLE -->
        <div style="padding:16px 28px;border:1px solid #e5e7eb;border-top:none;">
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr>
                        <th style="text-align:left;padding:8px 4px;font-size:10px;font-weight:800;border-bottom:2px solid #111;text-transform:uppercase;letter-spacing:1px;">Descripción</th>
                        ${sizeHeaders}
                        <th style="text-align:center;padding:8px 4px;font-size:10px;font-weight:800;border-bottom:2px solid #111;text-transform:uppercase;">Cant.</th>
                        <th style="text-align:right;padding:8px 4px;font-size:10px;font-weight:800;border-bottom:2px solid #111;text-transform:uppercase;">P. Unit.</th>
                        <th style="text-align:right;padding:8px 4px;font-size:10px;font-weight:800;border-bottom:2px solid #111;text-transform:uppercase;">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                </tbody>
            </table>
        </div>

        <!-- TOTALS -->
        <div style="padding:20px 28px;border:1px solid #e5e7eb;border-top:none;background:#fafafa;">
            <table style="width:280px;margin-left:auto;border-collapse:collapse;">
                <tr>
                    <td style="padding:6px 0;font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:1px;">Subtotal</td>
                    <td style="padding:6px 0;text-align:right;font-size:14px;font-weight:800;color:#333;">S/ ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:1px;">IGV (${igv}%)</td>
                    <td style="padding:6px 0;text-align:right;font-size:14px;font-weight:800;color:#333;">S/ ${igvAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                    <td colspan="2" style="padding:4px 0;"><div style="height:2px;background:#111;"></div></td>
                </tr>
                <tr>
                    <td style="padding:8px 0;font-size:16px;font-weight:900;color:#111;text-transform:uppercase;">TOTAL</td>
                    <td style="padding:8px 0;text-align:right;font-size:22px;font-weight:900;color:#111;">S/ ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
            </table>
        </div>

        <!-- OBSERVATIONS -->
        ${order.observations ? `
        <div style="padding:12px 28px;border:1px solid #e5e7eb;border-top:none;">
            <div style="font-size:8px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">Observaciones</div>
            <div style="font-size:11px;color:#555;font-weight:500;">${order.observations}</div>
        </div>` : ''}

        <!-- FOOTER -->
        <div style="padding:12px 28px;border:1px solid #e5e7eb;border-top:none;background:#fafafa;text-align:center;border-radius:0 0 16px 16px;">
            <div style="font-size:9px;color:#9ca3af;font-weight:700;">
                Vendedor: ${order.seller?.name || ''} (${order.zone || 'OFICINA'}) &nbsp;|&nbsp; 
                Total Despachado: ${order.items?.reduce((acc: number, it: any) => acc + (it.dispQuantity || 0), 0)} &nbsp;|&nbsp; 
                Generado: ${new Date().toLocaleString('es-PE')}
            </div>
        </div>
    </div>
</body>
</html>`;

        const printWindow = window.open('', '_blank', 'width=850,height=1100');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                }, 300);
            };
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
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
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
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                                Generar Comprobante
                            </h1>
                            <p className="text-gray-400 font-bold text-sm">
                                Pedido #{order.orderNumber || order.id.slice(-6).toUpperCase()} — {order.client?.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 text-xs font-black rounded-2xl transition-all uppercase tracking-widest active:scale-95"
                        >
                            <Printer className="w-4 h-4" /> Imprimir
                        </button>

                        {order.status !== 'ENTREGADO' && (
                            <button
                                onClick={handleCompleteOrder}
                                disabled={isCompleting}
                                className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-emerald-100 uppercase tracking-widest active:scale-95 disabled:opacity-50"
                            >
                                {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Finalizar Pedido
                            </button>
                        )}
                    </div>
                </div>

                {/* Config Panel */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6">Configuración del Comprobante</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Comprobante</label>
                            <div className="flex rounded-2xl bg-gray-100 p-1">
                                <button
                                    onClick={() => setDocType('BOLETA')}
                                    className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all ${docType === 'BOLETA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Boleta
                                </button>
                                <button
                                    onClick={() => setDocType('FACTURA')}
                                    className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all ${docType === 'FACTURA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Factura
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nro. Comprobante</label>
                            <input
                                type="text"
                                value={docNumber}
                                onChange={(e) => setDocNumber(e.target.value)}
                                placeholder="Ej: B001-00001"
                                className="w-full px-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-gray-700"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Método de Pago</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full px-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-gray-700 appearance-none"
                            >
                                <option value="TRANSFERENCIA">Transferencia</option>
                                <option value="EFECTIVO">Efectivo</option>
                                <option value="TARJETA">Tarjeta</option>
                                <option value="CREDITO">Crédito</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">IGV (%)</label>
                            <input
                                type="number"
                                value={igv}
                                onChange={(e) => setIgv(parseFloat(e.target.value) || 0)}
                                className="w-full px-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-gray-700"
                            />
                        </div>
                    </div>
                </div>

                {/* Invoice Preview */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                    {/* Invoice Header */}
                    <div className="bg-gray-900 text-white px-10 py-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center">
                                        <Package className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black uppercase tracking-tight">INVESTMENTS Z & G S.A.C.</h2>
                                        <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">Fabricación de Prendas de Vestir</p>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-0.5 text-[10px] text-gray-400">
                                    <p>RUC: 20611188715</p>
                                    <p>Mza. E Lote. 11 Dpto. 201 Cnd. Las Praderas (Block 18)</p>
                                    <p>Lima - Lima - Comas</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-1">
                                        {docType === 'BOLETA' ? 'Boleta de Venta' : 'Factura'}
                                    </p>
                                    <p className="text-xl font-black text-white">
                                        {docNumber || (docType === 'BOLETA' ? 'B001-XXXXXX' : 'F001-XXXXXX')}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1.5">
                                        Fecha: {new Date().toLocaleDateString('es-PE')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="px-10 py-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Datos del Cliente</h4>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-black text-gray-900 uppercase text-sm">{order.client?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-bold text-gray-600 text-xs">{order.client?.documentType}: {order.client?.documentNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-bold text-gray-600 text-xs">{order.client?.address || 'Sin dirección'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Datos del Pedido</h4>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <Hash className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-bold text-gray-600 text-xs">Nota: <span className="text-indigo-600 font-black">#{order.orderNumber || order.id.slice(-6)}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-bold text-gray-600 text-xs">Fecha: {formatDate(order.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-bold text-gray-600 text-xs">Condición: {order.condition || '—'}</span>
                                    </div>
                                    {order.agency && (
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="font-bold text-gray-600 text-xs">Agencia: {order.agency}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="px-10 py-4">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-900">
                                    <th className="text-left py-3 text-[9px] font-black text-gray-900 uppercase tracking-widest">Descripción</th>
                                    {activeSizes.map(sf => (
                                        <th key={sf.field} className="text-center py-3 text-[9px] font-black text-gray-900 uppercase tracking-widest w-10">{sf.label}</th>
                                    ))}
                                    <th className="text-center py-3 text-[9px] font-black text-gray-900 uppercase tracking-widest w-14">Cant.</th>
                                    <th className="text-right py-3 text-[9px] font-black text-gray-900 uppercase tracking-widest w-20">P. Unit.</th>
                                    <th className="text-right py-3 text-[9px] font-black text-gray-900 uppercase tracking-widest w-24">Importe</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {order.items?.filter((it: any) => it.dispQuantity > 0).map((item: any, idx: number) => (
                                    <tr key={item.id || idx}>
                                        <td className="py-3">
                                            <p className="font-black text-gray-900 uppercase text-xs">{item.modelName}</p>
                                            <p className="text-[10px] text-gray-400 font-bold">{item.color}</p>
                                        </td>
                                        {activeSizes.map(sf => {
                                            const val = item[sf.dispField] || 0;
                                            return (
                                                <td key={sf.field} className="text-center py-3 text-[11px] font-bold text-gray-600">
                                                    {val > 0 ? val : '—'}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center py-3 font-black text-gray-900 text-xs">{item.dispQuantity}</td>
                                        <td className="text-right py-3 font-bold text-gray-600 text-xs">S/ {item.unitPrice?.toFixed(2)}</td>
                                        <td className="text-right py-3 font-black text-gray-900 text-xs">S/ {(item.dispQuantity * item.unitPrice).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="px-10 py-5 border-t border-gray-200 bg-gray-50/30">
                        <div className="flex justify-end">
                            <div className="w-72 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Subtotal</span>
                                    <span className="text-sm font-black text-gray-700">S/ {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">IGV ({igv}%)</span>
                                    <span className="text-sm font-black text-gray-700">S/ {igvAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="h-px bg-gray-900"></div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-base font-black text-gray-900 uppercase">Total</span>
                                    <span className="text-2xl font-black text-gray-900">S/ {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-10 py-4 border-t border-gray-100 bg-gray-50/30 text-center">
                        <p className="text-[10px] text-gray-400 font-bold">
                            Vendedor: {order.seller?.name} ({order.zone || 'OFICINA'}) | 
                            Total Despachado: {order.items?.reduce((acc: number, it: any) => acc + (it.dispQuantity || 0), 0)} | 
                            Generado: {new Date().toLocaleString('es-PE')}
                        </p>
                    </div>
                </div>
            </div>
            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowConfirmModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            <div className="bg-emerald-600 p-8 text-center text-white">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">¿Finalizar Pedido?</h3>
                            </div>

                            <div className="p-8 text-center">
                                <p className="text-gray-600 font-bold mb-6 text-sm leading-relaxed">
                                    Estás a punto de marcar el despacho como <span className="text-emerald-600">ENTREGADO</span>. 
                                    Esto registrará la venta oficial en el sistema y ya no podrá ser modificado.
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setShowConfirmModal(false)}
                                        className="py-4 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black rounded-2xl transition-all uppercase text-xs tracking-widest active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={executeCompleteOrder}
                                        className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-100 uppercase text-xs tracking-widest active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Package className="w-4 h-4" /> Sí, Finalizar
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
