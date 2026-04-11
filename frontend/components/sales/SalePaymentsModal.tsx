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
    HelpCircle
} from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../hooks/useAuth';

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.endsWith('T00:00:00.000Z')) {
        return new Date(dateString).toLocaleDateString('es-PE', { timeZone: 'UTC' });
    }
    return new Date(dateString).toLocaleDateString('es-PE');
};

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '');

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

        const totalPaid = sale?.payments?.reduce((acc: number, p: any) => acc + p.amount, 0) || 0;
        const pendingAmount = sale ? sale.totalAmount - totalPaid : 0;

        if (numericAmount > pendingAmount) {
            setErrorMsg(`El saldo pendiente es de S/ ${pendingAmount.toLocaleString()}. No puede exceder este monto.`);
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/sales/${saleId}/payments`, {
                amount: numericAmount,
                method,
                paymentDate,
                notes,
                evidenceUrl
            });
            
            // Reset form
            setAmount('');
            setNotes('');
            setEvidenceUrl('');
            setShowAddForm(false);
            
            // Refresh data
            await fetchSaleDetails();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error adding payment:', error);
            alert('Error al registrar el pago');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinalize = async () => {
        setIsSubmitting(true);
        try {
            await api.patch(`/sales/${saleId}/finalize`);
            setShowConfirmLiquidation(false);
            await fetchSaleDetails();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error finalizing sale:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const totalPaid = sale?.payments?.reduce((acc: number, p: any) => acc + p.amount, 0) || 0;
    const pendingAmount = sale ? sale.totalAmount - totalPaid : 0;
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
                                    {!isCompleted && pendingAmount > 0 && (
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
                                                className="bg-white border border-slate-100 p-4 rounded-[1.5rem] flex items-center justify-between group hover:border-indigo-100 transition-all shadow-sm"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-indigo-500 shadow-inner">
                                                        <DollarSign className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-sm font-black text-slate-900 font-mono">S/ {payment.amount.toLocaleString()}</span>
                                                            <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                                payment.method === 'LIQUIDACION' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {payment.method === 'LIQUIDACION' ? 'LIQUIDACIÓN' : payment.method}
                                                            </span>
                                                        </div>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {new Date(payment.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} • {new Date(payment.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                {payment.evidenceUrl && (
                                                    <a 
                                                        href={`${SERVER_URL}${payment.evidenceUrl}`} 
                                                        target="_blank" 
                                                        className="w-10 h-10 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all flex items-center justify-center shadow-sm"
                                                    >
                                                        <ImageIcon className="w-4 h-4" />
                                                    </a>
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
                            <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`} />
                            <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${isCompleted ? 'text-emerald-600' : 'text-amber-500'}`}>
                                {isCompleted ? 'Venta Liquidada' : 'Adeudo Actual'}
                            </span>
                        </div>
                        
                        {!isCompleted ? (
                            <button 
                                onClick={() => setShowConfirmLiquidation(true)}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.25em] hover:bg-indigo-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                Liquidar Saldo
                            </button>
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
                                                onChange={(e) => setMethod(e.target.value)}
                                            >
                                                <option value="EFECTIVO">EFECTIVO</option>
                                                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                                                <option value="YAPE/PLIN">YAPE/PLIN</option>
                                                <option value="TARJETA">TARJETA</option>
                                                <option value="OTRO">OTRO</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Referencia</label>
                                        <input 
                                            placeholder="Detalles del pago..."
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
