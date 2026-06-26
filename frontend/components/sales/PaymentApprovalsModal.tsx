'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Check, 
    AlertCircle, 
    Loader2, 
    Calendar, 
    User, 
    CreditCard, 
    Image as ImageIcon,
    FileText,
    DollarSign,
    CornerDownRight
} from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '');

interface PaymentApprovalsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export default function PaymentApprovalsModal({ isOpen, onClose, onUpdate }: PaymentApprovalsModalProps) {
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchPendingPayments();
        }
    }, [isOpen]);

    const fetchPendingPayments = async () => {
        setIsLoading(true);
        try {
            const resp = await api.get('/sales/payments/pending');
            setPendingPayments(resp.data);
        } catch (error) {
            console.error('Error fetching pending payments:', error);
            toast.error('Error al cargar pagos pendientes');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (paymentId: string) => {
        setProcessingId(paymentId);
        try {
            await api.post(`/sales/payments/${paymentId}/approve`);
            toast.success('Pago aprobado correctamente');
            await fetchPendingPayments();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error approving payment:', error);
            toast.error('Error al aprobar el pago');
        } finally {
            setProcessingId(null);
        }
    };

    const executeReject = async (paymentId: string) => {
        setProcessingId(paymentId);
        try {
            await api.post(`/sales/payments/${paymentId}/reject`);
            toast.success('Pago rechazado correctamente. El vendedor verá el rechazo en su historial.');
            await fetchPendingPayments();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error rejecting payment:', error);
            toast.error('Error al rechazar el pago');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = (paymentId: string) => {
        toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-3xl pointer-events-auto flex flex-col p-6 border border-gray-100`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">Rechazar Pago</h3>
                </div>
                <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
                    ¿Está seguro de <span className="font-black text-rose-600">rechazar</span> este cobro? El vendedor deberá registrarlo nuevamente.
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
                            executeReject(paymentId);
                        }} 
                        className="px-5 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-rose-700 transition shadow-lg shadow-rose-200"
                    >
                        Sí, Rechazar
                    </button>
                </div>
            </div>
        ), { duration: Infinity });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-100"
                >
                    {/* HEADER */}
                    <div className="bg-gray-900 px-6 py-4 text-white relative flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-tight">Aprobación de Cobros</h2>
                                <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em]">Pendientes de Confirmación</p>
                            </div>
                        </div>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                                <p className="font-black uppercase text-xs tracking-widest">Buscando cobros pendientes...</p>
                            </div>
                        ) : pendingPayments.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-gray-400 text-center">
                                <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                                    <Check className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="font-black uppercase text-xs tracking-widest text-gray-800">¡Todo al día!</p>
                                <p className="text-xs text-gray-400 font-medium mt-1">No hay cobros pendientes de aprobación por parte de los vendedores.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingPayments.map((payment) => (
                                    <div 
                                        key={payment.id} 
                                        className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm hover:border-indigo-100 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex-1 space-y-3">
                                            {/* Top info */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                    Venta #{payment.saleId?.slice(-6).toUpperCase()}
                                                </span>
                                                {payment.sale?.invoiceNumber && (
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                                        Doc: {payment.sale.invoiceNumber}
                                                    </span>
                                                )}
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                                    payment.method === 'NOTA_CREDITO'
                                                        ? 'bg-violet-50 text-violet-700 border-violet-100 font-extrabold'
                                                        : 'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {payment.method === 'NOTA_CREDITO' ? 'NOTA DE CRÉDITO' : payment.method}
                                                </span>
                                                {payment.method === 'NOTA_CREDITO' && (
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                                        !payment.evidenceUrl && !payment.creditNoteNumber
                                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                            : 'bg-slate-50 text-slate-600 border-slate-100'
                                                    }`}>
                                                        {!payment.evidenceUrl && !payment.creditNoteNumber ? 'Emisión Electrónica SUNAT' : 'Registro Manual'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Client and amount */}
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Cliente</p>
                                                <p className="text-sm font-black text-gray-900 uppercase">
                                                    {payment.sale?.client?.name || 'PUBLICO GENERAL'}
                                                </p>
                                            </div>

                                            {/* Note / evidence details */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100 mt-2">
                                                <div>
                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Vendedor</p>
                                                    <p className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                                        {payment.registeredByName || 'Vendedor Zona'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Fecha Registro</p>
                                                    <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        {new Date(payment.createdAt).toLocaleDateString('es-PE')} {new Date(payment.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {payment.notes && (
                                                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-start gap-1.5 text-xs text-gray-500 font-medium">
                                                    <CornerDownRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                                    <span className="italic">"{payment.notes}"</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Amount card & Actions */}
                                        <div className="flex md:flex-col items-center justify-between md:justify-center md:items-end gap-3 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-5">
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Monto Abono</p>
                                                <p className="text-xl font-black text-indigo-600 font-mono">
                                                    S/ {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>

                                            <div className="flex gap-2">
                                                {payment.evidenceUrl && (
                                                    <button
                                                        onClick={() => setPreviewUrl(`${SERVER_URL}${payment.evidenceUrl}`)}
                                                        className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition shadow-sm"
                                                        title="Ver Evidencia"
                                                    >
                                                        <ImageIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleReject(payment.id)}
                                                    disabled={processingId !== null}
                                                    className="px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition disabled:opacity-50"
                                                >
                                                    Rechazar
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(payment.id)}
                                                    disabled={processingId !== null}
                                                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-emerald-700 transition disabled:opacity-50 shadow-md shadow-emerald-100 flex items-center gap-1"
                                                >
                                                    {processingId === payment.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Check className="w-3.5 h-3.5" />
                                                    )}
                                                    Aprobar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Evidence Preview Overlay */}
            <AnimatePresence>
                {previewUrl && (
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                        >
                            <div className="bg-gray-900 px-6 py-4 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-white">Comprobante de Pago</h3>
                                    <p className="text-indigo-400 text-[8px] font-black uppercase tracking-widest mt-0.5">Imagen de Evidencia</p>
                                </div>
                                <button 
                                    onClick={() => setPreviewUrl(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 flex justify-center bg-gray-50 overflow-auto max-h-[60vh]">
                                <img 
                                    src={previewUrl} 
                                    alt="Evidencia de Pago" 
                                    className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-md border border-gray-200" 
                                />
                            </div>
                            <div className="bg-gray-100 p-4 flex justify-end">
                                <button
                                    onClick={() => setPreviewUrl(null)}
                                    className="px-6 py-2.5 bg-gray-900 text-white font-black rounded-xl text-xs uppercase tracking-wider hover:bg-black transition active:scale-95 shadow-md"
                                >
                                    Cerrar Vista
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
}
