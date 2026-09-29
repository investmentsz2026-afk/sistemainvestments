'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    User,
    Download,
    Printer,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    ShoppingBag,
    DollarSign,
    Phone,
    MapPin,
    Copy,
    Check,
    Receipt,
    RefreshCw,
    Calendar,
    Filter
} from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';

interface ClientAccountStatementModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialClientId?: string | null;
    sales?: any[];
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (dateString.endsWith('T00:00:00.000Z')) {
        return new Date(dateString).toLocaleDateString('es-PE', { timeZone: 'UTC' });
    }
    return new Date(dateString).toLocaleDateString('es-PE');
};

const formatCurrency = (amount: number) => {
    return `S/ ${(amount || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ClientAccountStatementModal({
    isOpen,
    onClose,
    initialClientId,
    sales: preloadedSales
}: ClientAccountStatementModalProps) {
    const [clients, setClients] = useState<any[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [clientSales, setClientSales] = useState<any[]>([]);
    const [isLoadingSales, setIsLoadingSales] = useState(false);
    const [isExportingImage, setIsExportingImage] = useState(false);
    const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

    // Period filter state: Semester / Annual / All
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [periodType, setPeriodType] = useState<'1S' | '2S' | 'ANUAL' | 'TODOS'>('ANUAL');

    const statementCardRef = useRef<HTMLDivElement>(null);

    // Load clients on modal open
    useEffect(() => {
        if (isOpen) {
            fetchClients();
        } else {
            setClientSearch('');
            if (!initialClientId) {
                setSelectedClient(null);
                setClientSales([]);
            }
        }
    }, [isOpen]);

    // Handle initial client if provided
    useEffect(() => {
        if (isOpen && initialClientId && clients.length > 0) {
            const client = clients.find(c => c.id === initialClientId);
            if (client) {
                handleSelectClient(client);
            }
        }
    }, [isOpen, initialClientId, clients]);

    const fetchClients = async () => {
        setIsLoadingClients(true);
        try {
            const resp = await api.get('/sales/clients');
            setClients(resp.data || []);
        } catch (error) {
            console.error('Error fetching clients for account statement:', error);
            if (preloadedSales && preloadedSales.length > 0) {
                const uniqueClientsMap = new Map();
                preloadedSales.forEach(s => {
                    if (s.client && !uniqueClientsMap.has(s.client.id)) {
                        uniqueClientsMap.set(s.client.id, s.client);
                    }
                });
                setClients(Array.from(uniqueClientsMap.values()));
            }
        } finally {
            setIsLoadingClients(false);
        }
    };

    const handleSelectClient = async (client: any) => {
        setSelectedClient(client);
        setClientSearch('');
        setIsLoadingSales(true);
        try {
            const resp = await api.get('/sales', { params: { clientId: client.id } });
            const salesData = resp.data || [];
            setClientSales(salesData);

            // Auto-select latest year with sales if available
            if (salesData.length > 0) {
                const years = salesData
                    .map((s: any) => new Date(s.createdAt).getFullYear())
                    .filter((y: number) => !isNaN(y));
                if (years.length > 0) {
                    const latest = Math.max(...years);
                    setSelectedYear(latest);
                }
            }
        } catch (error) {
            console.error('Error fetching sales for client:', error);
            if (preloadedSales) {
                const filtered = preloadedSales.filter(s => s.clientId === client.id || s.client?.id === client.id);
                setClientSales(filtered);
            } else {
                toast.error('No se pudieron cargar las compras del cliente');
            }
        } finally {
            setIsLoadingSales(false);
        }
    };

    // Filtered client list for searching
    const filteredClients = useMemo(() => {
        if (!clientSearch.trim()) return clients.slice(0, 15);
        const search = clientSearch.toLowerCase().trim();
        return clients.filter(c =>
            (c.name && c.name.toLowerCase().includes(search)) ||
            (c.documentNumber && c.documentNumber.includes(search)) ||
            (c.phone && c.phone.includes(search)) ||
            (c.zone && c.zone.toLowerCase().includes(search))
        ).slice(0, 20);
    }, [clients, clientSearch]);

    // Available years from sales
    const availableYears = useMemo(() => {
        const yearsSet = new Set<number>();
        yearsSet.add(currentYear);
        clientSales.forEach(s => {
            if (s.createdAt) {
                const y = new Date(s.createdAt).getFullYear();
                if (!isNaN(y)) yearsSet.add(y);
            }
        });
        return Array.from(yearsSet).sort((a, b) => b - a);
    }, [clientSales, currentYear]);

    // Period sales filtered by selected Year and Period (1S, 2S, ANUAL, TODOS)
    const periodSales = useMemo(() => {
        return clientSales.filter(sale => {
            if (!sale.createdAt) return false;
            const d = new Date(sale.createdAt);
            const y = d.getFullYear();
            const m = d.getMonth(); // 0: Jan, 5: Jun, 6: Jul, 11: Dec

            if (periodType === 'TODOS') return true;
            if (y !== selectedYear) return false;

            if (periodType === '1S') {
                return m >= 0 && m <= 5; // 1er Semestre: Ene - Jun
            }
            if (periodType === '2S') {
                return m >= 6 && m <= 11; // 2do Semestre: Jul - Dic
            }
            if (periodType === 'ANUAL') {
                return true; // Todo el año seleccionado
            }
            return true;
        });
    }, [clientSales, selectedYear, periodType]);

    // Text label for the active period
    const periodLabel = useMemo(() => {
        if (periodType === '1S') return `1er Semestre ${selectedYear} (Ene - Jun)`;
        if (periodType === '2S') return `2do Semestre ${selectedYear} (Jul - Dic)`;
        if (periodType === 'ANUAL') return `Año ${selectedYear}`;
        return 'Histórico Completo';
    }, [periodType, selectedYear]);

    // Metrics for the filtered period
    const metrics = useMemo(() => {
        const activeSales = periodSales.filter(s => s.status !== 'ANULADO');

        let totalAmount = 0;
        let totalPaid = 0;
        let paidCount = 0;
        let pendingCount = 0;

        activeSales.forEach(s => {
            const saleTotal = Number(s.totalAmount) || 0;
            totalAmount += saleTotal;

            const paid = (s.payments || [])
                .filter((p: any) => p.status === 'APROBADO')
                .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
            totalPaid += paid;

            if (paid >= saleTotal - 0.01) {
                paidCount++;
            } else {
                pendingCount++;
            }
        });

        const totalBalance = Math.max(0, totalAmount - totalPaid);

        return {
            activeCount: activeSales.length,
            totalAmount,
            totalPaid,
            totalBalance,
            paidCount,
            pendingCount
        };
    }, [periodSales]);

    // Download Statement as PNG Image using html2canvas
    const handleDownloadImage = async () => {
        if (!statementCardRef.current || !selectedClient) {
            toast.error('Selecciona un cliente para exportar');
            return;
        }

        setIsExportingImage(true);
        const loadingToast = toast.loading('Generando imagen compacta en alta resolución...');

        try {
            const html2canvas = (await import('html2canvas')).default;
            const element = statementCardRef.current;

            const canvas = await html2canvas(element, {
                scale: 2.2, // High resolution for mobile
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: element.scrollWidth,
            });

            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const cleanClient = selectedClient.name
                .replace(/[^a-zA-Z0-9]/g, '_')
                .replace(/__+/g, '_')
                .substring(0, 20);
            const periodTag = periodType === '1S'
                ? `1er_Semestre_${selectedYear}`
                : periodType === '2S'
                    ? `2do_Semestre_${selectedYear}`
                    : periodType === 'ANUAL'
                        ? `Anual_${selectedYear}`
                        : 'Historico';

            link.download = `Estado_Cuenta_${cleanClient}_${periodTag}.png`;
            link.href = imgData;
            link.click();

            toast.success('¡Imagen descargada con éxito!', { id: loadingToast });
        } catch (error) {
            console.error('Error al generar imagen de estado de cuenta:', error);
            toast.error('No se pudo generar la imagen', { id: loadingToast });
        } finally {
            setIsExportingImage(false);
        }
    };

    // Copy formatted WhatsApp summary
    const handleCopyWhatsApp = () => {
        if (!selectedClient) return;

        const activeSales = periodSales.filter(s => s.status !== 'ANULADO');
        const emissionDate = new Date().toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const lines = [
            `📄 *ESTADO DE CUENTA - INVESTMENTS Z&G S.A.*`,
            `🗓️ *Periodo:* ${periodLabel}`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `👤 *Cliente:* ${selectedClient.name}`,
            `🆔 *${selectedClient.documentType || 'DOC'}:* ${selectedClient.documentNumber || 'S/N'}`,
            selectedClient.phone ? `📞 *Tel:* ${selectedClient.phone}` : null,
            `📅 *Emisión:* ${emissionDate}`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `📊 *RESUMEN DEL PERIODO:*`,
            `• Compras: ${metrics.activeCount} comprobante(s)`,
            `• Total Facturado: S/ ${metrics.totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
            `• Total Pagado: S/ ${metrics.totalPaid.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
            metrics.totalBalance > 0
                ? `🔴 *SALDO PENDIENTE: S/ ${metrics.totalBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}*`
                : `🟢 *ESTADO: AL DÍA (TOTALMENTE CANCELADO)*`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `📋 *DETALLE:*`,
            ...activeSales.map((s, idx) => {
                const paid = (s.payments || [])
                    .filter((p: any) => p.status === 'APROBADO')
                    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
                const bal = Math.max(0, (Number(s.totalAmount) || 0) - paid);
                const sDate = formatDate(s.createdAt);
                const doc = s.invoiceNumber ? s.invoiceNumber : `#${s.id.slice(-6).toUpperCase()}`;
                const statusTag = bal <= 0.01 ? 'CANCELADO' : paid > 0 ? `PARCIAL (Resta S/ ${bal.toFixed(2)})` : 'PENDIENTE';
                return `${idx + 1}. ${sDate} | ${doc} | Total: S/ ${s.totalAmount.toFixed(2)} | Pagado: S/ ${paid.toFixed(2)} | Saldo: S/ ${bal.toFixed(2)} [${statusTag}]`;
            }),
            `\n_Para cualquier consulta comunicarse con el área comercial de Investments Z&G._`
        ].filter(Boolean).join('\n');

        navigator.clipboard.writeText(lines);
        setCopiedWhatsApp(true);
        toast.success('¡Resumen copiado para enviar por WhatsApp!');
        setTimeout(() => setCopiedWhatsApp(false), 2500);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-transparent"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[92vh] z-10"
                >
                    {/* MODAL TOP HEADER */}
                    <div className="bg-slate-900 p-5 sm:p-6 text-white shrink-0 relative border-b border-slate-800">
                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 p-2 text-white/50 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition active:scale-95"
                            title="Cerrar modal"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                        Estado de Cuenta
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            Clientes
                                        </span>
                                    </h2>
                                    <p className="text-xs text-slate-300">
                                        Filtra por semestre o año y descarga la imagen optimizada para enviar al cliente.
                                    </p>
                                </div>
                            </div>

                            {selectedClient && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDownloadImage}
                                        disabled={isExportingImage || periodSales.length === 0}
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50"
                                        title="Descargar este estado de cuenta en imagen PNG"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>{isExportingImage ? 'Generando...' : 'Descargar Imagen'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCopyWhatsApp}
                                        disabled={periodSales.length === 0}
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50"
                                        title="Copiar texto para WhatsApp"
                                    >
                                        {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedWhatsApp ? '¡Copiado!' : 'WhatsApp'}</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* CLIENT SEARCH BAR & SELECTOR */}
                        <div className="mt-4 pt-3 border-t border-slate-800">
                            {selectedClient ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                                            {selectedClient.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-white text-sm uppercase">
                                                    {selectedClient.name}
                                                </h3>
                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                                    {selectedClient.documentType || 'DOC'}: {selectedClient.documentNumber || 'S/N'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                {selectedClient.phone ? `Tel: ${selectedClient.phone} • ` : ''}Zona: {selectedClient.zone || 'OFICINA'}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedClient(null);
                                            setClientSales([]);
                                            setClientSearch('');
                                        }}
                                        className="self-end sm:self-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center gap-1"
                                    >
                                        <Search className="w-3 h-3" /> Cambiar Cliente
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={clientSearch}
                                            onChange={(e) => setClientSearch(e.target.value)}
                                            placeholder="Buscar cliente por Nombre, Razón Social, RUC o DNI..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 text-white placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs font-medium transition"
                                            autoFocus
                                        />
                                        {clientSearch && (
                                            <button
                                                onClick={() => setClientSearch('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Auto-suggest dropdown */}
                                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20 max-h-60 overflow-y-auto">
                                        {isLoadingClients ? (
                                            <div className="p-4 text-center text-gray-400 font-bold text-xs uppercase tracking-wider">
                                                Cargando clientes...
                                            </div>
                                        ) : filteredClients.length === 0 ? (
                                            <div className="p-4 text-center text-gray-400 font-medium text-xs">
                                                No se encontraron clientes con &quot;{clientSearch}&quot;
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {filteredClients.map((client) => (
                                                    <button
                                                        key={client.id}
                                                        type="button"
                                                        onClick={() => handleSelectClient(client)}
                                                        className="w-full p-3 text-left hover:bg-emerald-50/60 transition flex items-center justify-between group"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center font-bold text-xs text-gray-700 transition">
                                                                {client.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-900 text-xs group-hover:text-emerald-700 transition">
                                                                    {client.name}
                                                                </h4>
                                                                <p className="text-[10px] text-gray-400 font-mono">
                                                                    {client.documentType}: {client.documentNumber || 'S/N'} {client.phone ? `• Tel: ${client.phone}` : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                                            Elegir →
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MODAL BODY */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-4">
                        {!selectedClient ? (
                            <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-gray-200 max-w-sm mx-auto my-10 space-y-3">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                                    <User className="w-6 h-6" />
                                </div>
                                <h3 className="text-base font-black text-gray-900 uppercase">
                                    Selecciona un Cliente
                                </h3>
                                <p className="text-xs text-gray-500 font-medium">
                                    Usa el buscador para elegir el cliente y ver su estado de cuenta semestral o anual.
                                </p>
                            </div>
                        ) : isLoadingSales ? (
                            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm space-y-2">
                                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
                                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    Cargando historial de ventas...
                                </h4>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* ── FILTROS DE PERIODO (SEMESTRAL / ANUAL) ── */}
                                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span className="text-xs font-black uppercase text-gray-700 tracking-wider">
                                            Año:
                                        </span>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                                            className="bg-gray-100 border border-gray-300 text-gray-900 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            {availableYears.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Period Tabs */}
                                    <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setPeriodType('1S')}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition ${periodType === '1S' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            1er Semestre (Ene - Jun)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPeriodType('2S')}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition ${periodType === '2S' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            2do Semestre (Jul - Dic)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPeriodType('ANUAL')}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition ${periodType === 'ANUAL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Anual {selectedYear}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPeriodType('TODOS')}
                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition ${periodType === 'TODOS' ? 'bg-slate-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                                            title="Ver todas las ventas históricas"
                                        >
                                            Todo
                                        </button>
                                    </div>
                                </div>

                                {/* ── THE COMPACT PRINTABLE / EXPORTABLE ACCOUNT STATEMENT CARD ── */}
                                <div
                                    id="account-statement-printable"
                                    ref={statementCardRef}
                                    className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-4 text-gray-900"
                                >
                                    {/* 1. Sleek Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-black tracking-tight text-gray-900">
                                                INVESTMENTS Z&amp;G S.A.
                                            </span>
                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                                RUC: 20608552391
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 sm:text-right">
                                            <span className="text-[11px] font-black uppercase tracking-wide text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                                ESTADO DE CUENTA: {periodLabel}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {new Date().toLocaleDateString('es-PE')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 2. Compact Client Strip + Mini KPI Badges (Minimal vertical height) */}
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                        {/* Client Info */}
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Cliente:</span>
                                                <h4 className="font-black text-gray-900 uppercase text-xs">
                                                    {selectedClient.name}
                                                </h4>
                                            </div>
                                            <p className="text-[11px] text-gray-600 flex flex-wrap items-center gap-3">
                                                <span><strong>{selectedClient.documentType || 'DOC'}:</strong> {selectedClient.documentNumber || 'S/N'}</span>
                                                <span><strong>Zona:</strong> {selectedClient.zone || 'OFICINA'}</span>
                                                {selectedClient.phone && <span><strong>Tel:</strong> {selectedClient.phone}</span>}
                                            </p>
                                        </div>

                                        {/* 4 Small Horizontal Metric Pills */}
                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs text-center">
                                                <span className="text-[9px] font-black uppercase text-gray-400 block leading-tight">Compras</span>
                                                <span className="text-xs font-black text-gray-900">{metrics.activeCount}</span>
                                            </div>

                                            <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs text-center">
                                                <span className="text-[9px] font-black uppercase text-blue-600 block leading-tight">Facturado</span>
                                                <span className="text-xs font-black font-mono text-blue-900">{formatCurrency(metrics.totalAmount)}</span>
                                            </div>

                                            <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs text-center">
                                                <span className="text-[9px] font-black uppercase text-emerald-600 block leading-tight">Pagado</span>
                                                <span className="text-xs font-black font-mono text-emerald-900">{formatCurrency(metrics.totalPaid)}</span>
                                            </div>

                                            <div className={`px-2.5 py-1.5 rounded-lg border shadow-2xs text-center ${metrics.totalBalance > 0.01 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'}`}>
                                                <span className={`text-[9px] font-black uppercase block leading-tight ${metrics.totalBalance > 0.01 ? 'text-rose-700' : 'text-emerald-700'}`}>Saldo</span>
                                                <span className={`text-xs font-black font-mono ${metrics.totalBalance > 0.01 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                    {formatCurrency(metrics.totalBalance)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Streamlined Table (Fecha, Comprobante, Total Venta, Pagado, Saldo) */}
                                    <div className="space-y-1.5">
                                        {periodSales.length === 0 ? (
                                            <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                                                No registra ventas en este periodo ({periodLabel}).
                                            </div>
                                        ) : (
                                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-100 text-[10px] font-black text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                                            <th className="py-2.5 px-3">Fecha</th>
                                                            <th className="py-2.5 px-3">Comprobante</th>
                                                            <th className="py-2.5 px-3 text-right">Total Venta</th>
                                                            <th className="py-2.5 px-3 text-right">Pagado</th>
                                                            <th className="py-2.5 px-3 text-right">Saldo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 text-xs">
                                                        {periodSales.map((sale, idx) => {
                                                            const isCancelled = sale.status === 'ANULADO';
                                                            const totalPaid = (sale.payments || [])
                                                                .filter((p: any) => p.status === 'APROBADO')
                                                                .reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
                                                            const balance = isCancelled ? 0 : Math.max(0, (Number(sale.totalAmount) || 0) - totalPaid);

                                                            return (
                                                                <tr
                                                                    key={sale.id}
                                                                    className={`hover:bg-slate-50 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                                                                >
                                                                    <td className="py-2 px-3 font-bold text-gray-700 whitespace-nowrap text-[11px]">
                                                                        {formatDate(sale.createdAt)}
                                                                    </td>
                                                                    <td className="py-2 px-3 font-mono font-bold text-gray-900 text-xs">
                                                                        {sale.invoiceNumber ? (
                                                                            <span className="text-indigo-700">{sale.invoiceNumber}</span>
                                                                        ) : (
                                                                            <span className="text-gray-500">#{sale.id.slice(-6).toUpperCase()}</span>
                                                                        )}
                                                                        {isCancelled && (
                                                                            <span className="ml-1.5 text-[9px] font-black uppercase text-gray-400 bg-gray-100 px-1 py-0.5 rounded">
                                                                                Anulado
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className={`py-2 px-3 text-right font-mono font-bold ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                                                        {formatCurrency(sale.totalAmount)}
                                                                    </td>
                                                                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                                                        {formatCurrency(totalPaid)}
                                                                    </td>
                                                                    <td className={`py-2 px-3 text-right font-mono font-black ${balance > 0.01 ? 'text-rose-600' : 'text-gray-400'}`}>
                                                                        {formatCurrency(balance)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-300">
                                                            <td colSpan={2} className="py-2.5 px-3 uppercase text-gray-800 tracking-wider">
                                                                TOTAL ({periodLabel})
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-mono text-blue-900">
                                                                {formatCurrency(metrics.totalAmount)}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                                                                {formatCurrency(metrics.totalPaid)}
                                                            </td>
                                                            <td className={`py-2.5 px-3 text-right font-mono ${metrics.totalBalance > 0.01 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                                {formatCurrency(metrics.totalBalance)}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. Compact Footer Note */}
                                    <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-gray-400 gap-1">
                                        <p>
                                            * Documento oficial de cobranzas y cuentas comerciales • Investments Z&amp;G S.A.
                                        </p>
                                        <p className="font-mono text-gray-400">
                                            RUC: 20608552391
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MODAL FOOTER */}
                    <div className="p-3.5 sm:p-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                        <div className="text-xs text-gray-500 font-medium">
                            {selectedClient ? (
                                <span>
                                    Mostrando <strong>{periodSales.length} ventas</strong> para <strong>{selectedClient.name}</strong> ({periodLabel})
                                </span>
                            ) : (
                                <span>Selecciona un cliente para generar el estado de cuenta</span>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition active:scale-95"
                            >
                                Cerrar
                            </button>

                            {selectedClient && periodSales.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleDownloadImage}
                                    disabled={isExportingImage}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{isExportingImage ? 'Generando...' : 'Descargar Imagen'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
