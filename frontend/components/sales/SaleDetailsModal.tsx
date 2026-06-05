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
    ShieldCheck,
    Download,
    Eye,
    Truck
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
    const [isEditingGuide, setIsEditingGuide] = useState(false);
    const [guideValue, setGuideValue] = useState('');
    const [isSavingGuide, setIsSavingGuide] = useState(false);

    const [isEditingInvoice, setIsEditingInvoice] = useState(false);
    const [invoiceValue, setInvoiceValue] = useState('');
    const [isSavingInvoice, setIsSavingInvoice] = useState(false);
    const [showGreForm, setShowGreForm] = useState(false);
    const [isConsultingGuia, setIsConsultingGuia] = useState(false);
    const [greData, setGreData] = useState({
        peso_bruto_total: '0.00',
        numero_de_bultos: '1',
        punto_de_partida_ubigeo: '150110', // Comas, Lima
        punto_de_partida_direccion: 'Mza. E Lote. 11 Dpto. 201 Cnd. Las Praderas (Block 18), Lima - Lima - Comas',
        punto_de_llegada_ubigeo: '150101', // Default to Lima
        punto_de_llegada_direccion: '',
        vehiculo_placa: 'CTP-078',
        conductor_tipo_de_documento: '1',
        conductor_numero_de_documento: '43225002', // Driver DNI
        conductor_denominacion: 'Eder Joel Ancassi Cárdenas',
        conductor_licencia: 'Q43225002',
    });

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
            setInvoiceValue(resp.data.invoiceNumber || '');
            
            // Calculate weight dynamically based on sale items
            let totalWeight = 0;
            resp.data.items?.forEach((item: any) => {
                const qty = item.quantity || 0;
                const category = item.variant?.product?.category || '';
                const isBermuda = category.toLowerCase().includes('bermuda') || category.toLowerCase().includes('short');
                const itemWeight = isBermuda ? 0.5 : 0.6;
                totalWeight += qty * itemWeight;
            });

            setGreData(prev => ({
                ...prev,
                punto_de_llegada_direccion: resp.data.client?.address || '',
                punto_de_llegada_ubigeo: '150101',
                peso_bruto_total: totalWeight.toFixed(2)
            }));
        } catch (error) {
            console.error('Error fetching sale details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveInvoiceNumber = async () => {
        setIsSavingInvoice(true);
        try {
            await api.patch(`/sales/${saleId}/invoice-number`, { invoiceNumber: invoiceValue });
            toast.success('Número de comprobante actualizado');
            setIsEditingInvoice(false);
            fetchSaleDetails();
        } catch (error: any) {
            console.error('Error updating invoice number:', error);
            toast.error(error.response?.data?.message || 'Error al actualizar el comprobante');
        } finally {
            setIsSavingInvoice(false);
        }
    };

    const handleGenerateGRE = async () => {
        if (!greData.conductor_numero_de_documento) {
            toast.error('Por favor, ingrese el DNI del chofer');
            return;
        }
        setIsSavingGuide(true);
        try {
            await api.post(`/sales/${saleId}/generate-gre`, greData);
            toast.success('Guía de remisión electrónica generada correctamente');
            setShowGreForm(false);
            fetchSaleDetails();
            // Auto-consult after a delay to try to get the PDF
            setTimeout(async () => {
                try {
                    const resp = await api.post(`/sales/${saleId}/consultar-guia`);
                    if (resp.data.pdfUrl) {
                        toast.success('PDF de guía disponible');
                        fetchSaleDetails();
                    }
                } catch (e) {
                    // Silently fail - SUNAT may not have processed yet
                    console.log('Auto-consult: PDF not ready yet');
                }
            }, 5000);
        } catch (error: any) {
            console.error('Error generating GRE:', error);
            toast.error(error.response?.data?.message || 'Error al generar la guía');
        } finally {
            setIsSavingGuide(false);
        }
    };

    const handleConsultarGuia = async () => {
        setIsConsultingGuia(true);
        try {
            const resp = await api.post(`/sales/${saleId}/consultar-guia`);
            if (resp.data.pdfUrl) {
                toast.success('PDF de guía obtenido correctamente');
                fetchSaleDetails();
                // Open the PDF in a new tab
                window.open(resp.data.pdfUrl, '_blank');
            } else {
                toast('La guía aún está siendo procesada por SUNAT. Intente en unos minutos.', { icon: '⏳' });
            }
        } catch (error: any) {
            console.error('Error consulting GRE:', error);
            toast.error(error.response?.data?.message || 'Error al consultar la guía');
        } finally {
            setIsConsultingGuia(false);
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

    const handleSaveGuide = async () => {
        setIsSavingGuide(true);
        try {
            await api.patch(`/sales/${saleId}/referral-guide`, { referralGuide: guideValue });
            toast.success('Guía de remisión actualizada');
            setIsEditingGuide(false);
            fetchSaleDetails();
        } catch (error: any) {
            console.error('Error updating referral guide:', error);
            toast.error(error.response?.data?.message || 'Error al actualizar la guía');
        } finally {
            setIsSavingGuide(false);
        }
    };

    const getVoucherHTML = () => {
        if (!sale) return '';
        const docTitle = sale.invoiceNumber?.startsWith('F') ? 'Factura' : 'Boleta de Venta';
        const docNum = sale.invoiceNumber || 'S/N';
        const today = formatDate(sale.createdAt);

        const itemRows = (sale.items || []).map((item: any) => `
            <tr>
                <td style="padding:6px 4px;border-bottom:1px solid #eee;">
                    <div style="font-weight:700;color:#111;font-size:10px;text-transform:uppercase;">${item.variant?.product?.name || 'PRODUCTO'}</div>
                    <div style="font-size:8px;color:#777;font-weight:600;">Talla: ${item.variant?.size || ''} / Color: ${item.variant?.color || ''}</div>
                </td>
                <td style="text-align:center;padding:6px 4px;font-weight:700;color:#111;font-size:10px;border-bottom:1px solid #eee;">${item.quantity}</td>
                <td style="text-align:right;padding:6px 4px;font-weight:600;color:#555;font-size:9px;border-bottom:1px solid #eee;">S/ ${item.unitPrice?.toFixed(2)}</td>
                <td style="text-align:right;padding:6px 4px;font-weight:700;color:#111;font-size:10px;border-bottom:1px solid #eee;">${item.totalPrice?.toFixed(2)}</td>
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
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Inter', sans-serif; color: #111; padding: 20px 30px; font-size: 10px; }
                    .header { background:#111; color:#fff; padding:15px 20px; border-radius:10px; margin-bottom:12px; display: flex; justify-content: space-between; align-items: center; }
                    .client-box { padding:10px 15px; border:1px solid #eee; border-radius:10px; margin-bottom:12px; background:#fafafa; display: flex; justify-content: space-between; }
                    table { width:100%; border-collapse:collapse; margin-bottom:12px; }
                    th { text-align:left; padding:6px 4px; font-size:8px; border-bottom:2px solid #111; text-transform:uppercase; color:#555; }
                    .totals { width:180px; margin-left:auto; }
                    .totals-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 9px; }
                    .grand-total { border-top: 1px solid #111; margin-top: 6px; padding-top: 6px; font-weight: 800; font-size: 12px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div style="font-size:14px;font-weight:800;">INVESTMENTS Z & G S.A.C.</div>
                        <div style="font-size:8px;color:#9ca3af;">RUC: 20611188715</div>
                    </div>
                    <div style="border:1px solid rgba(255,255,255,0.2);padding:6px 12px;border-radius:6px;text-align:center;">
                        <div style="font-size:7px;font-weight:800;color:#818cf8;text-transform:uppercase;">${docTitle}</div>
                        <div style="font-size:12px;font-weight:800;">${docNum}</div>
                    </div>
                </div>

                <div class="client-box">
                    <div>
                        <div style="font-size:7px;font-weight:800;color:#9ca3af;text-transform:uppercase;">Cliente</div>
                        <div style="font-size:10px;font-weight:800;margin-top:2px;">${sale.client?.name || 'PUBLICO GENERAL'}</div>
                        <div style="font-size:8px;color:#666;">${sale.client?.documentType || 'DNI'}: ${sale.client?.documentNumber || '00000000'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:7px;font-weight:800;color:#9ca3af;text-transform:uppercase;">Detalles</div>
                        <div style="font-size:8px;color:#666;margin-top:2px;">Fecha Emisión: ${today}</div>
                        ${sale.referralGuide ? `<div style="font-size:8px;color:#666;margin-top:2px;">Guía Remisión: <span style="font-weight:700;">${sale.referralGuide}</span></div>` : ''}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Descripción</th>
                            <th style="text-align:center;width:40px;">Cant</th>
                            <th style="text-align:right;width:70px;">P. Unit</th>
                            <th style="text-align:right;width:80px;">Total</th>
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
                        className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
                    >
                        {/* HEADER */}
                        <div className="bg-gray-900 px-6 py-4 text-white relative">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black uppercase tracking-tight">Detalle de Venta</h2>
                                            <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em]">Transaction Audit System</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-3 text-[9px] font-bold text-gray-400">
                                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                                            <Hash className="w-2.5 h-2.5" /> ID: {saleId}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/20" suppressHydrationWarning>
                                            <Calendar className="w-2.5 h-2.5" /> {sale ? formatDate(sale.createdAt) : '---'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right hidden md:block">
                                    <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300 mb-0.5">Status</p>
                                        <div className="flex items-center justify-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="font-black text-white uppercase tracking-widest text-xs">{sale?.status || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                            {isLoading ? (
                                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                                    <p className="font-black uppercase text-xs tracking-widest">Cargando información del sistema...</p>
                                </div>
                            ) : sale && (
                                <>
                                    {/* INFO CARDS */}
                                    <div className={`grid grid-cols-1 ${sale.invoiceNumber ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400">
                                                    <User className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Información del Cliente</span>
                                            </div>
                                            <p className="font-black text-gray-900 uppercase text-xs mb-0.5">{sale.client?.name || 'PUBLICO GENERAL'}</p>
                                            <p className="text-[10px] font-bold text-gray-500">{sale.client?.documentType}: {sale.client?.documentNumber || '---------'}</p>
                                            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400">
                                                <MapPin className="w-2.5 h-2.5" />
                                                <span className="font-medium line-clamp-1">{sale.client?.address || 'Sin dirección registrada'}</span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400">
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pago y Facturación</span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Documento</span>
                                                    {isEditingInvoice ? (
                                                        <div className="flex items-center gap-1">
                                                            <input 
                                                                type="text"
                                                                className="px-2 py-0.5 border border-gray-300 rounded text-xs font-bold uppercase w-28 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                value={invoiceValue}
                                                                onChange={(e) => setInvoiceValue(e.target.value)}
                                                                placeholder="F001-000001"
                                                            />
                                                            <button 
                                                                onClick={handleSaveInvoiceNumber}
                                                                disabled={isSavingInvoice}
                                                                className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded uppercase tracking-wider hover:bg-emerald-700 transition"
                                                            >
                                                                Ok
                                                            </button>
                                                            <button 
                                                                onClick={() => setIsEditingInvoice(false)}
                                                                className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[9px] font-black rounded uppercase tracking-wider hover:bg-gray-300 transition"
                                                            >
                                                                X
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-black text-indigo-600">{sale.invoiceNumber || 'Sin comprobante'}</span>
                                                            <button 
                                                                onClick={() => {
                                                                    setInvoiceValue(sale.invoiceNumber || '');
                                                                    setIsEditingInvoice(true);
                                                                }}
                                                                className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 underline uppercase"
                                                            >
                                                                Editar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Método</span>
                                                    <span className="text-xs font-black text-gray-700">{sale.paymentMethod}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Moneda</span>
                                                    <span className="text-xs font-black text-gray-700">SOLES (S/)</span>
                                                </div>
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Guía Remisión</span>
                                                    {isEditingGuide ? (
                                                        <div className="flex items-center gap-1">
                                                            <input 
                                                                type="text"
                                                                className="px-2 py-0.5 border border-gray-300 rounded text-xs font-bold uppercase w-28 bg-white"
                                                                value={guideValue}
                                                                onChange={(e) => setGuideValue(e.target.value)}
                                                                placeholder="T001-000001"
                                                            />
                                                            <button 
                                                                onClick={handleSaveGuide}
                                                                disabled={isSavingGuide}
                                                                className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded uppercase tracking-wider hover:bg-emerald-700 transition"
                                                            >
                                                                Ok
                                                            </button>
                                                            <button 
                                                                onClick={() => setIsEditingGuide(false)}
                                                                className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[9px] font-black rounded uppercase tracking-wider hover:bg-gray-300 transition"
                                                            >
                                                                X
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1 items-end">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-black text-gray-700">{sale.referralGuide || 'SIN GUIA'}</span>
                                                                <button 
                                                                    onClick={() => {
                                                                        setGuideValue(sale.referralGuide || '');
                                                                        setIsEditingGuide(true);
                                                                    }}
                                                                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 underline uppercase"
                                                                >
                                                                    {sale.referralGuide ? 'Editar Nro' : 'Agregar Nro'}
                                                                </button>
                                                            </div>
                                                            <button 
                                                                onClick={() => setShowGreForm(true)}
                                                                className="text-[9px] px-2 py-0.5 bg-indigo-50 text-indigo-600 font-black rounded border border-indigo-100 hover:bg-indigo-100 transition uppercase"
                                                            >
                                                                Emitir GRE
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Responsable</span>
                                            </div>
                                            <p className="font-black text-gray-900 uppercase text-xs mb-0.5">{sale.seller?.name}</p>
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-1.5 py-0.5 bg-indigo-50 rounded-md inline-block">
                                                Zona: {sale.seller?.zone || 'OFICINA'}
                                            </p>
                                            {sale.notes && (
                                                <p className="mt-2 text-[9px] text-gray-400 italic font-medium line-clamp-2">
                                                    "{sale.notes}"
                                                </p>
                                            )}
                                        </div>

                                        {sale.invoiceNumber && (
                                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400">
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Información SUNAT</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Estado</span>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                                                            sale.sunatStatus === 'ACEPTADO' || sale.sunatStatus === 'ENVIADO' ? 'bg-emerald-50 text-emerald-600' : 
                                                            sale.sunatStatus === 'ERROR' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                        }`}>{sale.sunatStatus || 'PENDIENTE'}</span>
                                                    </div>
                                                    
                                                    {(!sale.sunatStatus || sale.sunatStatus === 'ERROR') ? (
                                                        <button 
                                                            onClick={handleSendToSunat}
                                                            disabled={isSending}
                                                            className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-100"
                                                        >
                                                            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Enviar a SUNAT'}
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                if (window.confirm('¿Está seguro de reenviar este comprobante a SUNAT (Producción)? Se registrará en el entorno de producción de SUNAT y Nubefact. Si la venta tiene más de 3 días de antigüedad, se ajustará la fecha de emisión a la de hoy.')) {
                                                                    handleSendToSunat();
                                                                }
                                                            }}
                                                            disabled={isSending}
                                                            className="w-full py-2 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-700 transition disabled:opacity-50 shadow-md shadow-amber-100"
                                                        >
                                                            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Reenviar a SUNAT (Prod)'}
                                                        </button>
                                                    )}

                                                    {sale.sunatResponse && (
                                                        <p className="text-[8px] text-gray-400 font-medium italic border-t border-gray-200 pt-1 line-clamp-2">
                                                            {sale.sunatResponse}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* PRODUCTS TABLE */}
                                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Resumen de Productos</h3>
                                            <span className="text-[10px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-50 shadow-sm">
                                                {sale.items?.length} Ítems registrados
                                            </span>
                                        </div>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-50">
                                                    <th className="px-4 py-2 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                                                    <th className="px-4 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-widest">Variante</th>
                                                    <th className="px-4 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-widest">Cant.</th>
                                                    <th className="px-4 py-2 text-right text-[8px] font-black text-gray-400 uppercase tracking-widest">Precio Unit.</th>
                                                    <th className="px-4 py-2 text-right text-[8px] font-black text-gray-400 uppercase tracking-widest">Precio Costo</th>
                                                    <th className="px-4 py-2 text-right text-[8px] font-black text-gray-400 uppercase tracking-widest">Costo Total</th>
                                                    <th className="px-4 py-2 text-right text-[8px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {sale.items?.map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-gray-50/50 transition duration-150">
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center font-black text-gray-400 text-[9px]">
                                                                    {item.variant?.product?.name?.charAt(0) || 'P'}
                                                                </div>
                                                                <span className="font-bold text-gray-800 uppercase text-xs">
                                                                    {item.variant?.product?.name || 'PRODUCTO'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-xs font-black text-indigo-600">
                                                            {item.variant?.size} / {item.variant?.color}
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-xs font-black text-gray-900">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-xs font-bold text-gray-500">
                                                            S/ {item.unitPrice?.toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-xs font-bold text-rose-500">
                                                            S/ {(item.costPrice || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-xs font-bold text-rose-500">
                                                            S/ {((item.costPrice || 0) * item.quantity).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-xs font-black text-gray-900">
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
                            <div className="bg-gray-50 p-4 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex gap-2.5">
                                    <button
                                        onClick={handlePrint}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:bg-black transition active:scale-95"
                                    >
                                        <Printer className="w-3.5 h-3.5" /> Reimprimir Comprobante
                                    </button>
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm hover:bg-gray-50 transition active:scale-95"
                                    >
                                        <FileText className="w-3.5 h-3.5" /> Descargar PDF
                                    </button>

                                    {sale.sunatPdfUrl && (
                                        <a
                                            href={sale.sunatPdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:bg-emerald-700 transition active:scale-95"
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5" /> Ver Factura Oficial
                                        </a>
                                    )}

                                    {sale.sunatGuidePdfUrl ? (
                                        <a
                                            href={sale.sunatGuidePdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:bg-teal-700 transition active:scale-95"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Ver Guía PDF
                                        </a>
                                    ) : sale.referralGuide ? (
                                        <button
                                            onClick={handleConsultarGuia}
                                            disabled={isConsultingGuia}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:bg-teal-700 transition active:scale-95 disabled:opacity-50"
                                        >
                                            {isConsultingGuia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                                            {isConsultingGuia ? 'Consultando...' : 'Obtener Guía PDF'}
                                        </button>
                                    ) : null}
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-md w-full md:w-72">
                                    <div className="space-y-1.5 mb-2">
                                        <div className="flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                            <span>Subtotal</span>
                                            <span>S/ {(sale.totalAmount / 1.18).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                            <span>Impuestos (18%)</span>
                                            <span>S/ ({(sale.totalAmount - (sale.totalAmount / 1.18)).toFixed(2)})</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-black text-rose-500 uppercase tracking-widest">
                                            <span>Costo Total</span>
                                            <span>S/ {(sale.totalCost || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                                            <span>Utilidad</span>
                                            <span>S/ {(sale.totalAmount - (sale.totalCost || 0)).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="h-px bg-gray-200 mb-2" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-gray-900 uppercase">Total Final</span>
                                        <span className="text-2xl font-black text-indigo-600 leading-none">S/ {sale.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            {/* GRE Form Modal */}
            <AnimatePresence>
                {showGreForm && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-gray-700"
                        >
                            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight">Generar Guía de Remisión Electrónica (GRE)</h3>
                                    <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">SUNAT Invoicing Integration</p>
                                </div>
                                <button 
                                    onClick={() => setShowGreForm(false)}
                                    className="p-2 hover:bg-white/10 rounded-full transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-gray-700">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Motivo de Traslado</label>
                                        <input 
                                            type="text" 
                                            value="VENTA" 
                                            disabled 
                                            className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-400 cursor-not-allowed text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modalidad de Transporte</label>
                                        <input 
                                            type="text" 
                                            value="TRANSPORTE PRIVADO" 
                                            disabled 
                                            className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-400 cursor-not-allowed text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chofer / Conductor</label>
                                        <input 
                                            type="text" 
                                            value={greData.conductor_denominacion} 
                                            onChange={(e) => setGreData({...greData, conductor_denominacion: e.target.value})} 
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-xs text-gray-700"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Licencia de Conducir</label>
                                        <input 
                                            type="text" 
                                            value={greData.conductor_licencia} 
                                            onChange={(e) => setGreData({...greData, conductor_licencia: e.target.value})} 
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-xs text-gray-700"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Placa de Vehículo</label>
                                        <input 
                                            type="text" 
                                            value={greData.vehiculo_placa} 
                                            onChange={(e) => setGreData({...greData, vehiculo_placa: e.target.value})} 
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-xs text-gray-700"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DNI del Chofer *</label>
                                        <input 
                                            type="text" 
                                            value={greData.conductor_numero_de_documento} 
                                            onChange={(e) => setGreData({...greData, conductor_numero_de_documento: e.target.value})} 
                                            placeholder="DNI del chofer"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-xs text-gray-700"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Peso Bruto Total (kg)</label>
                                        <input 
                                            type="text" 
                                            value={greData.peso_bruto_total} 
                                            onChange={(e) => setGreData({...greData, peso_bruto_total: e.target.value})} 
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-xs text-gray-700"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nro de Bultos</label>
                                        <input 
                                            type="number" 
                                            value={greData.numero_de_bultos} 
                                            onChange={(e) => setGreData({...greData, numero_de_bultos: e.target.value})} 
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-xs text-gray-700"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                        <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider">Punto de Partida (Origen)</h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="sm:col-span-2 space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dirección Origen</label>
                                                <input 
                                                    type="text" 
                                                    value={greData.punto_de_partida_direccion} 
                                                    onChange={(e) => setGreData({...greData, punto_de_partida_direccion: e.target.value})} 
                                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-xs text-gray-700"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ubigeo Origen</label>
                                                <input 
                                                    type="text" 
                                                    value={greData.punto_de_partida_ubigeo} 
                                                    onChange={(e) => setGreData({...greData, punto_de_partida_ubigeo: e.target.value})} 
                                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-xs text-gray-700"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                        <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider">Punto de Llegada (Destino)</h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="sm:col-span-2 space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dirección Destino</label>
                                                <input 
                                                    type="text" 
                                                    value={greData.punto_de_llegada_direccion} 
                                                    onChange={(e) => setGreData({...greData, punto_de_llegada_direccion: e.target.value})} 
                                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-xs text-gray-700"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ubigeo Destino</label>
                                                <input 
                                                    type="text" 
                                                    value={greData.punto_de_llegada_ubigeo} 
                                                    onChange={(e) => setGreData({...greData, punto_de_llegada_ubigeo: e.target.value})} 
                                                    placeholder="Ej. 150101"
                                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none font-bold text-xs text-gray-700"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-end gap-3">
                                <button 
                                    onClick={() => setShowGreForm(false)}
                                    className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-gray-100 transition active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleGenerateGRE}
                                    disabled={isSavingGuide}
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {isSavingGuide ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                    Emitir y Guardar Guía
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
}
