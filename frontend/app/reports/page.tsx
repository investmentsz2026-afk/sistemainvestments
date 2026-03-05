'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    TrendingUp, TrendingDown, Package, DollarSign, Calendar, Download, FileText,
    BarChart3, PieChart as PieChartIcon, Activity, Filter, RefreshCw, Layers, Boxes, Wallet, ChevronRight, ChevronLeft, X, FileSpreadsheet, FileText as FilePdf, Search
} from 'lucide-react';
import { format, subDays, startOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { reportsService, ReportFilters } from '../../services/reports.service';
import { useProducts } from '../../hooks/useProducts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { Layout } from '../../components/common/Layout';

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];

/* ─── Stat Card ─── */
const statStyles: any = {
    indigo: { gradient: 'from-indigo-500 to-indigo-600', iconBg: 'bg-indigo-400/20', ring: 'ring-indigo-200' },
    emerald: { gradient: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-400/20', ring: 'ring-emerald-200' },
    amber: { gradient: 'from-amber-400 to-amber-500', iconBg: 'bg-amber-300/20', ring: 'ring-amber-200' },
    rose: { gradient: 'from-rose-400 to-rose-500', iconBg: 'bg-rose-300/20', ring: 'ring-rose-200' },
};

const CompactStatCard = ({ title, value, icon: Icon, color = "indigo" }: any) => {
    const s = statStyles[color] || statStyles.indigo;
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className={`bg-gradient-to-br ${s.gradient} p-5 rounded-3xl shadow-lg shadow-${color}-200/40 flex flex-col gap-3 relative overflow-hidden group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300`}
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4" />
            <div className={`p-2.5 ${s.iconBg} rounded-2xl w-fit backdrop-blur-sm`}>
                <Icon size={20} className="text-white" />
            </div>
            <div className="z-10">
                <p className="text-white/70 text-[9px] font-bold uppercase tracking-[0.15em]">{title}</p>
                <h3 className="text-2xl font-black text-white mt-1 tracking-tight">{value}</h3>
            </div>
        </motion.div>
    );
};

