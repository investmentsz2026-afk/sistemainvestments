// frontend/app/admin/finance/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/common/Layout';
import api from '../../../lib/axios';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Wallet,
    Landmark,
    Coins,
    Calendar,
    Search,
    CheckCircle2,
    AlertCircle,
    Clock,
    Eye,
    X,
    Upload,
    Loader2,
    ExternalLink,
    TrendingUp,
    TrendingDown,
    Scale,
    ArrowRight,
    FileSignature,
    DollarSign,
    Building2,
    Printer,
    Plus,
    Check,
    CreditCard,
    PieChart
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '');

export default function FinanceTreasuryPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<
        'LETRAS_PROVEEDORES' | 'PAGOS_PROVEEDORES' | 'FLUJO_CAJA' | 'PRESUPUESTOS_COBRANZAS'
    >('LETRAS_PROVEEDORES');

    const [isLoading, setIsLoading] = useState(true);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [clientLetras, setClientLetras] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDIENTE' | 'PAGADO'>('ALL');

    // Period filter for Cash Flow
    const [periodMode, setPeriodMode] = useState<'MES' | 'SEMESTRE' | 'ANIO' | 'HISTORICO'>('MES');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedSemester, setSelectedSemester] = useState<1 | 2>(new Date().getMonth() < 6 ? 1 : 2);

    // Selected purchase for viewing & paying its Supplier Letras
    const [selectedPurchaseSchedule, setSelectedPurchaseSchedule] = useState<any | null>(null);
    const [selectedInstallmentToPay, setSelectedInstallmentToPay] = useState<any | null>(null);

    // Selected purchase for direct payment (Contado / Crédito)
    const [selectedPurchaseForDirectPay, setSelectedPurchaseForDirectPay] = useState<any | null>(null);
    const [directPayAmount, setDirectPayAmount] = useState<string>('');

    // Shared payment form states (for paying a supplier Letra or a direct supplier invoice)
    const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [payMethod, setPayMethod] = useState<string>('TRANSFERENCIA');
    const [payOperationNum, setPayOperationNum] = useState<string>('');
    const [payVoucherUrl, setPayVoucherUrl] = useState<string>('');
    const [payNotes, setPayNotes] = useState<string>('');
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

    // Quick modal to convert an unconfigured purchase into Letras right from Treasury
    const [purchaseToConvertLetras, setPurchaseToConvertLetras] = useState<any | null>(null);
    const [convertNumLetras, setConvertNumLetras] = useState<number>(5);
    const [convertLetrasList, setConvertLetrasList] = useState<any[]>([]);
    const [isSavingConversion, setIsSavingConversion] = useState<boolean>(false);

    // Monthly Budgets state (saved in localStorage so user can customize targets)
    const [budgets, setBudgets] = useState<{
        materiales: number;
        avios: number;
        servicios: number;
        operativos: number;
    }>({
        materiales: 25000,
        avios: 8000,
        servicios: 18000,
        operativos: 6000,
    });

    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${SERVER_URL}${url}`;
    };

    useEffect(() => {
        const savedBudgets = localStorage.getItem('zyg_treasury_budgets');
        if (savedBudgets) {
            try {
                setBudgets(JSON.parse(savedBudgets));
            } catch (e) {}
        }
    }, []);

    const handleUpdateBudget = (key: keyof typeof budgets, value: number) => {
        const next = { ...budgets, [key]: value };
        setBudgets(next);
        localStorage.setItem('zyg_treasury_budgets', JSON.stringify(next));
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user && user.role !== 'ADMIN' && user.role !== 'CONTABILIDAD') {
            router.push('/');
            toast.error('Acceso restringido: Finanzas y Tesorería');
            return;
        }
        fetchTreasuryData();
    }, [user, authLoading]);

    const fetchTreasuryData = async () => {
        setIsLoading(true);
        try {
            const [purRes, salesRes, letrasRes] = await Promise.all([
                api.get('/purchases').catch(() => ({ data: { data: [] } })),
                api.get('/sales').catch(() => ({ data: [] })),
                api.get('/sales/letras').catch(() => ({ data: [] })),
            ]);

            const purList = Array.isArray(purRes.data?.data)
                ? purRes.data.data
                : Array.isArray(purRes.data)
                ? purRes.data
                : [];
            setPurchases(purList);
            setSales(salesRes.data || []);
            setClientLetras(letrasRes.data || []);

            // If schedule modal is open, refresh its reference
            if (selectedPurchaseSchedule) {
                const updated = purList.find((p: any) => p.id === selectedPurchaseSchedule.id);
                if (updated) setSelectedPurchaseSchedule(updated);
            }
        } catch (error) {
            console.error('Error fetching treasury data:', error);
            toast.error('Error al cargar datos de Finanzas y Tesorería');
        } finally {
            setIsLoading(false);
        }
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
            setPayVoucherUrl(resp.data.url);
            toast.success('Comprobante subido con éxito');
        } catch (error) {
            console.error(error);
            toast.error('Error al subir el comprobante');
        } finally {
            setIsUploading(false);
        }
    };

    // Pay a specific Letra of a Purchase
    const handleConfirmPayInstallment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPurchaseSchedule || !selectedInstallmentToPay) return;

        setIsSubmittingPayment(true);
        try {
            const resp = await api.post(
                `/purchases/${selectedPurchaseSchedule.id}/installments/${selectedInstallmentToPay.number}/pay`,
                {
                    paymentDate: payDate,
                    paymentMethod: payMethod,
                    operationNumber: payOperationNum,
                    voucherUrl: payVoucherUrl,
                    notes: payNotes,
                }
            );

            if (resp.data?.success === false) {
                throw new Error(resp.data.message);
            }

            toast.success(`Letra N° ${selectedInstallmentToPay.number} pagada y registrada en Contabilidad.`);
            setSelectedInstallmentToPay(null);
            setPayOperationNum('');
            setPayVoucherUrl('');
            setPayNotes('');
            await fetchTreasuryData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al registrar el pago de la letra');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    // Register a direct payment (abono o cancelación total) for a supplier purchase/service
    const handleConfirmDirectPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPurchaseForDirectPay) return;

        const amt = parseFloat(directPayAmount);
        if (isNaN(amt) || amt <= 0) {
            toast.error('Ingrese un monto válido mayor a cero');
            return;
        }

        setIsSubmittingPayment(true);
        try {
            const resp = await api.post(`/purchases/${selectedPurchaseForDirectPay.id}/direct-payment`, {
                amount: amt,
                paymentDate: payDate,
                paymentMethod: payMethod,
                operationNumber: payOperationNum,
                voucherUrl: payVoucherUrl,
                notes: payNotes,
            });

            if (resp.data?.success === false) {
                throw new Error(resp.data.message);
            }

            toast.success('Pago a proveedor registrado y actualizado en Contabilidad.');
            setSelectedPurchaseForDirectPay(null);
            setDirectPayAmount('');
            setPayOperationNum('');
            setPayVoucherUrl('');
            setPayNotes('');
            await fetchTreasuryData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al registrar pago a proveedor');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    // Quick helper to generate equal letras when converting a purchase in Treasury
    const openConvertLetrasModal = (purchase: any, count: number = 5) => {
        setPurchaseToConvertLetras(purchase);
        buildConvertLetrasList(count, purchase.totalAmount);
    };

    const buildConvertLetrasList = (count: number, totalAmt: number) => {
        const safeCount = Math.max(1, Math.min(24, count));
        setConvertNumLetras(safeCount);
        const baseAmt = Math.floor((totalAmt / safeCount) * 100) / 100;
        const remainder = Math.round((totalAmt - baseAmt * safeCount) * 100) / 100;
        const now = new Date();

        const list = Array.from({ length: safeCount }, (_, idx) => {
            const due = new Date(now);
            due.setDate(due.getDate() + 30 * (idx + 1));
            return {
                id: `L-${idx + 1}`,
                number: idx + 1,
                uniqueCode: `LET-${String(idx + 1).padStart(3, '0')}`,
                amount: idx === safeCount - 1 ? Math.round((baseAmt + remainder) * 100) / 100 : baseAmt,
                dueDate: due.toISOString().split('T')[0],
                status: 'PENDIENTE',
            };
        });
        setConvertLetrasList(list);
    };

    const handleSaveConvertLetras = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!purchaseToConvertLetras) return;

        const sum = convertLetrasList.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
        if (Math.abs(sum - purchaseToConvertLetras.totalAmount) > 0.1) {
            toast.error(`La suma de las letras (S/. ${sum.toFixed(2)}) debe ser igual al total de la compra (S/. ${purchaseToConvertLetras.totalAmount.toFixed(2)})`);
            return;
        }

        setIsSavingConversion(true);
        try {
            const resp = await api.patch(`/purchases/${purchaseToConvertLetras.id}/finance-plan`, {
                paymentCondition: 'LETRAS',
                installments: convertLetrasList,
            });
            if (resp.data?.success === false) {
                throw new Error(resp.data.message);
            }
            toast.success(`Cronograma de ${convertLetrasList.length} letras creado exitosamente.`);
            setPurchaseToConvertLetras(null);
            await fetchTreasuryData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al programar letras');
        } finally {
            setIsSavingConversion(false);
        }
    };

    // 1. Purchases financed with Letras
    const letrasPurchases = useMemo(() => {
        return purchases
            .filter(p => p.status !== 'RECHAZADO' && p.financeInfo?.paymentCondition === 'LETRAS')
            .filter(p => {
                if (statusFilter === 'PENDIENTE' && p.financeInfo?.paymentStatus === 'PAGADO') return false;
                if (statusFilter === 'PAGADO' && p.financeInfo?.paymentStatus !== 'PAGADO') return false;
                if (!searchTerm.trim()) return true;
                const q = searchTerm.toLowerCase();
                return (
                    p.supplier?.name?.toLowerCase().includes(q) ||
                    p.invoiceNumber?.toLowerCase().includes(q) ||
                    p.op?.toLowerCase().includes(q) ||
                    (p.items || []).some((it: any) => it.name?.toLowerCase().includes(q))
                );
            });
    }, [purchases, statusFilter, searchTerm]);

    // 2. Purchases for Direct Supplier Payments (Contado / Crédito / Sin configurar)
    const directPayablePurchases = useMemo(() => {
        return purchases
            .filter(p => p.status !== 'RECHAZADO' && p.financeInfo?.paymentCondition !== 'LETRAS')
            .filter(p => {
                const fin = p.financeInfo || {};
                if (statusFilter === 'PENDIENTE' && fin.paymentStatus === 'PAGADO') return false;
                if (statusFilter === 'PAGADO' && fin.paymentStatus !== 'PAGADO') return false;
                if (!searchTerm.trim()) return true;
                const q = searchTerm.toLowerCase();
                return (
                    p.supplier?.name?.toLowerCase().includes(q) ||
                    p.invoiceNumber?.toLowerCase().includes(q) ||
                    p.op?.toLowerCase().includes(q) ||
                    (p.items || []).some((it: any) => it.name?.toLowerCase().includes(q))
                );
            });
    }, [purchases, statusFilter, searchTerm]);

    // Helper for period filtering
    const isDateInPeriod = (dateStr: string | Date) => {
        if (!dateStr) return false;
        if (periodMode === 'HISTORICO') return true;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        if (y !== selectedYear) return false;
        if (periodMode === 'ANIO') return true;
        if (periodMode === 'MES') return m === selectedMonth;
        if (periodMode === 'SEMESTRE') {
            return selectedSemester === 1 ? m >= 1 && m <= 6 : m >= 7 && m <= 12;
        }
        return true;
    };

    // 3. Treasury Metrics & Unified Cash Flow (Inflows vs Outflows)
    const treasuryMetrics = useMemo(() => {
        let totalSupplierLetrasDebt = 0;
        let totalSupplierLetrasPaid = 0;
        let totalSupplierLetrasPending = 0;
        let overdueSupplierLetrasCount = 0;
        let pendingSupplierLetrasCount = 0;

        let totalDirectDebtPending = 0;
        let totalAllSupplierPaid = 0;

        const cashMovements: any[] = [];

        // Outflows from Purchases (Letras paid + Direct payments)
        purchases.filter(p => p.status !== 'RECHAZADO').forEach(p => {
            const fin = p.financeInfo || {};
            const paid = Number(fin.paidAmount) || 0;
            const pending = fin.isConfigured ? (Number(fin.pendingAmount) || 0) : (Number(p.totalAmount) || 0);

            totalAllSupplierPaid += paid;

            if (fin.paymentCondition === 'LETRAS') {
                totalSupplierLetrasDebt += Number(p.totalAmount) || 0;
                totalSupplierLetrasPaid += paid;
                totalSupplierLetrasPending += pending;

                (fin.installments || []).forEach((inst: any) => {
                    if (inst.status === 'PAGADO') {
                        cashMovements.push({
                            id: `OUT-LET-${p.id}-${inst.number}`,
                            direction: 'EGRESO',
                            date: inst.paymentDate || p.updatedAt,
                            entity: p.supplier?.name || 'Proveedor',
                            concept: `PAGO LETRA N° ${inst.number} (${p.invoiceNumber || 'Compra'})`,
                            method: inst.paymentMethod || 'TRANSFERENCIA',
                            reference: inst.operationNumber || inst.uniqueCode || '-',
                            amount: Number(inst.amount) || 0,
                            voucherUrl: inst.voucherUrl || '',
                            notes: inst.notes || (p.items || []).map((i: any) => i.name).join(', '),
                        });
                    } else {
                        pendingSupplierLetrasCount += 1;
                        if (inst.dueDate && new Date(inst.dueDate) < new Date()) {
                            overdueSupplierLetrasCount += 1;
                        }
                    }
                });
            } else {
                totalDirectDebtPending += pending;
                if (Array.isArray(fin.paymentsHistory) && fin.paymentsHistory.length > 0) {
                    fin.paymentsHistory.forEach((ph: any, idx: number) => {
                        cashMovements.push({
                            id: `OUT-DIR-${p.id}-${idx}`,
                            direction: 'EGRESO',
                            date: ph.paymentDate || p.createdAt,
                            entity: p.supplier?.name || 'Proveedor',
                            concept: `${p.type === 'SERVICE' ? 'PAGO SERVICIO' : 'PAGO COMPRA'} (${p.invoiceNumber || 'S/N'})`,
                            method: ph.paymentMethod || fin.paymentMethod || 'TRANSFERENCIA',
                            reference: ph.operationNumber || '-',
                            amount: Number(ph.amount) || 0,
                            voucherUrl: ph.voucherUrl || fin.voucherUrl || '',
                            notes: ph.notes || (p.items || []).map((i: any) => i.name).join(', '),
                        });
                    });
                } else if (paid > 0) {
                    cashMovements.push({
                        id: `OUT-CONT-${p.id}`,
                        direction: 'EGRESO',
                        date: fin.paymentDate || p.createdAt,
                        entity: p.supplier?.name || 'Proveedor',
                        concept: `${p.type === 'SERVICE' ? 'PAGO SERVICIO' : 'PAGO COMPRA'} (${p.invoiceNumber || 'S/N'})`,
                        method: fin.paymentMethod || 'TRANSFERENCIA',
                        reference: fin.operationNumber || '-',
                        amount: paid,
                        voucherUrl: fin.voucherUrl || '',
                        notes: fin.accountingNotes || (p.items || []).map((i: any) => i.name).join(', '),
                    });
                }
            }
        });

        // Inflows from Client Conciliated Sales Payments (excluding Credit Notes & Letras)
        let accountsReceivableFromClients = 0;
        sales.filter(s => s.status !== 'ANULADO').forEach(sale => {
            const activePs = (sale.payments || []).filter((sp: any) => sp.status === 'APROBADO' || sp.status === 'CONCILIADO');
            const totalPaidOnSale = activePs.reduce((acc: number, sp: any) => acc + (Number(sp.amount) || 0), 0);
            if (!sale.letraGroupId && sale.totalAmount > totalPaidOnSale + 0.01) {
                accountsReceivableFromClients += (sale.totalAmount - totalPaidOnSale);
            }

            (sale.payments || [])
                .filter((sp: any) => sp.status === 'CONCILIADO' && sp.method !== 'LETRAS' && sp.method !== 'NOTA_CREDITO' && Number(sp.amount) > 0)
                .forEach((sp: any) => {
                    cashMovements.push({
                        id: `IN-SALE-${sp.id}`,
                        direction: 'INGRESO',
                        date: sp.paymentDate || sp.createdAt,
                        entity: sale.client?.name || 'Cliente',
                        concept: `COBRO VENTA ${sale.invoiceNumber || 'S/N'}`,
                        method: sp.method,
                        reference: sale.invoiceNumber || '-',
                        amount: Number(sp.amount) || 0,
                        voucherUrl: sp.evidenceUrl || '',
                        notes: sp.notes || 'Cobro conciliado en banco',
                    });
                });
        });

        // Inflows from Paid Client Letras
        clientLetras.forEach(cl => {
            if (cl.status === 'PAGADO') {
                cashMovements.push({
                    id: `IN-CLET-${cl.id}`,
                    direction: 'INGRESO',
                    date: cl.paymentDate || cl.updatedAt,
                    entity: cl.group?.client?.name || 'Cliente',
                    concept: `COBRO LETRA CLIENTE N° ${cl.number}`,
                    method: 'LETRA BANCO',
                    reference: cl.uniqueNumber || `Letra #${cl.number}`,
                    amount: Number(cl.amount) || 0,
                    voucherUrl: cl.voucherUrl || '',
                    notes: cl.paymentNotes || 'Letra de cliente pagada',
                });
            } else if (cl.group?.status === 'APROBADO') {
                accountsReceivableFromClients += (Number(cl.amount) || 0);
            }
        });

        const sortedMovements = cashMovements
            .filter(m => isDateInPeriod(m.date))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const periodInflows = Math.round(
            sortedMovements.filter(m => m.direction === 'INGRESO').reduce((acc, m) => acc + m.amount, 0) * 100
        ) / 100;
        const periodOutflows = Math.round(
            sortedMovements.filter(m => m.direction === 'EGRESO').reduce((acc, m) => acc + m.amount, 0) * 100
        ) / 100;
        const netCashFlow = Math.round((periodInflows - periodOutflows) * 100) / 100;

        // Budget execution in current month
        const currentMonthPurchases = purchases.filter(p => {
            if (p.status === 'RECHAZADO') return false;
            const d = new Date(p.createdAt);
            return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
        });

        let execMateriales = 0;
        let execAvios = 0;
        let execServicios = 0;
        let execOperativos = 0;

        currentMonthPurchases.forEach(p => {
            const amt = Number(p.totalAmount) || 0;
            if (p.type === 'SERVICE') {
                execServicios += amt;
            } else if (p.type === 'EXPENSE' || p.type === 'TAX') {
                execOperativos += amt;
            } else {
                const isAvio = (p.items || []).some((i: any) => (i.category || '').toUpperCase().includes('AVIO'));
                if (isAvio) execAvios += amt;
                else execMateriales += amt;
            }
        });

        return {
            totalSupplierLetrasDebt: Math.round(totalSupplierLetrasDebt * 100) / 100,
            totalSupplierLetrasPaid: Math.round(totalSupplierLetrasPaid * 100) / 100,
            totalSupplierLetrasPending: Math.round(totalSupplierLetrasPending * 100) / 100,
            overdueSupplierLetrasCount,
            pendingSupplierLetrasCount,
            totalDirectDebtPending: Math.round(totalDirectDebtPending * 100) / 100,
            totalAllSupplierPending: Math.round((totalSupplierLetrasPending + totalDirectDebtPending) * 100) / 100,
            totalAllSupplierPaid: Math.round(totalAllSupplierPaid * 100) / 100,
            accountsReceivableFromClients: Math.round(accountsReceivableFromClients * 100) / 100,
            sortedMovements,
            periodInflows,
            periodOutflows,
            netCashFlow,
            execMateriales: Math.round(execMateriales * 100) / 100,
            execAvios: Math.round(execAvios * 100) / 100,
            execServicios: Math.round(execServicios * 100) / 100,
            execOperativos: Math.round(execOperativos * 100) / 100,
        };
    }, [purchases, sales, clientLetras, periodMode, selectedYear, selectedMonth, selectedSemester]);

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
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[9px] font-black uppercase tracking-widest">
                                Tesorería Corporativa y Obligaciones con Proveedores
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5 mt-1">
                            <Wallet className="w-8 h-8 text-indigo-600 shrink-0" />
                            Finanzas y Tesorería
                        </h1>
                        <p className="text-slate-500 font-medium text-sm sm:text-base">
                            Gestiona el flujo de caja, presupuestos, cobranzas, pagos de letras a proveedores (telas, avíos, servicios) y financiamiento.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/admin/accounting"
                            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl transition active:scale-95 shadow-md flex items-center gap-2"
                        >
                            <Scale className="w-4 h-4" />
                            Ver Contabilidad y Ganancia Neta
                        </Link>
                    </div>
                </div>

                {/* Top 4 Executive Treasury KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className="bg-slate-950 text-white rounded-[2.2rem] p-6 shadow-xl relative overflow-hidden">
                        <div className="text-[10px] text-indigo-300 font-black uppercase tracking-wider">Deuda Total en Letras (Proveedores)</div>
                        <div className="text-2xl font-black mt-2">S/. {treasuryMetrics.totalSupplierLetrasPending.toFixed(2)}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                            {treasuryMetrics.pendingSupplierLetrasCount} letras pendientes por pagar
                        </div>
                    </div>

                    <div className="bg-white border border-emerald-200 rounded-[2.2rem] p-6 shadow-md">
                        <div className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">Total Ya Pagado a Proveedores</div>
                        <div className="text-2xl font-black text-emerald-600 mt-2">S/. {treasuryMetrics.totalAllSupplierPaid.toFixed(2)}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                            Letras pagadas: S/. {treasuryMetrics.totalSupplierLetrasPaid.toFixed(2)}
                        </div>
                    </div>

                    <div className="bg-white border border-amber-200 rounded-[2.2rem] p-6 shadow-md">
                        <div className="text-[10px] text-amber-600 font-black uppercase tracking-wider">Cuentas por Pagar Directas</div>
                        <div className="text-2xl font-black text-amber-600 mt-2">S/. {treasuryMetrics.totalDirectDebtPending.toFixed(2)}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                            Facturas y servicios por liquidar
                        </div>
                    </div>

                    <div className="bg-white border border-rose-200 rounded-[2.2rem] p-6 shadow-md">
                        <div className="text-[10px] text-rose-500 font-black uppercase tracking-wider">Letras de Proveedores Vencidas</div>
                        <div className="text-2xl font-black text-rose-600 mt-2">{treasuryMetrics.overdueSupplierLetrasCount} Letras</div>
                        <div className="text-[9px] text-rose-400 font-bold uppercase mt-1">
                            Deuda total empresa: S/. {treasuryMetrics.totalAllSupplierPending.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Sub-modules Navigation Tabs */}
                <div className="flex flex-wrap border-b border-slate-200 gap-3 sm:gap-6">
                    <button
                        onClick={() => setActiveTab('LETRAS_PROVEEDORES')}
                        className={`pb-4 px-2 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                            activeTab === 'LETRAS_PROVEEDORES'
                                ? 'border-indigo-600 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <FileSignature className="w-4 h-4 text-indigo-600" />
                        1. Pago de Letras a Proveedores ({letrasPurchases.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('PAGOS_PROVEEDORES')}
                        className={`pb-4 px-2 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                            activeTab === 'PAGOS_PROVEEDORES'
                                ? 'border-amber-600 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <CreditCard className="w-4 h-4 text-amber-600" />
                        2. Pagos Directos a Proveedores ({directPayablePurchases.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('FLUJO_CAJA')}
                        className={`pb-4 px-2 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                            activeTab === 'FLUJO_CAJA'
                                ? 'border-emerald-600 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        3. Flujo de Caja Real
                    </button>
                    <button
                        onClick={() => setActiveTab('PRESUPUESTOS_COBRANZAS')}
                        className={`pb-4 px-2 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                            activeTab === 'PRESUPUESTOS_COBRANZAS'
                                ? 'border-violet-600 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <PieChart className="w-4 h-4 text-violet-600" />
                        4. Presupuestos y Cobranzas vs Deudas
                    </button>
                </div>

                {/* =========================================================================================
                    SUB-MÓDULO 1: PAGO DE LETRAS Y CUOTAS A PROVEEDORES (FINANCIAMIENTO EMPRESA)
                ========================================================================================= */}
                {activeTab === 'LETRAS_PROVEEDORES' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
                            <div className="flex-1 min-w-[240px] relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por proveedor, factura de compra, tela o OP..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-2.5 font-bold text-slate-800 outline-none text-xs"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                {(['ALL', 'PENDIENTE', 'PAGADO'] as const).map(st => (
                                    <button
                                        key={st}
                                        onClick={() => setStatusFilter(st)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition ${
                                            statusFilter === st
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {st === 'ALL' ? 'Todas' : st === 'PENDIENTE' ? 'Falta Pagar' : 'Completadas'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={cardClass}>
                            <div className="border-b border-slate-100 pb-4 mb-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase">
                                    Cronogramas de Letras por Pagar a Proveedores
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                    Compras de telas, avíos o servicios financiadas en letras. Haz clic en "Ver y Pagar Letras" para abonar cada letra y subir su comprobante.
                                </p>
                            </div>

                            <div className="overflow-x-auto -mx-8">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="px-6 py-4">Proveedor / Factura</th>
                                            <th className="px-6 py-4">Materiales / Servicios Comprados</th>
                                            <th className="px-6 py-4 text-right">Monto Total</th>
                                            <th className="px-6 py-4 text-right">Ya Pagado</th>
                                            <th className="px-6 py-4 text-right">Falta Pagar</th>
                                            <th className="px-6 py-4 text-center">Progreso Letras</th>
                                            <th className="px-6 py-4 text-center">Estado</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                        {letrasPurchases.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-8 py-16 text-center text-slate-400">
                                                    <div className="space-y-2">
                                                        <p className="italic">No hay compras programadas en letras en este filtro.</p>
                                                        <p className="text-[10px] font-black uppercase text-indigo-600">
                                                            Puedes programar cualquier compra a letras desde la pestaña "2. Pagos Directos a Proveedores" o desde "Contabilidad y Costos".
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            letrasPurchases.map((p) => {
                                                const fin = p.financeInfo || {};
                                                const insts = Array.isArray(fin.installments) ? fin.installments : [];
                                                const paidCount = insts.filter((i: any) => i.status === 'PAGADO').length;
                                                const hasOverdue = insts.some((i: any) => i.status !== 'PAGADO' && new Date(i.dueDate) < new Date());

                                                return (
                                                    <tr key={p.id} className="hover:bg-slate-50/40 transition">
                                                        <td className="px-6 py-4 uppercase">
                                                            <div className="font-black text-slate-900">{p.supplier?.name || 'Proveedor'}</div>
                                                            <div className="text-[9px] text-indigo-600 font-black mt-0.5">Doc: {p.invoiceNumber || 'S/N'}</div>
                                                            <div className="text-[8px] text-slate-400">Fecha: {new Date(p.createdAt).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4 max-w-xs">
                                                            <div className="truncate font-bold text-slate-800">
                                                                {(p.items || []).map((it: any) => `${it.name} (${it.quantity} ${it.unit || ''})`).join(', ') || '-'}
                                                            </div>
                                                            {p.op && <span className="text-[9px] font-black text-indigo-500 uppercase">OP: {p.op}</span>}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-900">
                                                            S/. {Number(p.totalAmount).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-emerald-600">
                                                            S/. {Number(fin.paidAmount || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-rose-600">
                                                            S/. {Number(fin.pendingAmount || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="text-[10px] font-black text-slate-800">
                                                                {paidCount} de {insts.length} Letras Pagadas
                                                            </div>
                                                            <div className="w-28 mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                                                <div
                                                                    className="h-full bg-emerald-500 rounded-full"
                                                                    style={{ width: `${insts.length > 0 ? (paidCount / insts.length) * 100 : 0}%` }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {fin.paymentStatus === 'PAGADO' ? (
                                                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[9px] font-black uppercase">
                                                                    Terminó de Pagar
                                                                </span>
                                                            ) : hasOverdue ? (
                                                                <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg text-[9px] font-black uppercase animate-pulse">
                                                                    Con Letra Vencida
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[9px] font-black uppercase">
                                                                    Falta Pagar ({insts.length - paidCount})
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => setSelectedPurchaseSchedule(p)}
                                                                className="bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-black uppercase px-3.5 py-2 rounded-xl transition active:scale-95 inline-flex items-center gap-1.5 shadow-sm"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                Ver y Pagar Letras
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================================================================
                    SUB-MÓDULO 2: CUENTAS POR PAGAR DIRECTAS A PROVEEDORES (CONTADO / CRÉDITO / PASAR A LETRAS)
                ========================================================================================= */}
                {activeTab === 'PAGOS_PROVEEDORES' && (
                    <div className="space-y-6">
                        <div className={cardClass}>
                            <div className="border-b border-slate-100 pb-4 mb-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase">
                                    Compras y Servicios por Pagar a Proveedores
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                    Registra el pago directo con voucher o convierte cualquier compra en un cronograma de Letras (ej. 5 letras) con un clic.
                                </p>
                            </div>

                            <div className="overflow-x-auto -mx-8">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="px-6 py-4">Proveedor / Doc</th>
                                            <th className="px-6 py-4">Concepto / Materiales</th>
                                            <th className="px-6 py-4 text-right">Monto Total</th>
                                            <th className="px-6 py-4 text-right">Abonado</th>
                                            <th className="px-6 py-4 text-right">Falta Pagar</th>
                                            <th className="px-6 py-4 text-center">Estado</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                        {directPayablePurchases.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-8 py-16 text-center text-slate-400 italic">
                                                    No hay compras o servicios directos en este filtro.
                                                </td>
                                            </tr>
                                        ) : (
                                            directPayablePurchases.map((p) => {
                                                const fin = p.financeInfo || {};
                                                const pending = fin.isConfigured ? Number(fin.pendingAmount || 0) : Number(p.totalAmount || 0);
                                                const isPaid = fin.paymentStatus === 'PAGADO';

                                                return (
                                                    <tr key={p.id} className="hover:bg-slate-50/40 transition">
                                                        <td className="px-6 py-4 uppercase">
                                                            <div className="font-black text-slate-900">{p.supplier?.name || 'Proveedor General'}</div>
                                                            <div className="text-[9px] text-indigo-600 font-black">Doc: {p.invoiceNumber || 'S/N'}</div>
                                                            <div className="text-[8px] text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4 max-w-xs">
                                                            <div className="truncate font-bold text-slate-800">
                                                                {(p.items || []).map((it: any) => `${it.name} (${it.quantity} ${it.unit || ''})`).join(', ') || '-'}
                                                            </div>
                                                            {p.op && <span className="text-[9px] font-black text-indigo-500 uppercase">OP: {p.op}</span>}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-900">
                                                            S/. {Number(p.totalAmount).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-emerald-600">
                                                            S/. {Number(fin.paidAmount || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-rose-600">
                                                            S/. {pending.toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                                                                isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                            }`}>
                                                                {isPaid ? 'Pagado' : 'Falta Pagar'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {!isPaid && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedPurchaseForDirectPay(p);
                                                                                setDirectPayAmount(pending.toFixed(2));
                                                                            }}
                                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl transition active:scale-95 inline-flex items-center gap-1"
                                                                        >
                                                                            <DollarSign className="w-3 h-3" />
                                                                            Pagar / Abonar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => openConvertLetrasModal(p, 5)}
                                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl transition active:scale-95 inline-flex items-center gap-1"
                                                                        >
                                                                            <FileSignature className="w-3 h-3" />
                                                                            Sacar a Letras
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {fin.voucherUrl && (
                                                                    <button
                                                                        onClick={() => setPreviewImageUrl(fin.voucherUrl)}
                                                                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase px-2.5 py-2 rounded-xl"
                                                                    >
                                                                        Ver Voucher
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================================================================
                    SUB-MÓDULO 3: FLUJO DE CAJA REAL (ENTRADAS DE COBRANZAS VS SALIDAS A PROVEEDORES)
                ========================================================================================= */}
                {activeTab === 'FLUJO_CAJA' && (
                    <div className="space-y-6">
                        {/* Period Filter */}
                        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {(['MES', 'SEMESTRE', 'ANIO', 'HISTORICO'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setPeriodMode(mode)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition ${
                                            periodMode === mode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {mode === 'MES' ? 'Este Mes' : mode === 'SEMESTRE' ? 'Este Semestre' : mode === 'ANIO' ? 'Este Año' : 'Histórico'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                {periodMode !== 'HISTORICO' && (
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black"
                                    >
                                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>Año {y}</option>)}
                                    </select>
                                )}
                                {periodMode === 'MES' && (
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-xs font-black text-indigo-900"
                                    >
                                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                            <option key={i + 1} value={i + 1}>{m}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-[2.2rem] p-6">
                                <div className="text-[10px] font-black text-emerald-700 uppercase">Total Entradas (Cobranzas)</div>
                                <div className="text-2xl font-black text-emerald-700 mt-1">+S/. {treasuryMetrics.periodInflows.toFixed(2)}</div>
                            </div>
                            <div className="bg-rose-50 border border-rose-200 rounded-[2.2rem] p-6">
                                <div className="text-[10px] font-black text-rose-700 uppercase">Total Salidas (Pagos a Proveedores)</div>
                                <div className="text-2xl font-black text-rose-600 mt-1">-S/. {treasuryMetrics.periodOutflows.toFixed(2)}</div>
                            </div>
                            <div className="bg-slate-950 text-white rounded-[2.2rem] p-6">
                                <div className="text-[10px] font-black text-indigo-300 uppercase">Flujo de Caja Neto (Liquidez Real)</div>
                                <div className={`text-2xl font-black mt-1 ${treasuryMetrics.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    S/. {treasuryMetrics.netCashFlow.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className={cardClass}>
                            <h3 className="text-lg font-black text-slate-900 uppercase mb-4">Movimientos de Tesorería (Ingresos y Egresos)</h3>
                            <div className="overflow-x-auto -mx-8">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase">
                                            <th className="px-6 py-3.5">Fecha</th>
                                            <th className="px-6 py-3.5">Tipo</th>
                                            <th className="px-6 py-3.5">Cliente / Proveedor</th>
                                            <th className="px-6 py-3.5">Concepto</th>
                                            <th className="px-6 py-3.5">Método / Ref</th>
                                            <th className="px-6 py-3.5 text-right">Importe</th>
                                            <th className="px-6 py-3.5 text-center">Voucher</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                        {treasuryMetrics.sortedMovements.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-8 py-16 text-center text-slate-400 italic">
                                                    No hay movimientos de caja en el período seleccionado.
                                                </td>
                                            </tr>
                                        ) : (
                                            treasuryMetrics.sortedMovements.map((m) => (
                                                <tr key={m.id} className="hover:bg-slate-50/40">
                                                    <td className="px-6 py-3.5 whitespace-nowrap">{new Date(m.date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-3.5">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                            m.direction === 'INGRESO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                            {m.direction}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3.5 uppercase font-black text-slate-900">{m.entity}</td>
                                                    <td className="px-6 py-3.5 uppercase">{m.concept}</td>
                                                    <td className="px-6 py-3.5 text-[10px] text-slate-500">{m.method} ({m.reference})</td>
                                                    <td className={`px-6 py-3.5 text-right font-black ${
                                                        m.direction === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                        {m.direction === 'INGRESO' ? '+' : '-'}S/. {m.amount.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-center">
                                                        {m.voucherUrl ? (
                                                            <button
                                                                onClick={() => setPreviewImageUrl(m.voucherUrl)}
                                                                className="text-indigo-600 hover:underline text-[10px] font-black uppercase"
                                                            >
                                                                Ver Voucher
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================================================================
                    SUB-MÓDULO 4: PRESUPUESTOS MENSUALES Y BALANCE COBRANZAS VS OBLIGACIONES
                ========================================================================================= */}
                {activeTab === 'PRESUPUESTOS_COBRANZAS' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-[2.2rem] border border-emerald-200 p-7 shadow-md">
                                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Cartera Total por Cobrar a Clientes</div>
                                <div className="text-3xl font-black text-emerald-700 mt-2">S/. {treasuryMetrics.accountsReceivableFromClients.toFixed(2)}</div>
                                <p className="text-xs font-bold text-slate-500 mt-1">
                                    Suma de facturas pendientes de cobro y letras de clientes por vencer.
                                </p>
                            </div>
                            <div className="bg-white rounded-[2.2rem] border border-rose-200 p-7 shadow-md">
                                <div className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Obligaciones Totales por Pagar a Proveedores</div>
                                <div className="text-3xl font-black text-rose-600 mt-2">S/. {treasuryMetrics.totalAllSupplierPending.toFixed(2)}</div>
                                <p className="text-xs font-bold text-slate-500 mt-1">
                                    Suma de letras a proveedores pendientes (S/. {treasuryMetrics.totalSupplierLetrasPending.toFixed(2)}) y créditos directos (S/. {treasuryMetrics.totalDirectDebtPending.toFixed(2)}).
                                </p>
                            </div>
                        </div>

                        <div className={cardClass}>
                            <h3 className="text-lg font-black text-slate-900 uppercase mb-1">
                                Control de Presupuesto Mensual por Partida ({selectedMonth}/{selectedYear})
                            </h3>
                            <p className="text-xs font-medium text-slate-500 mb-6">
                                Ajusta el presupuesto mensual asignado a cada partida para monitorear el límite de gasto de la empresa.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { key: 'materiales' as const, label: 'Compra de Telas y Materiales', executed: treasuryMetrics.execMateriales, color: 'bg-blue-600' },
                                    { key: 'avios' as const, label: 'Compra de Avíos e Insumos', executed: treasuryMetrics.execAvios, color: 'bg-teal-600' },
                                    { key: 'servicios' as const, label: 'Servicios de Confección y Lavandería', executed: treasuryMetrics.execServicios, color: 'bg-amber-500' },
                                    { key: 'operativos' as const, label: 'Gastos Operativos y Tributos', executed: treasuryMetrics.execOperativos, color: 'bg-violet-600' },
                                ].map((b) => {
                                    const limit = budgets[b.key] || 1;
                                    const pct = Math.min(100, Math.round((b.executed / limit) * 100));
                                    return (
                                        <div key={b.key} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-slate-900 uppercase text-xs">{b.label}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Presupuesto S/.</span>
                                                    <input
                                                        type="number"
                                                        value={budgets[b.key]}
                                                        onChange={(e) => handleUpdateBudget(b.key, Number(e.target.value))}
                                                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-right"
                                                    />
                                                </div>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div className={`h-full ${b.executed > limit ? 'bg-rose-600' : b.color}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-slate-600">Ejecutado este mes: <strong>S/. {b.executed.toFixed(2)}</strong></span>
                                                <span className={b.executed > limit ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'}>
                                                    {b.executed > limit ? `Excedido en S/. ${(b.executed - limit).toFixed(2)}` : `Disponible: S/. ${(limit - b.executed).toFixed(2)}`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* =========================================================================================
                MODAL 1: CRONOGRAMA DE LETRAS DEL PROVEEDOR (VER Y PAGAR CADA LETRA CON COMPROBANTE)
            ========================================================================================= */}
            {selectedPurchaseSchedule && (
                <div className="fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-4xl p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedPurchaseSchedule(null)}
                            className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                    selectedPurchaseSchedule.financeInfo?.paymentStatus === 'PAGADO'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {selectedPurchaseSchedule.financeInfo?.paymentStatus === 'PAGADO' ? 'COMPRA LIQUIDADA AL 100%' : 'EN CURSO DE PAGO'}
                                </span>
                                <h2 className="text-xl font-black text-slate-900 uppercase">
                                    Letras a Proveedor: {selectedPurchaseSchedule.supplier?.name || 'Proveedor'}
                                </h2>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                Factura: {selectedPurchaseSchedule.invoiceNumber || 'S/N'} | Total Compra: S/. {Number(selectedPurchaseSchedule.totalAmount).toFixed(2)} | Pagado: S/. {Number(selectedPurchaseSchedule.financeInfo?.paidAmount || 0).toFixed(2)} | Falta Pagar: S/. {Number(selectedPurchaseSchedule.financeInfo?.pendingAmount || 0).toFixed(2)}
                            </p>
                        </div>

                        <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase">
                                        <th className="px-6 py-3.5">Letra</th>
                                        <th className="px-6 py-3.5 text-right">Monto</th>
                                        <th className="px-6 py-3.5">Vencimiento</th>
                                        <th className="px-6 py-3.5">Comprobante / Pago</th>
                                        <th className="px-6 py-3.5 text-center">Estado</th>
                                        <th className="px-6 py-3.5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                    {(selectedPurchaseSchedule.financeInfo?.installments || []).map((inst: any) => {
                                        const isOverdue = inst.status !== 'PAGADO' && new Date(inst.dueDate) < new Date();
                                        return (
                                            <tr key={inst.number} className="hover:bg-slate-50/30">
                                                <td className="px-6 py-3.5 font-black text-slate-900">
                                                    Letra N° {inst.number}
                                                    {inst.uniqueCode && (
                                                        <div className="text-[9px] font-mono text-slate-400">{inst.uniqueCode}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3.5 text-right font-black text-slate-900">
                                                    S/. {Number(inst.amount).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div className={isOverdue ? 'text-rose-600 font-black' : ''}>
                                                        {new Date(inst.dueDate).toLocaleDateString()}
                                                    </div>
                                                    {isOverdue && (
                                                        <span className="text-[8px] font-black uppercase bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">
                                                            Vencida
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    {inst.status === 'PAGADO' ? (
                                                        <div className="flex items-center gap-3">
                                                            {inst.voucherUrl && (
                                                                <img
                                                                    src={getImageUrl(inst.voucherUrl)}
                                                                    alt="Voucher"
                                                                    onClick={() => setPreviewImageUrl(inst.voucherUrl)}
                                                                    className="w-10 h-10 object-cover rounded-xl cursor-zoom-in border border-slate-200"
                                                                />
                                                            )}
                                                            <div className="text-[10px]">
                                                                <div className="text-emerald-600 font-black">
                                                                    Pagado: {inst.paymentDate ? new Date(inst.paymentDate).toLocaleDateString() : '-'}
                                                                </div>
                                                                <div className="text-slate-400">
                                                                    {inst.paymentMethod} {inst.operationNumber ? `• Op: ${inst.operationNumber}` : ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[10px]">Pendiente de pago...</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3.5 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                                                        inst.status === 'PAGADO'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : isOverdue
                                                            ? 'bg-rose-100 text-rose-700'
                                                            : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {inst.status === 'PAGADO' ? 'PAGADO' : 'FALTA PAGAR'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    {inst.status !== 'PAGADO' ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedInstallmentToPay(inst);
                                                                setPayDate(new Date().toISOString().split('T')[0]);
                                                                setPayOperationNum('');
                                                                setPayVoucherUrl('');
                                                                setPayNotes('');
                                                            }}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl transition active:scale-95 inline-flex items-center gap-1 shadow-sm"
                                                        >
                                                            <DollarSign className="w-3 h-3" />
                                                            Pagar Letra
                                                        </button>
                                                    ) : (
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase">Saldo Restante de esta Compra: </span>
                                <span className="text-lg font-black text-rose-600">
                                    S/. {Number(selectedPurchaseSchedule.financeInfo?.pendingAmount || 0).toFixed(2)}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedPurchaseSchedule(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase px-6 py-3 rounded-xl"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================================
                MODAL 2: PAGAR UNA LETRA INDIVIDUAL DE PROVEEDOR (CON SUBIDA DE COMPROBANTE / VOUCHER)
            ========================================================================================= */}
            {selectedInstallmentToPay && selectedPurchaseSchedule && (
                <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase flex items-center gap-2">
                                <Landmark className="w-5 h-5 text-indigo-600" />
                                Pagar Letra N° {selectedInstallmentToPay.number}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                Proveedor: {selectedPurchaseSchedule.supplier?.name || 'Proveedor'} | Importe: S/. {Number(selectedInstallmentToPay.amount).toFixed(2)}
                            </p>
                        </div>

                        <form onSubmit={handleConfirmPayInstallment} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Fecha de Pago</label>
                                    <input
                                        type="date"
                                        required
                                        value={payDate}
                                        onChange={(e) => setPayDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Método de Pago</label>
                                    <select
                                        value={payMethod}
                                        onChange={(e) => setPayMethod(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black"
                                    >
                                        <option value="TRANSFERENCIA">Transferencia</option>
                                        <option value="DEPOSITO">Depósito Bancario</option>
                                        <option value="CARGO_CUENTA">Cargo en Cuenta</option>
                                        <option value="EFECTIVO">Efectivo</option>
                                        <option value="CHEQUE">Cheque</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">N° de Operación Bancaria</label>
                                <input
                                    type="text"
                                    placeholder="Ej: BCP-4920182"
                                    value={payOperationNum}
                                    onChange={(e) => setPayOperationNum(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Subir Comprobante / Voucher de Pago</label>
                                {payVoucherUrl ? (
                                    <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                        <img src={getImageUrl(payVoucherUrl)} alt="Voucher" className="w-12 h-12 object-cover rounded-lg" />
                                        <span className="flex-1 truncate font-mono text-[10px]">{payVoucherUrl.split('/').pop()}</span>
                                        <button type="button" onClick={() => setPayVoucherUrl('')} className="text-rose-500 p-1">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer">
                                        {isUploading ? (
                                            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-indigo-500 mb-1" />
                                                <span className="text-[10px] font-black uppercase text-indigo-600">Subir Imagen del Voucher</span>
                                            </>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                                    </label>
                                )}
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Observaciones</label>
                                <input
                                    type="text"
                                    placeholder="Comentario opcional del pago..."
                                    value={payNotes}
                                    onChange={(e) => setPayNotes(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedInstallmentToPay(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-xl text-xs uppercase"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingPayment}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 shadow-md"
                                >
                                    {isSubmittingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Confirmar Pago de Letra
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =========================================================================================
                MODAL 3: REGISTRAR PAGO DIRECTO A PROVEEDOR (CONTADO / ABONO)
            ========================================================================================= */}
            {selectedPurchaseForDirectPay && (
                <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase">Registrar Pago a Proveedor</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                {selectedPurchaseForDirectPay.supplier?.name || 'Proveedor'} — Doc: {selectedPurchaseForDirectPay.invoiceNumber || 'S/N'}
                            </p>
                        </div>

                        <form onSubmit={handleConfirmDirectPayment} className="space-y-4 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Monto a Pagar (S/.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={directPayAmount}
                                    onChange={(e) => setDirectPayAmount(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-black text-base text-slate-900"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Fecha de Pago</label>
                                    <input
                                        type="date"
                                        required
                                        value={payDate}
                                        onChange={(e) => setPayDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Método</label>
                                    <select
                                        value={payMethod}
                                        onChange={(e) => setPayMethod(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black"
                                    >
                                        <option value="TRANSFERENCIA">Transferencia</option>
                                        <option value="DEPOSITO">Depósito</option>
                                        <option value="EFECTIVO">Efectivo</option>
                                        <option value="YAPE_PLIN">Yape / Plin</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">N° Operación</label>
                                <input
                                    type="text"
                                    placeholder="Ej: OP-329102"
                                    value={payOperationNum}
                                    onChange={(e) => setPayOperationNum(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Comprobante (Voucher)</label>
                                {payVoucherUrl ? (
                                    <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                        <img src={getImageUrl(payVoucherUrl)} alt="Voucher" className="w-12 h-12 object-cover rounded-lg" />
                                        <span className="flex-1 truncate font-mono text-[10px]">{payVoucherUrl.split('/').pop()}</span>
                                        <button type="button" onClick={() => setPayVoucherUrl('')} className="text-rose-500 p-1">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer">
                                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-emerald-600 mb-1" />}
                                        <span className="text-[10px] font-black uppercase text-emerald-700">Subir Voucher</span>
                                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                    </label>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPurchaseForDirectPay(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-xl text-xs uppercase"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingPayment}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 shadow-md"
                                >
                                    {isSubmittingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Confirmar Pago
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =========================================================================================
                MODAL 4: PROGRAMAR COMPRA EN LETRAS (EJ: 5 LETRAS)
            ========================================================================================= */}
            {purchaseToConvertLetras && (
                <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setPurchaseToConvertLetras(null)}
                            className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase">
                                Programar Compra en Letras a Proveedor
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                {purchaseToConvertLetras.supplier?.name || 'Proveedor'} | Factura: {purchaseToConvertLetras.invoiceNumber || 'S/N'} | Total: S/. {Number(purchaseToConvertLetras.totalAmount).toFixed(2)}
                            </p>
                        </div>

                        <form onSubmit={handleSaveConvertLetras} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-2xl">
                                <span className="font-black text-indigo-950 uppercase">Cantidad de Letras a Programar:</span>
                                <select
                                    value={convertNumLetras}
                                    onChange={(e) => buildConvertLetrasList(Number(e.target.value), purchaseToConvertLetras.totalAmount)}
                                    className="bg-white border border-indigo-200 rounded-xl px-4 py-2 font-black text-indigo-900"
                                >
                                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                                        <option key={n} value={n}>{n} {n === 1 ? 'Letra' : 'Letras'}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {convertLetrasList.map((inst, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                        <div className="col-span-3 font-black text-slate-900">Letra N° {inst.number}</div>
                                        <div className="col-span-3">
                                            <input
                                                type="text"
                                                value={inst.uniqueCode}
                                                onChange={(e) => {
                                                    const copy = [...convertLetrasList];
                                                    copy[idx] = { ...copy[idx], uniqueCode: e.target.value };
                                                    setConvertLetrasList(copy);
                                                }}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <input
                                                type="date"
                                                value={inst.dueDate}
                                                onChange={(e) => {
                                                    const copy = [...convertLetrasList];
                                                    copy[idx] = { ...copy[idx], dueDate: e.target.value };
                                                    setConvertLetrasList(copy);
                                                }}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={inst.amount}
                                                onChange={(e) => {
                                                    const copy = [...convertLetrasList];
                                                    copy[idx] = { ...copy[idx], amount: Number(e.target.value) };
                                                    setConvertLetrasList(copy);
                                                }}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black text-right"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setPurchaseToConvertLetras(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-xl text-xs uppercase"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingConversion}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 shadow-md"
                                >
                                    {isSavingConversion && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Guardar Cronograma de Letras
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImageUrl && (
                <div
                    className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setPreviewImageUrl(null)}
                >
                    <img
                        src={getImageUrl(previewImageUrl)}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setPreviewImageUrl(null)}
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}
        </Layout>
    );
}
