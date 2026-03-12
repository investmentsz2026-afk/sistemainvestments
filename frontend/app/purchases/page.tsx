// frontend/app/purchases/page.tsx
'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import {
    ShoppingBag,
    Plus,
    FileText,
    Calendar,
    Package,
    X,
    PlusCircle,
    Eye,
    Edit2,
    Trash2,
    Clock,
    User as UserIcon,
    Box,
    Truck,
    Settings,
    Droplets,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Info,
    Download,
    FileSpreadsheet,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Wrench,
    Briefcase,
    Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
    { id: 'Materiales', label: 'Materiales', icon: Box, color: 'bg-blue-100 text-blue-700', unitHint: 'Metros' },
    { id: 'Avios', label: 'Avios', icon: Truck, color: 'bg-amber-100 text-amber-700', unitHint: 'Unidades' },
    { id: 'Maquinaria', label: 'Maquinaria', icon: Settings, color: 'bg-purple-100 text-purple-700', unitHint: 'Unidades' },
    { id: 'Productos Químicos', label: 'Productos Químicos', icon: Droplets, color: 'bg-teal-100 text-teal-700', unitHint: 'Litros' },
    { id: 'Servicio', label: 'Servicio / Mano de Obra', icon: Wrench, color: 'bg-indigo-100 text-indigo-700', unitHint: 'Servicio' },
];

const emptyItem = { name: '', description: '', category: 'Materiales', unit: 'Metros', quantity: 1, price: 0 };
const ITEMS_PER_PAGE = 10;

