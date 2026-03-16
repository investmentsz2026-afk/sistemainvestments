'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/axios';
import {
    ArrowLeft,
    Save,
    Camera,
    Box,
    CheckSquare,
    Search,
    FileText,
    ChevronDown,
    ClipboardList,
    X,
    Building2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const PROCESS_OPTIONS = [
    { id: 'Corte', label: 'Corte', icon: Box, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
    { id: 'Confección', label: 'Confección', icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    { id: 'Lavado', label: 'Lavado', icon: Search, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100' },
    { id: 'Acabados', label: 'Acabados', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
];

export default function NewAuditPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [sampleId, setSampleId] = useState('');
    const [op, setOp] = useState('');
    const [process, setProcess] = useState('Corte');
    const [externalCompany, setExternalCompany] = useState('');
    const [observations, setObservations] = useState('');
    const [evidences, setEvidences] = useState<string[]>([]);
    const [totalQuantity, setTotalQuantity] = useState(0);

    // UI Helpers
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const resp = await api.get('/process-audits/auditable-items');
            const { samples } = resp.data;
            setProducts(samples || []);
        } catch (error) {
            console.error('Error fetching auditable items:', error);
        }
    };

    const handleSelectSample = (s: any) => {
        setSampleId(s.id);
        if (s.op) setOp(s.op);
        if (s.productionQuantity) setTotalQuantity(s.productionQuantity);
        setShowProductSearch(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEvidences(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeEvidence = (idx: number) => {
        setEvidences(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sampleId || !op) {
            alert('Por favor selecciona una muestra aprobada y verifica la OP');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/process-audits', {
                sampleId,
                op,
                process,
                externalCompany: externalCompany || null,
                totalQuantity,
                observations,
                evidences
            });
            router.push('/audit');
        } catch (error) {
            console.error('Error saving audit:', error);
            alert('Hubo un error al crear la auditoría');
        } finally {
            setIsSaving(false);
        }
    };

    const selectedSample = products.find(p => p.id === sampleId);

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
                            <p className="text-gray-500 font-medium">Envía una muestra aprobada al proceso de auditoría</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition disabled:opacity-50 active:scale-95"
                    >
                        {isSaving ? 'Creando...' : (
                            <>
                                <Save className="w-5 h-5" /> Enviar a Auditoría
                            </>
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: MAIN INFO */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* SECCIÓN 1: MUESTRA + OP + PROCESO */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Información Base</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* MUESTRA SELECTOR */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Muestra Aprobada</label>
                                    <div className="relative">
                                        <button 
                                            type="button"
                                            onClick={() => setShowProductSearch(!showProductSearch)}
                                            className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-left font-bold text-gray-900 hover:bg-gray-100/50 transition flex items-center justify-between"
                                        >
                                            {selectedSample ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-indigo-600 font-mono">{selectedSample.sku}</span>
                                                    <span>{selectedSample.name}</span>
                                                    {selectedSample.op && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-black">OP: {selectedSample.op}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">Seleccionar Muestra Aprobada...</span>
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
                                                        placeholder="Buscar por nombre de muestra..."
                                                        className="w-full p-3 bg-gray-50 border-none rounded-xl mb-4 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                    />
                                                    <div className="space-y-1">
                                                        {products.length === 0 ? (
                                                            <p className="text-center text-gray-400 text-sm py-4 font-bold">No hay muestras aprobadas</p>
                                                        ) : (
                                                            products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                                                                <button 
                                                                    key={p.id}
                                                                    onClick={() => handleSelectSample(p)}
                                                                    className="w-full p-3 text-left hover:bg-indigo-50 rounded-xl transition flex items-center gap-3 group"
                                                                >
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                                    <span className="font-mono text-xs font-black text-gray-400 group-hover:text-indigo-500">{p.sku}</span>
                                                                    <span className="font-bold text-gray-700 text-sm truncate">{p.name}</span>
                                                                    {p.op && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-black ml-auto">OP: {p.op}</span>}
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* OP - AUTO-FILLED */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">OP (auto-completado)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Se auto-completa al seleccionar muestra"
                                        className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none font-bold text-gray-900 transition uppercase font-mono"
                                        value={op}
                                        readOnly
                                    />
                                </div>

                                {/* QUANTITY - AUTO-FILLED */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Cantidad Total (prendas)</label>
                                    <input 
                                        type="number" 
                                        placeholder="Auto-completado desde la OP"
                                        className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none font-bold text-gray-900 transition"
                                        value={totalQuantity || ''}
                                        readOnly
                                    />
                                </div>
                            </div>

                            {/* PROCESO SELECTOR */}
                            <div className="mt-8 space-y-4 pt-6 border-t border-gray-50">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 block">¿A qué proceso va la auditoría?</label>
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

                            {/* EMPRESA EXTERNA */}
                            <div className="mt-8 space-y-2 pt-6 border-t border-gray-50">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5" /> Empresa Externa (opcional)
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Lavandería San Martín, Taller Textil Lima..."
                                    className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900 transition"
                                    value={externalCompany}
                                    onChange={(e) => setExternalCompany(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: OBSERVACIONES + EVIDENCIA */}
                    <div className="space-y-8">
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 sticky top-24">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-indigo-400" /> Detalles
                            </h2>

                            {/* RESUMEN DE SELECCIÓN */}
                            {selectedSample && (
                                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 mb-6">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Resumen</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-bold">Muestra:</span>
                                            <span className="font-black text-gray-900">{selectedSample.name}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-bold">OP:</span>
                                            <span className="font-black text-indigo-600 font-mono">{op}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-bold">Cantidad:</span>
                                            <span className="font-black text-gray-900">{totalQuantity} prendas</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-bold">Proceso:</span>
                                            <span className="font-black text-gray-900">{process}</span>
                                        </div>
                                        {externalCompany && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 font-bold">Empresa:</span>
                                                <span className="font-black text-gray-900">{externalCompany}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-indigo-100/50">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Estado: EN PROCESO</p>
                                    </div>
                                </div>
                            )}

                            {/* OBSERVACIONES */}
                            <div className="space-y-2 mb-6">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observaciones Iniciales</label>
                                <textarea
                                    className="w-full p-5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-800 text-sm h-28 resize-none transition shadow-inner"
                                    placeholder="Notas sobre el envío a auditoría..."
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                />
                            </div>

                            {/* EVIDENCIA FOTOGRÁFICA */}
                            <div className="pt-6 border-t border-gray-50">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">Evidencia Fotográfica ({evidences.length})</p>
                                
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {evidences.map((img, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                                            <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => removeEvidence(idx)}
                                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <input 
                                    type="file" 
                                    id="evidence-upload" 
                                    className="hidden" 
                                    multiple 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                />
                                <label
                                    htmlFor="evidence-upload"
                                    className="w-full py-8 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center gap-2 hover:bg-indigo-50 hover:border-indigo-100 transition group cursor-pointer"
                                >
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition">
                                        <Camera className="w-6 h-6 text-gray-300 group-hover:text-inherit" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-300 uppercase group-hover:text-indigo-600 transition tracking-widest">Subir Evidencias</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
