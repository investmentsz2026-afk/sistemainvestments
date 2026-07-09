'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/axios';
import { toast } from 'react-hot-toast';
import {
    Search,
    ChevronRight,
    Loader2,
    Calendar,
    FileText,
    CheckCircle2,
    XCircle,
    Plus,
    Trash2,
    ArrowLeft,
    Check,
    Coins,
    DollarSign,
    Printer,
    FileSignature,
    Percent
} from 'lucide-react';
import Link from 'next/link';

export default function LetraGroupsPage() {
    const { user } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form states
    const [selectedClientId, setSelectedClientId] = useState('');
    const [clientSearchText, setClientSearchText] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
    const [cantidadLetras, setCantidadLetras] = useState(1);
    const [letrasList, setLetrasList] = useState<any[]>([
        { number: 1, dueDate: '', amount: '', uniqueNumber: '', observation: '' }
    ]);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal state for adjusting balance
    const [selectedGroupForAdjustment, setSelectedGroupForAdjustment] = useState<any | null>(null);
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentMethod, setAdjustmentMethod] = useState('NOTA_CREDITO'); // NOTA_CREDITO, EFECTIVO, TRANSFERENCIA, TARJETA
    const [adjustmentReference, setAdjustmentReference] = useState('');
    const [creditNoteNumber, setCreditNoteNumber] = useState('');
    const [creditNoteMotive, setCreditNoteMotive] = useState('1'); // 1: Anulación de la operación, etc.
    const [isAdjusting, setIsAdjusting] = useState(false);

    // Action execution states
    const [processingGroupId, setProcessingGroupId] = useState<string | null>(null);

    const isCommercialOrAdmin = user?.role === 'ADMIN' || user?.role === 'COMERCIAL';

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [clientsResp, salesResp, groupsResp] = await Promise.all([
                api.get('/sales/clients'),
                api.get('/sales'),
                api.get('/sales/letra-groups')
            ]);
            setClients(clientsResp.data || []);
            setSales(salesResp.data || []);
            setGroups(groupsResp.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Error al cargar la información inicial');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter pending/partial sales for selected client
    const clientSales = useMemo(() => {
        if (!selectedClientId) return [];
        return sales.filter(s => 
            s.clientId === selectedClientId && 
            s.status !== 'ANULADO' &&
            s.paymentStatus !== 'CANCELADO' &&
            !s.letraGroupId
        );
    }, [selectedClientId, sales]);
    // Filter clients based on search text
    const filteredClients = useMemo(() => {
        if (!clientSearchText) return clients;
        const lower = clientSearchText.toLowerCase();
        return clients.filter(c => 
            c.name.toLowerCase().includes(lower) || 
            c.documentNumber?.includes(lower)
        );
    }, [clientSearchText, clients]);
    // Sum of selected sales
    const totalSalesSelected = useMemo(() => {
        return clientSales
            .filter(s => selectedSaleIds.includes(s.id))
            .reduce((sum, s) => sum + s.totalAmount, 0);
    }, [selectedSaleIds, clientSales]);

    // Sum of letras inputs
    const totalLetrasProgrammed = useMemo(() => {
        return letrasList.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
    }, [letrasList]);

    const pendingDiffBalance = useMemo(() => {
        return parseFloat((totalSalesSelected - totalLetrasProgrammed).toFixed(2));
    }, [totalSalesSelected, totalLetrasProgrammed]);

    // Handle number of installments change
    const handleCantidadLetrasChange = (val: number) => {
        const parsed = Math.max(1, val);
        setCantidadLetras(parsed);

        const newList = Array.from({ length: parsed }, (_, i) => {
            const existing = letrasList[i];
            const d = new Date();
            d.setDate(d.getDate() + ((i + 1) * 30));
            const defaultDate = d.toISOString().split('T')[0];

            return {
                number: i + 1,
                dueDate: existing?.dueDate || defaultDate,
                amount: existing?.amount || '',
                uniqueNumber: existing?.uniqueNumber || '',
                observation: existing?.observation || ''
            };
        });

        // Evenly distribute total amount if we have selected sales and want to pre-fill
        if (totalSalesSelected > 0 && parsed > 0) {
            const equalShare = parseFloat((totalSalesSelected / parsed).toFixed(2));
            newList.forEach((item, idx) => {
                if (idx === newList.length - 1) {
                    const sumPrev = newList.slice(0, -1).reduce((s, l) => s + parseFloat(l.amount || 0), 0);
                    item.amount = (totalSalesSelected - sumPrev).toFixed(2);
                } else {
                    item.amount = equalShare.toFixed(2);
                }
            });
        }

        setLetrasList(newList);
    };

    // Auto distribute total sales when sales selection changes
    useEffect(() => {
        if (totalSalesSelected > 0) {
            const share = parseFloat((totalSalesSelected / cantidadLetras).toFixed(2));
            const newList = letrasList.map((item, idx) => {
                if (idx === letrasList.length - 1) {
                    const sumPrev = letrasList.slice(0, -1).reduce((s, l) => s + parseFloat(l.amount || 0), 0);
                    return { ...item, amount: (totalSalesSelected - sumPrev).toFixed(2) };
                }
                return { ...item, amount: share.toFixed(2) };
            });
            setLetrasList(newList);
        }
    }, [totalSalesSelected]);

    const handleLetraFieldChange = (idx: number, field: string, value: any) => {
        const copy = [...letrasList];
        copy[idx][field] = value;
        setLetrasList(copy);
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSaleIds.length === 0) {
            toast.error('Debe seleccionar al menos una venta/factura');
            return;
        }

        const sumOfLetras = letrasList.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
        if (sumOfLetras <= 0) {
            toast.error('La suma de las letras debe ser mayor a cero.');
            return;
        }

        const invalidLetras = letrasList.some(l => !l.dueDate || !l.amount || parseFloat(l.amount) <= 0);
        if (invalidLetras) {
            toast.error('Todas las letras deben tener una fecha de vencimiento e importe válido.');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/sales/letra-groups', {
                clientId: selectedClientId,
                saleIds: selectedSaleIds,
                letras: letrasList,
                notes
            });

            toast.success(user?.role.includes('VENDEDOR') 
                ? 'Lote de letras registrado. En espera de aprobación comercial.' 
                : 'Lote de letras aprobado de forma automática.'
            );

            // Reset form
            setSelectedClientId('');
            setClientSearchText('');
            setSelectedSaleIds([]);
            setCantidadLetras(1);
            setLetrasList([{ number: 1, dueDate: '', amount: '', uniqueNumber: '', observation: '' }]);
            setNotes('');

            // Reload data
            fetchInitialData();
        } catch (error: any) {
            console.error('Error creating letra group:', error);
            toast.error(error.response?.data?.message || 'Error al procesar el lote de letras');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async (id: string) => {
        setProcessingGroupId(id);
        try {
            await api.post(`/sales/letra-groups/${id}/approve`);
            toast.success('Lote de letras aprobado. Facturas canceladas.');
            fetchInitialData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al aprobar lote');
        } finally {
            setProcessingGroupId(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessingGroupId(id);
        try {
            await api.post(`/sales/letra-groups/${id}/reject`);
            toast.success('Lote de letras rechazado.');
            fetchInitialData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al rechazar lote');
        } finally {
            setProcessingGroupId(null);
        }
    };

    const handleAdjustBalance = async (e: React.FormEvent) => {
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
            fetchInitialData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al ajustar saldo');
        } finally {
            setIsAdjusting(false);
        }
    };

    const cardClass = "bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl";

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Módulo de Letras</h1>
                        <p className="text-slate-500 font-medium text-lg mt-1">Gestión de refinanciamiento, canje por lote de facturas y cronogramas de pago.</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando cuentas por cobrar...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LEFT FORM: Client & Invoice Selector + install scheduler */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className={cardClass}>
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2 border-b border-slate-50 pb-3">
                                    <Coins className="w-5 h-5 text-indigo-600" />
                                    1. Selección de Cliente y Ventas
                                </h2>

                                <div className="space-y-6">
                                    {/* Searchable Client Selector */}
                                    <div className="relative">
                                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Cliente Comercial</label>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={clientSearchText}
                                                onChange={(e) => {
                                                    setClientSearchText(e.target.value);
                                                    setSelectedClientId('');
                                                    setSelectedSaleIds([]);
                                                    setIsClientDropdownOpen(true);
                                                }}
                                                onFocus={() => setIsClientDropdownOpen(true)}
                                                placeholder="Escribe el nombre o documento del cliente..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-10 py-3 font-bold text-slate-800 outline-none text-xs focus:ring-2 focus:ring-indigo-500/20"
                                            />
                                            {clientSearchText && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setClientSearchText('');
                                                        setSelectedClientId('');
                                                        setSelectedSaleIds([]);
                                                        setIsClientDropdownOpen(false);
                                                    }}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition active:scale-90"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Dropdown backdrop listener */}
                                        {isClientDropdownOpen && (
                                            <div 
                                                className="fixed inset-0 z-10" 
                                                onClick={() => setIsClientDropdownOpen(false)} 
                                            />
                                        )}

                                        {/* Suggestions Dropdown list */}
                                        {isClientDropdownOpen && filteredClients.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-50">
                                                {filteredClients.map(c => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => {
                                                            setSelectedClientId(c.id);
                                                            setClientSearchText(`${c.name.toUpperCase()} (RUC/DNI: ${c.documentNumber})`);
                                                            setIsClientDropdownOpen(false);
                                                        }}
                                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700 transition uppercase"
                                                    >
                                                        {c.name} <span className="text-slate-400 font-medium font-mono text-[10px] ml-1.5">| {c.documentNumber}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {isClientDropdownOpen && filteredClients.length === 0 && (
                                            <div className="absolute z-20 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 text-center text-xs font-bold text-slate-400 italic">
                                                No se encontraron clientes
                                            </div>
                                        )}
                                    </div>

                                    {selectedClientId && (
                                        <div className="space-y-4">
                                            <label className="block text-[9px] font-black uppercase text-slate-400">Facturas / Ventas Pendientes de Cobro</label>
                                            
                                            {clientSales.length === 0 ? (
                                                <p className="text-slate-400 font-bold uppercase text-[10px] bg-slate-50 rounded-2xl p-6 text-center">
                                                    No hay ventas pendientes de canje para este cliente.
                                                </p>
                                            ) : (
                                                <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                                    <table className="w-full text-left text-xs border-collapse">
                                                        <thead>
                                                            <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase">
                                                                <th className="px-4 py-3 text-center w-12">Select</th>
                                                                <th className="px-4 py-3">Nro Factura / Fecha</th>
                                                                <th className="px-4 py-3 text-right">Monto Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                                            {clientSales.map(sale => {
                                                                const isChecked = selectedSaleIds.includes(sale.id);
                                                                return (
                                                                    <tr 
                                                                        key={sale.id}
                                                                        onClick={() => {
                                                                            if (isChecked) {
                                                                                setSelectedSaleIds(selectedSaleIds.filter(id => id !== sale.id));
                                                                            } else {
                                                                                setSelectedSaleIds([...selectedSaleIds, sale.id]);
                                                                            }
                                                                        }}
                                                                        className={`hover:bg-slate-50/40 cursor-pointer transition ${isChecked ? 'bg-indigo-50/20' : ''}`}
                                                                    >
                                                                        <td className="px-4 py-3 text-center">
                                                                            <div className={`w-5 h-5 mx-auto rounded-lg border flex items-center justify-center transition-all ${
                                                                                isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                                                                            }`}>
                                                                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 uppercase">
                                                                            <div className="text-slate-900 font-black">{sale.invoiceNumber || 'S/N'}</div>
                                                                            <div className="text-[9px] text-slate-400 mt-0.5">{new Date(sale.createdAt).toLocaleDateString()}</div>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right font-black text-slate-900">
                                                                            S/. {sale.totalAmount.toFixed(2)}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedSaleIds.length > 0 && (
                                <form onSubmit={handleCreateGroup} className={`${cardClass} space-y-6`}>
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2 border-b border-slate-50 pb-3">
                                        <FileSignature className="w-5 h-5 text-indigo-600" />
                                        2. Cronograma de Letras de Cambio
                                    </h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Cantidad de Cuotas (Letras)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={24}
                                                value={cantidadLetras}
                                                onChange={(e) => handleCantidadLetrasChange(parseInt(e.target.value))}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none text-xs"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Installments Table editor */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black uppercase text-slate-400">Detalle de Cuotas</label>
                                        <div className="space-y-3">
                                            {letrasList.map((letra, idx) => (
                                                <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs font-bold text-slate-700">
                                                    <div className="sm:col-span-1 text-center font-black text-indigo-600 uppercase text-[10px]">
                                                        Cuota {letra.number}
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <label className="block text-[8px] uppercase text-slate-400 mb-1">Monto (S/.)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={letra.amount}
                                                            onChange={(e) => handleLetraFieldChange(idx, 'amount', e.target.value)}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <label className="block text-[8px] uppercase text-slate-400 mb-1">Vencimiento</label>
                                                        <input
                                                            type="date"
                                                            value={letra.dueDate}
                                                            onChange={(e) => handleLetraFieldChange(idx, 'dueDate', e.target.value)}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <label className="block text-[8px] uppercase text-slate-400 mb-1">Nro Único</label>
                                                        <input
                                                            type="text"
                                                            value={letra.uniqueNumber}
                                                            placeholder="Opcional"
                                                            onChange={(e) => handleLetraFieldChange(idx, 'uniqueNumber', e.target.value)}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <label className="block text-[8px] uppercase text-slate-400 mb-1">Observación</label>
                                                        <input
                                                            type="text"
                                                            value={letra.observation}
                                                            placeholder="Opcional"
                                                            onChange={(e) => handleLetraFieldChange(idx, 'observation', e.target.value)}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Comentarios / Observaciones</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={3}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs"
                                            placeholder="Detalle sobre el acuerdo o refinanciamiento..."
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-slate-50">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-2xl transition active:scale-95 shadow-md flex items-center gap-2"
                                        >
                                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Registrar Compromiso de Letras
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Summary cards */}
                        <div className="space-y-8">
                            {/* Summary panel */}
                            {selectedSaleIds.length > 0 && (
                                <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-4">Resumen del Canje</h3>
                                    
                                    <div className="space-y-4 text-xs font-bold uppercase tracking-wider">
                                        <div className="flex justify-between border-b border-white/5 pb-2.5">
                                            <span className="text-slate-400">Total Facturas:</span>
                                            <span>S/. {totalSalesSelected.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-2.5">
                                            <span className="text-slate-400">Total en Letras:</span>
                                            <span>S/. {totalLetrasProgrammed.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 text-sm font-black">
                                            <span className="text-slate-200">Saldo Sobrante:</span>
                                            <span className={pendingDiffBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                                                S/. {pendingDiffBalance.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {pendingDiffBalance > 0 && (
                                        <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[10px] text-amber-300 font-bold leading-normal uppercase">
                                            ⚠️ El saldo sobrante de S/. {pendingDiffBalance.toFixed(2)} quedará registrado como saldo pendiente del cliente para ser liquidado posteriormente.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* FULL-WIDTH TABLE: History List */}
                {!isLoading && (
                    <div className={`${cardClass} overflow-hidden`}>
                        <div className="border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Historial de Canjes de Letras</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Listado y estados de letras refinanciadas por cliente.</p>
                        </div>
                        
                        <div className="overflow-x-auto -mx-8">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="px-8 py-4">Cliente / Registro</th>
                                        <th className="px-8 py-4">Facturas Asociadas</th>
                                        <th className="px-8 py-4 text-right">Total Facturas</th>
                                        <th className="px-8 py-4 text-right">Total Letras</th>
                                        <th className="px-8 py-4 text-right">Saldo Pendiente</th>
                                        <th className="px-8 py-4 text-center">Estado</th>
                                        <th className="px-8 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                    {groups.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-8 py-16 text-center text-slate-400 italic">No hay canjes registrados.</td>
                                        </tr>
                                    ) : (
                                        groups.map(g => (
                                            <tr key={g.id} className="hover:bg-slate-50/30 transition">
                                                <td className="px-8 py-4 uppercase">
                                                    <div className="text-slate-900 font-black text-xs">{g.client?.name}</div>
                                                    <div className="text-[9px] text-slate-400 mt-0.5">Registrado: {new Date(g.createdAt).toLocaleDateString()}</div>
                                                    {g.registeredByName && (
                                                        <div className="text-[9px] text-indigo-500/80 font-black mt-0.5">Por: {g.registeredByName.toUpperCase()}</div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-4 max-w-xs truncate uppercase text-slate-500">
                                                    {g.sales?.map((s: any) => s.invoiceNumber || 'S/N').join(', ') || 'Sin facturas'}
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
                                                        <div className="text-[8px] text-slate-400 mt-0.5 uppercase">Referencia: {g.creditNoteNumber}</div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                        g.status === 'APROBADO' ? 'bg-emerald-50 text-emerald-600' :
                                                        g.status === 'RECHAZADO' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600 animate-pulse'
                                                    }`}>
                                                        {g.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        {g.status === 'PENDIENTE' && isCommercialOrAdmin && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApprove(g.id)}
                                                                    disabled={processingGroupId === g.id}
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-sm"
                                                                >
                                                                    {processingGroupId === g.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                    Aprobar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReject(g.id)}
                                                                    disabled={processingGroupId === g.id}
                                                                    className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-sm"
                                                                >
                                                                    {processingGroupId === g.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                                                    Rechazar
                                                                </button>
                                                            </>
                                                        )}
                                                        
                                                        {g.status === 'APROBADO' && g.pendingBalance > 0 && isCommercialOrAdmin && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedGroupForAdjustment(g);
                                                                    setAdjustmentAmount(g.pendingBalance.toFixed(2));
                                                                }}
                                                                className="bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-black uppercase px-4 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5 shadow-sm"
                                                            >
                                                                <Coins className="w-3.5 h-3.5" />
                                                                Ajustar Saldo
                                                            </button>
                                                        )}
                                                    </div>
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

            {/* MODAL: Adjust Balance / Credit Note */}
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

                        <form onSubmit={handleAdjustBalance} className="space-y-4 text-xs font-bold text-slate-700">
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
        </Layout>
    );
}