export default function PurchasesPage() {
    const { user } = useAuth();
    const [allRecords, setAllRecords] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [moduleType, setModuleType] = useState<'PURCHASE' | 'SERVICE'>('PURCHASE');
    const [statusFilter, setStatusFilter] = useState<'EN_CALIDAD' | 'RECIBIDO_EN_PROCESO' | 'RECIBIDO' | 'RECHAZADO'>('EN_CALIDAD');

    // Filter by type and status
    const purchases = useMemo(() => {
        let filtered = allRecords.filter(r => (r.type || 'PURCHASE') === moduleType);
        filtered = filtered.filter(r => r.status === statusFilter);
        return filtered;
    }, [allRecords, moduleType, statusFilter]);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(purchases.length / ITEMS_PER_PAGE);
    const paginatedPurchases = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return purchases.slice(start, start + ITEMS_PER_PAGE);
    }, [purchases, currentPage]);

    // Modals
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form
    const [formData, setFormData] = useState({
        invoiceNumber: '', op: '', supplierId: '', notes: '', items: [{ ...emptyItem }] as any[]
    });

    useEffect(() => { fetchPurchases(); fetchSuppliers(); }, []);

    const fetchSuppliers = async () => {
        try {
            const resp = await api.get('/suppliers');
            setSuppliers(resp.data.data.filter((s: any) => s.isActive) || []);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const fetchPurchases = async () => {
        try {
            const resp = await api.get('/purchases');
            setAllRecords(resp.data.data || []);
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        const firstItem = moduleType === 'SERVICE'
            ? { ...emptyItem, category: 'Servicio', unit: 'Servicio' }
            : { ...emptyItem };
        setFormData({ invoiceNumber: '', op: '', supplierId: '', notes: '', items: [firstItem] });
        setEditingId(null);
    };

    const openNewPurchase = () => { resetForm(); setShowFormModal(true); };
    const openEditPurchase = (p: any) => {
        setEditingId(p.id);
        setFormData({
            invoiceNumber: p.invoiceNumber || '', op: p.op || '', supplierId: p.supplierId || '', notes: p.notes || '',
            items: p.items.map((item: any) => ({
                name: item.name,
                description: item.description || '',
                category: item.category,
                unit: item.unit || '',
                quantity: item.quantity,
                price: item.price
            }))
        });
        setShowFormModal(true);
    };
    const openDetails = (p: any) => { setSelectedPurchase(p); setShowDetailModal(true); };
    const openDelete = (id: string) => { setDeletingId(id); setShowDeleteModal(true); };

    const addItem = () => {
        const newItem = moduleType === 'SERVICE'
            ? { ...emptyItem, category: 'Servicio', unit: 'Servicio' }
            : { ...emptyItem };
        setFormData({ ...formData, items: [...formData.items, newItem] });
    };
    const removeItem = (idx: number) => { if (formData.items.length <= 1) return; const n = [...formData.items]; n.splice(idx, 1); setFormData({ ...formData, items: n }); };
    const updateItem = (idx: number, field: string, value: any) => {
        const n = [...formData.items]; n[idx] = { ...n[idx], [field]: value };
        if (field === 'category') { const cat = CATEGORIES.find(c => c.id === value); if (cat) n[idx].unit = cat.unitHint; }
        setFormData({ ...formData, items: n });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.items.length === 0 || !formData.items[0].name) return showToast('Completa al menos un ítem', 'error');

        const payload = {
            ...formData,
            type: moduleType
        };

        try {
            const response = editingId ? await api.put(`/purchases/${editingId}`, payload) : await api.post('/purchases', payload);
            if (response.data.success) {
                showToast(editingId ? 'Registro actualizado' : 'Registro exitoso', 'success');
                setShowFormModal(false); resetForm(); fetchPurchases();
            } else { showToast('Error: ' + response.data.message, 'error'); }
        } catch (error: any) { showToast(error.response?.data?.message || 'Error al procesar', 'error'); }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            const resp = await api.delete(`/purchases/${deletingId}`);
            if (resp.data.success) { showToast('Registro eliminado', 'success'); setShowDeleteModal(false); setDeletingId(null); fetchPurchases(); }
            else { showToast('Error: ' + resp.data.message, 'error'); }
        } catch (error: any) { showToast(error.response?.data?.message || 'Error al eliminar', 'error'); }
    };

    // ========== EXPORT PDF ==========
    const exportPDF = async () => {
        try {
            const jsPDFModule = await import('jspdf');
            const jsPDF = jsPDFModule.default;
            const { default: autoTable } = await import('jspdf-autotable') as any;

            const doc = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const title = moduleType === 'PURCHASE' ? 'REPORTE DE COMPRAS' : 'REPORTE DE SERVICIOS';

            // Header
            doc.setFillColor(moduleType === 'PURCHASE' ? 16 : 79, moduleType === 'PURCHASE' ? 185 : 70, moduleType === 'PURCHASE' ? 129 : 229);
            doc.rect(0, 0, pageWidth, 28, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 14, 14);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`, 14, 22);
            doc.text(`Total de registros: ${purchases.length}`, pageWidth - 60, 14);
            const totalGeneral = purchases.reduce((s, p) => s + p.totalAmount, 0);
            doc.text(`Monto total: $${totalGeneral.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 60, 22);

            // Summary table
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Resumen General', 14, 36);

            autoTable(doc, {
                startY: 40,
                head: [['Nro', 'Factura/Ref', 'OP', 'Fecha', 'Hora', 'Registrado por', 'Ítems', 'Total ($)']],
                body: purchases.map((p, i) => {
                    const d = new Date(p.createdAt);
                    return [
                        i + 1,
                        p.invoiceNumber || 'Sin Ref.',
                        p.op || '-',
                        d.toLocaleDateString('es-PE'),
                        d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
                        p.user?.name || '-',
                        p.items.map((it: any) => it.name).join(', '),
                        `$${p.totalAmount.toFixed(2)}`
                    ];
                }),
                theme: 'grid',
                headStyles: { fillColor: moduleType === 'PURCHASE' ? [16, 185, 129] : [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                foot: [['', '', '', '', '', '', 'TOTAL:', `$${totalGeneral.toFixed(2)}`]],
                footStyles: { fillColor: moduleType === 'PURCHASE' ? [16, 185, 129] : [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                margin: { left: 14, right: 14 },
            });

            doc.save(`Reporte_${moduleType}_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('PDF exportado correctamente', 'success');
        } catch (error) {
            console.error('Error al exportar PDF:', error);
            showToast('Error al generar el PDF', 'error');
        }
    };

    // ========== EXPORT EXCEL ==========
    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const sheetName = moduleType === 'PURCHASE' ? 'Reporte de Compras' : 'Reporte de Servicios';

        // Sheet 1: Summary
        const summaryData = purchases.map((p, i) => {
            const d = new Date(p.createdAt);
            return {
                'Nro': i + 1,
                'Factura/Ref': p.invoiceNumber || 'Sin Ref.',
                'OP': p.op || '-',
                'Fecha': d.toLocaleDateString('es-PE'),
                'Hora': d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
                'Registrado por': p.user?.name || '-',
                'Productos/Servicios': p.items.map((it: any) => it.name).join(', '),
                'Total ($)': p.totalAmount
            };
        });
        const totalGeneral = purchases.reduce((s, p) => s + p.totalAmount, 0);
        summaryData.push({ 'Nro': '' as any, 'Factura/Ref': '', 'OP': '', 'Fecha': '', 'Hora': '', 'Registrado por': '', 'Productos/Servicios': 'TOTAL:' as any, 'Total ($)': totalGeneral });

        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws1, sheetName);
        XLSX.writeFile(wb, `Reporte_${moduleType}_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast('Excel exportado correctamente', 'success');
    };

    const getCategoryBadge = (category: string) => {
        const cat = CATEGORIES.find(c => c.id === category);
        const Icon = cat?.icon || Package;
        const colorClass = cat?.color || 'bg-gray-100 text-gray-600';
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${colorClass}`}>
                <Icon className="w-3 h-3" />{category}
            </span>
        );
    };

    const fmtDate = (s: string) => new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fmtTime = (s: string) => new Date(s).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    return (
        <Layout>
            {/* TOAST */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -40, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -40, x: '-50%' }}
                        className={`fixed top-6 left-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[320px] border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-blue-50 border-blue-200 text-blue-800'
                            }`}>
                        {toast.type === 'success' && <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />}
                        {toast.type === 'error' && <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />}
                        {toast.type === 'info' && <Info className="w-6 h-6 text-blue-500 flex-shrink-0" />}
                        <p className="font-semibold text-sm flex-1">{toast.message}</p>
                        <button onClick={() => setToast(null)} className="p-1 hover:bg-white/50 rounded-lg transition flex-shrink-0"><X className="w-4 h-4" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{moduleType === 'PURCHASE' ? 'Registro de Compras' : 'Registro de Servicios'}</h1>
                    <p className="text-gray-500 mt-1">Gestión de adquisiciones · {purchases.length} registros</p>
                </div>

                {/* Module Switcher */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center shadow-inner self-start">
                        <button
                            onClick={() => { setModuleType('PURCHASE'); setCurrentPage(1); }}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${moduleType === 'PURCHASE' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-500 hover:bg-white/50'}`}
                        >
                            <ShoppingBag className="w-4 h-4" /> Compras
                        </button>
                        <button
                            onClick={() => { setModuleType('SERVICE'); setCurrentPage(1); }}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${moduleType === 'SERVICE' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:bg-white/50'}`}
                        >
                            <Briefcase className="w-4 h-4" /> Servicios
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl self-start overflow-x-auto max-w-full no-scrollbar">
                        <button
                            onClick={() => { setStatusFilter('EN_CALIDAD'); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === 'EN_CALIDAD' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white hover:text-blue-500'}`}
                        >
                            <Truck className="w-3 h-3 inline mr-1.5" /> Enviadas
                        </button>
                        <button
                            onClick={() => { setStatusFilter('RECIBIDO_EN_PROCESO'); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === 'RECIBIDO_EN_PROCESO' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:bg-white hover:text-orange-500'}`}
                        >
                            <Clock className="w-3 h-3 inline mr-1.5" /> En Revisión
                        </button>
                        <button
                            onClick={() => { setStatusFilter('RECIBIDO'); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === 'RECIBIDO' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-400 hover:bg-white hover:text-emerald-500'}`}
                        >
                            <CheckCircle className="w-3 h-3 inline mr-1.5" /> Registradas
                        </button>
                        <button
                            onClick={() => { setStatusFilter('RECHAZADO'); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === 'RECHAZADO' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-400 hover:bg-white hover:text-red-500'}`}
                        >
                            <XCircle className="w-3 h-3 inline mr-1.5" /> Rechazadas
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Export buttons */}
                    {purchases.length > 0 && (
                        <>
                            <button onClick={exportPDF}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 rounded-xl text-sm font-bold hover:bg-red-100 border border-red-100 transition active:scale-95">
                                <Download className="w-4 h-4" /> PDF
                            </button>
                            <button onClick={exportExcel}
                                className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-bold hover:bg-green-100 border border-green-100 transition active:scale-95">
                                <FileSpreadsheet className="w-4 h-4" /> Excel
                            </button>
                        </>
                    )}
                    <button onClick={openNewPurchase}
                        className={`flex items-center gap-2 text-white px-6 py-2.5 rounded-xl font-semibold transition shadow-lg active:scale-95 ${moduleType === 'PURCHASE' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}`}>
                        <Plus className="w-5 h-5" /> {moduleType === 'PURCHASE' ? 'Nueva Compra' : 'Nuevo Servicio'}
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />)}</div>
                ) : purchases.length === 0 ? (
                    <div className="text-center py-20">
                        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-1">No hay {moduleType === 'PURCHASE' ? 'compras' : 'servicios'} registrados</h3>
                        <p className="text-gray-500 mb-6">{moduleType === 'PURCHASE' ? 'Registra materiales, maquinaria o insumos' : 'Registra cortes, reparaciones o mano de obra'}</p>
                        <button onClick={openNewPurchase} className={`px-6 py-3 text-white rounded-xl font-semibold transition ${moduleType === 'PURCHASE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            Registrar primer {moduleType === 'PURCHASE' ? 'compra' : 'servicio'}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">Nro</th>
                                        <th className="text-left px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">{moduleType === 'PURCHASE' ? 'Factura' : 'Referencia'}</th>
                                        <th className="text-left px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">OP</th>
                                        <th className="text-left px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">Fecha / Hora</th>
                                        <th className="text-left px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">
                                            {moduleType === 'PURCHASE' ? 'Productos' : 'Servicios'}
                                        </th>
                                        <th className="text-left px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">Estado</th>
                                        <th className="text-right px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">Total</th>
                                        <th className="text-center px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedPurchases.map((p, idx) => (
                                        <motion.tr key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                                            className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${moduleType === 'PURCHASE' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        {moduleType === 'PURCHASE' ? <FileText className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                                                    </div>
                                                    <span className="font-bold text-gray-900 text-sm">{p.invoiceNumber || <span className="text-gray-400 italic font-normal">Sin Nro.</span>}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono font-semibold text-gray-700">{p.op || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{fmtDate(p.createdAt)}</div>
                                                <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{fmtTime(p.createdAt)}</div>
                                            </td>
                                            <td className="px-6 py-4 max-w-[200px]">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900 truncate" title={p.items.map((i: any) => i.name).join(', ')}>
                                                        {p.items[0]?.name || '-'}
                                                        {p.items.length > 1 && <span className="text-xs text-emerald-600 font-normal ml-1">... y {p.items.length - 1} más</span>}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 uppercase font-medium mt-0.5">
                                                        {p.items.length} {p.items.length !== 1 ? 'registros' : 'registro'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.status === 'RECIBIDO' ? 'bg-emerald-100 text-emerald-700' :
                                                    p.status === 'RECHAZADO' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {p.status === 'EN_CALIDAD' ? 'En Calidad' : p.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`text-lg font-black ${moduleType === 'PURCHASE' ? 'text-gray-900' : 'text-indigo-900'}`}>${p.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => openDetails(p)} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" title="Ver detalles"><Eye className="w-4 h-4" /></button>
                                                    {p.status === 'EN_CALIDAD' && (
                                                        <>
                                                            <button onClick={() => openEditPurchase(p)} className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => openDelete(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINATION */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <p className="text-sm text-gray-500">
                                    Mostrando <span className="font-bold text-gray-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-gray-700">{Math.min(currentPage * ITEMS_PER_PAGE, purchases.length)}</span> de <span className="font-bold text-gray-700">{purchases.length}</span> registros
                                </p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                                        className="p-2 rounded-lg hover:bg-white text-gray-400 hover:text-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsLeft className="w-4 h-4" /></button>
                                    <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}
                                        className="p-2 rounded-lg hover:bg-white text-gray-400 hover:text-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                        .reduce((acc: (number | string)[], p, i, arr) => {
                                            if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                                            acc.push(p);
                                            return acc;
                                        }, [])
                                        .map((p, i) =>
                                            typeof p === 'string' ? (
                                                <span key={`dots-${i}`} className="px-2 text-gray-400">…</span>
                                            ) : (
                                                <button key={p} onClick={() => setCurrentPage(p as number)}
                                                    className={`w-9 h-9 rounded-lg text-sm font-bold transition ${currentPage === p ? (moduleType === 'PURCHASE' ? 'bg-emerald-600 text-white shadow-md' : 'bg-indigo-600 text-white shadow-md') : 'hover:bg-white text-gray-600'}`}>
                                                    {p}
                                                </button>
                                            )
                                        )}

                                    <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg hover:bg-white text-gray-400 hover:text-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg hover:bg-white text-gray-400 hover:text-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsRight className="w-4 h-4" /></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ===== MODAL DETALLES ===== */}
            <AnimatePresence>
                {showDetailModal && selectedPurchase && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDetailModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            <div className={`p-6 border-b border-gray-100 flex justify-between items-start ${moduleType === 'PURCHASE' ? 'bg-emerald-50/30' : 'bg-indigo-50/30'}`}>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Detalle de {moduleType === 'PURCHASE' ? 'Compra' : 'Servicio'}</h2>
                                    <p className={`text-sm font-medium mt-1 ${moduleType === 'PURCHASE' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                        {selectedPurchase.invoiceNumber ? `Ref: ${selectedPurchase.invoiceNumber}` : 'Sin referencia'}
                                        {selectedPurchase.op && ` • OP: ${selectedPurchase.op}`}
                                    </p>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white rounded-full transition"><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Fecha</p>
                                        <p className="font-bold text-gray-900 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" />{fmtDate(selectedPurchase.createdAt)}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Hora</p>
                                        <p className="font-bold text-gray-900 flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" />{fmtTime(selectedPurchase.createdAt)}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Registrado por</p>
                                        <p className="font-bold text-gray-900 flex items-center gap-1.5"><UserIcon className="w-4 h-4 text-gray-400" />{selectedPurchase.user?.name}</p>
                                    </div>
                                    <div className={`${moduleType === 'PURCHASE' ? 'bg-emerald-50' : 'bg-indigo-50'} p-4 rounded-xl`}>
                                        <p className={`text-[10px] uppercase font-black mb-1 ${moduleType === 'PURCHASE' ? 'text-emerald-500' : 'text-indigo-500'}`}>Total</p>
                                        <p className={`font-black text-xl ${moduleType === 'PURCHASE' ? 'text-emerald-700' : 'text-indigo-700'}`}>${selectedPurchase.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                {(selectedPurchase.notes || selectedPurchase.supplier) && (
                                    <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl">
                                        <p className="text-[10px] uppercase font-black text-yellow-500 mb-1">Notas / Proveedor</p>
                                        {selectedPurchase.supplier && (
                                            <p className="text-sm font-bold text-yellow-900 mb-1 flex items-center gap-1">
                                                <Building2 className="w-4 h-4" /> {selectedPurchase.supplier.name} <span className="text-xs text-yellow-700 font-normal">({selectedPurchase.supplier.documentNumber})</span>
                                            </p>
                                        )}
                                        {selectedPurchase.notes && <p className="text-sm text-yellow-800 italic">{selectedPurchase.notes}</p>}
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                        {moduleType === 'PURCHASE' ? <Package className="w-4 h-4 text-emerald-600" /> : <Wrench className="w-4 h-4 text-indigo-600" />}
                                        Descripción de {moduleType === 'PURCHASE' ? 'Productos' : 'Servicios'} ({selectedPurchase.items.length})
                                    </h3>
                                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead><tr className="bg-gray-50">
                                                <th className="text-left px-4 py-3 text-[10px] uppercase font-black text-gray-400">{moduleType === 'PURCHASE' ? 'Producto' : 'Servicio'}</th>
                                                <th className="text-left px-4 py-3 text-[10px] uppercase font-black text-gray-400">Categoría</th>
                                                <th className="text-right px-4 py-3 text-[10px] uppercase font-black text-gray-400">Cantidad</th>
                                                <th className="text-right px-4 py-3 text-[10px] uppercase font-black text-gray-400">Precio Unit.</th>
                                                <th className="text-right px-4 py-3 text-[10px] uppercase font-black text-gray-400">Subtotal</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {selectedPurchase.items.map((item: any, i: number) => (
                                                    <Fragment key={i}>
                                                        <tr className="hover:bg-gray-50/50">
                                                            <td className="px-4 py-3">
                                                                <p className="font-semibold text-gray-900">{item.name}</p>
                                                                {item.description && <p className="text-xs text-gray-400 italic">{item.description}</p>}
                                                            </td>
                                                            <td className="px-4 py-3">{getCategoryBadge(item.category)}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-gray-900">{item.quantity} <span className="text-xs text-gray-400">{item.unit}</span></td>
                                                            <td className="px-4 py-3 text-right text-gray-700">${item.price.toFixed(2)}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-gray-900">${(item.quantity * item.price).toFixed(2)}</td>
                                                        </tr>
                                                        {item.qualityControl && (
                                                            <tr className="bg-gray-50/30">
                                                                <td colSpan={5} className="px-4 py-3">
                                                                    <div className={`p-4 rounded-2xl border ${item.qualityControl.status === 'RECIBIDO'
                                                                        ? 'bg-emerald-50 border-emerald-100'
                                                                        : 'bg-red-50 border-red-100'
                                                                        }`}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${item.qualityControl.status === 'RECIBIDO' ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                                                                                }`}>
                                                                                {item.qualityControl.status === 'RECIBIDO' ? 'Aprobado por Calidad' : 'Rechazado por Calidad'}
                                                                            </span>
                                                                            <span className="text-[10px] font-bold text-gray-400">
                                                                                Firmado por: {item.qualityControl.confirmedBy?.name || 'Sistema'}
                                                                            </span>
                                                                        </div>
                                                                        {item.qualityControl.rejectionReason && (
                                                                            <p className="text-xs text-red-700 mb-1">
                                                                                <span className="font-black">MOTIVO DE RECHAZO:</span> {item.qualityControl.rejectionReason}
                                                                            </p>
                                                                        )}
                                                                        {item.qualityControl.observations && (
                                                                            <p className="text-xs text-gray-600 italic">
                                                                                <span className="font-black not-italic text-gray-500 uppercase">NOTAS ODP:</span> {item.qualityControl.observations}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
                                <button onClick={() => { setShowDetailModal(false); openEditPurchase(selectedPurchase); }}
                                    className="px-5 py-2.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-100 transition flex items-center gap-2"><Edit2 className="w-4 h-4" /> Editar</button>
                                <button onClick={() => setShowDetailModal(false)}
                                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition">Cerrar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== MODAL DELETE ===== */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8 text-red-600" /></div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar este registro?</h3>
                            <p className="text-gray-500 mb-6 text-sm">Esta acción no se puede deshacer.</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setShowDeleteModal(false)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                                <button onClick={handleDelete} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-600/30">Sí, eliminar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== MODAL FORM ===== */}
            <AnimatePresence>
                {showFormModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowFormModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${moduleType === 'PURCHASE' ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar' : 'Registrar'} {moduleType === 'PURCHASE' ? 'Compra' : 'Servicio'}</h2>
                                    <p className={`text-sm font-medium ${moduleType === 'PURCHASE' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                        {editingId ? 'Modifica los datos del registro' : `Ingresa los detalles del nuevo ${moduleType === 'PURCHASE' ? 'gasto por compra' : 'gasto por servicio'}`}
                                    </p>
                                </div>
                                <button onClick={() => setShowFormModal(false)} className="p-2 hover:bg-white rounded-full transition shadow-sm"><X className="w-6 h-6 text-gray-400" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">{moduleType === 'PURCHASE' ? 'Nro. Factura / Correlativo' : 'Referencia'}</label>
                                        <div className="relative">
                                            {moduleType === 'PURCHASE' ? <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /> : <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
                                            <input type="text" className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                                placeholder={moduleType === 'PURCHASE' ? "Ej: F001-000123" : "Ej: Juan Pérez"} value={formData.invoiceNumber} onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Orden de Prod. (OP)</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input type="text" className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition uppercase font-mono"
                                                placeholder="Ej: OP-050" value={formData.op} onChange={e => setFormData({ ...formData, op: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Proveedor</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <select className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition appearance-none"
                                                value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })}>
                                                <option value="">Compra externa (Sin Proveedor)</option>
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} - {s.documentType} {s.documentNumber}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Notas adicionales</label>
                                        <input type="text" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                            placeholder="Detalles" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            {moduleType === 'PURCHASE' ? <Package className="w-5 h-5 text-emerald-600" /> : <Wrench className="w-5 h-5 text-indigo-600" />}
                                            Lista de {moduleType === 'PURCHASE' ? 'Productos' : 'Servicios / Actividades'}
                                        </h3>
                                        <button type="button" onClick={addItem} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${moduleType === 'PURCHASE' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                                            <PlusCircle className="w-4 h-4" /> Agregar Item
                                        </button>
                                    </div>
                                    {formData.items.map((item, idx) => (
                                        <div key={idx} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 relative group transition-all hover:border-emerald-200 hover:bg-white">
                                            {formData.items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(idx)} className="absolute -top-2 -right-2 p-1.5 bg-white border border-red-100 text-red-400 hover:text-red-600 rounded-full shadow-sm hover:shadow transition opacity-0 group-hover:opacity-100"><X className="w-4 h-4" /></button>
                                            )}
                                            <div className="grid grid-cols-12 gap-3">
                                                <div className="col-span-12 sm:col-span-2">
                                                    <label className="text-[10px] uppercase font-black text-gray-400 mb-1 block">Tipo</label>
                                                    <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                                                        value={item.category} onChange={e => updateItem(idx, 'category', e.target.value)}>
                                                        {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-12 sm:col-span-3">
                                                    <label className="text-[10px] uppercase font-black text-gray-400 mb-1 block">{moduleType === 'PURCHASE' ? 'Nombre del Producto' : 'Nombre del Servicio'}</label>
                                                    <input required type="text" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                                                        placeholder={moduleType === 'PURCHASE' ? "Ej: Tela Denim" : "Ej: Corte de tela"} value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} />
                                                </div>
                                                <div className="col-span-4 sm:col-span-2">
                                                    <label className={`text-[10px] uppercase font-black mb-1 block ${moduleType === 'PURCHASE' ? 'text-emerald-600' : 'text-indigo-600'}`}>Cantidad</label>
                                                    <input required type="number" step="0.01" min="0.01"
                                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-base text-center"
                                                        value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                                                </div>
                                                <div className="col-span-4 sm:col-span-2">
                                                    <label className="text-[10px] uppercase font-black text-gray-400 mb-1 block">Unidad</label>
                                                    <input type="text" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                                                        value={item.unit} placeholder={moduleType === 'PURCHASE' ? "Metros" : "Servicio"} onChange={e => updateItem(idx, 'unit', e.target.value)} />
                                                </div>
                                                <div className="col-span-4 sm:col-span-2">
                                                    <label className="text-[10px] uppercase font-black text-gray-400 mb-1 block">Costo Unit.</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                                                        <input required type="number" step="0.01" min="0"
                                                            className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                                                            value={item.price} onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)} />
                                                    </div>
                                                </div>
                                                <div className="col-span-12 sm:col-span-1 flex flex-col justify-end items-end pb-1">
                                                    <p className="text-[10px] text-gray-400 font-bold">Subtotal</p>
                                                    <p className="font-bold text-gray-900 text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <input type="text" placeholder="Descripción o detalles específicos (opcional)..."
                                                    className="w-full px-3 py-1.5 rounded-lg border border-transparent text-sm bg-transparent outline-none focus:border-emerald-200 text-gray-500 italic"
                                                    value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100 text-center md:text-left">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total de la Factura / Honorarios</p>
                                        <p className="text-3xl font-black text-gray-900">${formData.items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <button type="submit"
                                        className={`w-full md:w-auto px-14 py-4 text-white rounded-2xl font-black shadow-xl transition active:scale-95 flex items-center justify-center gap-3 ${moduleType === 'PURCHASE' ? 'bg-emerald-600 shadow-emerald-500/40 hover:bg-emerald-700' : 'bg-indigo-600 shadow-indigo-500/40 hover:bg-indigo-700'}`}>
                                        <ShoppingBag className="w-5 h-5" /> {editingId ? 'Guardar Cambios' : 'Confirmar Registro'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