/* ─── Report Tab Button ─── */
const ReportTypeButton = ({ title, icon: Icon, isActive, onClick }: any) => (
    <button onClick={onClick}
        className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border transition-all duration-300 font-bold text-sm shadow-sm ${isActive
            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200/60'
            : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md'
            }`}
    >
        <Icon size={18} />
        <span className="whitespace-nowrap">{title}</span>
    </button>
);

/* ─── Main Page ─── */
export default function ReportsPage() {
    const [reportType, setReportType] = useState<'inventory' | 'movements' | 'valuation'>('inventory');
    const handleReportType = (t: 'inventory' | 'movements' | 'valuation') => { setReportType(t); setCurrentPage(1); };
    const [filters, setFilters] = useState<ReportFilters>({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        category: 'todas', productId: 'todos', inventoryType: 'TODOS'
    });
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const { products } = useProducts();

    const categories = useMemo(() => {
        if (!products) return ['todas'];
        return ['todas', ...Array.from(new Set(products.map(p => p.category)))].sort();
    }, [products]);

    const inventoryTypes = useMemo(() => {
        if (!products) return ['TODOS'];
        const types = Array.from(new Set(products.map(p => p.inventoryType)));
        return ['TODOS', ...types.map(t => t.toUpperCase()).sort()];
    }, [products]);

    const { data: stockData, refetch: refetchStock } = useQuery(
        ['currentStock', filters], () => reportsService.getCurrentStock(filters), { enabled: reportType === 'inventory' }
    );
    const { data: valuationData, refetch: refetchValuation } = useQuery(
        ['valuedStock', filters], () => reportsService.getValuedStock(filters), { enabled: reportType === 'valuation' }
    );
    const { data: movementData, refetch: refetchMovements } = useQuery(
        ['movements', filters], () => reportsService.getMovements(filters), { enabled: reportType === 'movements' }
    );

    /* ── Filtered Data ── */
    const filteredStock = useMemo(() => {
        if (!stockData) return [];
        return stockData.filter((item: any) => {
            const matchC = filters.category === 'todas' || item.category === filters.category;
            const matchP = filters.productId === 'todos' || item.productId === filters.productId;
            const matchT = filters.inventoryType === 'TODOS' || item.inventoryType?.toUpperCase() === filters.inventoryType?.toUpperCase();
            const s = searchTerm.toLowerCase();
            const matchS = !searchTerm || item.productName.toLowerCase().includes(s) || item.variantSku.toLowerCase().includes(s);
            return matchC && matchP && matchT && matchS;
        });
    }, [stockData, filters, searchTerm]);

    const filteredMovements = useMemo(() => {
        if (!movementData?.movements) return [];
        return movementData.movements.filter((m: any) => {
            const matchC = filters.category === 'todas' || m.variant.product.category === filters.category;
            const matchP = filters.productId === 'todos' || m.variant.productId === filters.productId;
            const matchT = filters.inventoryType === 'TODOS' || m.variant.product.inventoryType?.toUpperCase() === filters.inventoryType?.toUpperCase();
            const s = searchTerm.toLowerCase();
            const matchS = !searchTerm || m.variant.product.name.toLowerCase().includes(s) || m.reason.toLowerCase().includes(s);
            return matchC && matchP && matchT && matchS;
        });
    }, [movementData, filters, searchTerm]);

    const filteredValuation = useMemo(() => {
        if (!valuationData?.details) return [];
        return valuationData.details.filter((v: any) => {
            const matchC = filters.category === 'todas' || v.category === filters.category;
            const matchP = filters.productId === 'todos' || v.productId === filters.productId;
            const matchT = filters.inventoryType === 'TODOS' || v.inventoryType?.toUpperCase() === filters.inventoryType?.toUpperCase();
            const s = searchTerm.toLowerCase();
            const matchS = !searchTerm || v.product.toLowerCase().includes(s) || v.category.toLowerCase().includes(s);
            return matchC && matchP && matchT && matchS;
        });
    }, [valuationData, filters, searchTerm]);

    // Reset page when data changes
    const activeData = reportType === 'inventory' ? filteredStock : reportType === 'movements' ? filteredMovements : filteredValuation;
    const totalPages = Math.max(1, Math.ceil(activeData.length / ITEMS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedData = activeData.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

    // Reset to page 1 when filters, search or report type change
    const resetPage = () => setCurrentPage(1);

    /* ── Derived Stats ── */
    const valuationStats = useMemo(() => {
        const tp = filteredValuation.reduce((a: number, v: any) => a + v.purchaseValue, 0);
        const ts = filteredValuation.reduce((a: number, v: any) => a + v.salesValue, 0);
        return { totalPurchase: tp, totalSales: ts, profit: ts - tp, margin: tp > 0 ? ((ts - tp) / tp) * 100 : 0 };
    }, [filteredValuation]);

    const movementStats = useMemo(() => {
        const entries = filteredMovements.filter((m: any) => m.type === 'ENTRY');
        const exits = filteredMovements.filter((m: any) => m.type === 'EXIT');
        return { total: filteredMovements.length, entries: entries.length, exits: exits.length, quantity: filteredMovements.reduce((a: number, m: any) => a + m.quantity, 0) };
    }, [filteredMovements]);

    /* ── Export ── */
    const exportData = (fmt: 'excel' | 'pdf') => {
        let data: any[] = [], headers: any[] = [], title = '';
        if (reportType === 'inventory') {
            title = 'REPORTE DE INVENTARIO ACTUAL';
            headers = [['Fecha Reg.', 'SKU', 'Producto', 'Variante', 'Stock', 'P. Compra', 'P. Venta', 'Valor Total']];
            data = filteredStock.map((s: any) => [format(new Date(s.createdAt), 'dd/MM/yyyy'), s.variantSku, s.productName, `${s.size}/${s.color}`, s.stock, s.purchasePrice, s.sellingPrice, s.totalValue]);
        } else if (reportType === 'movements') {
            title = 'REPORTE DE MOVIMIENTOS';
            headers = [['Fecha', 'Tipo', 'Producto', 'Variante', 'Cant.', 'Motivo', 'Anterior', 'Nuevo']];
            data = filteredMovements.map((m: any) => [format(new Date(m.createdAt), 'dd/MM/yyyy HH:mm'), m.type === 'ENTRY' ? 'ENTRADA' : 'SALIDA', m.variant.product.name, `${m.variant.size}-${m.variant.color}`, m.quantity, m.reason, m.previousStock, m.newStock]);
        } else {
            title = 'REPORTE DE VALORIZACIÓN';
            headers = [['Producto', 'Variante', 'Stock', 'Valor Compra', 'Valor Venta']];
            data = filteredValuation.map((v: any) => [v.product, v.variant, v.quantity, v.purchaseValue, v.salesValue]);
        }
        if (fmt === 'excel') {
            const ws = XLSX.utils.json_to_sheet(data.map(row => { const o: any = {}; headers[0].forEach((h: string, i: number) => o[h] = row[i]); return o; }));
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
            XLSX.writeFile(wb, `${title.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            toast.success('Excel generado ✓');
        } else {
            const doc = new jsPDF('l', 'mm', 'a4');
            doc.setFontSize(18); doc.setTextColor(79, 70, 229); doc.text(title, 14, 20);
            doc.setFontSize(8); doc.setTextColor(120); doc.text(`Generado: ${format(new Date(), 'dd/MMM/yyyy HH:mm', { locale: es })}`, 14, 26);
            autoTable(doc, { startY: 30, head: headers, body: data, theme: 'striped', headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }, styles: { fontSize: 7, cellPadding: 2 } });
            doc.save(`${title.replace(/ /g, '_')}.pdf`);
            toast.success('PDF generado ✓');
        }
    };

    /* ─────────── RENDER ─────────── */
    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-amber-50/20 p-4 md:p-6 lg:p-8 font-sans max-w-7xl mx-auto">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                            📊 Reportes <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Lima</span>
                        </h1>
                        <p className="text-[11px] text-gray-500 font-semibold mt-1 flex items-center gap-1.5">
                            <Activity size={14} className="text-indigo-500" /> Panel de Control Inteligente
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                        {/* Filters Toggle */}
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md ${showFilters
                                ? 'bg-indigo-600 text-white shadow-indigo-200/60'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:shadow-lg'
                                }`}
                        >
                            <Filter size={16} /> Filtros
                        </motion.button>

                        {/* Export Buttons */}
                        <div className="flex gap-2 ml-auto md:ml-0">
                            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.93 }} onClick={() => exportData('excel')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-200 text-emerald-700 rounded-2xl shadow-md shadow-emerald-100/50 hover:shadow-lg hover:shadow-emerald-200/60 transition-all font-bold text-[10px] uppercase group"
                            >
                                <FileSpreadsheet size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" /> Excel
                            </motion.button>
                            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.93 }} onClick={() => exportData('pdf')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-rose-200 text-rose-700 rounded-2xl shadow-md shadow-rose-100/50 hover:shadow-lg hover:shadow-rose-200/60 transition-all font-bold text-[10px] uppercase group"
                            >
                                <FilePdf size={16} className="text-rose-500 group-hover:scale-110 transition-transform" /> PDF
                            </motion.button>
                            <motion.button whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}
                                onClick={() => { refetchStock(); refetchMovements(); refetchValuation(); toast.success('Datos actualizados ✓'); }}
                                className="p-2.5 bg-white border border-gray-200 text-indigo-600 rounded-2xl shadow-md hover:shadow-lg transition-all"
                            >
                                <RefreshCw size={18} />
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* ── Report Type Tabs ── */}
                <div className="flex overflow-x-auto pb-2 gap-3 mb-8 no-scrollbar">
                    <ReportTypeButton title="Inventario Real" icon={Boxes} isActive={reportType === 'inventory'} onClick={() => handleReportType('inventory')} />
                    <ReportTypeButton title="Movimientos" icon={Layers} isActive={reportType === 'movements'} onClick={() => handleReportType('movements')} />
                    <ReportTypeButton title="Análisis Monetario" icon={Wallet} isActive={reportType === 'valuation'} onClick={() => handleReportType('valuation')} />
                </div>

                {/* ── Filters Panel ── */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
                            <div className="bg-white/80 backdrop-blur-xl border border-indigo-100 p-6 rounded-3xl shadow-xl shadow-indigo-100/30">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                    <div>
                                        <label className="text-[10px] font-extrabold text-indigo-900/70 uppercase mb-1.5 block tracking-widest">Fecha Inicio / Fin</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                                                className="w-full bg-white border border-indigo-100 rounded-2xl p-3 text-xs font-bold text-gray-800 shadow-sm focus:ring-2 focus:ring-indigo-400 focus:shadow-md transition-all" />
                                            <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                                                className="w-full bg-white border border-indigo-100 rounded-2xl p-3 text-xs font-bold text-gray-800 shadow-sm focus:ring-2 focus:ring-indigo-400 focus:shadow-md transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-extrabold text-indigo-900/70 uppercase mb-1.5 block tracking-widest">Categoría</label>
                                        <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                                            className="w-full bg-white border border-indigo-100 rounded-2xl p-3 text-xs font-bold text-gray-800 shadow-sm hover:shadow-md focus:ring-2 focus:ring-indigo-400 transition-all cursor-pointer appearance-none">
                                            {categories.map(c => <option key={c} value={c}>{c === 'todas' ? 'Todas las Categorías' : c.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-extrabold text-indigo-900/70 uppercase mb-1.5 block tracking-widest">Producto</label>
                                        <select value={filters.productId} onChange={e => setFilters(f => ({ ...f, productId: e.target.value }))}
                                            className="w-full bg-white border border-indigo-100 rounded-2xl p-3 text-xs font-bold text-gray-800 shadow-sm hover:shadow-md focus:ring-2 focus:ring-indigo-400 transition-all cursor-pointer appearance-none">
                                            <option value="todos">Todos los Productos</option>
                                            {products?.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-extrabold text-indigo-900/70 uppercase mb-1.5 block tracking-widest">Tipo Almacén</label>
                                            <select value={filters.inventoryType} onChange={e => setFilters(f => ({ ...f, inventoryType: e.target.value }))}
                                                className="w-full bg-white border border-indigo-100 rounded-2xl p-3 text-xs font-bold text-gray-800 shadow-sm hover:shadow-md focus:ring-2 focus:ring-indigo-400 transition-all cursor-pointer appearance-none">
                                                {inventoryTypes.map(t => <option key={t} value={t}>{t === 'TODOS' ? 'Todos los Almacenes' : t}</option>)}
                                            </select>
                                        </div>
                                        <motion.button whileTap={{ scale: 0.9 }}
                                            onClick={() => setFilters({ startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), category: 'todas', productId: 'todos', inventoryType: 'TODOS' })}
                                            className="p-3 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm hover:shadow-md mb-0"
                                        >
                                            <X size={20} />
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {reportType === 'valuation' ? (
                        <>
                            <CompactStatCard title="INVERSIÓN" value={`S/ ${valuationStats.totalPurchase.toLocaleString()}`} icon={Wallet} color="indigo" />
                            <CompactStatCard title="VENTAS" value={`S/ ${valuationStats.totalSales.toLocaleString()}`} icon={DollarSign} color="emerald" />
                            <CompactStatCard title="MARGEN" value={`S/ ${valuationStats.profit.toLocaleString()}`} icon={TrendingUp} color="amber" />
                            <CompactStatCard title="RENDIMIENTO" value={`${valuationStats.margin.toFixed(1)}%`} icon={Activity} color="rose" />
                        </>
                    ) : reportType === 'inventory' ? (
                        <>
                            <CompactStatCard title="ITEMS STOCK" value={(filteredStock.reduce((a: number, s: any) => a + s.stock, 0) || 0).toLocaleString()} icon={Boxes} color="indigo" />
                            <CompactStatCard title="EXISTENCIAS" value={filteredStock.length} icon={Layers} color="amber" />
                            <CompactStatCard title="VALOR COSTO" value={`S/ ${(filteredStock.reduce((a: number, s: any) => a + s.totalValue, 0) || 0).toLocaleString()}`} icon={Wallet} color="emerald" />
                            <CompactStatCard title="DISPONIBILIDAD" value="94%" icon={Activity} color="rose" />
                        </>
                    ) : (
                        <>
                            <CompactStatCard title="OPERACIONES" value={movementStats.total} icon={Activity} color="indigo" />
                            <CompactStatCard title="ENTRADAS" value={movementStats.entries} icon={TrendingUp} color="emerald" />
                            <CompactStatCard title="SALIDAS" value={movementStats.exits} icon={TrendingDown} color="rose" />
                            <CompactStatCard title="CANT. TOTAL" value={movementStats.quantity} icon={Boxes} color="amber" />
                        </>
                    )}
                </div>

                {/* ── Charts Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                    {/* Bar / Area Chart */}
                    <div className="lg:col-span-8 bg-white/80 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-lg shadow-indigo-100/20">
                        <h3 className="text-sm font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                            <BarChart3 size={18} className="text-indigo-500" /> Tendencias
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                {reportType === 'movements' ? (
                                    <AreaChart data={movementData?.movements ? Array.from({ length: 15 }, (_, i) => {
                                        const d = subDays(new Date(), i); const ds = format(d, 'yyyy-MM-dd');
                                        const dm = (movementData.movements || []).filter((m: any) => format(new Date(m.createdAt), 'yyyy-MM-dd') === ds);
                                        return { name: format(d, 'dd MMM', { locale: es }), Entradas: dm.filter((m: any) => m.type === 'ENTRY').reduce((a: number, x: any) => a + x.quantity, 0), Salidas: dm.filter((m: any) => m.type === 'EXIT').reduce((a: number, x: any) => a + x.quantity, 0) };
                                    }).reverse() : []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(99,102,241,0.15)', fontWeight: 600 }} />
                                        <Area type="monotone" dataKey="Entradas" stroke="#6366f1" strokeWidth={3} fill="url(#colorEntries)" />
                                        <Area type="monotone" dataKey="Salidas" stroke="#f43f5e" strokeWidth={3} fill="url(#colorExits)" />
                                        <defs>
                                            <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                                            <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                                        </defs>
                                    </AreaChart>
                                ) : (
                                    <BarChart data={reportType === 'inventory'
                                        ? categories.filter(c => c !== 'todas').slice(0, 8).map(c => ({ name: c, value: stockData?.filter((i: any) => i.category === c).reduce((a: number, i: any) => a + i.stock, 0) || 0 }))
                                        : valuationData?.details?.slice(0, 10).map((d: any) => ({ name: d.product.substring(0, 12), value: d.purchaseValue }))
                                    }>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: '11px', borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(99,102,241,0.15)', fontWeight: 600 }} />
                                        <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#6366f1" barSize={28} />
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="lg:col-span-4 bg-white/80 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-lg shadow-indigo-100/20">
                        <h3 className="text-sm font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                            <PieChartIcon size={18} className="text-amber-500" /> Distribución
                        </h3>
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={reportType === 'movements'
                                        ? Object.entries(movementData?.byReason || {}).map(([name, val]: any) => ({ name, value: val.quantity }))
                                        : categories.filter(c => c !== 'todas').slice(0, 6).map(c => ({ name: c, value: stockData?.filter((i: any) => i.category === c).length || 0 }))}
                                        innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value"
                                    >
                                        {CHART_COLORS.map((color, i) => <Cell key={`cell-${i}`} fill={color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontWeight: 600 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 space-y-2.5">
                            {(reportType === 'movements' ? Object.entries(movementData?.byReason || {}).slice(0, 4)
                                : categories.filter(c => c !== 'todas').slice(0, 4)).map((item: any, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            <span className="text-[10px] font-semibold text-gray-600 uppercase">{typeof item === 'string' ? item : item[0]}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-800">{typeof item === 'string' ? '...' : (item[1]?.quantity || item[1] || 0)}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* ── Detail Table ── */}
                <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl shadow-xl shadow-indigo-100/20 overflow-hidden">
                    <div className="p-6 border-b border-indigo-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <h2 className="text-sm font-extrabold text-gray-800 whitespace-nowrap">📋 Detalle del Informe</h2>
                            <div className="relative flex-1 md:w-80">
                                <input type="text" placeholder="Buscar en la tabla..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="w-full bg-indigo-600 border-none rounded-2xl px-5 py-3 text-xs font-bold text-white placeholder-indigo-200 focus:ring-4 focus:ring-indigo-200 transition-all pl-11 shadow-lg shadow-indigo-200/40" />
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200" />
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-indigo-500 to-violet-500 text-[10px] font-bold text-white px-4 py-2 rounded-2xl shadow-md shadow-indigo-200/40">
                            {reportType === 'inventory' ? filteredStock.length : reportType === 'movements' ? filteredMovements.length : filteredValuation.length} Registros
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gradient-to-r from-indigo-50/50 to-violet-50/30">
                                    {reportType === 'movements' ? (
                                        <>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest">Fecha</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest">Operación</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest">Producto</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest text-right">Cant.</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest">Concepto</th>
                                        </>
                                    ) : reportType === 'inventory' ? (
                                        <>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest">Fecha Reg.</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest">SKU</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest">Producto</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest">Variante</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest text-right">Stock</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest text-right">Valor</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest">Producto</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest">Variante</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest text-right">Stock</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest text-right">Compra</th>
                                            <th className="px-6 py-4 text-[10px] font-extrabold text-indigo-900/70 uppercase tracking-widest text-right">Venta</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-indigo-50/50">
                                {reportType === 'movements' ? (
                                    paginatedData.map((m: any) => (
                                        <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-700">{format(new Date(m.createdAt), 'dd/MM/yy HH:mm')}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-bold shadow-sm ${m.type === 'ENTRY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {m.type === 'ENTRY' ? '▲ ENTRADA' : '▼ SALIDA'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-gray-800 uppercase block">{m.variant.product.name}</span>
                                                <span className="text-[9px] font-medium text-gray-400">{m.variant.size} - {m.variant.color}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-black text-gray-800 tabular-nums">{m.quantity}</td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-500 italic">"{m.reason}"</td>
                                        </tr>
                                    ))
                                ) : reportType === 'inventory' ? (
                                    paginatedData.map((s: any, i: number) => (
                                        <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-6 py-4 text-xs font-semibold text-gray-700">{format(new Date(s.createdAt), 'dd/MM/yy')}</td>
                                            <td className="px-6 py-4"><code className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{s.variantSku}</code></td>
                                            <td className="px-6 py-4 font-bold text-gray-800 uppercase text-xs">{s.productName}</td>
                                            <td className="px-6 py-4 text-[10px] font-medium text-gray-400 uppercase">{s.size} / {s.color}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`text-sm font-black tabular-nums ${s.stock < 5 ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg' : 'text-gray-800'}`}>{s.stock}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs font-bold text-gray-800">S/ {s.totalValue.toLocaleString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    paginatedData.map((v: any, i: number) => (
                                        <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800 uppercase text-xs">{v.product}</td>
                                            <td className="px-6 py-4 text-[10px] font-medium text-gray-400 uppercase">{v.variant}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-gray-800 tabular-nums">{v.quantity}</td>
                                            <td className="px-6 py-4 text-right text-xs font-bold text-emerald-600">S/ {v.purchaseValue.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-xs font-bold text-indigo-600">S/ {v.salesValue.toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination ── */}
                    <div className="px-6 py-4 border-t border-indigo-50 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/30 to-violet-50/20">
                        <p className="text-[10px] font-bold text-gray-500">
                            Mostrando <span className="text-indigo-600 font-extrabold">{((safeCurrentPage - 1) * ITEMS_PER_PAGE) + 1}</span> - <span className="text-indigo-600 font-extrabold">{Math.min(safeCurrentPage * ITEMS_PER_PAGE, activeData.length)}</span> de <span className="text-indigo-600 font-extrabold">{activeData.length}</span> registros
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}
                                className="px-2.5 py-1.5 text-[10px] font-bold rounded-xl border border-indigo-100 text-gray-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >«</button>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1}
                                className="p-1.5 rounded-xl border border-indigo-100 text-gray-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            ><ChevronLeft size={16} /></button>

                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let page: number;
                                if (totalPages <= 5) { page = i + 1; }
                                else if (safeCurrentPage <= 3) { page = i + 1; }
                                else if (safeCurrentPage >= totalPages - 2) { page = totalPages - 4 + i; }
                                else { page = safeCurrentPage - 2 + i; }
                                return (
                                    <button key={page} onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 text-[11px] font-bold rounded-xl transition-all shadow-sm ${page === safeCurrentPage
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50'
                                                : 'border border-indigo-100 text-gray-600 hover:bg-indigo-50'
                                            }`}
                                    >{page}</button>
                                );
                            })}

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages}
                                className="p-1.5 rounded-xl border border-indigo-100 text-gray-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            ><ChevronRight size={16} /></button>
                            <button
                                onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages}
                                className="px-2.5 py-1.5 text-[10px] font-bold rounded-xl border border-indigo-100 text-gray-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >»</button>
                        </div>
                    </div>
                </div>

            </div>
        </Layout>
    );
}
