'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    User,
    Download,
    Share2,
    Printer,
    FileSpreadsheet,
    FileText,
    CheckCircle2,
    AlertCircle,
    Clock,
    ShoppingBag,
    DollarSign,
    Phone,
    MapPin,
    Mail,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    CreditCard,
    ArrowUpRight,
    Building2,
    Calendar,
    Receipt,
    RefreshCw
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
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
    const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

    const statementCardRef = useRef<HTMLDivElement>(null);

    // Load clients on modal open
    useEffect(() => {
        if (isOpen) {
            fetchClients();
        } else {
            // Reset when closing
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
            // Fallback: extract unique clients from preloaded sales if available
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
            setClientSales(resp.data || []);
        } catch (error) {
            console.error('Error fetching sales for client:', error);
            // Fallback to preloaded sales
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

    // Financial Metrics for Selected Client
    const metrics = useMemo(() => {
        if (!selectedClient) {
            return {
                totalCount: 0,
                activeCount: 0,
                cancelledCount: 0,
                totalAmount: 0,
                totalPaid: 0,
                totalBalance: 0,
                paidCount: 0,
                pendingCount: 0
            };
        }

        const activeSales = clientSales.filter(s => s.status !== 'ANULADO');
        const cancelledSales = clientSales.filter(s => s.status === 'ANULADO');

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
            totalCount: clientSales.length,
            activeCount: activeSales.length,
            cancelledCount: cancelledSales.length,
            totalAmount,
            totalPaid,
            totalBalance,
            paidCount,
            pendingCount
        };
    }, [selectedClient, clientSales]);

    // Filtered sales according to active tab
    const displaySales = useMemo(() => {
        return clientSales.filter(sale => {
            if (sale.status === 'ANULADO') return statusFilter === 'ALL';
            const paid = (sale.payments || [])
                .filter((p: any) => p.status === 'APROBADO')
                .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
            const isFullyPaid = paid >= (Number(sale.totalAmount) || 0) - 0.01;

            if (statusFilter === 'PAID') return isFullyPaid;
            if (statusFilter === 'PENDING') return !isFullyPaid;
            return true;
        });
    }, [clientSales, statusFilter]);

    // Download Statement as PNG Image using html2canvas
    const handleDownloadImage = async () => {
        if (!statementCardRef.current || !selectedClient) {
            toast.error('Selecciona un cliente para exportar');
            return;
        }

        setIsExportingImage(true);
        const loadingToast = toast.loading('Generando imagen en alta resolución...');

        try {
            const html2canvas = (await import('html2canvas')).default;
            const element = statementCardRef.current;

            // Render high-res image
            const canvas = await html2canvas(element, {
                scale: 2.5, // Crisp 2.5x resolution for retina and mobile viewing
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
                .substring(0, 25);
            const dateStr = new Date().toISOString().split('T')[0];
            link.download = `Estado_Cuenta_${cleanClient}_${dateStr}.png`;
            link.href = imgData;
            link.click();

            toast.success('¡Estado de cuenta descargado como imagen!', { id: loadingToast });
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

        const activeSales = clientSales.filter(s => s.status !== 'ANULADO');
        const emissionDate = new Date().toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const lines = [
            `📄 *ESTADO DE CUENTA - INVESTMENTS Z&G S.A.*`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `👤 *Cliente:* ${selectedClient.name}`,
            `🆔 *${selectedClient.documentType || 'DOC'}:* ${selectedClient.documentNumber || 'S/N'}`,
            selectedClient.phone ? `📞 *Teléfono:* ${selectedClient.phone}` : null,
            selectedClient.address ? `📍 *Dirección:* ${selectedClient.address}` : null,
            `📅 *Fecha de Emisión:* ${emissionDate}`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `📊 *RESUMEN DE CUENTA:*`,
            `• Compras Realizadas: ${metrics.activeCount} comprobante(s)`,
            `• Monto Total Facturado: S/ ${metrics.totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
            `• Total Abonado / Pagado: S/ ${metrics.totalPaid.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            metrics.totalBalance > 0
                ? `🔴 *SALDO PENDIENTE POR PAGAR: S/ ${metrics.totalBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}*`
                : `🟢 *ESTADO: AL DÍA (TOTALMENTE CANCELADO - SIN DEUDA)*`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `📋 *DETALLE DE COMPROBANTES:*`,
            ...activeSales.map((s, idx) => {
                const paid = (s.payments || [])
                    .filter((p: any) => p.status === 'APROBADO')
                    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
                const bal = Math.max(0, (Number(s.totalAmount) || 0) - paid);
                const sDate = formatDate(s.createdAt);
                const doc = s.invoiceNumber ? `Doc: ${s.invoiceNumber}` : `Venta #${s.id.slice(-6).toUpperCase()}`;
                const statusTag = bal <= 0.01 ? 'CANCELADO' : paid > 0 ? `PARCIAL (Debe S/ ${bal.toFixed(2)})` : 'PENDIENTE';
                return `${idx + 1}. ${doc} (${sDate}) | Total: S/ ${s.totalAmount.toFixed(2)} | Pagado: S/ ${paid.toFixed(2)} [${statusTag}]`;
            }),
            `\n_Cualquier consulta o coordinación de pagos, comunicarse con el área comercial de Investments Z&G._`
        ].filter(Boolean).join('\n');

        navigator.clipboard.writeText(lines);
        setCopiedWhatsApp(true);
        toast.success('¡Resumen copiado para enviar por WhatsApp!');
        setTimeout(() => setCopiedWhatsApp(false), 2500);
    };

    // Print functionality
    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
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
                    className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[92vh] z-10"
                >
                    {/* MODAL TOP HEADER */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shrink-0 relative border-b border-indigo-900/50">
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-white/50 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition active:scale-95"
                            title="Cerrar modal"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-12">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white shrink-0">
                                    <FileSpreadsheet className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                                            Estado de Cuenta
                                        </h2>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            Clientes
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-indigo-200/80 font-medium mt-0.5">
                                        Historial consolidado de compras, facturas, abonos y saldos pendientes.
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons (when client is selected) */}
                            {selectedClient && (
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={handleDownloadImage}
                                        disabled={isExportingImage || clientSales.length === 0}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50"
                                        title="Descargar este estado de cuenta en formato de imagen PNG para enviar al cliente"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>{isExportingImage ? 'Generando...' : 'Descargar Imagen'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCopyWhatsApp}
                                        disabled={clientSales.length === 0}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50"
                                        title="Copiar resumen para enviar por WhatsApp"
                                    >
                                        {copiedWhatsApp ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                                        <span>{copiedWhatsApp ? '¡Copiado!' : 'WhatsApp'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        disabled={clientSales.length === 0}
                                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition active:scale-95"
                                        title="Imprimir"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* CLIENT SEARCH BAR & SELECTOR */}
                        <div className="mt-6 pt-5 border-t border-indigo-900/60">
                            {selectedClient ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/15">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/30 flex items-center justify-center font-black text-indigo-300 text-lg border border-indigo-400/30">
                                            {selectedClient.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-white text-base tracking-tight uppercase">
                                                    {selectedClient.name}
                                                </h3>
                                                <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md bg-white/20 text-white">
                                                    {selectedClient.documentType}: {selectedClient.documentNumber || 'S/N'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-indigo-200/70 flex items-center gap-3 mt-0.5">
                                                {selectedClient.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3 text-indigo-400" /> {selectedClient.phone}
                                                    </span>
                                                )}
                                                {selectedClient.zone && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3 text-amber-400" /> Zona: {selectedClient.zone}
                                                    </span>
                                                )}
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
                                        className="self-end sm:self-center px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center gap-1.5"
                                    >
                                        <Search className="w-3.5 h-3.5" /> Cambiar Cliente
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="w-5 h-5 text-indigo-300 absolute left-4 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={clientSearch}
                                            onChange={(e) => setClientSearch(e.target.value)}
                                            placeholder="Buscar cliente por Nombre, Razón Social, RUC o DNI..."
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/10 text-white placeholder-indigo-200/50 rounded-2xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-medium transition"
                                            autoFocus
                                        />
                                        {clientSearch && (
                                            <button
                                                onClick={() => setClientSearch('')}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Auto-suggest dropdown */}
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-20 max-h-72 overflow-y-auto">
                                        {isLoadingClients ? (
                                            <div className="p-6 text-center text-gray-400 font-bold text-xs uppercase tracking-wider">
                                                Cargando catálogo de clientes...
                                            </div>
                                        ) : filteredClients.length === 0 ? (
                                            <div className="p-6 text-center text-gray-400 font-medium text-sm">
                                                No se encontraron clientes con el término &quot;{clientSearch}&quot;
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {filteredClients.map((client) => (
                                                    <button
                                                        key={client.id}
                                                        type="button"
                                                        onClick={() => handleSelectClient(client)}
                                                        className="w-full p-4 text-left hover:bg-indigo-50/70 transition flex items-center justify-between group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center font-bold text-sm text-gray-700 transition">
                                                                {client.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition">
                                                                    {client.name}
                                                                </h4>
                                                                <p className="text-xs text-gray-400 font-mono">
                                                                    {client.documentType}: {client.documentNumber || 'S/N'} {client.phone ? `• Tel: ${client.phone}` : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-700 transition">
                                                            Seleccionar →
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
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50 space-y-6">
                        {!selectedClient ? (
                            /* Empty state: prompt to select client */
                            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 max-w-lg mx-auto my-12 space-y-4">
                                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                    <User className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 uppercase">
                                    Selecciona un Cliente
                                </h3>
                                <p className="text-sm text-gray-500 font-medium">
                                    Usa el buscador superior para seleccionar al cliente y visualizar su estado de cuenta consolidado, facturas y saldos pendientes.
                                </p>
                            </div>
                        ) : isLoadingSales ? (
                            /* Loading sales */
                            <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm space-y-3">
                                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                    Consultando ventas y cobranzas del cliente...
                                </h4>
                            </div>
                        ) : (
                            /* ── THE PRINTABLE / EXPORTABLE ACCOUNT STATEMENT CARD ── */
                            <div className="space-y-6">
                                {/* The main card that gets captured into image */}
                                <div
                                    id="account-statement-printable"
                                    ref={statementCardRef}
                                    className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6 text-gray-900"
                                >
                                    {/* Statement Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-100 pb-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-black tracking-tight text-gray-900">
                                                    INVESTMENTS Z&amp;G S.A.
                                                </span>
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                                    RUC: 20608552391
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Sistema de Facturación y Control Comercial
                                            </p>
                                        </div>

                                        <div className="sm:text-right">
                                            <span className="inline-block text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                                Estado de Cuenta Oficial
                                            </span>
                                            <p className="text-[11px] text-gray-400 mt-1 font-medium">
                                                Fecha de Emisión: <strong>{new Date().toLocaleDateString('es-PE')} {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Client Details Box */}
                                    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 p-5 rounded-2xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                                                Cliente / Razón Social
                                            </span>
                                            <h4 className="text-base font-black text-gray-900 mt-0.5 uppercase">
                                                {selectedClient.name}
                                            </h4>
                                            <span className="text-xs font-bold text-indigo-700 font-mono">
                                                {selectedClient.documentType || 'DOC'}: {selectedClient.documentNumber || 'S/N'}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                                                Contacto
                                            </span>
                                            <p className="text-xs font-bold text-gray-800 mt-0.5">
                                                Teléfono: {selectedClient.phone || 'No registrado'}
                                            </p>
                                            <p className="text-xs text-gray-600 truncate">
                                                Email: {selectedClient.email || 'No registrado'}
                                            </p>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                                                Ubicación y Zona
                                            </span>
                                            <p className="text-xs font-bold text-gray-800 mt-0.5">
                                                Zona: <span className="uppercase text-indigo-700">{selectedClient.zone || 'OFICINA'}</span>
                                            </p>
                                            <p className="text-xs text-gray-600 truncate">
                                                Dirección: {selectedClient.address || 'No registrada'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* KPI Summary Cards */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                        <div className="bg-slate-50 border border-slate-200/70 p-4 rounded-2xl">
                                            <div className="flex items-center justify-between text-gray-400 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider">Total Compras</span>
                                                <ShoppingBag className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div className="text-2xl font-black text-gray-900">
                                                {metrics.activeCount}
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-medium">
                                                {metrics.paidCount} canceladas • {metrics.pendingCount} pendientes
                                            </span>
                                        </div>

                                        <div className="bg-blue-50/60 border border-blue-200/70 p-4 rounded-2xl">
                                            <div className="flex items-center justify-between text-blue-600 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider">Total Facturado</span>
                                                <Receipt className="w-4 h-4" />
                                            </div>
                                            <div className="text-2xl font-black text-blue-900 font-mono">
                                                {formatCurrency(metrics.totalAmount)}
                                            </div>
                                            <span className="text-[10px] text-blue-700 font-medium">
                                                Suma de todas sus compras
                                            </span>
                                        </div>

                                        <div className="bg-emerald-50/60 border border-emerald-200/70 p-4 rounded-2xl">
                                            <div className="flex items-center justify-between text-emerald-600 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider">Total Pagado</span>
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                            <div className="text-2xl font-black text-emerald-900 font-mono">
                                                {formatCurrency(metrics.totalPaid)}
                                            </div>
                                            <span className="text-[10px] text-emerald-700 font-medium">
                                                Abonos y pagos conciliados
                                            </span>
                                        </div>

                                        <div className={`p-4 rounded-2xl border ${metrics.totalBalance > 0.01 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${metrics.totalBalance > 0.01 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                    Saldo Pendiente
                                                </span>
                                                <DollarSign className={`w-4 h-4 ${metrics.totalBalance > 0.01 ? 'text-rose-600' : 'text-emerald-600'}`} />
                                            </div>
                                            <div className={`text-2xl font-black font-mono ${metrics.totalBalance > 0.01 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                {formatCurrency(metrics.totalBalance)}
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${metrics.totalBalance > 0.01 ? 'text-rose-800' : 'text-emerald-800'}`}>
                                                {metrics.totalBalance > 0.01 ? '⚠ Por pagar' : '✓ Al día (Sin deuda)'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Alert Banner */}
                                    <div className={`p-4 rounded-2xl flex items-center justify-between border ${metrics.totalBalance > 0.01 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                                        <div className="flex items-center gap-3">
                                            {metrics.totalBalance > 0.01 ? (
                                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                            ) : (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                            )}
                                            <div>
                                                <h5 className="font-black text-xs uppercase tracking-wide">
                                                    {metrics.totalBalance > 0.01
                                                        ? `El cliente registra un saldo pendiente de ${formatCurrency(metrics.totalBalance)}`
                                                        : 'El cliente se encuentra completamente al día en todos sus pagos'}
                                                </h5>
                                                <p className="text-[11px] opacity-80">
                                                    {metrics.totalBalance > 0.01
                                                        ? `De un total de ${metrics.activeCount} compras facturadas, adeuda saldo en ${metrics.pendingCount} comprobante(s).`
                                                        : `Ha cancelado la totalidad de sus compras por un monto de ${formatCurrency(metrics.totalAmount)}.`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right font-mono font-black text-sm">
                                            {metrics.totalAmount > 0 ? `${Math.round((metrics.totalPaid / metrics.totalAmount) * 100)}% Cubierto` : '100%'}
                                        </div>
                                    </div>

                                    {/* Invoices Breakdown Table */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                                                Historial de Facturas y Comprobantes
                                            </h4>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                {displaySales.length} comprobante(s)
                                            </span>
                                        </div>

                                        {clientSales.length === 0 ? (
                                            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-widest">
                                                Este cliente aún no registra compras ni ventas en el sistema.
                                            </div>
                                        ) : (
                                            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-100/80 text-[10px] font-black text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                                            <th className="py-3 px-4">Fecha</th>
                                                            <th className="py-3 px-4">Comprobante</th>
                                                            <th className="py-3 px-4">Condición</th>
                                                            <th className="py-3 px-4 text-right">Total Venta</th>
                                                            <th className="py-3 px-4 text-right">Pagado</th>
                                                            <th className="py-3 px-4 text-right">Saldo</th>
                                                            <th className="py-3 px-4 text-center">Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 text-xs">
                                                        {displaySales.map((sale, idx) => {
                                                            const isCancelled = sale.status === 'ANULADO';
                                                            const totalPaid = (sale.payments || [])
                                                                .filter((p: any) => p.status === 'APROBADO')
                                                                .reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
                                                            const balance = isCancelled ? 0 : Math.max(0, (Number(sale.totalAmount) || 0) - totalPaid);
                                                            const isFullyPaid = !isCancelled && balance <= 0.01;
                                                            const isPartial = !isCancelled && totalPaid > 0 && !isFullyPaid;
                                                            const hasPayments = (sale.payments || []).length > 0;
                                                            const isExpanded = expandedSaleId === sale.id;

                                                            return (
                                                                <tr
                                                                    key={sale.id}
                                                                    className={`hover:bg-slate-50 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
                                                                >
                                                                    <td className="py-3 px-4 font-bold text-gray-700 whitespace-nowrap">
                                                                        {formatDate(sale.createdAt)}
                                                                    </td>
                                                                    <td className="py-3 px-4 font-mono font-black text-gray-900">
                                                                        {sale.invoiceNumber ? (
                                                                            <span className="text-indigo-600">{sale.invoiceNumber}</span>
                                                                        ) : (
                                                                            <span className="text-gray-500">#{sale.id.slice(-6).toUpperCase()}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-3 px-4 uppercase text-[11px] font-bold text-gray-500">
                                                                        {sale.paymentMethod || 'CONTADO'}
                                                                    </td>
                                                                    <td className={`py-3 px-4 text-right font-mono font-bold ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                                                        {formatCurrency(sale.totalAmount)}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                                                                        {formatCurrency(totalPaid)}
                                                                    </td>
                                                                    <td className={`py-3 px-4 text-right font-mono font-black ${balance > 0.01 ? 'text-rose-600' : 'text-gray-400'}`}>
                                                                        {formatCurrency(balance)}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-center">
                                                                        {isCancelled ? (
                                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-500 border border-gray-200">
                                                                                Anulado
                                                                            </span>
                                                                        ) : isFullyPaid ? (
                                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                                Cancelado
                                                                            </span>
                                                                        ) : isPartial ? (
                                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                                                                Parcial
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                                                                Pendiente
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-300">
                                                            <td colSpan={3} className="py-3 px-4 uppercase text-gray-700 tracking-wider">
                                                                TOTAL GENERAL CONSOLIDADO
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-mono text-blue-900">
                                                                {formatCurrency(metrics.totalAmount)}
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-mono text-emerald-800">
                                                                {formatCurrency(metrics.totalPaid)}
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-mono text-rose-700">
                                                                {formatCurrency(metrics.totalBalance)}
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${metrics.totalBalance > 0.01 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                                    {metrics.totalBalance > 0.01 ? 'Con Saldo' : 'Al Día'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Statement Footer Note */}
                                    <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-400 gap-2">
                                        <p>
                                            * Documento oficial de control de cobranzas y cuentas comerciales de Investments Z&amp;G S.A.
                                        </p>
                                        <p className="font-mono font-bold text-gray-500">
                                            Investments Z&amp;G S.A. • RUC: 20608552391
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MODAL FOOTER */}
                    <div className="p-4 sm:p-5 bg-white border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                        <div className="text-xs text-gray-500 font-medium">
                            {selectedClient ? (
                                <span>
                                    Mostrando compras y estado de <strong>{selectedClient.name}</strong> ({clientSales.length} ventas)
                                </span>
                            ) : (
                                <span>Selecciona un cliente para ver su estado de cuenta</span>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition active:scale-95"
                            >
                                Cerrar
                            </button>

                            {selectedClient && clientSales.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleDownloadImage}
                                    disabled={isExportingImage}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>{isExportingImage ? 'Generando...' : 'Descargar como Imagen'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
