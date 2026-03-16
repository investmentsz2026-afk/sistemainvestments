'use client';

import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/axios';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    ClipboardList,
    Camera,
    Plus,
    Trash2,
    Search,
    Calculator,
    Package,
    ArrowRight,
    Save,
    AlertTriangle,
    FileText,
    Edit,
    Send
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function SampleDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const router = useRouter();

    const [sample, setSample] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Review State
    const [reviewStatus, setReviewStatus] = useState('');
    const [observations, setObservations] = useState('');
    const [recommendations, setRecommendations] = useState('');
    const [bom, setBom] = useState<any[]>([]);
    const [opName, setOpName] = useState('');
    const [prodQuantity, setProdQuantity] = useState('');
    const [productionDetail, setProductionDetail] = useState<{size: string, color: string, quantity: number}[]>([]);

    // Edit State (UDP)
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        description: '',
        characteristics: '',
        images: [] as string[]
    });

    // Auto-calculate total quantity based on detailed breakdown
    useEffect(() => {
        const total = productionDetail.reduce((acc, item) => acc + (item.quantity || 0), 0);
        if (total > 0) {
            setProdQuantity(total.toString());
        }
    }, [productionDetail]);

    // Projection State
    const [targetQuantity, setTargetQuantity] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    // Sync targetQuantity with prodQuantity for automatic cost calculation
    useEffect(() => {
        const qty = parseFloat(prodQuantity);
        if (!isNaN(qty) && qty >= 0) {
            setTargetQuantity(qty);
        }
    }, [prodQuantity]);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [sResp, pResp] = await Promise.all([
                api.get(`/samples/${id}`),
                api.get('/products')
            ]);

            const sampleData = sResp.data;
            setSample(sampleData);
            setProducts(pResp.data.data || []);

            // Sync local state with sample data
            setReviewStatus(sampleData.status);
            setObservations(sampleData.observations || '');
            setRecommendations(sampleData.recommendations || '');
            setEditData({
                name: sampleData.name,
                description: sampleData.description || '',
                characteristics: sampleData.characteristics || '',
                images: sampleData.images || []
            });
            if (sampleData.materials && sampleData.materials.length > 0) {
                const initialBom = sampleData.materials.map((m: any) => ({
                    productId: m.productId || `custom-${m.id}`,
                    name: m.product?.name || m.customMaterial || 'Material',
                    sku: m.product?.sku || 'MANUAL',
                    quantityPerUnit: m.quantity || 1,
                    unitPrice: m.unitPriceAtTime || 0
                }));
                setBom(initialBom);
            }
            if (sampleData.op) setOpName(sampleData.op);
            if (sampleData.productionQuantity) setProdQuantity(sampleData.productionQuantity.toString());
            if (sampleData.productionSizeData) {
                // If it's the new array format
                if (Array.isArray(sampleData.productionSizeData)) {
                    setProductionDetail(sampleData.productionSizeData);
                } else {
                    // Fallback for old object format
                    const oldFormat = sampleData.productionSizeData;
                    const color = sampleData.productionColor || 'Pendiente';
                    const detail = Object.entries(oldFormat).map(([size, qty]) => ({
                        size, color, quantity: qty as number
                    }));
                    setProductionDetail(detail);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const addMaterial = (p: any) => {
        if (bom.find(item => item.productId === p.id)) return;
        setBom([...bom, {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            quantityPerUnit: 1,
            unitPrice: p.purchasePrice
        }]);
    };

    const removeMaterial = (productId: string) => {
        setBom(bom.filter(b => b.productId !== productId));
    };

    const updateBomQuantity = (productId: string, q: number) => {
        setBom(bom.map(b => b.productId === productId ? { ...b, quantityPerUnit: q } : b));
    };

    const handleAdminApproveMaterials = async () => {
        setIsSaving(true);
        try {
            await api.patch(`/samples/${id}/admin-approve-materials`, { notes: recommendations });
            toast.success('Materiales aprobados para logística');
            fetchData();
        } catch (error) {
            console.error('Error approving materials:', error);
            toast.error('Error al aprobar materiales');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogisticsDeliverMaterials = async () => {
        setIsSaving(true);
        try {
            await api.patch(`/samples/${id}/logistics-deliver-materials`);
            toast.success('Pedido entregado a UDP');
            fetchData();
        } catch (error) {
            console.error('Error delivering materials:', error);
            toast.error('Error al registrar entrega');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUDPConfirmMaterials = async () => {
        setIsSaving(true);
        try {
            await api.patch(`/samples/${id}/udp-confirm-materials`);
            toast.success('Materiales recibidos. Ahora puedes desarrollar la muestra.');
            fetchData();
        } catch (error) {
            console.error('Error confirming materials:', error);
            toast.error('Error al confirmar recepción');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUDPCompleteDevelopment = async () => {
        setIsSaving(true);
        try {
            await api.patch(`/samples/${id}/udp-complete-development`);
            toast.success('Muestra enviada a comercial para revisión');
            fetchData();
        } catch (error) {
            console.error('Error completing development:', error);
            toast.error('Error al enviar a revisión');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveReview = async () => {
        if (!reviewStatus || reviewStatus === 'PENDIENTE') {
            toast.error('Por favor selecciona un estado de revisión');
            return;
        }

        if (reviewStatus === 'APROBADO' && (!opName.trim() || !prodQuantity.trim())) {
            toast.error('Para aprobar debes ingresar la OP y la Cantidad de Producción.');
            return;
        }

        setIsSaving(true);
        try {
            await api.put(`/samples/${id}/review`, {
                status: reviewStatus,
                observations,
                recommendations,
                op: reviewStatus === 'APROBADO' ? opName : undefined,
                productionQuantity: reviewStatus === 'APROBADO' ? parseFloat(prodQuantity) : undefined,
                productionSizeData: reviewStatus === 'APROBADO' ? productionDetail : undefined,
                materials: reviewStatus === 'APROBADO' ? bom : []
            });
            toast.success('Muestra actualizada con éxito');
            router.push('/samples');
        } catch (error) {
            console.error('Error saving review:', error);
            toast.error('Error al guardar la revisión');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEdit = async () => {
        setIsSaving(true);
        try {
            await api.put(`/samples/${id}`, editData);
            toast.success('Muestra actualizada correctamente');
            setIsEditing(false);
            fetchData();
        } catch (error) {
            console.error('Error updating sample:', error);
            toast.error('Error al actualizar la muestra');
        } finally {
            setIsSaving(false);
        }
    };

    // Calculations
    const totalCostPerUnit = bom.reduce((acc, item) => acc + ((item.quantityPerUnit || 0) * (item.unitPrice || 0)), 0);
    const totalProjectedCost = totalCostPerUnit * targetQuantity;

    const cardClass = "bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20";

    if (isLoading || !sample) return (
        <Layout>
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        </Layout>
    );

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* TOP BAR */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 shadow-sm transition active:scale-90"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            {isEditing ? (
                                <input
                                    className="text-3xl font-black text-gray-900 tracking-tight uppercase bg-gray-50 border-none rounded-xl px-4 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={editData.name}
                                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                                />
                            ) : (
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">{sample.name}</h1>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${sample.status === 'APROBADO' ? 'bg-emerald-100 text-emerald-600' :
                                        sample.status === 'OBSERVADO' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                    }`}>
                                    {sample.status}
                                </span>
                                <span className="text-xs font-bold text-gray-400">Ref ID: {sample.id.slice(-6).toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {user?.role === 'UDP' && sample.status === 'PENDIENTE' && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-600 hover:text-indigo-600 shadow-sm transition"
                            >
                                <Edit className="w-4 h-4" /> Editar Muestra
                            </button>
                        )}
                        {isEditing && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-400 hover:text-gray-900 shadow-sm transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-black transition"
                                >
                                    <Save className="w-4 h-4" /> Guardar Cambios
                                </button>
                            </div>
                        )}
                        {user?.role === 'COMERCIAL' && sample.status === 'PENDIENTE' && (
                            <div className="hidden md:flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-sm">
                                <AlertTriangle className="w-5 h-5" /> Revisión Requerida
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN: SAMPLE INFO */}
                    <div className="lg:col-span-7 space-y-8">
                        {/* MATERIAL WORKFLOW STATUS & ACTIONS */}
                        {sample.materialReceiptStatus && (
                            <div className={`${cardClass} border-indigo-100 bg-indigo-50/10`}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                        <Package className="w-5 h-5 text-indigo-500" /> Estado de Materiales
                                    </h3>
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                        sample.materialReceiptStatus === 'RECIBIDO_UDP' ? 'bg-indigo-100 text-indigo-700' :
                                        sample.materialReceiptStatus === 'DESARROLLO_COMPLETADO' ? 'bg-emerald-100 text-emerald-700' :
                                        sample.materialReceiptStatus === 'ENTREGADO_LOGISTICA' ? 'bg-blue-100 text-blue-700' :
                                        sample.materialReceiptStatus === 'APROBADO_ADMIN' ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-100 text-gray-500'
                                    }`}>
                                        {sample.materialReceiptStatus === 'PENDIENTE_ADMIN' ? '⌛ PENDIENTE APROBACIÓN ADMIN' :
                                         sample.materialReceiptStatus === 'APROBADO_ADMIN' ? '🚛 ESPERANDO ENTREGA LOGÍSTICA' :
                                         sample.materialReceiptStatus === 'ENTREGADO_LOGISTICA' ? '📦 POR CONFIRMAR UDP' :
                                         sample.materialReceiptStatus === 'RECIBIDO_UDP' ? '🛠️ EN DESARROLLO (UDP)' :
                                         '✅ LISTO PARA REVISIÓN COMERCIAL'}
                                    </span>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Insumos Solicitados</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {sample.materials?.map((m: any, idx: number) => (
                                            <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                                                <div>
                                                    <p className="font-black text-gray-900 text-xs uppercase">{m.product?.name || m.customMaterial || 'Material'}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{m.productId ? (m.product?.sku || 'Prod') : 'Manual'}</p>
                                                </div>
                                                <div className="px-3 py-1 bg-gray-50 rounded-lg font-black text-xs text-indigo-600">
                                                    x {m.quantity}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {sample.adminMaterialNotes && (
                                        <div className="p-4 bg-white rounded-2xl border border-amber-100 mt-4 italic text-sm text-gray-600">
                                            <span className="font-black text-amber-600 uppercase text-[9px] block mb-1">Notas de Admin</span>
                                            "{sample.adminMaterialNotes}"
                                        </div>
                                    )}
                                </div>

                                {/* WORKFLOW ACTIONS */}
                                <div className="pt-6 border-t border-gray-100">
                                    {user?.role === 'ADMIN' && sample.materialReceiptStatus === 'PENDIENTE_ADMIN' && (
                                        <div className="space-y-4">
                                            <textarea 
                                                placeholder="Añadir notas para logística o UDP (opcional)..."
                                                className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                                value={recommendations}
                                                onChange={e => setRecommendations(e.target.value)}
                                            />
                                            <button 
                                                onClick={handleAdminApproveMaterials}
                                                disabled={isSaving}
                                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition shadow-xl shadow-emerald-200"
                                            >
                                                <CheckCircle2 className="w-5 h-5 inline mr-2" /> Aprobar Entrega de Insumos
                                            </button>
                                        </div>
                                    )}

                                    {user?.role === 'LOGISTICA' && sample.materialReceiptStatus === 'APROBADO_ADMIN' && (
                                        <button 
                                            onClick={handleLogisticsDeliverMaterials}
                                            disabled={isSaving}
                                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition shadow-xl shadow-indigo-200"
                                        >
                                            <Package className="w-5 h-5 inline mr-2" /> Confirmar Entrega a UDP
                                        </button>
                                    )}

                                    {user?.role === 'UDP' && sample.materialReceiptStatus === 'ENTREGADO_LOGISTICA' && (
                                        <button 
                                            onClick={handleUDPConfirmMaterials}
                                            disabled={isSaving}
                                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition shadow-xl shadow-emerald-200"
                                        >
                                            <CheckCircle2 className="w-5 h-5 inline mr-2" /> He recibido los materiales
                                        </button>
                                    )}

                                    {user?.role === 'UDP' && sample.materialReceiptStatus === 'RECIBIDO_UDP' && (
                                        <button 
                                            onClick={handleUDPCompleteDevelopment}
                                            disabled={isSaving}
                                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition shadow-xl shadow-indigo-200"
                                        >
                                            <Send className="w-5 h-5 inline mr-2" /> Ya hice la muestra y enviar a comercial
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={cardClass}>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-3">
                                <FileText className="w-6 h-6 text-indigo-400" /> Descripción Técnica
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Características Principales</h4>
                                    {isEditing ? (
                                        <textarea
                                            className="w-full bg-gray-50 border-none rounded-3xl p-6 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition min-h-[150px] resize-none"
                                            value={editData.characteristics}
                                            onChange={e => setEditData({ ...editData, characteristics: e.target.value })}
                                        />
                                    ) : (
                                        <p className="text-gray-900 font-bold bg-gray-50 p-6 rounded-3xl leading-relaxed whitespace-pre-wrap">
                                            {sample.characteristics || 'No se especificaron características técnicas.'}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descripción General</h4>
                                    {isEditing ? (
                                        <textarea
                                            className="w-full bg-gray-50 border-none rounded-3xl p-6 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition min-h-[100px] resize-none"
                                            value={editData.description}
                                            onChange={e => setEditData({ ...editData, description: e.target.value })}
                                        />
                                    ) : (
                                        <p className="text-gray-600 font-medium leading-relaxed">
                                            {sample.description || 'Sin descripción adicional.'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-gray-50 flex flex-wrap gap-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Desarrollado por</p>
                                        <p className="font-bold text-gray-900">{sample.udp?.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Fecha Envío</p>
                                        <p className="font-bold text-gray-900">{new Date(sample.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* EVIDENCE GALLERY */}
                        <div className={cardClass}>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-3">
                                <Camera className="w-6 h-6 text-indigo-400" /> Evidencias de Muestra
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {sample.images && sample.images.length > 0 ? sample.images.map((img: string, i: number) => (
                                    <div key={i} className="aspect-square bg-gray-100 rounded-3xl overflow-hidden shadow-sm">
                                        <img src={img} alt={`Evidencia ${i}`} className="w-full h-full object-cover" />
                                    </div>
                                )) : (
                                    <div className="col-span-full py-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300">
                                        <Camera className="w-10 h-10 mb-2" />
                                        <span className="font-black text-[10px] uppercase tracking-widest">No hay imágenes disponibles</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: COMMERCIAL REVIEW & BOM */}
                    <div className="lg:col-span-5 space-y-8">
                        {/* REVIEW SECTION */}
                        <div className={`${cardClass} border-indigo-100 shadow-indigo-100/30`}>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center justify-between">
                                <span>Control Comercial</span>
                                <ClipboardList className="w-6 h-6 text-indigo-600" />
                            </h2>

                            {user?.role === 'COMERCIAL' && sample.status === 'PENDIENTE' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setReviewStatus('APROBADO')}
                                            className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${reviewStatus === 'APROBADO' ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-white border-gray-100 hover:border-emerald-200'
                                                }`}
                                        >
                                            <CheckCircle2 className={`w-8 h-8 ${reviewStatus === 'APROBADO' ? 'text-emerald-600' : 'text-gray-300'}`} />
                                            <span className="font-black text-[10px] uppercase tracking-widest">Aprobar</span>
                                        </button>
                                        <button
                                            onClick={() => setReviewStatus('OBSERVADO')}
                                            className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${reviewStatus === 'OBSERVADO' ? 'bg-rose-50 border-rose-500 shadow-lg shadow-rose-100' : 'bg-white border-gray-100 hover:border-rose-200'
                                                }`}
                                        >
                                            <XCircle className={`w-8 h-8 ${reviewStatus === 'OBSERVADO' ? 'text-rose-600' : 'text-gray-300'}`} />
                                            <span className="font-black text-[10px] uppercase tracking-widest">Observar</span>
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {reviewStatus === 'APROBADO' && (
                                            <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 space-y-4">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Datos de Orden de Producción</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Orden de Producción (OP) *</label>
                                                        <input
                                                            type="text"
                                                            className="w-full bg-white border border-gray-200 rounded-2xl p-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 transition mt-2 uppercase font-mono"
                                                            placeholder="Ej: OP-050"
                                                            value={opName}
                                                            onChange={e => setOpName(e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cantidad de Prendas a Producir *</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className="w-full bg-white border border-gray-200 rounded-2xl p-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 transition mt-2"
                                                            placeholder="Ej: 1000"
                                                            value={prodQuantity}
                                                            onChange={e => setProdQuantity(e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-emerald-100/30">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Desglose de Producción (Talla, Color, Cantidad) *</label>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setProductionDetail([...productionDetail, { size: 'S', color: '', quantity: 0 }])}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-black transition shadow-sm"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Agregar Item
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="space-y-3">
                                                        {productionDetail.map((item, idx) => (
                                                            <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                                                <div className="col-span-3">
                                                                    <label className="text-[8px] font-black text-gray-400 uppercase mb-1 block">Talla</label>
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="S, M, 32..."
                                                                        className="w-full bg-gray-50 border-none rounded-xl p-2 text-xs font-bold uppercase"
                                                                        value={item.size}
                                                                        onChange={e => {
                                                                            const newList = [...productionDetail];
                                                                            newList[idx].size = e.target.value.toUpperCase();
                                                                            setProductionDetail(newList);
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="col-span-4">
                                                                    <label className="text-[8px] font-black text-gray-400 uppercase mb-1 block">Color</label>
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="Azul, Rojo..."
                                                                        className="w-full bg-gray-50 border-none rounded-xl p-2 text-xs font-bold"
                                                                        value={item.color}
                                                                        onChange={e => {
                                                                            const newList = [...productionDetail];
                                                                            newList[idx].color = e.target.value;
                                                                            setProductionDetail(newList);
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <label className="text-[8px] font-black text-gray-400 uppercase mb-1 block">Cantidad</label>
                                                                    <input 
                                                                        type="number" 
                                                                        className="w-full bg-gray-50 border-none rounded-xl p-2 text-xs font-bold"
                                                                        value={item.quantity}
                                                                        onChange={e => {
                                                                            const val = parseInt(e.target.value) || 0;
                                                                            const newList = [...productionDetail];
                                                                            newList[idx].quantity = val;
                                                                            setProductionDetail(newList);
                                                                            const total = newList.reduce((a, b) => a + b.quantity, 0);
                                                                            setProdQuantity(total.toString());
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="col-span-2 flex justify-end">
                                                                    <button 
                                                                        onClick={() => {
                                                                            const newList = productionDetail.filter((_, i) => i !== idx);
                                                                            setProductionDetail(newList);
                                                                            const total = newList.reduce((a, b) => a + b.quantity, 0);
                                                                            setProdQuantity(total.toString());
                                                                        }}
                                                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        
                                                        {productionDetail.length === 0 && (
                                                            <div className="text-center py-6 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 italic text-gray-400 text-[10px] font-bold uppercase">
                                                                No se han añadido ítems de producción
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observaciones Críticas</label>
                                            <textarea
                                                className="w-full bg-gray-50 border-none rounded-3xl p-6 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition mt-2 h-32 resize-none"
                                                placeholder="Escribe aquí los motivos del rechazo u observaciones generales..."
                                                value={observations}
                                                onChange={e => setObservations(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Recomendaciones de Mejora</label>
                                            <textarea
                                                className="w-full bg-gray-50 border-none rounded-3xl p-6 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition mt-2 h-32 resize-none"
                                                placeholder="Sugerencias para que la siguiente muestra sea aprobada..."
                                                value={recommendations}
                                                onChange={e => setRecommendations(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className={`p-6 rounded-[2rem] ${sample.status === 'APROBADO' ? 'bg-emerald-50' : 'bg-rose-50'} border border-transparent`}>
                                        <h4 className={`text-sm font-black uppercase tracking-widest ${sample.status === 'APROBADO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            Resultado: {sample.status}
                                        </h4>
                                        <p className="text-gray-700 font-bold mt-2 text-sm italic">"{sample.observations || 'Sin observaciones registradas.'}"</p>
                                        {sample.status === 'APROBADO' && sample.op && (
                                            <div className="mt-4 pt-4 border-t border-emerald-100/50 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Orden Prod. (OP)</p>
                                                    <p className="font-black text-emerald-900 text-lg font-mono">{sample.op}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Cantidad a Producir</p>
                                                    <p className="font-black text-emerald-900 text-lg">{sample.productionQuantity} prendas</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {sample.recommendations && (
                                        <div className="p-6 bg-indigo-50/50 rounded-[2rem]">
                                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Recomendaciones</h4>
                                            <p className="text-gray-900 font-bold text-sm">{sample.recommendations}</p>
                                        </div>
                                    )}

                                    {sample.status === 'APROBADO' && sample.productionSizeData && (
                                        <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Detalles de Fabricación (OP: {sample.op})
                                            </h4>
                                            <div className="space-y-2">
                                                {Array.isArray(sample.productionSizeData) ? (
                                                    (sample.productionSizeData as any[]).map((row, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl text-[11px] font-bold">
                                                            <div className="flex items-center gap-4">
                                                                <span className="w-8 text-indigo-600">T: {row.size}</span>
                                                                <span className="text-gray-500">Color: <span className="text-gray-900 uppercase">{row.color}</span></span>
                                                            </div>
                                                            <span className="text-emerald-600">{row.quantity} uds.</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    Object.entries(sample.productionSizeData as { [key: string]: number }).map(([size, qty]) => (
                                                        <div key={size} className="px-4 py-2 bg-white border border-gray-200 rounded-xl flex flex-col items-center min-w-[60px]">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase">{size}</span>
                                                            <span className="text-sm font-black text-gray-900">{qty}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* BOM SECTION (MATERIALS & REQUIREMENTS) - ONLY IF APPROVING OR ALREADY APPROVED */}
                        {(reviewStatus === 'APROBADO' || sample.status === 'APROBADO') && (
                            <AnimatePresence>
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className={cardClass}
                                >
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center gap-3">
                                        <Calculator className="w-6 h-6 text-emerald-600" /> Requerimientos (BOM)
                                    </h2>

                                    {/* SEARCH FOR RAW MATERIALS */}
                                    {sample.status === 'PENDIENTE' && (
                                        <div className="relative mb-8">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="text" placeholder="Añadir tela, botones, cierres..."
                                                className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-4 py-3 text-sm font-bold outline-none"
                                                onFocus={() => { }} // Could show a dropdown
                                            />
                                            {/* Simplified material selection mock-up or real logic */}
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {products.filter(p => ['Materiales', 'Avios'].includes(p.category)).slice(0, 5).map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => addMaterial(p)}
                                                        className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-colors"
                                                    >
                                                        + {p.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {bom.map(item => (
                                            <div key={item.productId} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl group">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-300">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-xs font-black text-gray-900 uppercase truncate">{item.name}</h4>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <div className="flex-1">
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cant. x Unidad</p>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-white border-none rounded-lg px-3 py-1 text-xs font-black mt-1"
                                                                value={item.quantityPerUnit}
                                                                onChange={e => updateBomQuantity(item.productId, parseFloat(e.target.value) || 0)}
                                                                disabled={sample.status === 'APROBADO'}
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">P. Unit</p>
                                                            <p className="text-xs font-black text-gray-900 mt-2">${item.unitPrice}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                {sample.status === 'PENDIENTE' && (
                                                    <button
                                                        onClick={() => removeMaterial(item.productId)}
                                                        className="p-2 text-gray-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {bom.length > 0 && (
                                        <div className="mt-8 pt-6 border-t border-gray-100 space-y-6">
                                            {/* PROJECTION CALCULATOR */}
                                            <div className="p-6 bg-gray-900 rounded-[2rem] text-white">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Escalabilidad</h4>
                                                        <p className="text-sm font-bold text-gray-100">Proyectar para:</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="number"
                                                            className="w-24 bg-white/10 border-none rounded-xl px-4 py-2 font-black text-white outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                                            value={targetQuantity}
                                                            onChange={e => setTargetQuantity(parseInt(e.target.value) || 0)}
                                                        />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Prendas</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                                                        <span>Costo Material x Unidad</span>
                                                        <span className="text-gray-100">${(totalCostPerUnit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                        <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Inversión Total Estimada (P. Unit x {targetQuantity})</span>
                                                        <span className="text-2xl font-black">${(totalProjectedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* DETAILED MATERIAL LIST FOR X QUANTITY */}
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Desglose de Materiales Necesarios</h4>
                                                <div className="space-y-2">
                                                    {bom.map(item => (
                                                        <div key={item.productId} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl text-xs font-bold">
                                                            <span className="text-gray-900">{item.name}</span>
                                                            <div className="text-right">
                                                                <span className="text-indigo-600">{( (item.quantityPerUnit || 0) * (targetQuantity || 0) ).toLocaleString()} Unidades/Metros</span>
                                                                <p className="text-[10px] text-gray-400 mt-1">Coste: ${( (item.unitPrice || 0) * (item.quantityPerUnit || 0) * (targetQuantity || 0) ).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        )}

                        {/* FINAL ACTION BUTTONS FOR COMMERCIAL - ENABLED ONLY IF MATERIALS ARE READY */}
                        {user?.role === 'COMERCIAL' && sample.status === 'PENDIENTE' && (
                            <div className="space-y-4">
                                {sample.materialReceiptStatus && sample.materialReceiptStatus !== 'DESARROLLO_COMPLETADO' ? (
                                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 flex items-center gap-4 text-amber-700">
                                        <Clock className="w-6 h-6 flex-shrink-0" />
                                        <p className="text-xs font-bold uppercase tracking-tight">
                                            La revisión comercial está bloqueada hasta que el desarrollo sea completado por UDP.
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleSaveReview}
                                        disabled={isSaving || !reviewStatus}
                                        className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl hover:bg-black transition active:scale-95 disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <>Procesando...</>
                                        ) : (
                                            <>
                                                <Save className="w-6 h-6" /> Guardar Veredicto Final
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
