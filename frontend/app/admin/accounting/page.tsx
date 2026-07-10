// frontend/app/admin/accounting/page.tsx
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
    Loader2, 
    Printer,
    ArrowUpRight,
    TrendingUp,
    Scale,
    BookmarkCheck,
    CoinsIcon,
    Wallet,
    Eye,
    X,
    ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AccountingPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [paidLetras, setPaidLetras] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [selectedSaleDetails, setSelectedSaleDetails] = useState<any | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '');
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
        fetchLedgerData();
    }, [user, authLoading]);

    const fetchLedgerData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Letras and filter paid ones
            const letrasRes = await api.get('/sales/letras');
            const paidLetrasOnly = letrasRes.data.filter((l: any) => l.status === 'PAGADO');
            setPaidLetras(paidLetrasOnly);

            // 2. Fetch all sales to extract direct approved payments
            const salesRes = await api.get('/sales');
            setSales(salesRes.data);
        } catch (error) {
            console.error('Error fetching accounting ledger data:', error);
            toast.error('Error al cargar datos contables de ingresos');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Unified Income Ledger (Letras Pagadas + Pagos Directos Aprobados)
    const unifiedIncomes = useMemo(() => {
        const list: any[] = [];

        // 1. Map paid Letras grouped by LetraGroup
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
                invoices: groupInfo?.sales?.map((s: any) => s.invoiceNumber || 'S/N').join(', ') || '-',
                notes: `${groupLetras.length} letras cobradas`,
                isGroup: true,
                saleDetails: {
                    ...groupInfo,
                    invoiceNumber: groupInfo?.sales?.map((s: any) => s.invoiceNumber || 'S/N').join(', ') || 'Varias Facturas',
                    totalAmount: totalAmount, // Show the total of paid Letras
                    isLetraGroup: true // flag for the modal
                },
                paymentsList: groupLetras.map(l => ({
                    ...l,
                    method: 'LETRA',
                    evidenceUrl: l.voucherUrl,
                    notes: l.paymentNotes,
                }))
            });
        });

        // 2. Map direct approved payments grouped by SALE
        sales.forEach(sale => {
            if (!sale.payments) return;
            const conciliatedPayments = sale.payments.filter((p: any) => p.status === 'CONCILIADO' && p.method !== 'LETRAS');
            
            if (conciliatedPayments.length > 0) {
                const totalAmount = conciliatedPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
                // Use the latest payment date for sorting
                const latestDate = conciliatedPayments.reduce((latest: string, p: any) => {
                    return new Date(p.paymentDate) > new Date(latest) ? p.paymentDate : latest;
                }, conciliatedPayments[0].paymentDate);

                list.push({
                    id: `SALE-${sale.id}`,
                    type: 'VENTA DIRECTA',
                    paymentDate: latestDate,
                    clientName: sale.client?.name || 'Cliente',
                    concept: `INGRESOS DE VENTA`,
                    voucher: 'Múltiples',
                    amount: totalAmount,
                    invoices: sale.invoiceNumber || 'S/N',
                    notes: `${conciliatedPayments.length} abonos conciliados`,
                    isGroup: true,
                    saleDetails: sale,
                    paymentsList: conciliatedPayments
                });
            }
        });

        // Sort by payment date descending
        return list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    }, [paidLetras, sales]);

    const filteredIncomes = useMemo(() => {
        return unifiedIncomes.filter(inc => {
            const clientName = inc.clientName?.toLowerCase() || '';
            const invoiceNum = inc.invoices?.toLowerCase() || '';
            const matchesSearch = clientName.includes(searchTerm.toLowerCase()) || invoiceNum.includes(searchTerm.toLowerCase());
            
            if (!monthFilter) return matchesSearch;
            const paymentMonth = new Date(inc.paymentDate).toISOString().substring(0, 7); // YYYY-MM
            return paymentMonth === monthFilter && matchesSearch;
        });
    }, [unifiedIncomes, searchTerm, monthFilter]);

    // Financial calculations
    const metrics = useMemo(() => {
        let totalIncome = 0;
        let totalLetrasIncome = 0;
        let totalDirectIncome = 0;

        filteredIncomes.forEach(inc => {
            totalIncome += inc.amount;
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

        return { totalIncome, totalLetrasIncome, totalDirectIncome, count, lastDeposit };
    }, [filteredIncomes]);

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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 print:hidden">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <Scale className="w-8 h-8 text-indigo-600" />
                            Libro Contable de Ingresos
                        </h1>
                        <p className="text-slate-500 font-medium text-lg mt-1">Control de fondos consolidados: abonos directos y letras reconciliadas.</p>
                    </div>
                    <div>
                        <button
                            onClick={handlePrint}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl transition active:scale-95 shadow-md flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir Reporte
                        </button>
                    </div>
                </div>

                {/* Print Title (Only visible during print) */}
                <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-6">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Investments Z&G S.A.</h1>
                    <h2 className="text-lg font-bold text-slate-700 uppercase mt-1">Libro de Ingresos de Caja y Bancos</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Fecha de Emisión: {new Date().toLocaleDateString()} | Generado por: {user?.name}</p>
                </div>

                {/* Dashboard Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
                    <div className="bg-slate-950 text-white rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden print:bg-slate-100 print:text-slate-900 print:border print:border-slate-200">
                        <div className="absolute right-4 bottom-4 text-white/5 print:hidden"><TrendingUp className="w-24 h-24" /></div>
                        <div className="text-[10px] text-slate-400 print:text-slate-500 font-black uppercase tracking-wider">Total Ingresos Consolidados</div>
                        <div className="text-2xl font-black mt-2">S/. {metrics.totalIncome.toFixed(2)}</div>
                        <div className="text-[9px] text-indigo-400 print:text-indigo-650 font-bold uppercase mt-1">Suma de abonos validados</div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-md print:border-slate-200">
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Ingresos por Letras</div>
                        <div className="text-2xl font-black text-emerald-600 mt-2">S/. {metrics.totalLetrasIncome.toFixed(2)}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Recaudado de letras reconciliadas</div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-md print:border-slate-200">
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Ingresos Directos</div>
                        <div className="text-2xl font-black text-indigo-600 mt-2">S/. {metrics.totalDirectIncome.toFixed(2)}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Abonos directos de ventas</div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-md print:border-slate-200">
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Transacciones y Conciliación</div>
                        <div className="text-2xl font-black text-slate-800 mt-2">{metrics.count} Transacciones</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Última: {metrics.lastDeposit}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className={`${cardClass} p-5 flex flex-wrap items-center gap-4 print:hidden`}>
                    <div className="flex-1 min-w-[300px] relative">
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
                                <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider print:bg-slate-100 print:text-slate-900 print:border-b-2">
                                    <th className="px-8 py-4 print:px-2">Fecha Pago</th>
                                    <th className="px-8 py-4 print:px-2">Cliente</th>
                                    <th className="px-8 py-4 print:px-2">Tipo / Concepto</th>
                                    <th className="px-8 py-4 print:px-2">Ref. Depósito / Comprobante</th>
                                    <th className="px-8 py-4 print:px-2 text-right">Monto</th>
                                    <th className="px-8 py-4 print:px-2">Documentos Relacionados</th>
                                    <th className="px-8 py-4 print:px-2 font-medium">Glosa / Notas</th>
                                    <th className="px-8 py-4 print:hidden text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-bold text-slate-700 print:text-[10px] print:text-slate-800">
                                {filteredIncomes.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-8 py-16 text-center text-slate-400 italic">No se registran movimientos reconciliados en este período.</td>
                                    </tr>
                                ) : (
                                    filteredIncomes.map(inc => (
                                        <tr key={inc.id} className="hover:bg-slate-50/20 transition print:hover:bg-transparent">
                                            <td className="px-8 py-4 print:px-2 whitespace-nowrap">
                                                {new Date(inc.paymentDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-8 py-4 print:px-2 uppercase font-black text-slate-900">
                                                {inc.clientName}
                                            </td>
                                            <td className="px-8 py-4 print:px-2 uppercase whitespace-nowrap">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-wider ${
                                                        inc.type === 'CRONOGRAMA LETRAS' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                                    }`}>
                                                        {inc.concept}
                                                    </span>
                                                    {inc.saleDetails?.isLetraGroup && (
                                                        <span className={`px-2 py-0.5 rounded text-[7px] font-black tracking-wider ${
                                                            inc.saleDetails.status === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {inc.saleDetails.status === 'COMPLETADO' ? 'COMPLETADO' : 'EN PROCESO'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-4 print:px-2 font-mono text-slate-500 uppercase">
                                                {inc.voucher || 'S/REF'}
                                            </td>
                                            <td className="px-8 py-4 print:px-2 text-right font-black text-emerald-600 text-xs">
                                                S/. {inc.amount.toFixed(2)}
                                            </td>
                                            <td className="px-8 py-4 print:px-2 max-w-xs truncate uppercase text-slate-400 font-medium">
                                                {inc.invoices || '-'}
                                            </td>
                                            <td className="px-8 py-4 print:px-2 text-slate-400 font-medium italic">
                                                {inc.notes ? `"${inc.notes}"` : '-'}
                                            </td>
                                            <td className="px-8 py-4 print:hidden text-right">
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

            {/* SIDE PANEL / MODAL: Details of Conciliated Sale Payments */}
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
                            <div className="flex items-center gap-2">
                                {selectedSaleDetails.saleDetails?.isLetraGroup && (
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                        selectedSaleDetails.saleDetails.status === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                                    }`}>
                                        {selectedSaleDetails.saleDetails.status === 'COMPLETADO' ? 'COMPLETADO' : 'EN PROCESO'}
                                    </span>
                                )}
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                    {selectedSaleDetails.saleDetails?.isLetraGroup ? 'Letras Cobradas del Cronograma:' : 'Abonos Conciliados de la Venta:'} {selectedSaleDetails.saleDetails?.invoiceNumber || 'S/N'}
                                </h2>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                Cliente: {selectedSaleDetails.saleDetails?.client?.name || selectedSaleDetails.clientName} | {selectedSaleDetails.saleDetails?.isLetraGroup ? `Registrado por: ${selectedSaleDetails.saleDetails?.registeredByName || '-'}` : `Vendedor: ${selectedSaleDetails.saleDetails?.seller?.name || '-'}`} | Monto {selectedSaleDetails.saleDetails?.isLetraGroup ? 'Cobrado' : 'Total'}: S/. {selectedSaleDetails.saleDetails?.totalAmount?.toFixed(2) || selectedSaleDetails.amount.toFixed(2)}
                            </p>
                        </div>

                        {/* List of conciliated payments for this sale */}
                        <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-3">Fecha Abono</th>
                                        <th className="px-6 py-3">Método</th>
                                        <th className="px-6 py-3 text-right">Monto</th>
                                        <th className="px-6 py-3">Evidencia (Voucher)</th>
                                        <th className="px-6 py-3">Glosa / Comentario</th>
                                        <th className="px-6 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                    {selectedSaleDetails.paymentsList?.map((p: any) => (
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
                                            <td className="px-6 py-3 text-center">
                                                <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
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
