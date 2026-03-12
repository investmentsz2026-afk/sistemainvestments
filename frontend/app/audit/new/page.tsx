'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/axios';
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Camera,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Box,
    CheckSquare,
    Search,
    FileText,
    ChevronDown,
    Calendar,
    User,
    ClipboardList,
    AlertTriangle,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const PROCESS_OPTIONS = [
    { id: 'Corte', label: 'Corte', icon: Box, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
    { id: 'Confección', label: 'Confección', icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    { id: 'Lavado', label: 'Lavado', icon: Search, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100' },
    { id: 'Acabados', label: 'Acabados', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
];

const CHECKLIST_TEMPLATES: Record<string, string[]> = {
    'Corte': ['Medidas según ficha', 'Piezas completas', 'Aprovechamiento de tela', 'Ausencia de defectos de corte'],
    'Confección': ['Calidad de costura', 'Alineación de piezas', 'Resistencia de costuras', 'Ensamblaje correcto'],
    'Lavado': ['Color uniforme', 'Control de encogimiento', 'Ausencia de manchas', 'Textura adecuada'],
    'Acabados': ['Accesorios correctos', 'Etiquetado correcto', 'Limpieza del producto', 'Presentación / Doblado'],
};

export default function NewAuditPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [productId, setProductId] = useState('');
    const [op, setOp] = useState('');
    const [process, setProcess] = useState('Corte');
    const [result, setResult] = useState('CONFORME');
    const [observations, setObservations] = useState('');
    const [checklist, setChecklist] = useState<Record<string, boolean>>({});
    const [findings, setFindings] = useState<any[]>([]);
    
    // Quantity State
    const [quantityGood, setQuantityGood] = useState(0);
    const [quantityProcess, setQuantityProcess] = useState(0);
    const [quantitySecond, setQuantitySecond] = useState(0);
    const totalQuantity = (quantityGood || 0) + (quantityProcess || 0) + (quantitySecond || 0);

    // UI Helpers
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        // Initialize checklist when process changes
        const currentChecklist: Record<string, boolean> = {};
        CHECKLIST_TEMPLATES[process].forEach(item => {
            currentChecklist[item] = true;
        });
        setChecklist(currentChecklist);
    }, [process]);

    const fetchProducts = async () => {
        try {
            const resp = await api.get('/products');
            setProducts(resp.data.data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleCheckToggle = (item: string) => {
        setChecklist(prev => {
            const next = { ...prev, [item]: !prev[item] };
            // If any item is unchecked, set result to OBSERVACION or NO_CONFORME automatically
            const allChecked = Object.values(next).every(v => v);
            if (!allChecked && result === 'CONFORME') {
                setResult('OBSERVACION');
            } else if (allChecked) {
                setResult('CONFORME');
            }
            return next;
        });
    };

    const addFinding = () => {
        setFindings([...findings, { 
            description: '', 
            severity: 'MEDIO', 
            responsibleArea: process,
            correctiveActions: [] 
        }]);
    };

    const removeFinding = (idx: number) => {
        const n = [...findings];
        n.splice(idx, 1);
        setFindings(n);
    };

    const updateFinding = (idx: number, field: string, value: any) => {
        const n = [...findings];
        n[idx] = { ...n[idx], [field]: value };
        setFindings(n);
    };

    const addAction = (findingIdx: number) => {
        const n = [...findings];
        n[findingIdx].correctiveActions.push({ action: '', responsibleName: '', deadline: '' });
        setFindings(n);
    };

    const removeAction = (findingIdx: number, actionIdx: number) => {
        const n = [...findings];
        n[findingIdx].correctiveActions.splice(actionIdx, 1);
        setFindings(n);
    };

    const updateAction = (findingIdx: number, actionIdx: number, field: string, value: any) => {
        const n = [...findings];
        n[findingIdx].correctiveActions[actionIdx][field] = value;
        setFindings(n);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || !op) {
            alert('Por favor completa el producto y el lote (OP)');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/process-audits', {
                productId,
                op,
                process,
                result,
                observations,
                checklist,
                findings,
                quantityGood,
                quantityProcess,
                quantitySecond,
                totalQuantity,
                evidences: [] // For now, evidence upload is simulated
            });
            router.push('/audit');
        } catch (error) {
            console.error('Error saving audit:', error);
            alert('Hubo un error al guardar la auditoría');
        } finally {
            setIsSaving(false);
        }
    };

    const selectedProduct = products.find(p => p.id === productId);

    return (
        <Layout>
            <div className="max-w-5xl mx-auto">
                {/* HEADER */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.back()}
                            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 shadow-sm transition active:scale-90"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Nueva Auditoría</h1>
                            <p className="text-gray-500 font-medium">Completa el reporte de control de calidad</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl hover:bg-black transition disabled:opacity-50 active:scale-95"
                    >
                        {isSaving ? 'Guardando...' : (
                            <>
                                <Save className="w-5 h-5" /> Finalizar Auditoría
                            </>
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: BASIC INFO & CHECKLIST */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* SECCIÓN 1: PRODUCTO Y PROCESO */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Información Base</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Producto</label>
                                    <div className="relative">
                                        <button 
                                            type="button"
                                            onClick={() => setShowProductSearch(!showProductSearch)}
                                            className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-left font-bold text-gray-900 hover:bg-gray-100/50 transition flex items-center justify-between"
                                        >
                                            {selectedProduct ? (
                                                <div className="truncate">
                                                    <span className="text-indigo-600 mr-2">{selectedProduct.sku}</span>
                                                    {selectedProduct.name}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">Seleccionar Producto...</span>
                                            )}
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        </button>
                                        
                                        <AnimatePresence>
                                            {showProductSearch && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 max-h-64 overflow-y-auto"
                                                >
                                                    <input 
                                                        type="text" 
                                                        placeholder="Buscar SKU o nombre..."
                                                        className="w-full p-3 bg-gray-50 border-none rounded-xl mb-4 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                    />
                                                    <div className="space-y-1">
                                                        {products.filter(p => p.sku.includes(searchQuery) || p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                                                            <button 
                                                                key={p.id}
                                                                onClick={() => { setProductId(p.id); setShowProductSearch(false); }}
                                                                className="w-full p-3 text-left hover:bg-indigo-50 rounded-xl transition flex items-center gap-3 group"
                                                            >
                                                                <span className="font-mono text-xs font-black text-gray-400 group-hover:text-indigo-500">{p.sku}</span>
                                                                <span className="font-bold text-gray-700 text-sm">{p.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Lote / OP</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: OP-2024-001"
                                        className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900 transition uppercase font-mono"
                                        value={op}
                                        onChange={(e) => setOp(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="mt-8 space-y-4 pt-6 border-t border-gray-50">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 block">Cantidades Auditadas</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100/50">
                                        <label className="text-[10px] font-black text-emerald-600 uppercase mb-1 block">1ra (Bueno)</label>
                                        <input type="number" className="w-full bg-transparent text-xl font-black text-emerald-700 outline-none" 
                                            value={quantityGood} onChange={e => setQuantityGood(parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div className="bg-amber-50/50 p-4 rounded-3xl border border-amber-100/50">
                                        <label className="text-[10px] font-black text-amber-600 uppercase mb-1 block">En Proceso</label>
                                        <input type="number" className="w-full bg-transparent text-xl font-black text-amber-700 outline-none" 
                                            value={quantityProcess} onChange={e => setQuantityProcess(parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div className="bg-red-50/50 p-4 rounded-3xl border border-red-100/50">
                                        <label className="text-[10px] font-black text-red-600 uppercase mb-1 block">2da (Segunda)</label>
                                        <input type="number" className="w-full bg-transparent text-xl font-black text-red-700 outline-none" 
                                            value={quantitySecond} onChange={e => setQuantitySecond(parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div className="bg-gray-900 p-4 rounded-3xl border border-gray-800">
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Total Lote</label>
                                        <p className="text-xl font-black text-white">{totalQuantity}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 space-y-4 pt-6 border-t border-gray-50">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 block">Proceso Auditado</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {PROCESS_OPTIONS.map(opt => {
                                        const Icon = opt.icon;
                                        const isSelected = process === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setProcess(opt.id)}
                                                className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all ${
                                                    isSelected 
                                                    ? `${opt.border} ${opt.bg} scale-105 shadow-lg shadow-gray-100` 
                                                    : 'border-transparent bg-gray-50 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm ${opt.color}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${isSelected ? opt.color : 'text-gray-500'}`}>
                                                    {opt.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: CHECKLIST */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Checklist: {process}</h2>
                                </div>
                                <div className="px-3 py-1 bg-gray-50 rounded-full text-[10px] font-black text-gray-400 uppercase">Verificación Técnica</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {CHECKLIST_TEMPLATES[process].map((item, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleCheckToggle(item)}
                                        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                                            checklist[item] 
                                            ? 'bg-emerald-50 border-emerald-100' 
                                            : 'bg-white border-red-100 shadow-sm'
                                        }`}
                                    >
                                        <span className={`text-sm font-bold ${checklist[item] ? 'text-emerald-800' : 'text-red-700'}`}>{item}</span>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                            checklist[item] ? 'bg-emerald-500 text-white' : 'bg-red-100 text-red-500'
                                        }`}>
                                            {checklist[item] ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* SECCIÓN 3: HALLAZGOS Y ACCIONES */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Hallazgos y Defectos</h2>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={addFinding}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-100 transition"
                                >
                                    <Plus className="w-4 h-4" /> Agregar Hallazgo
                                </button>
                            </div>

                            <div className="space-y-6">
                                {findings.length === 0 ? (
                                    <div className="py-12 border-2 border-dashed border-gray-50 rounded-3xl text-center">
                                        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Sin hallazgos reportados</p>
                                    </div>
                                ) : (
                                    findings.map((f, fIdx) => (
                                        <div key={fIdx} className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 relative group">
                                            <button 
                                                onClick={() => removeFinding(fIdx)}
                                                className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-red-50 text-red-400 rounded-full flex items-center justify-center shadow-lg hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>

                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                <div className="md:col-span-8 space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción del defecto</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Describe el error encontrado..."
                                                        className="w-full px-4 py-3 bg-white border-transparent rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900 text-sm transition shadow-sm"
                                                        value={f.description}
                                                        onChange={(e) => updateFinding(fIdx, 'description', e.target.value)}
                                                    />
                                                </div>
                                                <div className="md:col-span-4 space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gravedad</label>
                                                    <select 
                                                        className={`w-full px-4 py-3 bg-white border-transparent rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-[11px] uppercase tracking-widest transition shadow-sm ${
                                                            f.severity === 'CRITICO' ? 'text-red-600' : f.severity === 'ALTO' ? 'text-orange-600' : 'text-amber-600'
                                                        }`}
                                                        value={f.severity}
                                                        onChange={(e) => updateFinding(fIdx, 'severity', e.target.value)}
                                                    >
                                                        <option value="BAJO">BAJO</option>
                                                        <option value="MEDIO">MEDIO</option>
                                                        <option value="ALTO">ALTO</option>
                                                        <option value="CRITICO">CRITICO</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Acciones Correctivas del Hallazgo */}
                                            <div className="mt-6 pt-6 border-t border-white">
                                                <div className="flex items-center justify-between mb-4">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Acciones Correctivas</p>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => addAction(fIdx)}
                                                        className="text-[10px] font-black text-indigo-600 hover:underline"
                                                    >
                                                        + Añadir Acción
                                                    </button>
                                                </div>
                                                <div className="space-y-3">
                                                    {f.correctiveActions.map((a: any, aIdx: number) => (
                                                        <div key={aIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white/50 rounded-2xl border border-white">
                                                            <div className="md:col-span-5">
                                                                <input 
                                                                    type="text" placeholder="Acción a realizar..." 
                                                                    className="w-full h-8 text-xs bg-transparent border-b border-gray-100 outline-none focus:border-indigo-400 font-semibold"
                                                                    value={a.action} onChange={(e) => updateAction(fIdx, aIdx, 'action', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="md:col-span-3">
                                                                <input 
                                                                    type="text" placeholder="Responsable..." 
                                                                    className="w-full h-8 text-xs bg-transparent border-b border-gray-100 outline-none focus:border-indigo-400 font-semibold"
                                                                    value={a.responsibleName} onChange={(e) => updateAction(fIdx, aIdx, 'responsibleName', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="md:col-span-3">
                                                                <input 
                                                                    type="date" 
                                                                    className="w-full h-8 text-xs bg-transparent border-b border-gray-100 outline-none focus:border-indigo-400 font-semibold"
                                                                    value={a.deadline} onChange={(e) => updateAction(fIdx, aIdx, 'deadline', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="md:col-span-1 flex justify-end items-center">
                                                                <button onClick={() => removeAction(fIdx, aIdx)} className="text-red-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: STATUS & OBSERVATIONS */}
                    <div className="space-y-8">
                        {/* SECCIÓN RESULTADO */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 sticky top-24">
                            <div className="flex items-center gap-2 mb-8">
                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                    <Star className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Resultado Final</h2>
                            </div>

                            <div className="space-y-4 mb-8">
                                {[
                                    { id: 'CONFORME', label: 'Conforme', color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
                                    { id: 'OBSERVACION', label: 'Con Observación', color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle },
                                    { id: 'NO_CONFORME', label: 'No Conforme', color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', icon: XCircle }
                                ].map(res => {
                                    const Icon = res.icon;
                                    const isActive = result === res.id;
                                    return (
                                        <button
                                            key={res.id}
                                            type="button"
                                            onClick={() => setResult(res.id)}
                                            className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                                                isActive 
                                                ? `${res.bg} border-current ${res.text}` 
                                                : 'border-transparent bg-gray-50 text-gray-400 grayscale'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? res.color + ' text-white shadow-lg shadow-current/30' : 'bg-gray-200'}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className="font-black text-xs uppercase tracking-widest">{res.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observaciones Generales</label>
                                <textarea
                                    className="w-full p-5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-800 text-sm h-32 resize-none transition shadow-inner"
                                    placeholder="Añade notas adicionales sobre la auditoría..."
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                />
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-50">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">Evidencia Fotográfica</p>
                                <button
                                    type="button"
                                    className="w-full py-8 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center gap-2 hover:bg-indigo-50 hover:border-indigo-100 transition group"
                                >
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition">
                                        <Camera className="w-6 h-6 text-gray-300 group-hover:text-inherit" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-300 uppercase group-hover:text-indigo-600 transition tracking-widest">Subir Evidencias</span>
                                </button>
                                <p className="text-[9px] text-gray-400 text-center mt-3 font-semibold uppercase italic">Solo formato JPG, PNG · Max 5MB cada una</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function Star(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
