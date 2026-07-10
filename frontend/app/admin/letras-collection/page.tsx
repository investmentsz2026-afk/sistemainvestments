// frontend/app/admin/letras-collection/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/common/Layout';
import api from '../../../lib/axios';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
    Search, 
    Coins, 
    Calendar, 
    FileText, 
    Check, 
    Loader2, 
    DollarSign, 
    CheckCircle2, 
    X, 
    AlertCircle, 
    Landmark,
    Filter,
    ArrowLeft,
    ChevronRight,
    Eye,
    Briefcase,
    TrendingUp,
    ExternalLink,
    Upload,
    XCircle,
    BookmarkCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function LetrasCollectionPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'CANJES' | 'PAGOS_DIRECTOS'>('CANJES');
    const [isLoading, setIsLoading] = useState(true);

    // Letra Groups data
    const [groups, setGroups] = useState<any[]>([]);
    const [processingGroupId, setProcessingGroupId] = useState<string | null>(null);

    // Pending Direct Payments data
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

    // Detail Panel/Modal
    const [selectedGroupDetails, setSelectedGroupDetails] = useState<any | null>(null);

    // Modal state for paying a single Letra
    const [selectedLetraForPayment, setSelectedLetraForPayment] = useState<any | null>(null);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [voucherUrl, setVoucherUrl] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [isSavingLetraPayment, setIsSavingLetraPayment] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [selectedSaleDetails, setSelectedSaleDetails] = useState<any | null>(null);
    const [locallyApprovedPayments, setLocallyApprovedPayments] = useState<string[]>([]);

    // Modal state for adjusting balance (Note of credit / Cash / Transfer / Card)
    const [selectedGroupForAdjustment, setSelectedGroupForAdjustment] = useState<any | null>(null);
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentMethod, setAdjustmentMethod] = useState('NOTA_CREDITO'); // NOTA_CREDITO, EFECTIVO, TRANSFERENCIA, TARJETA
    const [adjustmentReference, setAdjustmentReference] = useState('');
    const [creditNoteNumber, setCreditNoteNumber] = useState('');
    const [creditNoteMotive, setCreditNoteMotive] = useState('1'); // 1: Anulación de la operación, etc.
    const [isAdjusting, setIsAdjusting] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '');
        return `${SERVER_URL}${url}`;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        try {
            const resp = await api.post('/uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setVoucherUrl(resp.data.url);
            toast.success('Comprobante subido con éxito.');
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Error al subir el archivo de comprobante');
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user && user.role !== 'ADMIN' && user.role !== 'CONTABILIDAD') {
            router.push('/');
            toast.error('Acceso restringido: Módulo de administración');
            return;
        }
        fetchAllData();
    }, [user, authLoading]);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            // Load Letra Groups (refinancing agreements)
            const groupsRes = await api.get('/sales/letra-groups');
            setGroups(groupsRes.data);

            // Load Pending Direct payments (needs approval/verification)
            const paymentsRes = await api.get('/sales/payments/pending?status=APROBADO');
            setPendingPayments(paymentsRes.data);
        } catch (error) {
            console.error('Error fetching administration collection data:', error);
            toast.error('Error al cargar datos del módulo de cobros');
        } finally {
            setIsLoading(false);
        }
    };

    // Group approvals
    const handleApproveGroup = async (groupId: string) => {
        setProcessingGroupId(groupId);
        try {
            await api.post(`/sales/letra-groups/${groupId}/approve`);
            toast.success('Lote de letras aprobado de forma definitiva.');
            fetchAllData();
            if (selectedGroupDetails?.id === groupId) {
                // Refresh detail modal
                setSelectedGroupDetails(null);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al aprobar el lote');
        } finally {
            setProcessingGroupId(null);
        }
    };

    const handleRejectGroup = async (groupId: string) => {
        setProcessingGroupId(groupId);
        try {
            await api.post(`/sales/letra-groups/${groupId}/reject`);
            toast.success('Lote de letras rechazado.');
            fetchAllData();
            if (selectedGroupDetails?.id === groupId) {
                setSelectedGroupDetails(null);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al rechazar el lote');
        } finally {
            setProcessingGroupId(null);
        }
    };

    const handleCompleteGroup = async (groupId: string) => {
        setProcessingGroupId(groupId);
        try {
            await api.post(`/sales/letra-groups/${groupId}/complete`);
            toast.success('Cronograma de letras completado y enviado a Contabilidad.');
            fetchAllData();
            if (selectedGroupDetails?.id === groupId) {
                setSelectedGroupDetails(null);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al completar el cronograma');
        } finally {
            setProcessingGroupId(null);
        }
    };

    // Letra individual payment
    const handleConfirmLetraPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLetraForPayment) return;

        setIsSavingLetraPayment(true);
        try {
            await api.post(`/sales/letras/${selectedLetraForPayment.id}/pay`, {
                paymentDate,
                voucherUrl,
                paymentNotes
            });
            toast.success(`Pago de la Letra N° ${selectedLetraForPayment.number} registrado con éxito.`);
            setSelectedLetraForPayment(null);
            setPaymentNotes('');
            setVoucherUrl('');
            
            // Reload
            const groupsRes = await api.get('/sales/letra-groups');
            setGroups(groupsRes.data);
            
            // Refresh detailed group object
            if (selectedGroupDetails) {
                const updatedGroup = groupsRes.data.find((g: any) => g.id === selectedGroupDetails.id);
                setSelectedGroupDetails(updatedGroup || null);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al registrar el pago de la letra');
        } finally {
            setIsSavingLetraPayment(false);
        }
    };

    // Adjust balance of a group
    const handleAdjustGroupBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroupForAdjustment) return;

        const amt = parseFloat(adjustmentAmount);
        if (isNaN(amt) || amt <= 0) {
            toast.error('El monto debe ser mayor a cero');
            return;
        }

        setIsAdjusting(true);
        try {
            let finalNumber = '';
            let finalMotive = '';

            if (adjustmentMethod === 'NOTA_CREDITO') {
                finalNumber = creditNoteNumber;
                const motives: any = {
                    '1': 'Anulación de la operación',
                    '2': 'Descuento global',
                    '3': 'Diferencia de canje de letras',
                    '4': 'Ajuste de Saldo Comercial'
                };
                finalMotive = `Nota de Crédito: ${motives[creditNoteMotive] || 'Ajuste'}`;
            } else if (adjustmentMethod === 'EFECTIVO') {
                finalNumber = 'EFECTIVO';
                finalMotive = 'Pago en Efectivo';
            } else if (adjustmentMethod === 'TRANSFERENCIA') {
                finalNumber = adjustmentReference || 'TRANSFERENCIA';
                finalMotive = 'Pago por Transferencia Bancaria';
            } else if (adjustmentMethod === 'TARJETA') {
                finalNumber = adjustmentReference || 'TARJETA';
                finalMotive = 'Pago con Tarjeta';
            }

            await api.post(`/sales/letra-groups/${selectedGroupForAdjustment.id}/adjust`, {
                creditNoteNumber: finalNumber,
                creditNoteMotive: finalMotive,
                amount: amt
            });
            toast.success('Saldo del lote ajustado con éxito.');
            setSelectedGroupForAdjustment(null);
            setAdjustmentAmount('');
            setCreditNoteNumber('');
            setAdjustmentReference('');
            setAdjustmentMethod('NOTA_CREDITO');
            
            // Reload
            const groupsRes = await api.get('/sales/letra-groups');
            setGroups(groupsRes.data);
            
            // Refresh detailed group object
            if (selectedGroupDetails) {
                const updatedGroup = groupsRes.data.find((g: any) => g.id === selectedGroupDetails.id);
                setSelectedGroupDetails(updatedGroup || null);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al ajustar saldo');
        } finally {
            setIsAdjusting(false);
        }
    };

    // Direct Payment Conciliation (Admin bank verification: APROBADO → CONCILIADO)
    const handleApprovePayment = async (paymentId: string) => {
        setProcessingPaymentId(paymentId);
        try {
            await api.post(`/sales/payments/${paymentId}/conciliate`);
            toast.success('Pago conciliado en banco. Transferido a contabilidad.');
            fetchAllData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al conciliar el pago');
        } finally {
            setProcessingPaymentId(null);
        }
    };

    const handleRejectPayment = async (paymentId: string) => {
        setProcessingPaymentId(paymentId);
        try {
            await api.post(`/sales/payments/${paymentId}/reject`);
            toast.success('Pago directo rechazado.');
            fetchAllData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al rechazar el pago');
        } finally {
            setProcessingPaymentId(null);
        }
    };

    // Filtering lists
    const filteredGroups = useMemo(() => {
        if (!searchTerm) return groups;
        const lower = searchTerm.toLowerCase();
        return groups.filter(g => 
            g.client?.name?.toLowerCase().includes(lower) || 
            g.client?.documentNumber?.includes(lower)
        );
    }, [groups, searchTerm]);

    // Group pending payments by sale/invoice
    const groupedPendingSales = useMemo(() => {
        const map: { [saleId: string]: any } = {};

        pendingPayments.forEach(p => {
            if (!p.sale) return;
            const saleId = p.sale.id;
            if (!map[saleId]) {
                map[saleId] = {
                    id: saleId,
                    invoiceNumber: p.sale.invoiceNumber || 'S/N',
                    totalAmount: p.sale.totalAmount,
                    client: p.sale.client,
                    seller: p.sale.seller || { name: p.registeredByName || 'Vendedor' },
                    createdAt: p.sale.createdAt,
                    pendingPaymentsList: [],
                    totalPendingAmount: 0
                };
            }
            map[saleId].pendingPaymentsList.push(p);
            map[saleId].totalPendingAmount += p.amount;
        });

        return Object.values(map);
    }, [pendingPayments]);

    const filteredPendingSales = useMemo(() => {
        if (!searchTerm) return groupedPendingSales;
        const lower = searchTerm.toLowerCase();
        return groupedPendingSales.filter((gs: any) => 
            gs.client?.name?.toLowerCase().includes(lower) || 
            gs.invoiceNumber?.toLowerCase().includes(lower)
        );
    }, [groupedPendingSales, searchTerm]);

    // Financial Metrics for the Top Ribbon
    const metrics = useMemo(() => {
        // Letra-groups: pending balances + collection status
        let totalCartera = 0;
        let totalCobradoLetras = 0;
        let totalPendienteLetras = 0;
        let totalMoraLetras = 0;

        groups.forEach(g => {
            if (g.status === 'APROBADO') {
                totalCartera += g.totalLetrasAmount;
                // Accumulate individual paid letras
                g.letras.forEach((l: any) => {
                    if (l.status === 'PAGADO') {
                        totalCobradoLetras += l.amount;
                    } else {
                        totalPendienteLetras += l.amount;
                        if (new Date(l.dueDate) < new Date()) {
                            totalMoraLetras += l.amount;
                        }
                    }
                });
            }
        });

        // Add direct pending payments awaiting verification
        const pendingDirectSum = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

        return {
            cartera: totalCartera,
            collected: totalCobradoLetras,
            pending: totalPendienteLetras + pendingDirectSum,
            overdue: totalMoraLetras,
            pendingDirectCount: pendingPayments.length
        };
    }, [groups, pendingPayments]);

    const cardClass = "bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl";

    if (authLoading || isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Cobranza y Verificación de Pagos</h1>
                        <p className="text-slate-500 font-medium text-lg mt-1">Valida canjes por letras, abonos directos y emite notas de crédito o cancelaciones.</p>
                    </div>
                </div>

                {/* Dashboard Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute right-4 bottom-4 text-white/5"><Coins className="w-24 h-24" /></div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Cartera Total Letras</div>
                        <div className="text-2xl font-black mt-2">S/. {metrics.cartera.toFixed(2)}</div>
                        <div className="text-[9px] text-indigo-400 font-bold uppercase mt-1">Refinanciaciones vigentes</div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-md">
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Recaudado (Banco)</div>
                        <div className="text-2xl font-black text-emerald-600 mt-2">S/. {metrics.collected.toFixed(2)}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Abonos de letras reconciliados</div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-md">
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Cobros por Reconciliar</div>
                        <div className="text-2xl font-black text-slate-800 mt-2">S/. {metrics.pending.toFixed(2)}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Letras pendientes + directos en cola</div>
                    </div>
                    <div className="bg-white border border-rose-100 rounded-[2.5rem] p-6 shadow-md">
                        <div className="text-[10px] text-rose-500 font-black uppercase tracking-wider">Cartera Vencida (Mora)</div>
                        <div className="text-2xl font-black text-rose-600 mt-2">S/. {metrics.overdue.toFixed(2)}</div>
                        <div className="text-[9px] text-rose-400 font-bold uppercase mt-1">Instalment expirado sin abono</div>
                    </div>
                </div>

                {/* Tabs Selectors */}
                <div className="flex border-b border-slate-100 gap-4">
                    <button
                        onClick={() => {
                            setActiveTab('CANJES');
                            setSearchTerm('');
                        }}
                        className={`pb-4 text-sm font-black uppercase tracking-wider border-b-2 transition ${
                            activeTab === 'CANJES' 
                            ? 'border-indigo-600 text-slate-900' 
                            : 'border-transparent text-slate-400 hover:text-slate-650'
                        }`}
                    >
                        Canjes por Letras
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('PAGOS_DIRECTOS');
                            setSearchTerm('');
                        }}
                        className={`pb-4 text-sm font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                            activeTab === 'PAGOS_DIRECTOS' 
                            ? 'border-indigo-600 text-slate-900' 
                            : 'border-transparent text-slate-400 hover:text-slate-650'
                        }`}
                    >
                        Validar Pagos Directos
                        {metrics.pendingDirectCount > 0 && (
                            <span className="bg-indigo-100 text-indigo-700 text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse">
                                {metrics.pendingDirectCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Search / filter box */}
                <div className={`${cardClass} p-4 flex items-center`}>
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={
                                activeTab === 'CANJES' 
                                ? "Buscar por cliente..." 
                                : "Buscar por cliente o número de factura..."
                            }
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 font-bold text-slate-850 outline-none text-xs focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-400"
                        />
                    </div>
                </div>

                {/* Main Views */}
                {activeTab === 'CANJES' ? (
                    <div className={`${cardClass} overflow-hidden`}>
                        <div className="overflow-x-auto -mx-8">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="px-8 py-4">Cliente / Registro</th>
                                        <th className="px-8 py-4">Facturas Canjeadas</th>
                                        <th className="px-8 py-4 text-right">Monto Facturas</th>
                                        <th className="px-8 py-4 text-right">Monto Letras</th>
                                        <th className="px-8 py-4 text-right">Saldo Pendiente</th>
                                        <th className="px-8 py-4 text-center">Estado Canje</th>
                                        <th className="px-8 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                    {filteredGroups.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-8 py-16 text-center text-slate-400 italic">No se encontraron lotes de canjes de letras.</td>
                                        </tr>
                                    ) : (
                                        filteredGroups.map(g => (
                                            <tr key={g.id} className="hover:bg-slate-50/30 transition">
                                                <td className="px-8 py-4 uppercase">
                                                    <div className="text-slate-900 font-black text-xs">{g.client?.name}</div>
                                                    <div className="text-[9px] text-slate-400 mt-0.5">Fecha: {new Date(g.createdAt).toLocaleDateString()}</div>
                                                    {g.registeredByName && (
                                                        <div className="text-[9px] text-indigo-500/80 font-black">Por: {g.registeredByName}</div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-4 max-w-xs truncate uppercase text-slate-500">
                                                    {g.sales?.map((s: any) => s.invoiceNumber || 'S/N').join(', ') || '-'}
                                                </td>
                                                <td className="px-8 py-4 text-right font-black text-slate-900">
                                                    S/. {g.totalSalesAmount.toFixed(2)}
                                                </td>
                                                <td className="px-8 py-4 text-right font-black text-slate-900">
                                                    S/. {g.totalLetrasAmount.toFixed(2)}
                                                </td>
                                                <td className="px-8 py-4 text-right font-black">
                                                    <span className={g.pendingBalance > 0 ? 'text-rose-600' : 'text-slate-400'}>
                                                        S/. {g.pendingBalance.toFixed(2)}
                                                    </span>
                                                    {g.creditNoteNumber && (
                                                        <div className="text-[8px] text-slate-400 mt-0.5 uppercase">Ajuste: {g.creditNoteNumber}</div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                        g.status === 'APROBADO' ? 'bg-emerald-50 text-emerald-600' :
                                                        g.status === 'RECHAZADO' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                        {g.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        {g.status === 'PENDIENTE' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApproveGroup(g.id)}
                                                                    disabled={processingGroupId === g.id}
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-sm"
                                                                >
                                                                    {processingGroupId === g.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                    Aprobar Canje
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectGroup(g.id)}
                                                                    disabled={processingGroupId === g.id}
                                                                    className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-sm"
                                                                >
                                                                    {processingGroupId === g.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                                                    Rechazar
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => setSelectedGroupDetails(g)}
                                                            className="bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-sm"
                                                        >
                                                            <Eye className="w-3 h-3" />
                                                            Ver Letras
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className={`${cardClass} overflow-hidden`}>
                        <div className="border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Ventas con Abonos Pendientes</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Ventas con abonos en efectivo o transferencias registrados que requieren verificación de comprobantes.</p>
                        </div>
                        
                        <div className="overflow-x-auto -mx-8">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="px-8 py-4">Cliente / Venta</th>
                                        <th className="px-8 py-4">Vendedor</th>
                                        <th className="px-8 py-4 text-right">Monto Total Venta</th>
                                        <th className="px-8 py-4 text-right">Monto a Validar</th>
                                        <th className="px-8 py-4 text-center">Abonos en Cola</th>
                                        <th className="px-8 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                    {filteredPendingSales.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-16 text-center text-slate-400 italic">No hay ventas con abonos pendientes de validación.</td>
                                        </tr>
                                    ) : (
                                        filteredPendingSales.map((gs: any) => (
                                            <tr key={gs.id} className="hover:bg-slate-50/30 transition">
                                                <td className="px-8 py-4 uppercase">
                                                    <div className="text-slate-900 font-black text-xs">{gs.client?.name || 'Cliente Genérico'}</div>
                                                    <div className="text-[9px] text-indigo-650 font-black mt-0.5">Venta: {gs.invoiceNumber}</div>
                                                    <div className="text-[8px] text-slate-400 font-medium">Registrado: {new Date(gs.createdAt).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-8 py-4 text-slate-550 uppercase">
                                                    {gs.seller?.name || 'Vendedor'}
                                                </td>
                                                <td className="px-8 py-4 text-right font-black text-slate-900 text-xs">
                                                    S/. {gs.totalAmount.toFixed(2)}
                                                </td>
                                                <td className="px-8 py-4 text-right font-black text-amber-600 text-xs">
                                                    S/. {gs.totalPendingAmount.toFixed(2)}
                                                </td>
                                                <td className="px-8 py-4 text-center">
                                                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black">
                                                        {gs.pendingPaymentsList.length} abonos
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSaleDetails(gs);
                                                            setLocallyApprovedPayments([]);
                                                        }}
                                                        className="bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-sm ml-auto"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        Ver Abonos
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* SIDE PANEL / MODAL: Details of Letra Group */}
            {selectedGroupDetails && (
                <div className="fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-4xl p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedGroupDetails(null)}
                            className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                    selectedGroupDetails.status === 'APROBADO' ? 'bg-emerald-50 text-emerald-600' :
                                    selectedGroupDetails.status === 'RECHAZADO' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600 animate-pulse'
                                }`}>
                                    {selectedGroupDetails.status}
                                </span>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                    Cronograma: {selectedGroupDetails.client?.name}
                                </h2>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                Facturas: {selectedGroupDetails.sales?.map((s: any) => s.invoiceNumber || 'S/N').join(', ') || '-'} | Total Refinanciado: S/. {selectedGroupDetails.totalLetrasAmount.toFixed(2)}
                            </p>
                        </div>

                        {/* Installation list table */}
                        <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-3">Letra</th>
                                        <th className="px-6 py-3 text-right">Monto</th>
                                        <th className="px-6 py-3">Vencimiento</th>
                                        <th className="px-6 py-3">Detalle de Depósito / Comprobante</th>
                                        <th className="px-6 py-3 text-center">Estado</th>
                                        <th className="px-6 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                    {selectedGroupDetails.letras?.map((l: any) => {
                                        const isOverdue = l.status === 'PENDIENTE' && new Date(l.dueDate) < new Date();
                                        return (
                                            <tr key={l.id} className="hover:bg-slate-50/20 transition">
                                                <td className="px-6 py-3 font-black text-slate-900">
                                                    N° {l.number}
                                                    {l.uniqueNumber && (
                                                        <div className="text-[8px] font-mono font-medium text-slate-400 uppercase">Único: {l.uniqueNumber}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right font-black text-slate-900 text-xs">
                                                    S/. {l.amount.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className={`flex items-center gap-1 text-[11px] ${isOverdue ? 'text-rose-600 font-black' : 'text-slate-650'}`}>
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(l.dueDate).toLocaleDateString()}
                                                    </div>
                                                    {isOverdue && (
                                                        <span className="text-[7px] font-black uppercase text-rose-500 bg-rose-50 px-1 rounded">VENCIDA</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-[10px] text-slate-500">
                                                    {l.status === 'PAGADO' ? (
                                                        <div className="flex items-center gap-3">
                                                            {l.voucherUrl && (
                                                                <img 
                                                                    src={getImageUrl(l.voucherUrl)} 
                                                                    alt="Voucher Letra" 
                                                                    onClick={() => setPreviewImageUrl(l.voucherUrl)}
                                                                    className="w-10 h-10 object-cover rounded-xl cursor-zoom-in hover:scale-105 border border-slate-200 shadow-sm transition active:scale-95 flex-shrink-0"
                                                                />
                                                            )}
                                                            <div className="space-y-0.5">
                                                                <div className="text-emerald-600 font-black">Pagado: {new Date(l.paymentDate).toLocaleDateString()}</div>
                                                                {l.voucherUrl && (
                                                                    <div className="text-slate-450 font-mono text-[9px] truncate max-w-[150px]" title={l.voucherUrl}>Ref: {l.voucherUrl.split('/').pop()}</div>
                                                                )}
                                                                {l.paymentNotes && (
                                                                    <div className="text-slate-400 italic">"{l.paymentNotes}"</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic font-medium">Esperando abono...</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                        l.status === 'PAGADO' ? 'bg-emerald-50 text-emerald-600' :
                                                        isOverdue ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {l.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    {l.status === 'PENDIENTE' && selectedGroupDetails.status === 'APROBADO' ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedLetraForPayment(l);
                                                                setPaymentDate(new Date().toISOString().split('T')[0]);
                                                            }}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg transition active:scale-95 inline-flex items-center gap-1 shadow-sm"
                                                        >
                                                            <DollarSign className="w-2.5 h-2.5" />
                                                            Cobrar
                                                        </button>
                                                    ) : l.status === 'PAGADO' ? (
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                                                    ) : (
                                                        <span className="text-slate-350 italic font-medium text-[10px]">Aprobación Pendiente</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Bottom Actions for Group Adjustment */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase">Saldo Pendiente del Lote:</div>
                                <div className="text-xl font-black text-rose-600 mt-0.5">S/. {selectedGroupDetails.pendingBalance.toFixed(2)}</div>
                            </div>
                            
                            <div className="flex gap-3">
                                {selectedGroupDetails.status === 'APROBADO' && selectedGroupDetails.pendingBalance > 0 && (
                                    <button
                                        onClick={() => {
                                            setSelectedGroupForAdjustment(selectedGroupDetails);
                                            setAdjustmentAmount(selectedGroupDetails.pendingBalance.toFixed(2));
                                        }}
                                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase px-6 py-3 rounded-xl transition active:scale-95 flex items-center gap-1.5 shadow-md"
                                    >
                                        <Coins className="w-4 h-4" />
                                        Ajustar Saldo Sobrante
                                    </button>
                                )}
                                {selectedGroupDetails.letras?.every((l: any) => l.status === 'PAGADO') && selectedGroupDetails.status !== 'COMPLETADO' && (
                                    <button
                                        onClick={() => handleCompleteGroup(selectedGroupDetails.id)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase px-6 py-3 rounded-xl transition active:scale-95 flex items-center gap-1.5 shadow-md"
                                    >
                                        <BookmarkCheck className="w-4 h-4" />
                                        Registrar Pago Completado
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedGroupDetails(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase px-6 py-3 rounded-xl transition active:scale-95"
                                >
                                    Cerrar Detalles
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDE PANEL / MODAL: Details of Grouped Pending Sale Payments */}
            {selectedSaleDetails && (
                <div className="fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-4xl p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedSaleDetails(null)}
                            className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                Abonos de la Venta: {selectedSaleDetails.invoiceNumber}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                Cliente: {selectedSaleDetails.client?.name} | Vendedor: {selectedSaleDetails.seller?.name} | Monto Total: S/. {selectedSaleDetails.totalAmount.toFixed(2)}
                            </p>
                        </div>

                        {/* List of pending payments for this sale */}
                        <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-3">Fecha Abono</th>
                                        <th className="px-6 py-3">Método</th>
                                        <th className="px-6 py-3 text-right">Monto</th>
                                        <th className="px-6 py-3">Evidencia (Voucher)</th>
                                        <th className="px-6 py-3">Glosa / Comentario</th>
                                        <th className="px-6 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                    {selectedSaleDetails.pendingPaymentsList?.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-slate-50/20 transition">
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                {new Date(p.paymentDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-black tracking-wider uppercase">
                                                    {p.method}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right font-black text-slate-900 text-xs">
                                                S/. {p.amount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3">
                                                {p.evidenceUrl ? (
                                                    <div className="flex items-center gap-2">
                                                        <img 
                                                            src={getImageUrl(p.evidenceUrl)} 
                                                            alt="Voucher" 
                                                            onClick={() => setPreviewImageUrl(p.evidenceUrl)}
                                                            className="w-10 h-10 object-cover rounded-xl cursor-zoom-in hover:scale-105 border border-slate-200 shadow-sm transition active:scale-95 flex-shrink-0"
                                                        />
                                                        <a 
                                                            href={getImageUrl(p.evidenceUrl)} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="text-slate-400 hover:text-indigo-650 transition"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-355 italic font-medium">Sin comprobante</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-slate-400 font-medium italic">
                                                {p.notes ? `"${p.notes}"` : '-'}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => {
                                                            if (locallyApprovedPayments.includes(p.id)) {
                                                                setLocallyApprovedPayments(prev => prev.filter(id => id !== p.id));
                                                            } else {
                                                                setLocallyApprovedPayments(prev => [...prev, p.id]);
                                                            }
                                                        }}
                                                        disabled={processingPaymentId === p.id}
                                                        className={`${locallyApprovedPayments.includes(p.id) ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg transition active:scale-95 inline-flex items-center gap-1 shadow-sm`}
                                                    >
                                                        {locallyApprovedPayments.includes(p.id) ? <Check className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5" />}
                                                        {locallyApprovedPayments.includes(p.id) ? 'Verificado' : 'Aprobar'}
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            await handleRejectPayment(p.id);
                                                            const updatedList = selectedSaleDetails.pendingPaymentsList.filter((x: any) => x.id !== p.id);
                                                            if (updatedList.length === 0) {
                                                                setSelectedSaleDetails(null);
                                                            } else {
                                                                setSelectedSaleDetails({
                                                                    ...selectedSaleDetails,
                                                                    pendingPaymentsList: updatedList,
                                                                    totalPendingAmount: selectedSaleDetails.totalPendingAmount - p.amount
                                                                });
                                                            }
                                                            setLocallyApprovedPayments(prev => prev.filter(id => id !== p.id));
                                                        }}
                                                        disabled={processingPaymentId === p.id}
                                                        className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg transition active:scale-95 inline-flex items-center gap-1 shadow-sm"
                                                    >
                                                        {processingPaymentId === p.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <X className="w-2.5 h-2.5" />}
                                                        Rechazar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                            <div className="text-[10px] font-black text-slate-500 uppercase">
                                {locallyApprovedPayments.length} abonos verificados listos para procesar
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedSaleDetails(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase px-6 py-3 rounded-xl transition active:scale-95"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (locallyApprovedPayments.length === 0) {
                                            toast.error('Debe aprobar al menos un pago para procesar la venta');
                                            return;
                                        }
                                        setProcessingPaymentId('bulk');
                                        try {
                                            await api.post(`/sales/${selectedSaleDetails.id}/conciliate-payments`, { paymentIds: locallyApprovedPayments });
                                            toast.success('Pagos conciliados exitosamente. Transferidos a contabilidad.');
                                            setSelectedSaleDetails(null);
                                            setLocallyApprovedPayments([]);
                                            fetchAllData();
                                        } catch (error: any) {
                                            console.error(error);
                                            toast.error(error.response?.data?.message || 'Error al conciliar los pagos');
                                        } finally {
                                            setProcessingPaymentId(null);
                                        }
                                    }}
                                    disabled={locallyApprovedPayments.length === 0 || processingPaymentId === 'bulk'}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase px-6 py-3 rounded-xl transition active:scale-95 shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processingPaymentId === 'bulk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Aprobar Pagos de Venta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Register payment info for a Letra installment */}
            {selectedLetraForPayment && (
                <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <Landmark className="w-5 h-5 text-indigo-600" />
                                Registrar Pago de Letra
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                Confirma la liquidación de la Letra N° {selectedLetraForPayment.number} por S/. {selectedLetraForPayment.amount.toFixed(2)}.
                            </p>
                        </div>

                        <form onSubmit={handleConfirmLetraPayment} className="space-y-4 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block text-[8px] uppercase text-slate-400 mb-1">Fecha de Operación / Depósito</label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none text-xs"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[8px] uppercase text-slate-400 mb-1">N° Operación / Voucher Comprobante</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Dep. BCP 8930129"
                                    value={voucherUrl}
                                    onChange={(e) => setVoucherUrl(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none text-xs"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[8px] uppercase text-slate-400 mb-1">Comprobante de Pago (Voucher Imagen)</label>
                                {voucherUrl ? (
                                    <div className="relative border border-slate-100 rounded-2xl p-2 bg-slate-50 flex items-center gap-3">
                                        <img 
                                            src={getImageUrl(voucherUrl)} 
                                            alt="Comprobante" 
                                            className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                                        />
                                        <div className="flex-1 truncate text-[10px] text-slate-500 font-mono">
                                            {voucherUrl.split('/').pop()}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setVoucherUrl('')}
                                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition ${
                                        isUploading 
                                        ? 'border-indigo-200 bg-indigo-50/20 animate-pulse' 
                                        : 'border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/50'
                                    }`}>
                                        {isUploading ? (
                                            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-indigo-500 mb-1" />
                                                <span className="text-[10px] text-indigo-600 font-black uppercase">Subir Imagen del Voucher</span>
                                            </>
                                        )}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleFileUpload} 
                                            className="hidden" 
                                            disabled={isUploading}
                                        />
                                    </label>
                                )}
                            </div>

                            <div>
                                <label className="block text-[8px] uppercase text-slate-400 mb-1">Observaciones / Notas adicionales</label>
                                <textarea
                                    rows={2}
                                    placeholder="Información adicional del abono..."
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none text-xs"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedLetraForPayment(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-xl text-xs active:scale-95 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingLetraPayment}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs active:scale-95 transition-all flex items-center gap-2 shadow-md"
                                >
                                    {isSavingLetraPayment && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Confirmar Pago
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Adjust Group Balance */}
            {selectedGroupForAdjustment && (
                <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <Coins className="w-5 h-5 text-indigo-600" />
                                Ajustar Saldo Pendiente
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                Genera un abono o nota de crédito sobre la diferencia no cubierta por las letras.
                            </p>
                        </div>

                        <form onSubmit={handleAdjustGroupBalance} className="space-y-4 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block text-[8px] uppercase text-slate-400 mb-1">Monto de Ajuste (S/.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    max={selectedGroupForAdjustment.pendingBalance}
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none text-xs"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[8px] uppercase text-slate-400 mb-1">Método de Ajuste</label>
                                <select
                                    value={adjustmentMethod}
                                    onChange={(e) => setAdjustmentMethod(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none text-xs cursor-pointer"
                                >
                                    <option value="NOTA_CREDITO">Nota de Crédito</option>
                                    <option value="EFECTIVO">Pago en Efectivo (Contado)</option>
                                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                    <option value="TARJETA">Pago con Tarjeta</option>
                                </select>
                            </div>

                            {adjustmentMethod === 'NOTA_CREDITO' && (
                                <>
                                    <div>
                                        <label className="block text-[8px] uppercase text-slate-400 mb-1">Número de Nota de Crédito</label>
                                        <input
                                            type="text"
                                            value={creditNoteNumber}
                                            placeholder="F001-XXXXXX"
                                            onChange={(e) => setCreditNoteNumber(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none text-xs"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[8px] uppercase text-slate-400 mb-1">Motivo</label>
                                        <select
                                            value={creditNoteMotive}
                                            onChange={(e) => setCreditNoteMotive(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none text-xs cursor-pointer"
                                        >
                                            <option value="1">Anulación de la operación</option>
                                            <option value="2">Descuento global</option>
                                            <option value="3">Diferencia de canje de letras</option>
                                            <option value="4">Ajuste de Saldo Comercial</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {(adjustmentMethod === 'TRANSFERENCIA' || adjustmentMethod === 'TARJETA') && (
                                <div>
                                    <label className="block text-[8px] uppercase text-slate-400 mb-1">Número de Operación / Referencia</label>
                                    <input
                                        type="text"
                                        value={adjustmentReference}
                                        placeholder="Ej: Op. 4829103 / Transf. 293"
                                        onChange={(e) => setAdjustmentReference(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none text-xs"
                                        required
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedGroupForAdjustment(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-xl text-xs active:scale-95 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAdjusting}
                                    className="bg-slate-900 hover:bg-slate-850 text-white font-black px-6 py-2.5 rounded-xl text-xs active:scale-95 transition-all flex items-center gap-2 shadow-md"
                                >
                                    {isAdjusting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Aplicar Ajuste
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* IMAGE PREVIEW MODAL OVERLAY */}
            {previewImageUrl && (
                <div 
                    className="fixed inset-0 bg-slate-950/80 z-[100] backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => setPreviewImageUrl(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewImageUrl(null)}
                            className="absolute -top-12 right-0 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider"
                        >
                            <X className="w-4 h-4" />
                            Cerrar Vista
                        </button>
                        <img
                            src={getImageUrl(previewImageUrl)}
                            alt="Voucher Preview"
                            className="max-w-full max-h-[75vh] object-contain rounded-[2rem] shadow-2xl border border-white/15 bg-slate-900/40"
                        />
                    </div>
                </div>
            )}
        </Layout>
    );
}
