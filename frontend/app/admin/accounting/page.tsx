// frontend/app/admin/accounting/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/common/Layout';
import api from '../../../lib/axios';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    Search, 
    Coins, 
    Calendar, 
    FileText, 
    Loader2, 
    Printer,
    TrendingUp,
    TrendingDown,
    Scale,
    Wallet,
    Eye,
    X,
    ExternalLink,
    ShoppingBag,
    Wrench,
    Layers,
    Calculator,
    CheckCircle2,
    AlertCircle,
    Clock,
    Plus,
    Upload,
    Building2,
    ArrowRight,
    Percent,
    DollarSign,
    Landmark,
    Scissors,
    Package
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '');

export default function AccountingPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // Sub-modules navigation
    const [activeSection, setActiveSection] = useState<
        'BALANCE_RESULTADOS' | 'LIBRO_INGRESOS' | 'COMPRAS_SERVICIOS' | 'COSTOS_UNITARIOS' | 'OBLIGACIONES_TRIBUTARIAS'
    >('BALANCE_RESULTADOS');

    // Period filter for Balance, Taxes & Executive Summary
    const [periodMode, setPeriodMode] = useState<'MES' | 'SEMESTRE' | 'ANIO' | 'HISTORICO'>('MES');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
    const [selectedSemester, setSelectedSemester] = useState<1 | 2>(new Date().getMonth() < 6 ? 1 : 2);

    // Core data
    const [paidLetras, setPaidLetras] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [costSummary, setCostSummary] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Libro de Ingresos filters
    const [searchTerm, setSearchTerm] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'DIRECT_ONLY' | 'WITH_CREDIT_NOTE' | 'LETRAS_ONLY'>('ALL');
    const [selectedSaleDetails, setSelectedSaleDetails] = useState<any | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    // Compras y Servicios filters
    const [purchaseSearch, setPurchaseSearch] = useState('');
    const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<'ALL' | 'PURCHASE' | 'SERVICE' | 'EXPENSE'>('ALL');
    const [purchasePaymentFilter, setPurchasePaymentFilter] = useState<'ALL' | 'PENDIENTE' | 'LETRAS' | 'PAGADO'>('ALL');

    // Modal for configuring Purchase Payment Plan (Contado / Crédito / Letras)
    const [selectedPurchaseForPlan, setSelectedPurchaseForPlan] = useState<any | null>(null);
    const [planCondition, setPlanCondition] = useState<'CONTADO' | 'CREDITO' | 'LETRAS'>('CONTADO');
    const [planTaxType, setPlanTaxType] = useState<'CON_IGV' | 'SIN_IGV'>('CON_IGV');
    const [planMermaPercent, setPlanMermaPercent] = useState<string>('0');
    const [planPaymentMethod, setPlanPaymentMethod] = useState<string>('TRANSFERENCIA');
    const [planOperationNumber, setPlanOperationNumber] = useState<string>('');
    const [planPaymentDate, setPlanPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [planDueDate, setPlanDueDate] = useState<string>('');
    const [planVoucherUrl, setPlanVoucherUrl] = useState<string>('');
    const [planNotes, setPlanNotes] = useState<string>('');
    const [numInstallments, setNumInstallments] = useState<number>(3);
    const [installmentsList, setInstallmentsList] = useState<any[]>([]);
    const [isSavingPlan, setIsSavingPlan] = useState<boolean>(false);
    const [isUploadingVoucher, setIsUploadingVoucher] = useState<boolean>(false);

    // Modal for registering a new Accounting Expense / Tax Operation
    const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
    const [newExpenseType, setNewExpenseType] = useState<'EXPENSE' | 'SERVICE' | 'PURCHASE'>('EXPENSE');
    const [newExpenseInvoice, setNewExpenseInvoice] = useState('');
    const [newExpenseSupplierId, setNewExpenseSupplierId] = useState('');
    const [newExpenseOp, setNewExpenseOp] = useState('');
    const [newExpenseConcept, setNewExpenseConcept] = useState('');
    const [newExpenseCategory, setNewExpenseCategory] = useState('Gasto Operativo');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');
    const [newExpenseNotes, setNewExpenseNotes] = useState('');
    const [isCreatingExpense, setIsCreatingExpense] = useState(false);

    // Costos Unitarios states
    const [costSearch, setCostSearch] = useState('');
    const [selectedOpCostDetails, setSelectedOpCostDetails] = useState<any | null>(null);
    // Quick Unit Cost Simulator
    const [simTelaCost, setSimTelaCost] = useState<string>('22');
    const [simAviosCost, setSimAviosCost] = useState<string>('4.5');
    const [simConfeccionCost, setSimConfeccionCost] = useState<string>('12');
    const [simLavanderiaCost, setSimLavanderiaCost] = useState<string>('6.5');
    const [simMermaPercent, setSimMermaPercent] = useState<string>('3');
    const [simTargetMargin, setSimTargetMargin] = useState<string>('35');

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${SERVER_URL}${url}`;
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user && user.role !== 'ADMIN' && user.role !== 'CONTABILIDAD') {
            router.push('/');
            toast.error('Acceso restringido: Módulo contable');
            return;
        }
        fetchAllAccountingData();
    }, [user, authLoading]);

    const fetchAllAccountingData = async () => {
        setIsLoading(true);
        try {
            const [letrasRes, salesRes, purchasesRes, costRes, suppliersRes] = await Promise.all([
                api.get('/sales/letras').catch(() => ({ data: [] })),
                api.get('/sales').catch(() => ({ data: [] })),
                api.get('/purchases').catch(() => ({ data: { data: [] } })),
                api.get('/purchases/cost-summary').catch(() => ({ data: { data: [] } })),
                api.get('/suppliers').catch(() => ({ data: { data: [] } })),
            ]);

            const paidLetrasOnly = (letrasRes.data || []).filter((l: any) => l.status === 'PAGADO');
            setPaidLetras(paidLetrasOnly);
            setSales(salesRes.data || []);

            const purList = Array.isArray(purchasesRes.data?.data)
                ? purchasesRes.data.data
                : Array.isArray(purchasesRes.data)
                ? purchasesRes.data
                : [];
            setPurchases(purList);

            const costList = Array.isArray(costRes.data?.data)
                ? costRes.data.data
                : Array.isArray(costRes.data)
                ? costRes.data
                : [];
            setCostSummary(costList);

            const supList = Array.isArray(suppliersRes.data?.data)
                ? suppliersRes.data.data
                : Array.isArray(suppliersRes.data)
                ? suppliersRes.data
                : [];
            setSuppliers(supList);
        } catch (error) {
            console.error('Error fetching accounting data:', error);
            toast.error('Error al cargar datos de Contabilidad y Costos');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleVoucherUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setIsUploadingVoucher(true);
        try {
            const resp = await api.post('/uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setPlanVoucherUrl(resp.data.url);
            toast.success('Comprobante subido correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al subir el comprobante');
        } finally {
            setIsUploadingVoucher(false);
        }
    };

    // Helper to check if a date falls inside the selected period (MES, SEMESTRE, ANIO, HISTORICO)
    const isDateInPeriod = (dateStr: string | Date) => {
        if (!dateStr) return false;
        if (periodMode === 'HISTORICO') return true;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;
        const y = d.getFullYear();
        const m = d.getMonth() + 1; // 1-12

        if (y !== selectedYear) return false;
        if (periodMode === 'ANIO') return true;
        if (periodMode === 'MES') return m === selectedMonth;
        if (periodMode === 'SEMESTRE') {
            return selectedSemester === 1 ? m >= 1 && m <= 6 : m >= 7 && m <= 12;
        }
        return true;
    };

    // 1. Unified Income Ledger (Letras Pagadas + Pagos Directos Conciliados)
    const unifiedIncomes = useMemo(() => {
        const list: any[] = [];

        // Map paid Letras grouped by LetraGroup
        const letraGroupsMap = new Map<string, any[]>();
        paidLetras.forEach(l => {
            const groupId = l.group?.id;
            if (groupId) {
                if (!letraGroupsMap.has(groupId)) {
                    letraGroupsMap.set(groupId, []);
                }
                letraGroupsMap.get(groupId)!.push(l);
            }
        });

        letraGroupsMap.forEach((groupLetras, groupId) => {
            const totalAmount = groupLetras.reduce((sum, l) => sum + l.amount, 0);
            const latestDate = groupLetras.reduce((latest: string, l: any) => {
                return new Date(l.paymentDate) > new Date(latest) ? l.paymentDate : latest;
            }, groupLetras[0].paymentDate);
            
            const groupInfo = groupLetras[0].group;
            
            list.push({
                id: `LETRAGROUP-${groupId}`,
                type: 'CRONOGRAMA LETRAS',
                paymentDate: latestDate,
                clientName: groupInfo?.client?.name || 'Cliente',
                concept: `INGRESOS DE LETRAS`,
                voucher: 'Múltiples',
                amount: totalAmount,
                netCollectedAmount: totalAmount,
                creditNoteAmount: 0,
                grossAmount: totalAmount,
                creditNoteNumbers: [],
                hasCreditNote: false,
                hasDevolutionAdjustment: false,
                invoices: groupInfo?.sales?.map((s: any) => s.invoiceNumber || 'S/N').join(', ') || '-',
                notes: `${groupLetras.length} letras cobradas`,
                isGroup: true,
                saleDetails: {
                    ...groupInfo,
                    invoiceNumber: groupInfo?.sales?.map((s: any) => s.invoiceNumber || 'S/N').join(', ') || 'Varias Facturas',
                    totalAmount: totalAmount,
                    isLetraGroup: true
                },
                paymentsList: groupLetras.map(l => ({
                    ...l,
                    method: 'LETRA',
                    evidenceUrl: l.voucherUrl,
                    notes: l.paymentNotes,
                }))
            });
        });

        // Map direct conciliated payments grouped by SALE
        sales.forEach(sale => {
            if (!sale.payments) return;
            const conciliatedPayments = sale.payments.filter((p: any) => p.status === 'CONCILIADO' && p.method !== 'LETRAS');
            
            if (conciliatedPayments.length > 0) {
                const directPayments = conciliatedPayments.filter((p: any) => p.method !== 'NOTA_CREDITO');
                const creditNotePayments = conciliatedPayments.filter((p: any) => p.method === 'NOTA_CREDITO');

                const netCollectedAmount = Math.round(
                    directPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) * 100
                ) / 100;
                const creditNoteAmount = Math.round(
                    creditNotePayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) * 100
                ) / 100;
                const grossAmount = Math.round((netCollectedAmount + creditNoteAmount) * 100) / 100;
                const creditNoteNumbers = creditNotePayments.map((p: any) => p.creditNoteNumber).filter(Boolean);
                const hasCreditNote = creditNoteAmount > 0.009;
                const hasDevolutionAdjustment = directPayments.some((p: any) => Number(p.amount) < 0);

                const latestDate = conciliatedPayments.reduce((latest: string, p: any) => {
                    return new Date(p.paymentDate) > new Date(latest) ? p.paymentDate : latest;
                }, conciliatedPayments[0].paymentDate);

                list.push({
                    id: `SALE-${sale.id}`,
                    type: 'VENTA DIRECTA',
                    paymentDate: latestDate,
                    clientName: sale.client?.name || 'Cliente',
                    concept: hasCreditNote ? `VENTA CON NOTA DE CRÉDITO` : `INGRESOS DE VENTA`,
                    voucher: creditNoteNumbers.length > 0 ? `NC: ${creditNoteNumbers.join(', ')}` : 'Múltiples',
                    amount: netCollectedAmount,
                    netCollectedAmount,
                    creditNoteAmount,
                    grossAmount,
                    creditNoteNumbers,
                    hasCreditNote,
                    hasDevolutionAdjustment,
                    invoices: sale.invoiceNumber || 'S/N',
                    notes: hasCreditNote
                        ? `${directPayments.length} abono(s) + ${creditNotePayments.length} NC (S/. ${creditNoteAmount.toFixed(2)})`
                        : `${conciliatedPayments.length} abonos conciliados`,
                    isGroup: true,
                    saleDetails: sale,
                    paymentsList: conciliatedPayments
                });
            }
        });

        return list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    }, [paidLetras, sales]);

    const filteredIncomes = useMemo(() => {
        return unifiedIncomes.filter(inc => {
            const clientName = inc.clientName?.toLowerCase() || '';
            const invoiceNum = inc.invoices?.toLowerCase() || '';
            const matchesSearch = clientName.includes(searchTerm.toLowerCase()) || invoiceNum.includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (typeFilter === 'WITH_CREDIT_NOTE' && !inc.hasCreditNote) return false;
            if (typeFilter === 'DIRECT_ONLY' && (inc.type !== 'VENTA DIRECTA' || inc.hasCreditNote)) return false;
            if (typeFilter === 'LETRAS_ONLY' && inc.type !== 'CRONOGRAMA LETRAS') return false;

            if (!monthFilter) return true;
            const paymentMonth = new Date(inc.paymentDate).toISOString().substring(0, 7);
            return paymentMonth === monthFilter;
        });
    }, [unifiedIncomes, searchTerm, monthFilter, typeFilter]);

    // Financial calculations for Libro de Ingresos
    const metrics = useMemo(() => {
        let totalIncome = 0;
        let totalLetrasIncome = 0;
        let totalDirectIncome = 0;
        let totalCreditNotes = 0;
        let creditNotesCount = 0;

        filteredIncomes.forEach(inc => {
            totalIncome += inc.amount;
            totalCreditNotes += (inc.creditNoteAmount || 0);
            if (inc.hasCreditNote) {
                creditNotesCount += 1;
            }
            if (inc.type === 'CRONOGRAMA LETRAS' || inc.type === 'LETRA') {
                totalLetrasIncome += inc.amount;
            } else {
                totalDirectIncome += inc.amount;
            }
        });

        const count = filteredIncomes.length;
        let lastDeposit = 'N/A';
        if (filteredIncomes.length > 0) {
            const dates = filteredIncomes.map(inc => new Date(inc.paymentDate).getTime());
            const maxDate = new Date(Math.max(...dates));
            lastDeposit = maxDate.toLocaleDateString();
        }

        return { totalIncome, totalLetrasIncome, totalDirectIncome, totalCreditNotes, creditNotesCount, count, lastDeposit };
    }, [filteredIncomes]);

    // 2. Period-filtered Executive Balance, Profits, Costs & Taxes
    const periodBalance = useMemo(() => {
        // Incomes in period
        const periodIncomes = unifiedIncomes.filter(inc => isDateInPeriod(inc.paymentDate));
        const netCollectedInPeriod = Math.round(periodIncomes.reduce((acc, inc) => acc + (Number(inc.amount) || 0), 0) * 100) / 100;
        const letrasCollectedInPeriod = Math.round(
            periodIncomes.filter(inc => inc.type === 'CRONOGRAMA LETRAS').reduce((acc, inc) => acc + (Number(inc.amount) || 0), 0) * 100
        ) / 100;
        const directCollectedInPeriod = Math.round((netCollectedInPeriod - letrasCollectedInPeriod) * 100) / 100;
        const creditNotesInPeriod = Math.round(periodIncomes.reduce((acc, inc) => acc + (Number(inc.creditNoteAmount) || 0), 0) * 100) / 100;

        // All active sales billed in period (for tax IGV & devengado)
        const periodBilledSales = sales.filter(s => s.status !== 'ANULADO' && isDateInPeriod(s.createdAt));
        const totalBilledSales = Math.round(periodBilledSales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0) * 100) / 100;

        // Purchases, Services & Expenses in period
        const periodPurchases = purchases.filter(p => p.status !== 'RECHAZADO' && isDateInPeriod(p.createdAt));

        let materialsTotal = 0;
        let servicesTotal = 0;
        let expensesTotal = 0;
        let totalCommittedExpenses = 0;
        let totalPaidExpenses = 0;
        let totalPendingToPay = 0;
        let totalPurchasesWithIgv = 0;
        let financedInLetrasCount = 0;
        let pendingInstallmentsCount = 0;

        periodPurchases.forEach(p => {
            const amt = Number(p.totalAmount) || 0;
            totalCommittedExpenses += amt;

            if (p.type === 'SERVICE') {
                servicesTotal += amt;
            } else if (p.type === 'EXPENSE' || p.type === 'TAX') {
                expensesTotal += amt;
            } else {
                materialsTotal += amt;
            }

            const fin = p.financeInfo || {};
            const paid = Number(fin.paidAmount) || 0;
            const pending = fin.isConfigured ? (Number(fin.pendingAmount) || 0) : amt;

            totalPaidExpenses += paid;
            totalPendingToPay += pending;

            if (fin.taxType !== 'SIN_IGV') {
                totalPurchasesWithIgv += amt;
            }

            if (fin.paymentCondition === 'LETRAS') {
                financedInLetrasCount += 1;
                const insts = Array.isArray(fin.installments) ? fin.installments : [];
                pendingInstallmentsCount += insts.filter((i: any) => i.status !== 'PAGADO').length;
            }
        });

        // Global pending debt across all purchases (regardless of period, for treasury awareness)
        const globalPendingToPay = Math.round(
            purchases
                .filter(p => p.status !== 'RECHAZADO')
                .reduce((acc, p) => {
                    const fin = p.financeInfo || {};
                    return acc + (fin.isConfigured ? (Number(fin.pendingAmount) || 0) : (Number(p.totalAmount) || 0));
                }, 0) * 100
        ) / 100;

        // Net Profit calculations:
        // 1. Real Cash Net Profit (Flujo de Caja Neto Real = Dinero Cobrado - Dinero Pagado)
        const realCashNetProfit = Math.round((netCollectedInPeriod - totalPaidExpenses) * 100) / 100;
        // 2. Operating Accounting Net Profit (Utilidad Neta Contable = Ingresos Netos Cobrados - Total Compras/Costos del período)
        const operatingNetProfit = Math.round((netCollectedInPeriod - totalCommittedExpenses) * 100) / 100;
        const profitMarginPercent = netCollectedInPeriod > 0
            ? Math.round((operatingNetProfit / netCollectedInPeriod) * 1000) / 10
            : 0;

        // Tax calculations (18% IGV in Peru: Total = Base * 1.18 -> IGV = Total - Total / 1.18)
        const igvSalesDebit = Math.round((netCollectedInPeriod - netCollectedInPeriod / 1.18) * 100) / 100;
        const igvPurchasesCredit = Math.round((totalPurchasesWithIgv - totalPurchasesWithIgv / 1.18) * 100) / 100;
        const netIgvToPay = Math.round((igvSalesDebit - igvPurchasesCredit) * 100) / 100;
        const netSalesBase = Math.round((netCollectedInPeriod / 1.18) * 100) / 100;
        const estimatedIncomeTax = Math.round(netSalesBase * 0.015 * 100) / 100; // 1.5% Régimen MYPE / General pago a cuenta

        // Monthly breakdown for the selected year (for projections table)
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const monthlyBreakdown = monthNames.map((mName, idx) => {
            const mNum = idx + 1;
            const mIncomes = unifiedIncomes
                .filter(inc => {
                    const d = new Date(inc.paymentDate);
                    return d.getFullYear() === selectedYear && d.getMonth() + 1 === mNum;
                })
                .reduce((acc, inc) => acc + (Number(inc.amount) || 0), 0);

            const mPurchases = purchases
                .filter(p => {
                    if (p.status === 'RECHAZADO') return false;
                    const d = new Date(p.createdAt);
                    return d.getFullYear() === selectedYear && d.getMonth() + 1 === mNum;
                });

            const mTotalExpense = mPurchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
            const mPaidExpense = mPurchases.reduce((acc, p) => acc + (Number(p.financeInfo?.paidAmount) || 0), 0);
            const mPendingExpense = mPurchases.reduce((acc, p) => {
                const fin = p.financeInfo || {};
                return acc + (fin.isConfigured ? (Number(fin.pendingAmount) || 0) : (Number(p.totalAmount) || 0));
            }, 0);

            return {
                monthNumber: mNum,
                monthName: mName,
                incomes: Math.round(mIncomes * 100) / 100,
                totalExpense: Math.round(mTotalExpense * 100) / 100,
                paidExpense: Math.round(mPaidExpense * 100) / 100,
                pendingExpense: Math.round(mPendingExpense * 100) / 100,
                netProfit: Math.round((mIncomes - mTotalExpense) * 100) / 100,
            };
        });

        return {
            netCollectedInPeriod,
            letrasCollectedInPeriod,
            directCollectedInPeriod,
            creditNotesInPeriod,
            totalBilledSales,
            materialsTotal: Math.round(materialsTotal * 100) / 100,
            servicesTotal: Math.round(servicesTotal * 100) / 100,
            expensesTotal: Math.round(expensesTotal * 100) / 100,
            totalCommittedExpenses: Math.round(totalCommittedExpenses * 100) / 100,
            totalPaidExpenses: Math.round(totalPaidExpenses * 100) / 100,
            totalPendingToPay: Math.round(totalPendingToPay * 100) / 100,
            globalPendingToPay,
            realCashNetProfit,
            operatingNetProfit,
            profitMarginPercent,
            financedInLetrasCount,
            pendingInstallmentsCount,
            igvSalesDebit,
            igvPurchasesCredit,
            netIgvToPay,
            netSalesBase,
            estimatedIncomeTax,
            monthlyBreakdown,
            periodPurchases,
            periodIncomes,
        };
    }, [unifiedIncomes, sales, purchases, periodMode, selectedYear, selectedMonth, selectedSemester]);

    // 3. Filtered Purchases & Services for the Compras y Servicios tab
    const filteredPurchasesList = useMemo(() => {
        return purchases.filter(p => {
            if (purchaseTypeFilter !== 'ALL' && p.type !== purchaseTypeFilter) return false;
            const fin = p.financeInfo || {};
            if (purchasePaymentFilter === 'PENDIENTE' && fin.paymentStatus === 'PAGADO') return false;
            if (purchasePaymentFilter === 'LETRAS' && fin.paymentCondition !== 'LETRAS') return false;
            if (purchasePaymentFilter === 'PAGADO' && fin.paymentStatus !== 'PAGADO') return false;

            if (!purchaseSearch.trim()) return true;
            const q = purchaseSearch.toLowerCase();
            const supName = p.supplier?.name?.toLowerCase() || '';
            const inv = p.invoiceNumber?.toLowerCase() || '';
            const op = p.op?.toLowerCase() || '';
            const itemsMatch = (p.items || []).some((it: any) => it.name?.toLowerCase().includes(q));
            return supName.includes(q) || inv.includes(q) || op.includes(q) || itemsMatch;
        });
    }, [purchases, purchaseTypeFilter, purchasePaymentFilter, purchaseSearch]);

    // 4. Filtered Cost Summary
    const filteredCostSummary = useMemo(() => {
        if (!costSearch.trim()) return costSummary;
        const q = costSearch.toLowerCase();
        return costSummary.filter(c =>
            c.op?.toLowerCase().includes(q) ||
            c.productName?.toLowerCase().includes(q) ||
            c.sku?.toLowerCase().includes(q)
        );
    }, [costSummary, costSearch]);

    // Open payment plan modal for a Purchase / Service
    const handleOpenPlanModal = (purchase: any) => {
        const fin = purchase.financeInfo || {};
        setSelectedPurchaseForPlan(purchase);
        setPlanCondition(fin.paymentCondition === 'LETRAS' ? 'LETRAS' : fin.paymentCondition === 'CREDITO' ? 'CREDITO' : 'CONTADO');
        setPlanTaxType(fin.taxType || 'CON_IGV');
        setPlanMermaPercent(String(fin.mermaPercent || 0));
        setPlanPaymentMethod(fin.paymentMethod || 'TRANSFERENCIA');
        setPlanOperationNumber(fin.operationNumber || '');
        setPlanPaymentDate(fin.paymentDate || new Date().toISOString().split('T')[0]);
        setPlanDueDate(fin.dueDate || '');
        setPlanVoucherUrl(fin.voucherUrl || '');
        setPlanNotes(fin.accountingNotes || '');

        if (Array.isArray(fin.installments) && fin.installments.length > 0) {
            setNumInstallments(fin.installments.length);
            setInstallmentsList(fin.installments);
        } else {
            generateEqualInstallments(3, purchase.totalAmount);
        }
    };

    const generateEqualInstallments = (count: number, totalAmt: number) => {
        const safeCount = Math.max(1, Math.min(24, count));
        setNumInstallments(safeCount);
        const baseAmt = Math.floor((totalAmt / safeCount) * 100) / 100;
        const remainder = Math.round((totalAmt - baseAmt * safeCount) * 100) / 100;
        const now = new Date();

        const generated = Array.from({ length: safeCount }, (_, idx) => {
            const due = new Date(now);
            due.setDate(due.getDate() + 30 * (idx + 1));
            return {
                id: `L-${idx + 1}`,
                number: idx + 1,
                uniqueCode: `L-${String(idx + 1).padStart(3, '0')}`,
                amount: idx === safeCount - 1 ? Math.round((baseAmt + remainder) * 100) / 100 : baseAmt,
                dueDate: due.toISOString().split('T')[0],
                status: 'PENDIENTE',
                paymentDate: null,
                paymentMethod: 'TRANSFERENCIA',
                operationNumber: '',
                voucherUrl: '',
                notes: '',
            };
        });
        setInstallmentsList(generated);
    };

    const handleSaveFinancePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPurchaseForPlan) return;

        if (planCondition === 'LETRAS') {
            const sumInst = installmentsList.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
            if (Math.abs(sumInst - selectedPurchaseForPlan.totalAmount) > 0.1) {
                toast.error(`La suma de las letras (S/. ${sumInst.toFixed(2)}) debe coincidir con el monto total de la compra (S/. ${selectedPurchaseForPlan.totalAmount.toFixed(2)})`);
                return;
            }
        }

        setIsSavingPlan(true);
        try {
            const resp = await api.patch(`/purchases/${selectedPurchaseForPlan.id}/finance-plan`, {
                paymentCondition: planCondition,
                taxType: planTaxType,
                mermaPercent: Number(planMermaPercent) || 0,
                paymentMethod: planPaymentMethod,
                operationNumber: planOperationNumber,
                paymentDate: planPaymentDate,
                dueDate: planDueDate,
                voucherUrl: planVoucherUrl,
                accountingNotes: planNotes,
                installments: planCondition === 'LETRAS' ? installmentsList : [],
            });

            if (resp.data?.success === false) {
                throw new Error(resp.data.message);
            }

            toast.success(
                planCondition === 'LETRAS'
                    ? `Compra programada en ${installmentsList.length} letras. Ya está disponible en Finanzas y Tesorería para su pago.`
                    : 'Configuración contable guardada correctamente.'
            );
            setSelectedPurchaseForPlan(null);
            await fetchAllAccountingData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al guardar la configuración financiera');
        } finally {
            setIsSavingPlan(false);
        }
    };

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(newExpenseAmount);
        if (!newExpenseConcept.trim() || isNaN(amt) || amt <= 0) {
            toast.error('Complete el concepto y un monto válido mayor a cero');
            return;
        }

        setIsCreatingExpense(true);
        try {
            const resp = await api.post('/purchases', {
                type: newExpenseType,
                invoiceNumber: newExpenseInvoice.trim() || `DOC-${Date.now().toString().slice(-5)}`,
                op: newExpenseOp.trim() || null,
                supplierId: newExpenseSupplierId || null,
                notes: newExpenseNotes.trim() || null,
                items: [
                    {
                        name: newExpenseConcept.trim(),
                        description: newExpenseNotes.trim() || newExpenseCategory,
                        category: newExpenseCategory,
                        unit: 'Servicio',
                        quantity: 1,
                        price: amt,
                    }
                ]
            });

            if (resp.data?.success === false) {
                throw new Error(resp.data.message);
            }

            toast.success('Operación registrada en Contabilidad correctamente');
            setShowNewExpenseModal(false);
            setNewExpenseConcept('');
            setNewExpenseInvoice('');
            setNewExpenseAmount('');
            setNewExpenseNotes('');
            setNewExpenseOp('');
            await fetchAllAccountingData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al registrar operación');
        } finally {
            setIsCreatingExpense(false);
        }
    };

    const cardClass = "bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl print:shadow-none print:border-none print:p-0";

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
            <div className="max-w-7xl mx-auto space-y-8 pb-20 print:pb-0 print:space-y-4">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6 print:hidden">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[9px] font-black uppercase tracking-widest">
                                Gestión Financiera e Industrial Textil
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5 mt-1">
                            <Scale className="w-8 h-8 text-indigo-600 shrink-0" />
                            Contabilidad y Costos
                        </h1>
                        <p className="text-slate-500 font-medium text-sm sm:text-base">
                            Registra operaciones contables, compras, servicios, obligaciones tributarias, costos unitarios por OP/mermas y ganancia neta real.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/admin/finance"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl transition active:scale-95 shadow-md flex items-center gap-2"
                        >
                            <Wallet className="w-4 h-4" />
                            Ir a Finanzas y Tesorería (Pagar Letras)
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                            onClick={handlePrint}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl transition active:scale-95 shadow-md flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir
                        </button>
                    </div>
                </div>

                {/* Sub-modules Navigation Tabs */}
                <div className="flex flex-wrap border-b border-slate-200 gap-2 sm:gap-6 print:hidden">
                    <button
                        onClick={() => setActiveSection('BALANCE_RESULTADOS')}
                        className={`pb-4 px-2 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                            activeSection === 'BALANCE_RESULTADOS'
                                ? 'border-indigo-600 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        1. Balance y Ganancia Neta
                    </button>
                    <button
                        onClick={() => setActiveSection('LIBRO_INGRESOS')}
                        className={`pb-4 px-2 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                            activeSection === 'LIBRO_INGRESOS'
                                ? 'border-emerald-600 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <Coins className="w-4 h-4 text-emerald-600" />
                        2. Libro de Ingresos ({unifiedIncomes.length})
                    </button>
                    <button
                        onClick={() => setActiveSection('COMPRAS_SERVICIOS')}
                        className={`pb-4 px-2 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                            activeSection === 'COMPRAS_SERVICIOS'
                                ? 'border-amber-600 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <ShoppingBag className="w-4 h-4 text-amber-600" />
                        3. Compras y Servicios ({purchases.length})
                    </button>
                    <button
                        onClick={() => setActiveSection('COSTOS_UNITARIOS')}
                        className={`pb-4 px-2 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                            activeSection === 'COSTOS_UNITARIOS'
                                ? 'border-blue-600 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <Scissors className="w-4 h-4 text-blue-600" />
                        4. Costos Unitarios y Mermas
                    </button>
                    <button
                        onClick={() => setActiveSection('OBLIGACIONES_TRIBUTARIAS')}
                        className={`pb-4 px-2 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                            activeSection === 'OBLIGACIONES_TRIBUTARIAS'
                                ? 'border-violet-600 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <Landmark className="w-4 h-4 text-violet-600" />
                        5. Obligaciones Tributarias (SUNAT)
                    </button>
                </div>

                {/* =========================================================================================
                    SUB-MÓDULO 1: BALANCE GENERAL, GASTOS Y GANANCIA NETA REAL (MES / SEMESTRE / AÑO)
                ========================================================================================= */}
                {activeSection === 'BALANCE_RESULTADOS' && (
                    <div className="space-y-8">
                        {/* Period Filter Bar */}
                        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">
                                    Período de Análisis:
                                </span>
                                {(['MES', 'SEMESTRE', 'ANIO', 'HISTORICO'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setPeriodMode(mode)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                                            periodMode === mode
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {mode === 'MES' ? 'Por Mes' : mode === 'SEMESTRE' ? 'Por Semestre' : mode === 'ANIO' ? 'Por Año' : 'Histórico Total'}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {periodMode !== 'HISTORICO' && (
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-800 outline-none"
                                    >
                                        {[2024, 2025, 2026, 2027].map(y => (
                                            <option key={y} value={y}>Año {y}</option>
                                        ))}
                                    </select>
                                )}
                                {periodMode === 'MES' && (
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className="bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2 text-xs font-black text-indigo-900 outline-none"
                                    >
                                        {[
                                            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                                        ].map((m, i) => (
                                            <option key={i + 1} value={i + 1}>{m}</option>
                                        ))}
                                    </select>
                                )}
                                {periodMode === 'SEMESTRE' && (
                                    <select
                                        value={selectedSemester}
                                        onChange={(e) => setSelectedSemester(Number(e.target.value) as 1 | 2)}
                                        className="bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2 text-xs font-black text-indigo-900 outline-none"
                                    >
                                        <option value={1}>1er Semestre (Ene - Jun)</option>
                                        <option value={2}>2do Semestre (Jul - Dic)</option>
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Top 5 Financial KPIs: Cuánto Ingresa, Cuánto Gasto, Cuánto Pagamos, Cuánto Debo Pagar, Cuánto Gano Neto */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                            <div className="bg-emerald-950 text-white rounded-[2.2rem] p-6 shadow-xl relative overflow-hidden">
                                <div className="text-[10px] text-emerald-300 font-black uppercase tracking-wider">1. Cuánto Ingresa (Neto)</div>
                                <div className="text-2xl font-black mt-2">S/. {periodBalance.netCollectedInPeriod.toFixed(2)}</div>
                                <div className="text-[9px] text-emerald-400 font-bold uppercase mt-1">
                                    Cobrado real (sin Notas de Crédito)
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-[2.2rem] p-6 shadow-md">
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">2. Cuánto Gastamos (Total)</div>
                                <div className="text-2xl font-black text-slate-900 mt-2">S/. {periodBalance.totalCommittedExpenses.toFixed(2)}</div>
                                <div className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                                    Compras: S/. {periodBalance.materialsTotal.toFixed(0)} | Serv: S/. {periodBalance.servicesTotal.toFixed(0)}
                                </div>
                            </div>

                            <div className="bg-white border border-amber-200 rounded-[2.2rem] p-6 shadow-md">
                                <div className="text-[10px] text-amber-600 font-black uppercase tracking-wider">3. Gastos Ya Pagados</div>
                                <div className="text-2xl font-black text-amber-600 mt-2">S/. {periodBalance.totalPaidExpenses.toFixed(2)}</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                                    Desembolsado en contado y letras
                                </div>
                            </div>

                            <div className="bg-white border border-rose-200 rounded-[2.2rem] p-6 shadow-md">
                                <div className="text-[10px] text-rose-500 font-black uppercase tracking-wider">4. Cuánto Debemos Pagar</div>
                                <div className="text-2xl font-black text-rose-600 mt-2">S/. {periodBalance.totalPendingToPay.toFixed(2)}</div>
                                <div className="text-[9px] text-rose-400 font-bold uppercase mt-1">
                                    Deuda total acumulada: S/. {periodBalance.globalPendingToPay.toFixed(2)}
                                </div>
                            </div>

                            <div className={`rounded-[2.2rem] p-6 shadow-xl text-white ${
                                periodBalance.operatingNetProfit >= 0 ? 'bg-slate-950' : 'bg-rose-950'
                            }`}>
                                <div className="text-[10px] text-indigo-300 font-black uppercase tracking-wider">5. Ganancia Neta Real</div>
                                <div className={`text-2xl font-black mt-2 ${
                                    periodBalance.operatingNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-300'
                                }`}>
                                    S/. {periodBalance.operatingNetProfit.toFixed(2)}
                                </div>
                                <div className="text-[9px] text-slate-300 font-bold uppercase mt-1">
                                    Caja Real en Mano: S/. {periodBalance.realCashNetProfit.toFixed(2)} ({periodBalance.profitMarginPercent}%)
                                </div>
                            </div>
                        </div>

                        {/* Breakdown Cards: Ingresos vs Egresos */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Desglose de Ingresos */}
                            <div className="bg-white rounded-[2.2rem] border border-slate-100 p-7 shadow-lg space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 uppercase">Desglose de Ingresos del Período</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Todo el dinero real que ingresó a la empresa</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveSection('LIBRO_INGRESOS')}
                                        className="text-[10px] font-black text-indigo-600 hover:underline uppercase flex items-center gap-1"
                                    >
                                        Ver Libro de Ingresos <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="space-y-3 text-xs font-bold">
                                    <div className="flex justify-between items-center p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                                        <span className="text-slate-700 uppercase">Cobros Directos de Ventas (Efectivo / Banco / Yape)</span>
                                        <span className="font-black text-emerald-700 text-sm">S/. {periodBalance.directCollectedInPeriod.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                                        <span className="text-slate-700 uppercase">Cobros de Letras de Clientes Conciliadas</span>
                                        <span className="font-black text-indigo-700 text-sm">S/. {periodBalance.letrasCollectedInPeriod.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3.5 bg-violet-50/60 rounded-2xl border border-violet-100">
                                        <span className="text-violet-700 uppercase">Descuentos / Devoluciones con Nota de Crédito (No suma a caja)</span>
                                        <span className="font-black text-violet-700 text-sm">S/. {periodBalance.creditNotesInPeriod.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-2xl">
                                        <span className="font-black uppercase">Total Dinero Neto Ingresado</span>
                                        <span className="font-black text-emerald-400 text-base">S/. {periodBalance.netCollectedInPeriod.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Desglose de Compras, Servicios y Obligaciones */}
                            <div className="bg-white rounded-[2.2rem] border border-slate-100 p-7 shadow-lg space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 uppercase">Desglose de Compras, Costos y Deudas</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Telas, avíos, servicios de confección y letras por pagar</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveSection('COMPRAS_SERVICIOS')}
                                        className="text-[10px] font-black text-amber-600 hover:underline uppercase flex items-center gap-1"
                                    >
                                        Gestionar Compras <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="space-y-3 text-xs font-bold">
                                    <div className="flex justify-between items-center p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100">
                                        <span className="text-slate-700 uppercase">Compra de Telas, Materiales, Avíos e Insumos</span>
                                        <span className="font-black text-blue-700 text-sm">S/. {periodBalance.materialsTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100">
                                        <span className="text-slate-700 uppercase">Servicios Textiles (Confección, Corte, Lavandería, Bordado)</span>
                                        <span className="font-black text-amber-700 text-sm">S/. {periodBalance.servicesTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100">
                                        <span className="text-rose-700 uppercase">
                                            Falta Pagar a Proveedores ({periodBalance.financedInLetrasCount} compras en letras • {periodBalance.pendingInstallmentsCount} letras pendientes)
                                        </span>
                                        <span className="font-black text-rose-600 text-sm">S/. {periodBalance.totalPendingToPay.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-2xl">
                                        <span className="font-black uppercase">Total Gastos y Costos del Período</span>
                                        <span className="font-black text-amber-400 text-base">S/. {periodBalance.totalCommittedExpenses.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Evolution & Projection Table for the Selected Year */}
                        <div className={cardClass}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase">
                                        Flujo Anual y Proyección Financiera ({selectedYear})
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                        Comparativo mes a mes de ingresos reales, gastos totales, pagos efectuados, deuda a proveedores y ganancia neta
                                    </p>
                                </div>
                            </div>
                            <div className="overflow-x-auto -mx-8">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="px-6 py-3.5">Mes ({selectedYear})</th>
                                            <th className="px-6 py-3.5 text-right">Ingresos Cobrados (Neto)</th>
                                            <th className="px-6 py-3.5 text-right">Total Compras y Costos</th>
                                            <th className="px-6 py-3.5 text-right">Ya Pagado a Proveedores</th>
                                            <th className="px-6 py-3.5 text-right">Deuda por Pagar</th>
                                            <th className="px-6 py-3.5 text-right">Ganancia Neta Real</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                        {periodBalance.monthlyBreakdown.map((m) => (
                                            <tr
                                                key={m.monthNumber}
                                                onClick={() => {
                                                    setPeriodMode('MES');
                                                    setSelectedMonth(m.monthNumber);
                                                }}
                                                className={`cursor-pointer transition hover:bg-indigo-50/40 ${
                                                    periodMode === 'MES' && selectedMonth === m.monthNumber ? 'bg-indigo-50/70 font-black' : ''
                                                }`}
                                            >
                                                <td className="px-6 py-3.5 uppercase font-black text-slate-900">
                                                    {m.monthName}
                                                </td>
                                                <td className="px-6 py-3.5 text-right text-emerald-600 font-black">
                                                    S/. {m.incomes.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-3.5 text-right text-slate-800">
                                                    S/. {m.totalExpense.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-3.5 text-right text-amber-600">
                                                    S/. {m.paidExpense.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-3.5 text-right text-rose-600">
                                                    S/. {m.pendingExpense.toFixed(2)}
                                                </td>
                                                <td className={`px-6 py-3.5 text-right font-black ${
                                                    m.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                                }`}>
                                                    S/. {m.netProfit.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================================================================
                    SUB-MÓDULO 2: LIBRO DE INGRESOS (VENTAS Y LETRAS CONCILIADAS + NOTAS DE CRÉDITO)
                ========================================================================================= */}
                {activeSection === 'LIBRO_INGRESOS' && (
                    <div className="space-y-8">
                        {/* Dashboard Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 print:grid-cols-5 print:gap-3">
                            <div className="bg-slate-950 text-white rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden">
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Neto Cobrado</div>
                                <div className="text-2xl font-black mt-2">S/. {metrics.totalIncome.toFixed(2)}</div>
                                <div className="text-[9px] text-indigo-400 font-bold uppercase mt-1">Dinero real cobrado (sin NC)</div>
                            </div>
                            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-md">
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Ingresos por Letras</div>
                                <div className="text-2xl font-black text-emerald-600 mt-2">S/. {metrics.totalLetrasIncome.toFixed(2)}</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Recaudado de letras reconciliadas</div>
                            </div>
                            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-md">
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Ventas Monto Neto</div>
                                <div className="text-2xl font-black text-indigo-600 mt-2">S/. {metrics.totalDirectIncome.toFixed(2)}</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Abonos directos cobrados</div>
                            </div>
                            <div
                                onClick={() => setTypeFilter(prev => prev === 'WITH_CREDIT_NOTE' ? 'ALL' : 'WITH_CREDIT_NOTE')}
                                className={`cursor-pointer transition rounded-[2.5rem] p-6 shadow-md border ${
                                    typeFilter === 'WITH_CREDIT_NOTE'
                                        ? 'bg-violet-900 text-white border-violet-700 ring-2 ring-violet-400'
                                        : 'bg-white border-violet-100 hover:border-violet-300'
                                }`}
                            >
                                <div className={`text-[10px] font-black uppercase tracking-wider ${typeFilter === 'WITH_CREDIT_NOTE' ? 'text-violet-200' : 'text-violet-600'}`}>
                                    Total Notas de Crédito
                                </div>
                                <div className={`text-2xl font-black mt-2 ${typeFilter === 'WITH_CREDIT_NOTE' ? 'text-white' : 'text-violet-700'}`}>
                                    S/. {metrics.totalCreditNotes.toFixed(2)}
                                </div>
                                <div className={`text-[9px] font-bold uppercase mt-1 ${typeFilter === 'WITH_CREDIT_NOTE' ? 'text-violet-300' : 'text-violet-400'}`}>
                                    {metrics.creditNotesCount} ventas con NC (Click filtrar)
                                </div>
                            </div>
                            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-md">
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Transacciones</div>
                                <div className="text-2xl font-black text-slate-800 mt-2">{metrics.count} Registros</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Última: {metrics.lastDeposit}</div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className={`${cardClass} p-5 flex flex-wrap items-center gap-4 print:hidden`}>
                            <div className="flex-1 min-w-[260px] relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filtrar por cliente o factura..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 font-bold text-slate-850 outline-none text-xs focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value as any)}
                                    className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 font-black text-slate-700 outline-none text-xs cursor-pointer uppercase"
                                >
                                    <option value="ALL">Todos los Ingresos</option>
                                    <option value="DIRECT_ONLY">Solo Ventas Directas (Sin NC)</option>
                                    <option value="WITH_CREDIT_NOTE">Ventas con Nota de Crédito</option>
                                    <option value="LETRAS_ONLY">Solo Cronograma de Letras</option>
                                </select>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <input
                                    type="month"
                                    value={monthFilter}
                                    onChange={(e) => setMonthFilter(e.target.value)}
                                    className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 font-bold text-slate-700 outline-none text-xs cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Ledger Sheet Table */}
                        <div className={cardClass}>
                            <div className="overflow-x-auto -mx-8 print:mx-0">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="px-8 py-4">Fecha Pago</th>
                                            <th className="px-8 py-4">Cliente</th>
                                            <th className="px-8 py-4">Tipo / Concepto</th>
                                            <th className="px-8 py-4">Ref. Depósito / Comprobante</th>
                                            <th className="px-8 py-4 text-right">Monto Neto Cobrado</th>
                                            <th className="px-8 py-4">Documentos Relacionados</th>
                                            <th className="px-8 py-4 font-medium">Glosa / Notas</th>
                                            <th className="px-8 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                        {filteredIncomes.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-8 py-16 text-center text-slate-400 italic">No se registran movimientos reconciliados en este período.</td>
                                            </tr>
                                        ) : (
                                            filteredIncomes.map(inc => (
                                                <tr key={inc.id} className="hover:bg-slate-50/20 transition">
                                                    <td className="px-8 py-4 whitespace-nowrap">
                                                        {new Date(inc.paymentDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-8 py-4 uppercase font-black text-slate-900">
                                                        {inc.clientName}
                                                    </td>
                                                    <td className="px-8 py-4 uppercase whitespace-nowrap">
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-wider ${
                                                                inc.type === 'CRONOGRAMA LETRAS'
                                                                    ? 'bg-emerald-50 text-emerald-600'
                                                                    : inc.hasCreditNote
                                                                    ? 'bg-violet-100 text-violet-700'
                                                                    : 'bg-indigo-50 text-indigo-600'
                                                            }`}>
                                                                {inc.concept}
                                                            </span>
                                                            {inc.hasDevolutionAdjustment && (
                                                                <span className="px-2 py-0.5 rounded text-[7px] font-black tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                                                                    AJUSTADO POR DEVOLUCIÓN / ADELANTO
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4 font-mono text-slate-500 uppercase">
                                                        {inc.voucher || 'S/REF'}
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <div className="font-black text-emerald-600 text-xs">
                                                            S/. {inc.amount.toFixed(2)}
                                                        </div>
                                                        {inc.hasCreditNote && (
                                                            <div className="text-[9px] font-black text-violet-600 mt-0.5">
                                                                + NC: S/. {inc.creditNoteAmount.toFixed(2)} (Total: S/. {inc.grossAmount.toFixed(2)})
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-4 max-w-xs truncate uppercase text-slate-400 font-medium">
                                                        {inc.invoices || '-'}
                                                    </td>
                                                    <td className="px-8 py-4 text-slate-400 font-medium italic">
                                                        {inc.notes ? `"${inc.notes}"` : '-'}
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        {inc.isGroup && (
                                                            <button
                                                                onClick={() => setSelectedSaleDetails(inc)}
                                                                className="bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-sm ml-auto"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                Ver Detalles
                                                            </button>
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
                    SUB-MÓDULO 3: COMPRAS Y SERVICIOS (JALADOS DE COMPRAS -> CONFIGURAR CUOTAS / LETRAS)
                ========================================================================================= */}
                {activeSection === 'COMPRAS_SERVICIOS' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase">
                                    Registro Contable de Compras de Materiales y Servicios Textiles
                                </h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">
                                    Todas las compras y servicios registrados en el módulo de Compras llegan automáticamente aquí. Configura si se pagaron al contado, están por pagar o si se sacaron a Letras / Cuotas para pagarlos en <strong>Finanzas y Tesorería</strong>.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    onClick={() => setShowNewExpenseModal(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl transition active:scale-95 shadow-md flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Registrar Gasto / Servicio Contable
                                </button>
                            </div>
                        </div>

                        {/* Filters for Purchases & Services */}
                        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-md flex flex-wrap items-center gap-4">
                            <div className="flex-1 min-w-[240px] relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por proveedor, factura, OP o material/servicio..."
                                    value={purchaseSearch}
                                    onChange={(e) => setPurchaseSearch(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-2.5 font-bold text-slate-800 outline-none text-xs"
                                />
                            </div>
                            <select
                                value={purchaseTypeFilter}
                                onChange={(e) => setPurchaseTypeFilter(e.target.value as any)}
                                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-black text-slate-700 text-xs uppercase outline-none"
                            >
                                <option value="ALL">Todos los Tipos</option>
                                <option value="PURCHASE">Compras (Telas / Avíos / Insumos)</option>
                                <option value="SERVICE">Servicios (Confección / Lavandería)</option>
                                <option value="EXPENSE">Gastos Operativos / Otros</option>
                            </select>
                            <select
                                value={purchasePaymentFilter}
                                onChange={(e) => setPurchasePaymentFilter(e.target.value as any)}
                                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 font-black text-slate-700 text-xs uppercase outline-none"
                            >
                                <option value="ALL">Todos los Estados de Pago</option>
                                <option value="PENDIENTE">Falta Pagar / Pendientes</option>
                                <option value="LETRAS">Financiados en Letras / Cuotas</option>
                                <option value="PAGADO">Pagados al 100%</option>
                            </select>
                        </div>

                        {/* Purchases & Services Table */}
                        <div className={cardClass}>
                            <div className="overflow-x-auto -mx-8">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="px-6 py-4">Fecha / Doc</th>
                                            <th className="px-6 py-4">Proveedor</th>
                                            <th className="px-6 py-4">Tipo / OP</th>
                                            <th className="px-6 py-4">Detalle de Ítems</th>
                                            <th className="px-6 py-4 text-right">Monto Total</th>
                                            <th className="px-6 py-4 text-right">Pagado</th>
                                            <th className="px-6 py-4 text-right">Falta Pagar</th>
                                            <th className="px-6 py-4 text-center">Modalidad / Cuotas</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                        {filteredPurchasesList.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-8 py-16 text-center text-slate-400 italic">
                                                    No se encontraron registros de compras o servicios con estos filtros.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPurchasesList.map((p) => {
                                                const fin = p.financeInfo || {};
                                                const insts = Array.isArray(fin.installments) ? fin.installments : [];
                                                const paidInsts = insts.filter((i: any) => i.status === 'PAGADO').length;

                                                return (
                                                    <tr key={p.id} className="hover:bg-slate-50/40 transition">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="font-black text-slate-900">{p.invoiceNumber || 'S/DOC'}</div>
                                                            <div className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4 uppercase">
                                                            <div className="font-black text-slate-900">{p.supplier?.name || 'Proveedor General'}</div>
                                                            {p.supplier?.documentNumber && (
                                                                <div className="text-[9px] text-slate-400">RUC: {p.supplier.documentNumber}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                                p.type === 'SERVICE'
                                                                    ? 'bg-amber-100 text-amber-800'
                                                                    : p.type === 'EXPENSE'
                                                                    ? 'bg-violet-100 text-violet-800'
                                                                    : 'bg-blue-100 text-blue-800'
                                                            }`}>
                                                                {p.type === 'SERVICE' ? 'SERVICIO TEXTIL' : p.type === 'EXPENSE' ? 'GASTO CONTABLE' : 'COMPRA MATERIAL'}
                                                            </span>
                                                            {p.op && (
                                                                <div className="text-[9px] font-black text-indigo-600 mt-1 uppercase">OP: {p.op}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 max-w-xs">
                                                            <div className="truncate font-bold text-slate-800">
                                                                {(p.items || []).map((it: any) => `${it.name} (${it.quantity} ${it.unit || ''})`).join(', ') || '-'}
                                                            </div>
                                                            {p.notes && (
                                                                <div className="text-[9px] text-slate-400 truncate italic">"{p.notes}"</div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-900">
                                                            S/. {Number(p.totalAmount || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-emerald-600">
                                                            S/. {Number(fin.paidAmount || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-rose-600">
                                                            S/. {Number(fin.isConfigured ? fin.pendingAmount : p.totalAmount).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {!fin.isConfigured ? (
                                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase">
                                                                    Por Configurar
                                                                </span>
                                                            ) : fin.paymentCondition === 'LETRAS' ? (
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                                                                        fin.paymentStatus === 'PAGADO'
                                                                            ? 'bg-emerald-100 text-emerald-800'
                                                                            : 'bg-indigo-100 text-indigo-800'
                                                                    }`}>
                                                                        En {insts.length} Letras ({paidInsts}/{insts.length} Pagadas)
                                                                    </span>
                                                                </div>
                                                            ) : fin.paymentStatus === 'PAGADO' ? (
                                                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[9px] font-black uppercase">
                                                                    Pagado ({fin.paymentMethod})
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[9px] font-black uppercase">
                                                                    Crédito Por Pagar
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleOpenPlanModal(p)}
                                                                    className="bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-sm"
                                                                >
                                                                    <Calculator className="w-3 h-3" />
                                                                    {fin.isConfigured ? 'Ver / Editar Pago' : 'Configurar Pago / Letras'}
                                                                </button>
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
                    SUB-MÓDULO 4: COSTOS UNITARIOS TEXTILES (TELAS, AVÍOS, MERMAS Y PROCESOS DE CONFECCIÓN)
                ========================================================================================= */}
                {activeSection === 'COSTOS_UNITARIOS' && (
                    <div className="space-y-8">
                        {/* Simulator & Explanation */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-white rounded-[2.2rem] border border-slate-100 p-7 shadow-lg space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                                            <Calculator className="w-5 h-5 text-blue-600" />
                                            Calculadora Textil de Costo Unitario y Merma
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                            Simula al instante el costo real por prenda sumando tela, avíos, confección, lavado y porcentaje de merma
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-bold">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Costo Tela por Prenda (S/.)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={simTelaCost}
                                            onChange={(e) => setSimTelaCost(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Avíos (Botón, Cierre, Hilo) (S/.)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={simAviosCost}
                                            onChange={(e) => setSimAviosCost(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Corte y Confección (S/.)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={simConfeccionCost}
                                            onChange={(e) => setSimConfeccionCost(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Lavandería / Bordado / Acabado (S/.)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={simLavanderiaCost}
                                            onChange={(e) => setSimLavanderiaCost(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-rose-500 uppercase block mb-1">% Merma Textil / Segunda</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={simMermaPercent}
                                            onChange={(e) => setSimMermaPercent(e.target.value)}
                                            className="w-full bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 font-black text-rose-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-emerald-600 uppercase block mb-1">% Margen Deseado</label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={simTargetMargin}
                                            onChange={(e) => setSimTargetMargin(e.target.value)}
                                            className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 font-black text-emerald-800"
                                        />
                                    </div>
                                </div>
                            </div>

                            {(() => {
                                const baseCost = (Number(simTelaCost) || 0) + (Number(simAviosCost) || 0) + (Number(simConfeccionCost) || 0) + (Number(simLavanderiaCost) || 0);
                                const mermaCost = baseCost * ((Number(simMermaPercent) || 0) / 100);
                                const realUnitCost = Math.round((baseCost + mermaCost) * 100) / 100;
                                const marginRatio = Math.min(0.9, Math.max(0.01, (Number(simTargetMargin) || 0) / 100));
                                const suggestedPrice = Math.round((realUnitCost / (1 - marginRatio)) * 100) / 100;
                                const unitGain = Math.round((suggestedPrice - realUnitCost) * 100) / 100;

                                return (
                                    <div className="bg-slate-950 text-white rounded-[2.2rem] p-7 shadow-xl flex flex-col justify-between">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Resultado Unitario por Prenda</span>
                                            <div className="mt-3 space-y-2 text-xs">
                                                <div className="flex justify-between text-slate-400">
                                                    <span>Costo Directo Base:</span>
                                                    <span className="font-bold text-white">S/. {baseCost.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-rose-400">
                                                    <span>Impacto por Merma ({simMermaPercent}%):</span>
                                                    <span className="font-bold">+S/. {mermaCost.toFixed(2)}</span>
                                                </div>
                                                <div className="border-t border-white/10 pt-2 flex justify-between items-baseline">
                                                    <span className="font-black uppercase text-slate-200">Costo Unitario Real:</span>
                                                    <span className="text-2xl font-black text-amber-400">S/. {realUnitCost.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center">
                                            <div>
                                                <div className="text-[9px] font-black uppercase text-emerald-400">Precio Venta Sugerido</div>
                                                <div className="text-xl font-black text-white">S/. {suggestedPrice.toFixed(2)}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[9px] font-black uppercase text-slate-400">Ganancia / Prenda</div>
                                                <div className="text-base font-black text-emerald-400">+S/. {unitGain.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* OP Cost Table */}
                        <div className={cardClass}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase">
                                        Costos Reales Acumulados por Orden de Producción (OP) y Lote
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                        Consolidado automático de compras de telas, avíos, servicios de confección y mermas registradas en auditoría
                                    </p>
                                </div>
                                <div className="relative min-w-[240px]">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por OP o Producto..."
                                        value={costSearch}
                                        onChange={(e) => setCostSearch(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto -mx-8">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="px-6 py-4">OP / Modelo</th>
                                            <th className="px-6 py-4 text-right">Telas y Materiales</th>
                                            <th className="px-6 py-4 text-right">Avíos / Químicos</th>
                                            <th className="px-6 py-4 text-right">Servicios Confección</th>
                                            <th className="px-6 py-4 text-right">Costo Total Lote</th>
                                            <th className="px-6 py-4 text-center">Prendas / Merma</th>
                                            <th className="px-6 py-4 text-right">Costo Unitario</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                        {filteredCostSummary.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-8 py-16 text-center text-slate-400 italic">
                                                    No se encontraron órdenes de producción o compras vinculadas.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCostSummary.map((c) => (
                                                <tr key={c.op} className="hover:bg-slate-50/40 transition">
                                                    <td className="px-6 py-4 uppercase">
                                                        <div className="font-black text-indigo-700 text-xs">OP: {c.op}</div>
                                                        <div className="text-[10px] font-black text-slate-800">{c.productName || 'Lote General'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-blue-700 font-black">
                                                        S/. {c.materialsCost.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-teal-700 font-black">
                                                        S/. {(c.aviosCost + c.chemicalsCost).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-amber-700 font-black">
                                                        S/. {c.servicesCost.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-slate-900 font-black">
                                                        S/. {c.totalCost.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="font-black text-slate-800">{c.totalProducedUnits || 1} unds</div>
                                                        {c.mermaPercent > 0 && (
                                                            <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded uppercase">
                                                                Merma: {c.mermaPercent}% ({c.mermaUnits} unds)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="font-black text-emerald-700 text-xs">S/. {c.unitCost.toFixed(2)} / und</div>
                                                        {c.sellingPrice > 0 && (
                                                            <div className="text-[9px] text-slate-400">
                                                                Venta: S/. {c.sellingPrice.toFixed(2)} ({c.marginPercent}%)
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setSelectedOpCostDetails(c)}
                                                            className="bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl transition active:scale-95 inline-flex items-center gap-1"
                                                        >
                                                            <Eye className="w-3 h-3" />
                                                            Desglose
                                                        </button>
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
                    SUB-MÓDULO 5: OBLIGACIONES TRIBUTARIAS (SUNAT • IGV DÉBITO / CRÉDITO FISCAL / RENTA)
                ========================================================================================= */}
                {activeSection === 'OBLIGACIONES_TRIBUTARIAS' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                            <div className="bg-white border border-slate-200 rounded-[2.2rem] p-6 shadow-md">
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">IGV Ventas (Débito Fiscal 18%)</div>
                                <div className="text-2xl font-black text-slate-900 mt-2">S/. {periodBalance.igvSalesDebit.toFixed(2)}</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                                    Base imponible: S/. {periodBalance.netSalesBase.toFixed(2)}
                                </div>
                            </div>
                            <div className="bg-white border border-emerald-200 rounded-[2.2rem] p-6 shadow-md">
                                <div className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">IGV Compras (Crédito Fiscal 18%)</div>
                                <div className="text-2xl font-black text-emerald-600 mt-2">-S/. {periodBalance.igvPurchasesCredit.toFixed(2)}</div>
                                <div className="text-[9px] text-emerald-500 font-bold uppercase mt-1">
                                    A favor por compras facturadas
                                </div>
                            </div>
                            <div className="bg-indigo-950 text-white rounded-[2.2rem] p-6 shadow-xl">
                                <div className="text-[10px] text-indigo-300 font-black uppercase tracking-wider">
                                    {periodBalance.netIgvToPay >= 0 ? 'IGV Neto a Pagar SUNAT' : 'Saldo a Favor Crédito Fiscal'}
                                </div>
                                <div className="text-2xl font-black text-white mt-2">
                                    S/. {Math.abs(periodBalance.netIgvToPay).toFixed(2)}
                                </div>
                                <div className="text-[9px] text-indigo-300 font-bold uppercase mt-1">
                                    {periodBalance.netIgvToPay >= 0 ? 'Débito Fiscal - Crédito Fiscal' : 'Crédito supera al Débito'}
                                </div>
                            </div>
                            <div className="bg-white border border-violet-200 rounded-[2.2rem] p-6 shadow-md">
                                <div className="text-[10px] text-violet-600 font-black uppercase tracking-wider">Pago a Cuenta Renta (1.5%)</div>
                                <div className="text-2xl font-black text-violet-700 mt-2">S/. {periodBalance.estimatedIncomeTax.toFixed(2)}</div>
                                <div className="text-[9px] text-violet-400 font-bold uppercase mt-1">
                                    Estimación mensual sobre base neta
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.2rem] border border-slate-100 p-7 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-black text-slate-900 uppercase">
                                    Liquidación Tributaria del Período
                                </h3>
                                <p className="text-xs font-medium text-slate-500 mt-1">
                                    Total estimado a declarar ante SUNAT (IGV Neto + Renta Mensual):{' '}
                                    <strong className="text-slate-900 font-black">
                                        S/. {(Math.max(0, periodBalance.netIgvToPay) + periodBalance.estimatedIncomeTax).toFixed(2)}
                                    </strong>
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setNewExpenseType('EXPENSE');
                                    setNewExpenseCategory('Tributos SUNAT');
                                    setNewExpenseConcept(`Pago PDT 621 IGV - Renta (${selectedMonth}/${selectedYear})`);
                                    setNewExpenseAmount(String(Math.round((Math.max(0, periodBalance.netIgvToPay) + periodBalance.estimatedIncomeTax) * 100) / 100));
                                    setShowNewExpenseModal(true);
                                }}
                                className="bg-violet-600 hover:bg-violet-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl transition active:scale-95 shadow-md flex items-center gap-2 shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                Registrar Pago de Tributo SUNAT
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* =========================================================================================
                MODAL 1: CONFIGURAR MODALIDAD DE PAGO / SACAR A LETRAS UNA COMPRA O SERVICIO
            ========================================================================================= */}
            {selectedPurchaseForPlan && (
                <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-3xl p-8 shadow-2xl relative space-y-6 max-h-[92vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedPurchaseForPlan(null)}
                            className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase">
                                Configuración Contable y Financiamiento
                            </span>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1">
                                {selectedPurchaseForPlan.type === 'SERVICE' ? 'Servicio:' : 'Compra:'} {selectedPurchaseForPlan.invoiceNumber || 'Sin N° Doc'} — S/. {Number(selectedPurchaseForPlan.totalAmount).toFixed(2)}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                                Proveedor: {selectedPurchaseForPlan.supplier?.name || 'General'} | OP: {selectedPurchaseForPlan.op || 'General'}
                            </p>
                        </div>

                        <form onSubmit={handleSaveFinancePlan} className="space-y-5 text-xs font-bold text-slate-700">
                            {/* Selector de Modalidad */}
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">
                                    1. Selecciona la Modalidad de Pago de esta Compra / Servicio
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPlanCondition('CONTADO')}
                                        className={`p-4 rounded-2xl border text-left transition ${
                                            planCondition === 'CONTADO'
                                                ? 'bg-emerald-950 text-white border-emerald-800 shadow-md'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="font-black uppercase text-xs">Al Contado (Pagado)</div>
                                        <div className={`text-[9px] mt-1 ${planCondition === 'CONTADO' ? 'text-emerald-300' : 'text-slate-400'}`}>
                                            Ya fue cancelado en su totalidad
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPlanCondition('CREDITO')}
                                        className={`p-4 rounded-2xl border text-left transition ${
                                            planCondition === 'CREDITO'
                                                ? 'bg-amber-950 text-white border-amber-800 shadow-md'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="font-black uppercase text-xs">Por Pagar (Crédito)</div>
                                        <div className={`text-[9px] mt-1 ${planCondition === 'CREDITO' ? 'text-amber-300' : 'text-slate-400'}`}>
                                            Falta pagar o se abona en Tesorería
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPlanCondition('LETRAS');
                                            if (installmentsList.length === 0) {
                                                generateEqualInstallments(3, selectedPurchaseForPlan.totalAmount);
                                            }
                                        }}
                                        className={`p-4 rounded-2xl border text-left transition ${
                                            planCondition === 'LETRAS'
                                                ? 'bg-indigo-950 text-white border-indigo-800 shadow-md'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="font-black uppercase text-xs">En Letras / Cuotas</div>
                                        <div className={`text-[9px] mt-1 ${planCondition === 'LETRAS' ? 'text-indigo-300' : 'text-slate-400'}`}>
                                            Ej: 5 letras para pagar en Tesorería
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Opciones Tributarias y Merma */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Afectación Tributaria (IGV)</label>
                                    <select
                                        value={planTaxType}
                                        onChange={(e) => setPlanTaxType(e.target.value as any)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800 outline-none"
                                    >
                                        <option value="CON_IGV">Gravado con IGV (18% Crédito Fiscal)</option>
                                        <option value="SIN_IGV">Sin IGV / Recibo / Inafecto</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">% Merma Estimada del Material/Proceso</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="50"
                                        value={planMermaPercent}
                                        onChange={(e) => setPlanMermaPercent(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Si es AL CONTADO */}
                            {planCondition === 'CONTADO' && (
                                <div className="space-y-4 bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Método de Pago</label>
                                            <select
                                                value={planPaymentMethod}
                                                onChange={(e) => setPlanPaymentMethod(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800"
                                            >
                                                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                                <option value="DEPOSITO">Depósito en Cuenta</option>
                                                <option value="EFECTIVO">Efectivo</option>
                                                <option value="YAPE_PLIN">Yape / Plin</option>
                                                <option value="CHEQUE">Cheque</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Fecha de Pago</label>
                                            <input
                                                type="date"
                                                value={planPaymentDate}
                                                onChange={(e) => setPlanPaymentDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">N° Operación / Referencia</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: OP-982341"
                                                value={planOperationNumber}
                                                onChange={(e) => setPlanOperationNumber(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Comprobante / Voucher de Pago</label>
                                        {planVoucherUrl ? (
                                            <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                                                <img src={getImageUrl(planVoucherUrl)} alt="Voucher" className="w-12 h-12 object-cover rounded-lg" />
                                                <span className="flex-1 truncate font-mono text-[10px]">{planVoucherUrl.split('/').pop()}</span>
                                                <button type="button" onClick={() => setPlanVoucherUrl('')} className="text-rose-500 p-1">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-white rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer">
                                                {isUploadingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-emerald-600" />}
                                                <span className="text-[10px] font-black uppercase text-emerald-700">Subir Voucher de Pago</span>
                                                <input type="file" accept="image/*" onChange={handleVoucherUpload} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Si es POR PAGAR (CRÉDITO SIMPLE) */}
                            {planCondition === 'CREDITO' && (
                                <div className="space-y-4 bg-amber-50/50 border border-amber-100 p-5 rounded-2xl">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Fecha de Vencimiento de Pago</label>
                                            <input
                                                type="date"
                                                value={planDueDate}
                                                onChange={(e) => setPlanDueDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Observación Contable</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Crédito a 30 días con proveedor..."
                                                value={planNotes}
                                                onChange={(e) => setPlanNotes(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Si es FINANCIADO EN LETRAS / CUOTAS A PROVEEDOR */}
                            {planCondition === 'LETRAS' && (
                                <div className="space-y-4 bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h4 className="font-black text-indigo-950 uppercase text-xs">
                                                Cronograma de Letras / Cuotas a Pagar al Proveedor
                                            </h4>
                                            <p className="text-[10px] text-indigo-600 font-bold">
                                                Estas letras aparecerán automáticamente en <strong>Finanzas y Tesorería</strong> para ir pagándolas y subiendo su comprobante.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-[9px] font-black uppercase text-indigo-900">N° de Letras:</label>
                                            <select
                                                value={numInstallments}
                                                onChange={(e) => generateEqualInstallments(Number(e.target.value), selectedPurchaseForPlan.totalAmount)}
                                                className="bg-white border border-indigo-200 rounded-xl px-3 py-1.5 font-black text-indigo-900 text-xs"
                                            >
                                                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                                                    <option key={n} value={n}>{n} {n === 1 ? 'Letra' : 'Letras'}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {installmentsList.map((inst, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-indigo-100">
                                                <div className="col-span-2 font-black text-indigo-900 text-[11px]">
                                                    Letra N° {inst.number}
                                                </div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Código / N° Letra"
                                                        value={inst.uniqueCode || ''}
                                                        onChange={(e) => {
                                                            const copy = [...installmentsList];
                                                            copy[idx] = { ...copy[idx], uniqueCode: e.target.value };
                                                            setInstallmentsList(copy);
                                                        }}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold"
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="date"
                                                        value={inst.dueDate}
                                                        onChange={(e) => {
                                                            const copy = [...installmentsList];
                                                            copy[idx] = { ...copy[idx], dueDate: e.target.value };
                                                            setInstallmentsList(copy);
                                                        }}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={inst.amount}
                                                        onChange={(e) => {
                                                            const copy = [...installmentsList];
                                                            copy[idx] = { ...copy[idx], amount: Number(e.target.value) };
                                                            setInstallmentsList(copy);
                                                        }}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-black text-right"
                                                    />
                                                </div>
                                                <div className="col-span-2 text-right">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                        inst.status === 'PAGADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {inst.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPurchaseForPlan(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-xl text-xs uppercase"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPlan}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 shadow-md"
                                >
                                    {isSavingPlan && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Guardar Configuración Contable
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =========================================================================================
                MODAL 2: REGISTRAR NUEVA OPERACIÓN / GASTO CONTABLE
            ========================================================================================= */}
            {showNewExpenseModal && (
                <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative space-y-6">
                        <button
                            onClick={() => setShowNewExpenseModal(false)}
                            className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase">Registrar Operación / Gasto Contable</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                Registra costos de servicios, gastos operativos o pagos tributarios para el cálculo de utilidad neta.
                            </p>
                        </div>

                        <form onSubmit={handleCreateExpense} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Tipo de Operación</label>
                                    <select
                                        value={newExpenseType}
                                        onChange={(e) => setNewExpenseType(e.target.value as any)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black"
                                    >
                                        <option value="EXPENSE">Gasto Operativo / Tributo</option>
                                        <option value="SERVICE">Servicio de Confección / Proceso</option>
                                        <option value="PURCHASE">Compra de Materiales / Avíos</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Categoría</label>
                                    <select
                                        value={newExpenseCategory}
                                        onChange={(e) => setNewExpenseCategory(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black"
                                    >
                                        <option value="Gasto Operativo">Gasto Operativo / Administrativo</option>
                                        <option value="Tributos SUNAT">Tributos SUNAT (IGV / Renta)</option>
                                        <option value="Servicio">Servicio / Mano de Obra Textil</option>
                                        <option value="Materiales">Telas y Materiales</option>
                                        <option value="Avios">Avíos e Insumos</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">N° Factura / Comprobante</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: F001-00421"
                                        value={newExpenseInvoice}
                                        onChange={(e) => setNewExpenseInvoice(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">OP Vinculada (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: OP-1024"
                                        value={newExpenseOp}
                                        onChange={(e) => setNewExpenseOp(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Proveedor / Entidad (Opcional)</label>
                                <select
                                    value={newExpenseSupplierId}
                                    onChange={(e) => setNewExpenseSupplierId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                                >
                                    <option value="">-- Sin proveedor específico / General --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.documentNumber})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Concepto / Descripción</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej: Servicio de lavandería lote denim..."
                                        value={newExpenseConcept}
                                        onChange={(e) => setNewExpenseConcept(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Monto Total (S/.)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        value={newExpenseAmount}
                                        onChange={(e) => setNewExpenseAmount(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowNewExpenseModal(false)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-xl text-xs uppercase"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingExpense}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 shadow-md"
                                >
                                    {isCreatingExpense && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Registrar Operación
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =========================================================================================
                MODAL 3: DESGLOSE DE COSTOS UNITARIOS POR OP
            ========================================================================================= */}
            {selectedOpCostDetails && (
                <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-3xl p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedOpCostDetails(null)}
                            className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div>
                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[9px] font-black uppercase">
                                Ficha Técnica de Costos Textiles
                            </span>
                            <h2 className="text-xl font-black text-slate-900 uppercase mt-1">
                                OP: {selectedOpCostDetails.op} — {selectedOpCostDetails.productName || 'Lote de Producción'}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">
                                Costo Total Lote: S/. {selectedOpCostDetails.totalCost.toFixed(2)} | Unidades: {selectedOpCostDetails.totalProducedUnits || 1} | Costo Unitario: S/. {selectedOpCostDetails.unitCost.toFixed(2)}
                            </p>
                        </div>

                        <div className="border border-slate-100 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase">
                                        <th className="px-4 py-3">Insumo / Servicio</th>
                                        <th className="px-4 py-3">Categoría</th>
                                        <th className="px-4 py-3">Proveedor</th>
                                        <th className="px-4 py-3 text-right">Cant.</th>
                                        <th className="px-4 py-3 text-right">Precio Unit.</th>
                                        <th className="px-4 py-3 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                    {(selectedOpCostDetails.items || []).map((it: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2.5 font-black text-slate-900">{it.name}</td>
                                            <td className="px-4 py-2.5">{it.category}</td>
                                            <td className="px-4 py-2.5">{it.supplierName}</td>
                                            <td className="px-4 py-2.5 text-right">{it.quantity} {it.unit}</td>
                                            <td className="px-4 py-2.5 text-right">S/. {Number(it.price).toFixed(2)}</td>
                                            <td className="px-4 py-2.5 text-right font-black text-slate-900">S/. {Number(it.total).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================================
                MODAL 4: DETALLES DE ABONOS CONCILIADOS DEL LIBRO DE INGRESOS
            ========================================================================================= */}
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
                            <div className="flex flex-wrap items-center gap-2">
                                {selectedSaleDetails.saleDetails?.isLetraGroup && (
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                        selectedSaleDetails.saleDetails.status === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                                    }`}>
                                        {selectedSaleDetails.saleDetails.status === 'COMPLETADO' ? 'COMPLETADO' : 'EN PROCESO'}
                                    </span>
                                )}
                                {selectedSaleDetails.hasCreditNote && (
                                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-violet-100 text-violet-700">
                                        CON NOTA DE CRÉDITO
                                    </span>
                                )}
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                    {selectedSaleDetails.saleDetails?.isLetraGroup ? 'Letras Cobradas del Cronograma:' : 'Abonos Conciliados de la Venta:'} {selectedSaleDetails.saleDetails?.invoiceNumber || 'S/N'}
                                </h2>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                Cliente: {selectedSaleDetails.saleDetails?.client?.name || selectedSaleDetails.clientName} | Monto Neto Cobrado: S/. {selectedSaleDetails.amount.toFixed(2)}
                            </p>
                        </div>

                        {!selectedSaleDetails.saleDetails?.isLetraGroup && (selectedSaleDetails.hasCreditNote || selectedSaleDetails.hasDevolutionAdjustment) && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Monto Total Operación</p>
                                    <p className="text-base font-black text-slate-900 mt-0.5">S/. {(selectedSaleDetails.grossAmount || selectedSaleDetails.amount).toFixed(2)}</p>
                                </div>
                                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-wider">Monto Neto Cobrado</p>
                                    <p className="text-base font-black text-emerald-600 mt-0.5">S/. {selectedSaleDetails.amount.toFixed(2)}</p>
                                </div>
                                <div className="bg-white p-3.5 rounded-xl border border-violet-100 shadow-sm">
                                    <p className="text-[8px] font-black text-violet-600 uppercase tracking-wider">Total Nota de Crédito</p>
                                    <p className="text-base font-black text-violet-700 mt-0.5">S/. {(selectedSaleDetails.creditNoteAmount || 0).toFixed(2)}</p>
                                    {selectedSaleDetails.creditNoteNumbers?.length > 0 && (
                                        <p className="text-[8px] font-black text-violet-500 uppercase mt-0.5">
                                            N° {selectedSaleDetails.creditNoteNumbers.join(', ')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-3">Fecha Abono</th>
                                        <th className="px-6 py-3">Método</th>
                                        <th className="px-6 py-3 text-right">Monto</th>
                                        <th className="px-6 py-3">Evidencia / Documento</th>
                                        <th className="px-6 py-3">Glosa / Comentario</th>
                                        <th className="px-6 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                    {selectedSaleDetails.paymentsList?.map((p: any) => {
                                        const isCreditNote = p.method === 'NOTA_CREDITO';
                                        const isNegativeTransfer = Number(p.amount) < 0;
                                        return (
                                            <tr key={p.id} className={`hover:bg-slate-50/20 transition ${isCreditNote ? 'bg-violet-50/20' : isNegativeTransfer ? 'bg-amber-50/20' : ''}`}>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    {new Date(p.paymentDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ${
                                                            isNegativeTransfer
                                                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                                : isCreditNote
                                                                ? 'bg-violet-100 text-violet-700 border border-violet-200'
                                                                : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {isNegativeTransfer ? 'TRASPASO A ADELANTO' : isCreditNote ? 'NOTA DE CRÉDITO' : p.method}
                                                        </span>
                                                        {isCreditNote && p.creditNoteNumber && (
                                                            <span className="text-[8px] font-black text-violet-600 font-mono">
                                                                N° {p.creditNoteNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-3 text-right font-black text-xs ${
                                                    isNegativeTransfer ? 'text-rose-600' : isCreditNote ? 'text-violet-700' : 'text-slate-900'
                                                }`}>
                                                    {isNegativeTransfer ? `-S/. ${Math.abs(p.amount).toFixed(2)}` : `S/. ${p.amount.toFixed(2)}`}
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
                                                    ) : isCreditNote && p.sunatPdfUrl ? (
                                                        <a
                                                            href={p.sunatPdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-lg text-[9px] font-black uppercase transition"
                                                        >
                                                            <FileText className="w-3 h-3" />
                                                            Ver PDF SUNAT
                                                        </a>
                                                    ) : isNegativeTransfer ? (
                                                        <span className="text-amber-700 font-black text-[9px] uppercase">Ajuste por Devolución</span>
                                                    ) : (
                                                        <span className="text-slate-355 italic font-medium">Sin comprobante</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-slate-400 font-medium italic">
                                                    {p.notes ? `"${p.notes}"` : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                        {p.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setSelectedSaleDetails(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase px-6 py-3 rounded-xl transition active:scale-95"
                            >
                                Cerrar Detalles
                            </button>
                        </div>
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
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}
        </Layout>
    );
}
