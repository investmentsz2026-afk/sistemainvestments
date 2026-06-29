'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Plus, 
    Calendar, 
    DollarSign, 
    Image as ImageIcon, 
    Trash2, 
    CheckCircle2, 
    ChevronRight,
    Loader2,
    FileText,
    Wallet,
    Upload,
    AlertCircle,
    ArrowRight,
    Search,
    Info,
    HelpCircle,
    Clock
} from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.endsWith('T00:00:00.000Z')) {
        return new Date(dateString).toLocaleDateString('es-PE', { timeZone: 'UTC' });
    }
    return new Date(dateString).toLocaleDateString('es-PE');
};

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '');

const getCreditNoteVoucherHTML = (payment: any, sale: any) => {
    if (!sale) return '';
    const today = formatDate(payment.createdAt || new Date().toISOString());
    const total = payment.amount;
    const subtotal = total / 1.18;
    const igv = total - subtotal;
    
    // Motive label map
    const motiveMap: Record<string, string> = {
        '1': 'ANULACIÓN DE LA OPERACIÓN',
        '4': 'DESCUENTO GLOBAL / DISMINUCIÓN DEL TOTAL',
        '6': 'DEVOLUCIÓN TOTAL DE PRODUCTOS',
        '10': 'OTROS CONCEPTOS'
    };
    const motiveDesc = motiveMap[payment.creditNoteMotive] || payment.notes || 'DESCUENTO GLOBAL';

    // Convert number to words (simple helper)
    const formatSolesInWords = (num: number) => {
        const integerPart = Math.floor(num);
        const decimalPart = Math.round((num - integerPart) * 100);
        
        // Simple integer to Spanish words (for typical values)
        const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
        const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
        const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
        const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
        
        const convertLessThanThousand = (n: number): string => {
            if (n === 0) return '';
            if (n === 100) return 'CIEN';
            const h = Math.floor(n / 100);
            const t = Math.floor((n % 100) / 10);
            const u = n % 10;
            
            let res = hundreds[h] ? hundreds[h] + ' ' : '';
            if (t === 1) {
                res += teens[u] + ' ';
            } else {
                res += (tens[t] ? tens[t] + ' ' : '');
                if (u > 0) {
                    res += (tens[t] ? 'Y ' : '') + units[u] + ' ';
                }
            }
            return res.trim();
        };

        const convertToWords = (n: number): string => {
            if (n === 0) return 'CERO';
            let word = '';
            
            if (Math.floor(n / 1000000) > 0) {
                const mill = Math.floor(n / 1000000);
                word += (mill === 1 ? 'UN MILLÓN' : convertLessThanThousand(mill) + ' MILLONES') + ' ';
                n %= 1000000;
            }
            
            if (Math.floor(n / 1000) > 0) {
                const thousands = Math.floor(n / 1000);
                word += (thousands === 1 ? 'MIL' : convertLessThanThousand(thousands) + ' MIL') + ' ';
                n %= 1000;
            }
            
            if (n > 0) {
                word += convertLessThanThousand(n) + ' ';
            }
            
            return word.trim();
        };

        const words = convertToWords(integerPart);
        const centsStr = decimalPart.toString().padStart(2, '0');
        return `SON: ${words} Y ${centsStr}/100 SOLES`;
    };

    const docTitle = sale.invoiceNumber?.startsWith('F') ? 'Factura Electrónica' : 'Boleta de Venta';
    const docNum = sale.invoiceNumber || 'S/N';
    const clientDocType = sale.client?.documentType || 'RUC';
    const clientDocNum = sale.client?.documentNumber || '00000000';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Inter', sans-serif; color: #111; padding: 25px; font-size: 10px; line-height: 1.4; }
                
                .top-container { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .company-info { width: 55%; }
                .company-name { font-size: 13px; font-weight: 900; margin-bottom: 4px; color: #111; }
                .company-details { font-size: 8px; color: #555; font-weight: 500; }
                
                .ruc-box { width: 40%; border: 2.5px solid #111; padding: 12px; text-align: center; border-radius: 4px; display: flex; flex-direction: column; justify-content: center; }
                .ruc-box .title { font-size: 10px; font-weight: 900; letter-spacing: 0.5px; }
                .ruc-box .ruc { font-size: 10px; font-weight: 900; margin: 4px 0; }
                .ruc-box .number { font-size: 12px; font-weight: 900; color: #111; }
                
                .section-title { font-size: 11px; font-weight: 900; border-bottom: 1.5px solid #111; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; }
                
                .grid-details { display: grid; grid-template-columns: 140px 1fr; row-gap: 5px; margin-bottom: 18px; font-size: 9px; }
                .grid-details .label { font-weight: 700; color: #333; }
                .grid-details .value { font-weight: 500; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; margin-top: 10px; }
                th { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #444; border-bottom: 2px solid #111; padding: 6px 4px; text-align: left; }
                td { padding: 8px 4px; border-bottom: 1px solid #ddd; font-size: 9px; }
                
                .bottom-section { display: flex; justify-content: space-between; margin-top: 15px; }
                .words-amount { width: 60%; font-weight: 700; font-size: 9px; text-transform: uppercase; border: 1px solid #eee; padding: 10px; border-radius: 6px; background: #fafafa; display: flex; align-items: center; }
                
                .totals-box { width: 35%; }
                .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 9px; }
                .totals-row.grand-total { border-top: 2px solid #111; font-weight: 900; font-size: 11px; padding-top: 6px; margin-top: 4px; }
                
                .footer-msg { border: 1px solid #111; border-radius: 4px; padding: 8px; font-size: 7.5px; font-style: italic; margin-top: 30px; text-align: center; }
                
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="top-container">
                <div class="company-info">
                    <div class="company-name">INVESTMENTS Z & G S.A.</div>
                    <div class="company-details">
                        MZA. E DPTO. 201 LOTE. 11 CND. LAS PRADERAS BLOCK 18 - COMAS-LIMA-LIMA<br>
                        Fecha de Emisión: ${today}
                    </div>
                </div>
                <div class="ruc-box">
                    <div class="title">NOTA DE CREDITO ELECTRONICA</div>
                    <div class="ruc">RUC: 20611188715</div>
                    <div class="number">${payment.creditNoteNumber || 'E001-PENDIENTE'}</div>
                </div>
            </div>

            <div class="section-title">Documento que modifies:</div>
            <div class="grid-details">
                <div class="label">${docTitle}</div>
                <div class="value">: ${docNum}</div>
                
                <div class="label">Señor(es)</div>
                <div class="value">: ${sale.client?.name || 'PÚBLICO GENERAL'}</div>
                
                <div class="label">${clientDocType}</div>
                <div class="value">: ${clientDocNum}</div>
                
                <div class="label">Tipo de Moneda</div>
                <div class="value">: SOLES</div>
                
                <div class="label">Motivo o Sustento</div>
                <div class="value">: ${motiveDesc.toUpperCase()}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 10%; text-align: center;">Cantidad</th>
                        <th style="width: 70%;">Descripción</th>
                        <th style="width: 20%; text-align: right;">Valor Unitario</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="text-align: center; font-weight: 700;">1</td>
                        <td style="font-weight: 500;">${motiveDesc.toUpperCase()}</td>
                        <td style="text-align: right; font-weight: 700;">S/ ${subtotal.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="bottom-section">
                <div class="words-amount">
                    ${formatSolesInWords(total)}
                </div>
                <div class="totals-box">
                    <div class="totals-row">
                        <span>Valor Venta</span>
                        <span style="font-weight: 700;">S/ ${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="totals-row">
                        <span>IGV (18%)</span>
                        <span style="font-weight: 700;">S/ ${igv.toFixed(2)}</span>
                    </div>
                    <div class="totals-row grand-total">
                        <span>Importe Total</span>
                        <span>S/ ${total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div class="footer-msg">
                Esta es una representación impresa de la nota de crédito electrónica, generada en el Sistema de SUNAT. Puede verificarla utilizando su clave SOL.
            </div>
        </body>
        </html>
    `;
};

interface SalePaymentsModalProps {
    saleId: string;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export default function SalePaymentsModal({ saleId, isOpen, onClose, onUpdate }: SalePaymentsModalProps) {
    const { user } = useAuth();
    const [sale, setSale] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showConfirmLiquidation, setShowConfirmLiquidation] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Form state
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('EFECTIVO');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [evidenceUrl, setEvidenceUrl] = useState('');

    // Credit Note specific form state
    const [isElectronic, setIsElectronic] = useState(true);
    const [creditNoteMotive, setCreditNoteMotive] = useState('4');
    const [creditNoteNumber, setCreditNoteNumber] = useState('');

    const handlePrintCreditNote = (payment: any) => {
        const printWindow = window.open('', '_blank', 'width=850,height=1100');
        if (printWindow) {
            printWindow.document.write(getCreditNoteVoucherHTML(payment, sale));
            printWindow.document.close();
            printWindow.onload = () => {
                setTimeout(() => { printWindow.print(); }, 500);
            };
        }
    };

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
            console.error('Error fetching sale payments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const resp = await api.post('/uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setEvidenceUrl(resp.data.url);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error al subir el archivo');
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        
        const numericAmount = parseFloat(amount);
        if (!amount || numericAmount <= 0) return;

        const totalPaid = sale?.payments?.filter((p: any) => p.status === 'APROBADO').reduce((acc: number, p: any) => acc + p.amount, 0) || 0;
        const pendingAmount = sale ? sale.totalAmount - totalPaid : 0;

        if (numericAmount > pendingAmount) {
            setErrorMsg(`El saldo pendiente es de S/ ${pendingAmount.toLocaleString()}. No puede exceder este monto.`);
            return;
        }

        if (method === 'NOTA_CREDITO' && !notes) {
            setErrorMsg('El motivo o sustento de la nota de crédito es obligatorio.');
            return;
        }

        if (method === 'NOTA_CREDITO' && !isElectronic && !creditNoteNumber) {
            setErrorMsg('El número de nota de crédito es obligatorio para registro manual.');
            return;
        }

        setIsSubmitting(true);
        const isVendor = user?.role === 'VENDEDOR_LIMA' || user?.role === 'VENDEDOR_ORIENTE';
        try {
            await api.post(`/sales/${saleId}/payments`, {
                amount: numericAmount,
                method,
                paymentDate,
                notes,
                evidenceUrl,
                creditNoteMotive: method === 'NOTA_CREDITO' ? creditNoteMotive : undefined,
                creditNoteNumber: method === 'NOTA_CREDITO' && !isElectronic ? creditNoteNumber : undefined,
                isElectronic: method === 'NOTA_CREDITO' ? isElectronic : undefined
            });
            
            // Reset form
            setAmount('');
            setNotes('');
            setEvidenceUrl('');
            setCreditNoteNumber('');
            setCreditNoteMotive('4');
            setIsElectronic(true);
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setShowAddForm(false);
            
            if (isVendor) {
                toast.success('Nota de Crédito registrada. En espera de confirmación por el área Comercial.', { duration: 6000 });
            } else {
                toast.success('Nota de Crédito procesada correctamente.');
            }

            // Refresh data
            await fetchSaleDetails();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error adding payment:', error);
            toast.error('Error al registrar la operación');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinalize = async () => {
        setIsSubmitting(true);
        const isVendor = user?.role === 'VENDEDOR_LIMA' || user?.role === 'VENDEDOR_ORIENTE';
        try {
            await api.patch(`/sales/${saleId}/finalize`);
            setShowConfirmLiquidation(false);
            if (isVendor) {
                toast.success('Liquidación registrada. En espera de confirmación por el área Comercial.', { duration: 6000 });
            } else {
                toast.success('Operación finalizada y venta liquidada.');
            }
            await fetchSaleDetails();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error finalizing sale:', error);
            toast.error('Error al liquidar la venta');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const totalPaid = sale?.payments?.filter((p: any) => p.status === 'APROBADO').reduce((acc: number, p: any) => acc + p.amount, 0) || 0;
    const totalPending = sale?.payments?.filter((p: any) => p.status === 'PENDIENTE').reduce((acc: number, p: any) => acc + p.amount, 0) || 0;
    const pendingAmount = sale ? sale.totalAmount - totalPaid : 0;
    const pendingAmountWithPending = pendingAmount - totalPending;
    const isCompleted = sale?.paymentStatus === 'CANCELADO';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    className="relative w-full max-w-2xl h-full sm:h-auto max-h-[90vh] bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100"
                >
                    {/* HEADER - COMPACT */}
                    <div className="bg-slate-950 p-6 sm:p-8 text-white relative flex-shrink-0">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -mr-32 -mt-32 blur-[60px]" />
                        
                        <div className="relative flex justify-between items-start mb-6">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <div className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                        <Wallet className="w-2.5 h-2.5" /> Cobranzas
                                    </div>
                                    {isCompleted ? (
                                        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                            <CheckCircle2 className="w-2.5 h-2.5" /> Liquidado
                                        </div>
                                    ) : (
                                        <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                                            <AlertCircle className="w-2.5 h-2.5" /> Pendiente
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-none text-white/90">
                                    Venta <span className="text-indigo-500">#{sale?.id?.slice(-6)}</span>
                                    {sale?.invoiceNumber && (
                                        <span className="ml-3 text-indigo-400 opacity-80 text-[14px] sm:text-[18px]">
                                            • DOC: {sale.invoiceNumber}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-slate-500 font-bold mt-1.5 uppercase text-[9px] tracking-[0.2em] flex items-center gap-1.5">
                                    CLIENTE <ArrowRight className="w-2.5 h-2.5 text-indigo-500" /> <span className="text-slate-300">{sale?.client?.name || 'Varios'}</span>
                                </p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all active:scale-95"
                            >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>

                        {/* SUMMARY CARDS - COMPACT */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 transition-all hover:bg-white/10">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Monto Total</p>
                                <p className="text-base sm:text-lg font-black font-mono">S/ {sale?.totalAmount?.toLocaleString()}</p>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3.5 transition-all hover:bg-emerald-500/10">
                                <p className="text-[8px] font-black text-emerald-500/70 uppercase tracking-[0.2em] mb-0.5">Abonado</p>
                                <p className="text-base sm:text-lg font-black text-emerald-400 font-mono">S/ {totalPaid.toLocaleString()}</p>
                            </div>
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3.5 transition-all hover:bg-amber-500/10">
                                <p className="text-[8px] font-black text-amber-500/70 uppercase tracking-[0.2em] mb-0.5">Pendiente</p>
                                <p className="text-base sm:text-lg font-black text-amber-500 font-mono">S/ {pendingAmount > 0 ? pendingAmount.toLocaleString() : '0'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50/80 p-6 sm:p-8 scrollbar-hide">
                        {isLoading ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3 py-10">
                                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Cargando historial...</span>
                            </div>
                        ) : (
                            <div className="max-w-xl mx-auto space-y-6">
                                {/* SECTION TITLE */}
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 border-l-2 border-indigo-500 pl-3">Abonos Realizados</h3>
                                    {!isCompleted && pendingAmountWithPending > 0 && (
                                        <button 
                                            onClick={() => {
                                                setShowAddForm(true);
                                                setErrorMsg(null);
                                            }}
                                            className="group flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md shadow-indigo-100 active:scale-95"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Registrar
                                        </button>
                                    )}
                                </div>

                                {pendingAmountWithPending <= 0 && pendingAmount > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-4 flex items-start gap-3"
                                    >
                                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Saldo cubierto por abonos pendientes</p>
                                            <p className="text-[9px] text-amber-600 font-bold leading-normal mt-1">
                                                El saldo pendiente de esta venta está completamente cubierto por abonos pendientes de aprobación. Debe esperar a que el área comercial apruebe o rechace dichos abonos para poder realizar nuevos registros.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* PAYMENTS LIST - COMPACT CARDS */}
                                <div className="grid grid-cols-1 gap-2.5">
                                    {sale?.payments?.length === 0 ? (
                                        <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm">
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Aún no hay abonos</p>
                                        </div>
                                    ) : (
                                        sale?.payments?.map((payment: any, pIdx: number) => (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                key={payment.id} 
                                                className={`bg-white border p-4 rounded-[1.5rem] group transition-all shadow-sm ${
                                                    payment.status === 'RECHAZADO' 
                                                        ? 'border-rose-200 bg-rose-50/30' 
                                                        : 'border-slate-100 hover:border-indigo-100'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
                                                            payment.status === 'RECHAZADO' 
                                                                ? 'bg-rose-100 text-rose-500' 
                                                                : 'bg-slate-50 text-indigo-500'
                                                        }`}>
                                                            <span className="text-xs font-black">S/</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-sm font-black text-slate-900 font-mono">S/ {payment.amount.toLocaleString()}</span>
                                                                <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                                    payment.method === 'NOTA_CREDITO' ? 'bg-violet-100 text-violet-700 border border-violet-200' :
                                                                    payment.method === 'LIQUIDACION' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {payment.method === 'NOTA_CREDITO' ? 'NOTA DE CRÉDITO' :
                                                                     payment.method === 'LIQUIDACION' ? 'LIQUIDACIÓN' : payment.method}
                                                                </span>
                                                                <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                                                    payment.status === 'APROBADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    payment.status === 'RECHAZADO' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                                }`}>
                                                                    {payment.status === 'APROBADO' ? 'CONFIRMADO' :
                                                                     payment.status === 'RECHAZADO' ? 'RECHAZADO' : 'PENDIENTE'}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-0.5" suppressHydrationWarning>
                                                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                                                                    Abono: <span className="text-indigo-600 font-black">{formatDate(payment.paymentDate)}</span>
                                                                </p>
                                                                <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest">
                                                                    Registrado: {new Date(payment.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} • {new Date(payment.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                                                    {payment.method === 'NOTA_CREDITO' && payment.creditNoteNumber && (
                                                                        <span className="ml-2 text-indigo-600 font-black">N° {payment.creditNoteNumber}</span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {payment.method === 'NOTA_CREDITO' && (
                                                            <button
                                                                onClick={() => handlePrintCreditNote(payment)}
                                                                className="w-10 h-10 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-100 rounded-xl transition-all flex items-center justify-center shadow-sm"
                                                                title="Imprimir Nota de Crédito"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {payment.method === 'NOTA_CREDITO' && payment.sunatPdfUrl && (
                                                            <a 
                                                                href={payment.sunatPdfUrl} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="w-10 h-10 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-100 rounded-xl transition-all flex items-center justify-center shadow-sm"
                                                                title="Ver Nota de Crédito SUNAT"
                                                            >
                                                                <HelpCircle className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        {payment.evidenceUrl && (
                                                            <a 
                                                                href={`${SERVER_URL}${payment.evidenceUrl}`} 
                                                                target="_blank" 
                                                                className="w-10 h-10 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all flex items-center justify-center shadow-sm"
                                                            >
                                                                <ImageIcon className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                {payment.status === 'RECHAZADO' && (
                                                    <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5">
                                                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Rechazado por Comercial</p>
                                                            <p className="text-[9px] text-rose-500 font-bold leading-snug mt-0.5">
                                                                Este cobro fue rechazado. Puede registrar un nuevo abono con los datos correctos.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {payment.status === 'PENDIENTE' && (
                                                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
                                                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">En espera de confirmación</p>
                                                            <p className="text-[9px] text-amber-500 font-bold leading-snug mt-0.5">
                                                                Este cobro será revisado y aprobado por el área Comercial.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* STICKY FOOTER - COMPACT */}
                    <div className="p-5 sm:p-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : pendingAmountWithPending <= 0 ? 'bg-amber-400 animate-pulse' : 'bg-amber-500'}`} />
                            <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${isCompleted ? 'text-emerald-600' : pendingAmountWithPending <= 0 ? 'text-amber-600' : 'text-amber-500'}`}>
                                {isCompleted ? 'Venta Liquidada' : pendingAmountWithPending <= 0 ? 'Aprobación Pendiente' : 'Adeudo Actual'}
                            </span>
                        </div>
                        
                        {!isCompleted ? (
                            pendingAmountWithPending <= 0 ? (
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-50/50 px-5 py-3 rounded-full border border-amber-100 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 animate-pulse" /> Aprobación Pendiente
                                </div>
                            ) : null
                        ) : (
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50/50 px-5 py-3 rounded-full border border-emerald-100 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 shadow-sm" /> Operación Completada
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* MODAL REGISTRAR ABONO */}
                <AnimatePresence>
                    {showAddForm && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowAddForm(false)}
                                className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                                className="relative w-full max-w-[360px] bg-white rounded-[2rem] shadow-2xl p-7 sm:p-8 border border-slate-50 flex flex-col items-center"
                            >
                                {/* REFINED HEADER */}
                                <div className="w-full flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                            <Plus className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black uppercase tracking-tighter text-slate-900 leading-none">Nuevo Abono</h3>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1.5">Registro de cobro</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowAddForm(false)}
                                        className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-slate-400"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <form onSubmit={handleAddPayment} className="w-full space-y-5">
                                    {errorMsg && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-3"
                                        >
                                            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Atención</p>
                                                <p className="text-[9px] text-amber-600 font-bold leading-tight mt-1">{errorMsg}</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Monto (S/)</label>
                                            <input 
                                                required
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                className={`w-full px-4 py-3 border rounded-2xl text-lg font-black font-mono transition-all outline-none ${
                                                    errorMsg ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-600'
                                                }`}
                                                value={amount}
                                                onChange={(e) => {
                                                    setAmount(e.target.value);
                                                    if (errorMsg) setErrorMsg(null);
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Método</label>
                                            <select 
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black focus:bg-white focus:border-indigo-600 transition-all outline-none appearance-none cursor-pointer"
                                                value={method}
                                                onChange={(e) => {
                                                    setMethod(e.target.value);
                                                    if (e.target.value === 'NOTA_CREDITO') {
                                                        // Automatically set notes to make it easy for user
                                                        setNotes('Descuento global al total de ventas');
                                                    } else {
                                                        setNotes('');
                                                    }
                                                }}
                                            >
                                                <option value="EFECTIVO">EFECTIVO</option>
                                                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                                                <option value="YAPE/PLIN">YAPE/PLIN</option>
                                                <option value="TARJETA">TARJETA</option>
                                                <option value="NOTA_CREDITO">NOTA DE CRÉDITO</option>
                                                <option value="OTRO">OTRO</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Fecha del Abono</label>
                                        <input 
                                            required
                                            type="date"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold focus:bg-white focus:border-indigo-600 transition-all outline-none"
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                        />
                                    </div>

                                    {method === 'NOTA_CREDITO' && (
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Tipo de Nota de Crédito</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsElectronic(true);
                                                            setErrorMsg(null);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                                                            isElectronic 
                                                                ? 'bg-indigo-600 text-white shadow-sm' 
                                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        Electrónica
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsElectronic(false);
                                                            setErrorMsg(null);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                                                            !isElectronic 
                                                                ? 'bg-indigo-600 text-white shadow-sm' 
                                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        Manual
                                                    </button>
                                                </div>
                                            </div>

                                            {isElectronic ? (
                                                <div className="space-y-3">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Motivo SUNAT</label>
                                                        <select
                                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none"
                                                            value={creditNoteMotive}
                                                            onChange={(e) => setCreditNoteMotive(e.target.value)}
                                                        >
                                                            <option value="1">Anulación de la operación (Anulación Total)</option>
                                                            <option value="4">Descuento global / Disminución del total</option>
                                                            <option value="6">Devolución total de productos</option>
                                                            <option value="10">Otros conceptos</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Número de Nota de Crédito</label>
                                                        <input
                                                            required
                                                            placeholder="E001-90"
                                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none"
                                                            value={creditNoteNumber}
                                                            onChange={(e) => setCreditNoteNumber(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                            {method === 'NOTA_CREDITO' ? 'Motivo o Sustento' : 'Referencia'}
                                        </label>
                                        <input 
                                            placeholder={method === 'NOTA_CREDITO' ? 'Describa el motivo del descuento...' : 'Detalles del pago...'}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold focus:bg-white focus:border-indigo-600 transition-all outline-none"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Subir Evidencia</label>
                                        <div className="relative group">
                                            <input 
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                                                disabled={isUploading}
                                            />
                                            <div className={`w-full min-h-[90px] border-2 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center transition-all px-6 py-4 ${
                                                evidenceUrl ? 'border-emerald-200 bg-emerald-50/10' : 
                                                isUploading ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-100 bg-slate-50 group-hover:bg-slate-100 group-hover:border-indigo-300'
                                            }`}>
                                                {isUploading ? (
                                                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                                ) : evidenceUrl ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white rounded-xl p-1 shadow-md overflow-hidden border border-emerald-300">
                                                            <img src={`${SERVER_URL}${evidenceUrl}`} className="w-full h-full object-cover rounded-lg" />
                                                        </div>
                                                        <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest leading-tight">✓ Foto<br/>Cargada</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Upload className="w-3.5 h-3.5 text-indigo-500" />
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">Adjuntar Boucher</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => setShowAddForm(false)}
                                            className="flex-1 px-4 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 hover:bg-slate-50 transition-all"
                                        >
                                            Cerrar
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={isSubmitting || isUploading || !amount}
                                            className="flex-[2] bg-indigo-600 text-white px-4 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'Cargando...' : 'Confirmar'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* MODAL CONFIRMACIÓN LIQUIDACIÓN: MODERNO Y PROFESIONAL */}
                <AnimatePresence>
                    {showConfirmLiquidation && (
                        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowConfirmLiquidation(false)}
                                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-[340px] bg-white rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center text-center border border-slate-100"
                            >
                                <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                                    <HelpCircle className="w-8 h-8 text-amber-500" />
                                </div>
                                
                                <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 mb-2">¿Liquidar Venta?</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-8 px-4">
                                    Esta acción marcará la deuda como <span className="text-emerald-600">TOTALMENTE CANCELADA</span> y cerrará el proceso de cobranza.
                                </p>

                                <div className="w-full space-y-3">
                                    <button 
                                        onClick={handleFinalize}
                                        disabled={isSubmitting}
                                        className="w-full bg-slate-950 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Procesando...' : 'Sí, Liquidar ahora'}
                                    </button>
                                    <button 
                                        onClick={() => setShowConfirmLiquidation(false)}
                                        className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:bg-slate-50 transition-all"
                                    >
                                        No, Cancelar
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </AnimatePresence>
    );
}
