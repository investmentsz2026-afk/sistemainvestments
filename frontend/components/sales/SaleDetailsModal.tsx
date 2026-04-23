'use client';

import { useState, useEffect } from 'react';
import {
    X,
    Printer,
    User,
    Calendar,
    CreditCard,
    MapPin,
    Package,
    Building2,
    Hash,
    Loader2,
    FileText,
    ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.endsWith('T00:00:00.000Z')) {
        return new Date(dateString).toLocaleDateString('es-PE', { timeZone: 'UTC' });
    }
    return new Date(dateString).toLocaleDateString('es-PE');
};

interface SaleDetailsModalProps {
    saleId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function SaleDetailsModal({ saleId, isOpen, onClose }: SaleDetailsModalProps) {
    const [sale, setSale] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (isOpen && saleId) {
            fetchSaleDetails();
        }
    }, [isOpen, saleId]);

    const fetchSaleDetails = async () => {
        setIsLoading(true);
        try {
            const resp = await api.get(`/sales/${saleId}`);
            setSale(resp.data);
        } catch (error) {
            console.error('Error fetching sale details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendToSunat = async () => {
        setIsSending(true);
        try {
            const resp = await api.post(`/sales/${saleId}/sunat`);
            if (resp.data.success) {
                toast.success('Documento enviado correctamente');
                fetchSaleDetails();
            } else {
                toast.error(resp.data.message || 'Error al enviar a SUNAT');
            }
        } catch (error) {
            console.error('Error sending to SUNAT:', error);
            toast.error('Error de conexión con el servidor de SUNAT');
        } finally {
            setIsSending(false);
        }
    };

    const getVoucherHTML = () => {
        if (!sale) return '';

        const docTitle = sale.invoiceNumber?.startsWith('F') ? 'Factura' : 'Boleta de Venta';
        const docNum = sale.invoiceNumber || 'S/N';
        const today = formatDate(sale.createdAt);

        const itemRows = (sale.items || []).map((item: any) => `
            <tr>
                <td style="padding:10px 4px;border-bottom:1px solid #eee;">
                    <div style="font-weight:800;color:#111;font-size:11px;text-transform:uppercase;">${item.variant?.product?.name || 'PRODUCTO'}</div>
                    <div style="font-size:9px;color:#888;font-weight:600;">${item.variant?.size || ''} / ${item.variant?.color || ''}</div>
                </td>
                <td style="text-align:center;padding:10px 4px;font-weight:800;color:#111;font-size:11px;border-bottom:1px solid #eee;">${item.quantity}</td>
                <td style="text-align:right;padding:10px 4px;font-weight:600;color:#555;font-size:10px;border-bottom:1px solid #eee;">S/ ${item.unitPrice?.toFixed(2)}</td>
                <td style="text-align:right;padding:10px 4px;font-weight:800;color:#111;font-size:11px;border-bottom:1px solid #eee;">S/ ${item.totalPrice?.toFixed(2)}</td>
            </tr>
        `).join('');

        const subtotal = sale.totalAmount / 1.18;
        const igvAmount = sale.totalAmount - subtotal;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Inter', sans-serif; color: #111; padding: 40px; }
                    .header { background:#111; color:#fff; padding:25px; border-radius:12px; margin-bottom:20px; display: flex; justify-content: space-between; align-items: center; }
                    .client-box { padding:15px; border:1px solid #eee; border-radius:12px; margin-bottom:20px; background:#fafafa; display: flex; justify-content: space-between; }
                    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
                    th { text-align:left; padding:10px; font-size:9px; border-bottom:2px solid #111; text-transform:uppercase; }
                    .totals { width:220px; margin-left:auto; }
                    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
                    .grand-total { border-top: 2px solid #111; margin-top: 10px; padding-top: 10px; font-weight: 900; font-size: 16px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div style="font-size:18px;font-weight:900;">INVESTMENTS Z & G S.A.C.</div>
                        <div style="font-size:9px;color:#9ca3af;">RUC: 20611188715</div>
                    </div>
                    <div style="border:1px solid rgba(255,255,255,0.2);padding:10px 20px;border-radius:8px;text-align:center;">
                        <div style="font-size:8px;font-weight:800;color:#818cf8;text-transform:uppercase;">${docTitle}</div>
                        <div style="font-size:16px;font-weight:900;">${docNum}</div>
                    </div>
                </div>

                <div class="client-box">
                    <div>
                        <div style="font-size:8px;font-weight:800;color:#9ca3af;text-transform:uppercase;">Cliente</div>
                        <div style="font-size:12px;font-weight:800;margin-top:2px;">${sale.client?.name || 'PUBLICO GENERAL'}</div>
                        <div style="font-size:10px;color:#666;">${sale.client?.documentType || 'DNI'}: ${sale.client?.documentNumber || '00000000'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:8px;font-weight:800;color:#9ca3af;text-transform:uppercase;">Detalles</div>
                        <div style="font-size:10px;color:#666;margin-top:2px;">Fecha: ${today}</div>
                        <div style="font-size:10px;color:#666;">Vendedor: ${sale.seller?.name || 'N/A'} (${sale.seller?.zone || 'OFICINA'})</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Descripción</th>
                            <th style="text-align:center;">Cant</th>
                            <th style="text-align:right;">P. Unit</th>
                            <th style="text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                </table>

                <div class="totals">
                    <div class="totals-row"><span>Subtotal</span><span>S/ ${subtotal.toFixed(2)}</span></div>
                    <div class="totals-row"><span>IGV (18%)</span><span>S/ ${igvAmount.toFixed(2)}</span></div>
                    <div class="totals-row grand-total"><span>TOTAL</span><span>S/ ${sale.totalAmount.toFixed(2)}</span></div>
                </div>
            </body>
            </html>
        `;
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=850,height=1100');
        if (printWindow) {
            printWindow.document.write(getVoucherHTML());
            printWindow.document.close();
            printWindow.onload = () => {
                setTimeout(() => { printWindow.print(); }, 500);
            };
        }
    };

    const handleDownloadPDF = () => {
        handlePrint();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        {/* HEADER */}
                        <div className="bg-gray-900 px-10 py-8 text-white relative">
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center">
                                            <Package className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black uppercase tracking-tight">Detalle de Venta</h2>
                                            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">Transaction Audit System</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold text-gray-400">
                                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                            <Hash className="w-3 h-3" /> ID: {saleId}
                                        </div>
                                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                            <Calendar className="w-3 h-3" /> {sale ? formatDate(sale.createdAt) : '---'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right hidden md:block">
                                    <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-center">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-1">Status</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="font-black text-white uppercase tracking-widest text-sm">{sale?.status || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                            {isLoading ? (
                                <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-4">
                                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                                    <p className="font-black uppercase text-xs tracking-widest">Cargando información del sistema...</p>
                                </div>
                            ) : sale && (
                                <>
                                    {/* INFO CARDS */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información del Cliente</span>
                                            </div>
                                            <p className="font-black text-gray-900 uppercase text-sm mb-1">{sale.client?.name || 'PUBLICO GENERAL'}</p>
                                            <p className="text-xs font-bold text-gray-500">{sale.client?.documentType}: {sale.client?.documentNumber || '---------'}</p>
                                            <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
                                                <MapPin className="w-3 h-3" />
                                                <span className="font-medium line-clamp-1">{sale.client?.address || 'Sin dirección registrada'}</span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400">
                                                    <CreditCard className="w-4 h-4" />
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pago y Facturación</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] font-bold text-gray-400 uppercase">Documento</span>
                                                    <span className="text-xs font-black text-indigo-600">{sale.invoiceNumber || 'Sin comprobante'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] font-bold text-gray-400 uppercase">Método</span>
                                                    <span className="text-xs font-black text-gray-700">{sale.paymentMethod}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] font-bold text-gray-400 uppercase">Moneda</span>
                                                    <span className="text-xs font-black text-gray-700">SOLES (S/)</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsable</span>
                                            </div>
                                            <p className="font-black text-gray-900 uppercase text-sm mb-1">{sale.seller?.name}</p>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded-md inline-block">
                                                Zona: {sale.seller?.zone || 'OFICINA'}
                                            </p>
                                            {sale.notes && (
                                                <p className="mt-3 text-[10px] text-gray-400 italic font-medium line-clamp-2">
                                                    "{sale.notes}"
                                                </p>
                                            )}
                                        </div>

                                        {sale.invoiceNumber && (
                                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400">
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información SUNAT</span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[11px] font-bold text-gray-400 uppercase">Estado</span>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                            sale.sunatStatus === 'ACEPTADO' || sale.sunatStatus === 'ENVIADO' ? 'bg-emerald-50 text-emerald-600' : 
                                                            sale.sunatStatus === 'ERROR' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                        }`}>{sale.sunatStatus || 'PENDIENTE'}</span>
                                                    </div>
                                                    
                                                    {(!sale.sunatStatus || sale.sunatStatus === 'ERROR') && (
                                                        <button 
                                                            onClick={handleSendToSunat}
                                                            disabled={isSending}
                                                            className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition disabled:opacity-50 shadow-lg shadow-indigo-100"
                                                        >
                                                            {isSending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Enviar a SUNAT'}
                                                        </button>
                                                    )}

                                                    {sale.sunatResponse && (
                                                        <p className="text-[9px] text-gray-400 font-medium italic border-t border-gray-200 pt-2">
                                                            {sale.sunatResponse}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* PRODUCTS TABLE */}
                                    <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                                        <div className="px-8 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumen de Productos</h3>
                                            <span className="text-[11px] font-black text-indigo-600 bg-white px-3 py-1 rounded-lg border border-indigo-50 shadow-sm">
                                                {sale.items?.length} Ítems registrados
                                            </span>
                                        </div>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-50">
                                                    <th className="px-8 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                                                    <th className="px-8 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Variante</th>
                                                    <th className="px-8 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Cant.</th>
                                                    <th className="px-8 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Precio Unit.</th>
                                                    <th className="px-8 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {sale.items?.map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-gray-50/50 transition duration-150">
                                                        <td className="px-8 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-black text-gray-400 text-[10px]">
                                                                    {item.variant?.product?.name?.charAt(0) || 'P'}
                                                                </div>
                                                                <span className="font-bold text-gray-800 uppercase text-xs">
                                                                    {item.variant?.product?.name || 'PRODUCTO'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-4 text-center text-xs font-black text-indigo-600">
                                                            {item.variant?.size} / {item.variant?.color}
                                                        </td>
                                                        <td className="px-8 py-4 text-center text-sm font-black text-gray-900">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="px-8 py-4 text-right text-xs font-bold text-gray-500">
                                                            S/ {item.unitPrice?.toFixed(2)}
                                                        </td>
                                                        <td className="px-8 py-4 text-right text-sm font-black text-gray-900">
                                                            S/ {item.totalPrice?.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* FOOTER - TOTALS */}
                        {sale && (
                            <div className="bg-gray-50 p-10 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="flex gap-4">
                                    <button
                                        onClick={handlePrint}
                                        className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-black transition active:scale-95"
                                    >
                                        <Printer className="w-4 h-4" /> Reimprimir Comprobante
                                    </button>
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="flex items-center gap-3 px-8 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-gray-50 transition active:scale-95"
                                    >
                                        <FileText className="w-4 h-4" /> Descargar PDF
                                    </button>
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 w-full md:w-80">
                                    <div className="space-y-2 mb-3">
                                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <span>Subtotal</span>
                                            <span>S/ {(sale.totalAmount / 1.18).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <span>Impuestos (18%)</span>
                                            <span>S/ ({(sale.totalAmount - (sale.totalAmount / 1.18)).toFixed(2)})</span>
                                        </div>
                                    </div>
                                    <div className="h-px bg-gray-200 mb-3" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-black text-gray-900 uppercase">Total Final</span>
                                        <span className="text-3xl font-black text-indigo-600 leading-none">S/ {sale.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
