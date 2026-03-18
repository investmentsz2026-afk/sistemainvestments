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
    const [bomViewSize, setBomViewSize] = useState<string | null>(null);
    const [showSalesPriceModal, setShowSalesPriceModal] = useState(false);
    const [salesPrices, setSalesPrices] = useState<{ [size: string]: { price: number, secondPrice: number } }>({});

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

        // Sync unique sizes into salesPrices
        const uniqueSizes = Array.from(new Set(productionDetail.map(pd => pd.size)));
        setSalesPrices(prev => {
            const next = { ...prev };
            let changed = false;
            uniqueSizes.forEach(size => {
                if (!next[size]) {
                    next[size] = { price: 0, secondPrice: 0 };
                    changed = true;
                }
            });
            Object.keys(next).forEach(key => {
                if (!uniqueSizes.includes(key)) {
                    delete next[key];
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

    }, [productionDetail]);

    // Projection State
    const [targetQuantity, setTargetQuantity] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    // Discharge Inventory State
    const [showDischargeModal, setShowDischargeModal] = useState(false);
    const [discharges, setDischarges] = useState<{materialId: string, variantId: string, quantity: number, name: string}[]>([]);
    const [isDischarging, setIsDischarging] = useState(false);

    // UDP Requirements State
    const [showRequirementsModal, setShowRequirementsModal] = useState(false);
    const [udpReqs, setUdpReqs] = useState<{size: string, items: any[]}[]>([]);
    const [materialPool, setMaterialPool] = useState<any[]>([]);
    const [selectedType, setSelectedType] = useState('');
    const [reqSearch, setReqSearch] = useState('');
    const [reqModalMode, setReqModalMode] = useState<'EDIT' | 'VIEW'>('EDIT');

    const inventoryTypes = useMemo(() => {
        const types = new Set(products.map(p => p.inventoryType || p.category));
        return Array.from(types).filter(Boolean);
    }, [products]);

    const filteredReqProducts = useMemo(() => {
        let list = products;
        if (selectedType) {
            list = list.filter(p => (p.inventoryType === selectedType || p.category === selectedType));
        }
        if (reqSearch) {
            list = list.filter(p => p.name.toLowerCase().includes(reqSearch.toLowerCase()) || p.sku.toLowerCase().includes(reqSearch.toLowerCase()));
        }
        return list.slice(0, 10);
    }, [products, selectedType, reqSearch]);

    const handleAddSize = () => setUdpReqs([...udpReqs, { size: '', items: [] }]);
    const handleRemoveSize = (idx: number) => setUdpReqs(udpReqs.filter((_, i) => i !== idx));
    const handleUpdateSizeName = (idx: number, name: string) => {
        const newReqs = [...udpReqs];
        newReqs[idx].size = name.toUpperCase();
        setUdpReqs(newReqs);
    };

    const handleAddToPool = (prod: any) => {
        if (materialPool.find(p => p.id === prod.id)) {
            toast.error('Material ya está en la lista del proyecto');
            return;
        }
        setMaterialPool([...materialPool, {
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            description: prod.description,
            price: prod.purchasePrice || 0
        }]);
        toast.success(`${prod.name} añadido a la lista`);
    };

    const handleRemoveFromPool = (id: string) => {
        setMaterialPool(materialPool.filter(p => p.id !== id));
        // Also remove from sizes
        setUdpReqs(udpReqs.map(s => ({
            ...s,
            items: s.items.filter(i => i.productId !== id)
        })));
    };

    const handleAddItemToSize = (sizeIdx: number, poolItem: any) => {
        const newReqs = [...udpReqs];
        if (newReqs[sizeIdx].items.some(item => item.productId === poolItem.id)) {
            toast.error('Material ya añadido a esta talla');
            return;
        }
        newReqs[sizeIdx].items.push({
            productId: poolItem.id,
            name: poolItem.name,
            sku: poolItem.sku,
            description: poolItem.description || '',
            consumption: 1,
            price: poolItem.price || 0
        });
        setUdpReqs(newReqs);
    };

    const handleRemoveItemFromSize = (sizeIdx: number, itemIdx: number) => {
        const newReqs = [...udpReqs];
        newReqs[sizeIdx].items.splice(itemIdx, 1);
        setUdpReqs(newReqs);
    };

    const handleUpdateItemCons = (sizeIdx: number, itemIdx: number, val: number) => {
        const newReqs = [...udpReqs];
        newReqs[sizeIdx].items[itemIdx].consumption = val;
        setUdpReqs(newReqs);
    };

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
            setProducts(pResp.data || []);

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
                    const initPrices: any = {};
                    sampleData.productionSizeData.forEach((row: any) => {
                        initPrices[row.size] = {
                            price: row.salePrice || 0,
                            secondPrice: row.secondSalePrice || 0
                        };
                    });
                    setSalesPrices(initPrices);
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
            if (sampleData.udpRequirements) {
                setUdpReqs(sampleData.udpRequirements.sizes || []);
                setMaterialPool(sampleData.udpRequirements.pool || []);
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

    const handleDischargeInventory = async () => {
        if (discharges.some(d => !d.variantId)) {
            toast.error('Por favor selecciona una variante para cada producto');
            return;
        }

        setIsDischarging(true);
        try {
            await api.post(`/samples/${id}/discharge-inventory`, { 
                discharges: discharges.map(d => ({
                    materialId: d.materialId,
                    variantId: d.variantId,
                    quantity: d.quantity
                }))
            });
            toast.success('Productos descargados del inventario');
            setShowDischargeModal(false);
            fetchData();
        } catch (error: any) {
            console.error('Error discharging inventory:', error);
            toast.error(error.response?.data?.message || 'Error al descargar productos');
        } finally {
            setIsDischarging(false);
        }
    };

    const handleSaveRequirements = async () => {
        setIsSaving(true);
        try {
            await api.patch(`/samples/${id}/udp-requirements`, { 
                requirements: {
                    sizes: udpReqs,
                    pool: materialPool
                } 
            });
            toast.success('Requerimientos guardados');
            setShowRequirementsModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving requirements:', error);
            toast.error('Error al guardar requerimientos');
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

        const enrichedProductionDetail = productionDetail.map(pd => ({
            ...pd,
            salePrice: salesPrices[pd.size]?.price || 0,
            secondSalePrice: salesPrices[pd.size]?.secondPrice || 0
        }));

        setIsSaving(true);
        try {
            await api.put(`/samples/${id}/review`, {
                status: reviewStatus,
                observations,
                recommendations,
                op: reviewStatus === 'APROBADO' ? opName : undefined,
                productionQuantity: reviewStatus === 'APROBADO' ? parseFloat(prodQuantity) : undefined,
                productionSizeData: reviewStatus === 'APROBADO' ? enrichedProductionDetail : undefined,
                materials: reviewStatus === 'APROBADO' ? activeBom : []
            });
            toast.success('OP enviada a admin para su aprobacion');
            router.push('/samples');
        } catch (error) {
            console.error('Error saving review:', error);
            toast.error('Error al guardar la revisión');
        } finally {
            setIsSaving(false);
        }
    };

    const handleApproveOP = async () => {
        setIsSaving(true);
        try {
            await api.patch(`/samples/${id}/admin-approve-op`, { notes: 'OP Aprobada por Administrador' });
            toast.success('OP aprobada con éxito, enviada a auditoría.');
            fetchData();
        } catch (error) {
            console.error('Error approving OP:', error);
            toast.error('Error al aprobar la OP');
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
    const activeBom = useMemo(() => {
        if (sample?.udpRequirements?.sizes && sample.udpRequirements.sizes.length > 0 && productionDetail.length > 0) {
            const materialMap = new Map<string, any>();
            
            productionDetail.forEach(pd => {
                const sizeReq = sample.udpRequirements.sizes.find((s: any) => s.size === pd.size);
                if (sizeReq) {
                    sizeReq.items.forEach((item: any) => {
                        if (!materialMap.has(item.productId)) {
                            materialMap.set(item.productId, {
                                productId: item.productId,
                                name: item.name,
                                sku: item.sku,
                                unitPrice: item.price || 0,
                                totalQuantity: 0,
                            });
                        }
                        const m = materialMap.get(item.productId);
                        m.totalQuantity += (pd.quantity || 0) * (item.consumption || 0);
                    });
                }
            });

            return Array.from(materialMap.values()).map(m => ({
                ...m,
                quantityPerUnit: targetQuantity > 0 ? m.totalQuantity / targetQuantity : 0
            }));
        }
        return bom;
    }, [sample, productionDetail, bom, targetQuantity]);

    const sizeCosts = useMemo(() => {
        if (!sample?.udpRequirements?.sizes) return [];
        return sample.udpRequirements.sizes.map((s: any) => {
            const cost = s.items.reduce((acc: number, item: any) => acc + ((item.price || 0) * (item.consumption || 0)), 0);
            return { size: s.size, cost };
        });
    }, [sample]);

    const totalCostPerUnit = activeBom.reduce((acc, item) => acc + ((item.quantityPerUnit || 0) * (item.unitPrice || 0)), 0);
    const totalProjectedCost = totalCostPerUnit * targetQuantity;

    const displayedMaterials = useMemo(() => {
        if (!sample?.udpRequirements?.sizes || !bomViewSize) return activeBom;
        const sizeReq = sample.udpRequirements.sizes.find((s: any) => s.size === bomViewSize);
        if (!sizeReq) return activeBom;
        return sizeReq.items.map((item: any) => ({
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            unitPrice: item.price || 0,
            quantityPerUnit: item.consumption || 0
        }));
    }, [bomViewSize, sample, activeBom]);

    // Default selection
    useEffect(() => {
        if (sizeCosts.length > 0 && !bomViewSize) {
            setBomViewSize(sizeCosts[0].size);
        }
    }, [sizeCosts]);

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
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">{sample.name} {sample.code ? `(${sample.code})` : ''}</h1>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    sample.status === 'APROBADO' ? 'bg-emerald-100 text-emerald-600' :
                                    sample.status === 'COMPLETADO_INVENTARIO' ? 'bg-blue-100 text-blue-600' :
                                    sample.status === 'OBSERVADO' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                    {sample.status === 'COMPLETADO_INVENTARIO' ? 'INVENTARIADO' : 
                                     (sample.status === 'APROBADO' && (sample as any).processAudits?.some((a: any) => a.adminStatus === 'APROBADO')) ? 'LISTO PARA INVENTARIO' :
                                     (sample.status === 'APROBADO' && sample.adminOpApprovalStatus === 'PENDIENTE') ? 'APROBADO - PEND. ADMIN' : 
                                     (sample.status === 'APROBADO' && sample.adminOpApprovalStatus === 'APROBADO') ? 'LISTO PARA AUDITORÍA' : 
                                     sample.status}
                                </span>
                                <span className="text-xs font-bold text-gray-400">Ref ID: {sample.id.slice(-6).toUpperCase()}</span>
                                {sample.code && <span className="text-xs font-bold text-indigo-500 uppercase">Cód: {sample.code}</span>}
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
                                        <div className="flex flex-col gap-4">
                                            <button 
                                                onClick={() => {
                                                    setDischarges(sample.materials
                                                        .filter((m: any) => m.productId)
                                                        .map((m: any) => ({
                                                            materialId: m.id,
                                                            variantId: m.product?.variants?.[0]?.id || '',
                                                            quantity: m.quantity,
                                                            name: m.product?.name || 'Material'
                                                        })));
                                                    setShowDischargeModal(true);
                                                }}
                                                className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition shadow-xl shadow-amber-200"
                                            >
                                                <Calculator className="w-5 h-5 inline mr-2" /> Descargar productos del inventario para la muestra {sample.code || ''}
                                            </button>
                                            
                                            <button 
                                                onClick={handleLogisticsDeliverMaterials}
                                                disabled={isSaving}
                                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition shadow-xl shadow-indigo-200"
                                            >
                                                <Package className="w-5 h-5 inline mr-2" /> Confirmar Entrega a UDP
                                            </button>
                                        </div>
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
                                        <div className="flex flex-col gap-4">
                                            <button 
                                                onClick={() => {
                                                    setReqModalMode('EDIT');
                                                    setShowRequirementsModal(true);
                                                }}
                                                className="w-full py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition shadow-lg shadow-indigo-100"
                                            >
                                                <ClipboardList className="w-5 h-5 inline mr-2" /> Llenar requerimientos
                                            </button>
                                            <button 
                                                onClick={handleUDPCompleteDevelopment}
                                                disabled={isSaving}
                                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition shadow-xl shadow-indigo-200"
                                            >
                                                <Send className="w-5 h-5 inline mr-2" /> Ya hice la muestra y enviar a comercial
                                            </button>
                                        </div>
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

                            {user?.role === 'COMERCIAL' && sample.status === 'PENDIENTE' && sample.udpRequirements && (
                                <button 
                                    onClick={() => {
                                        setReqModalMode('VIEW');
                                        setShowRequirementsModal(true);
                                    }}
                                    className="w-full mb-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                                >
                                    <FileText className="w-5 h-5" /> Ver Ficha Técnica (Requerimientos UDP)
                                </button>
                            )}

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

                                                    {productionDetail.length > 0 && (
                                                        <div className="pt-6 mt-6 border-t border-emerald-100/30">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowSalesPriceModal(true)}
                                                                className="w-full py-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                                                            >
                                                                <Calculator className="w-5 h-5" /> Configurar Precio de Venta por Talla
                                                            </button>
                                                        </div>
                                                    )}
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

                                    {/* SEARCH FOR RAW MATERIALS - ONLY IF NO UDP REQUIREMENTS */}
                                    {sample.status === 'PENDIENTE' && !sample.udpRequirements && (
                                        <div className="relative mb-8">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="text" placeholder="Añadir tela, botones, cierres..."
                                                className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-4 py-3 text-sm font-bold outline-none"
                                                onFocus={() => { }} // Could show a dropdown
                                            />
                                            {/* Simplified material selection mock-up or real logic */}
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {products.filter(p => ['Materiales', 'Avios', 'AVIOS', 'MATERIALES'].some(t => [p.category, p.inventoryType].includes(t))).slice(0, 5).map(p => (
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

                                    {/* SIZE COSTS BREAKDOWN (INTERACTIVE) */}
                                    {sample.udpRequirements && (
                                        <div className="mb-8 flex flex-wrap gap-4">
                                            {sizeCosts.map(sc => (
                                                <button 
                                                    key={sc.size} 
                                                    onClick={() => setBomViewSize(sc.size)}
                                                    className={`flex-1 min-w-[120px] p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-1 ${
                                                        bomViewSize === sc.size 
                                                        ? 'bg-indigo-50 border-indigo-500 shadow-xl shadow-indigo-100 scale-105' 
                                                        : 'bg-white border-gray-50 hover:border-indigo-100 hover:bg-gray-50/50'
                                                    }`}
                                                >
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${bomViewSize === sc.size ? 'text-indigo-400' : 'text-gray-400'}`}>Talla {sc.size}</span>
                                                    <span className={`text-lg font-black mt-1 ${bomViewSize === sc.size ? 'text-indigo-600' : 'text-gray-900'}`}>S/ {sc.cost.toFixed(2)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {displayedMaterials.map(item => (
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
                                                                value={item.quantityPerUnit.toFixed(4)}
                                                                onChange={e => updateBomQuantity(item.productId, parseFloat(e.target.value) || 0)}
                                                                disabled={sample.status === 'APROBADO' || !!sample.udpRequirements}
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">P. Unit</p>
                                                            <p className="text-xs font-black text-gray-900 mt-2">S/ {item.unitPrice.toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                {sample.status === 'PENDIENTE' && !sample.udpRequirements && (
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
                                                        <div className="bg-white/10 px-6 py-2 rounded-xl font-black text-white text-lg">
                                                            {targetQuantity}
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Prendas</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                        <span className="text-xs font-black uppercase tracking-widest text-emerald-400 italic">Inversión Total Estimada OP (P. Unit x {targetQuantity})</span>
                                                        <span className="text-3xl font-black text-white">S/ {totalProjectedCost.toFixed(2)}</span>
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
                                                                <span className="text-indigo-600 font-black text-xs uppercase italic">{ ( (item.quantityPerUnit || 0) * (targetQuantity || 0) ).toFixed(2) } Unidades/Metros</span>
                                                                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Coste: S/ { ( (item.unitPrice || 0) * (item.quantityPerUnit || 0) * (targetQuantity || 0) ).toFixed(2) }</p>
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

                        {/* ADMIN OP APPROVAL SECTION (IF PENDING OVERALL OP APPROVAL) */}
                        {user?.role === 'ADMIN' && sample?.status === 'APROBADO' && sample?.adminOpApprovalStatus === 'PENDIENTE' && (
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl mt-8">
                                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Aprobación Final de OP
                                </h2>
                                <p className="text-sm text-gray-500 font-bold mb-6">Comercial ha aprobado esta muestra y generado la OP {sample.op}. Requiere tu aprobación final para pasar a Auditoría.</p>
                                <button
                                    onClick={handleApproveOP}
                                    disabled={isSaving}
                                    className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:bg-black transition active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? 'Procesando...' : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" /> Aprobar OP {sample.op}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SALES PRICES MODAL */}
            <AnimatePresence>
                {showSalesPriceModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                            onClick={() => setShowSalesPriceModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 md:p-12">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight italic">Precios de Venta por Talla</h3>
                                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Configuración Comercial de OP</p>
                                    </div>
                                    <button 
                                        onClick={() => setShowSalesPriceModal(false)}
                                        className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl transition"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {Object.keys(salesPrices).map((size) => (
                                        <div key={size} className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Talla {size}</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Precio Normal (S/)</label>
                                                    <input 
                                                        type="number"
                                                        className="w-full mt-2 bg-white border border-gray-200 rounded-2xl px-5 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                                                        value={salesPrices[size].price || ''}
                                                        onChange={e => setSalesPrices(prev => ({
                                                            ...prev,
                                                            [size]: { ...prev[size], price: parseFloat(e.target.value) || 0 }
                                                        }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Precio de Segunda (S/)</label>
                                                    <input 
                                                        type="number"
                                                        className="w-full mt-2 bg-white border border-gray-200 rounded-2xl px-5 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-rose-500 transition-all font-mono"
                                                        value={salesPrices[size].secondPrice || ''}
                                                        onChange={e => setSalesPrices(prev => ({
                                                            ...prev,
                                                            [size]: { ...prev[size], secondPrice: parseFloat(e.target.value) || 0 }
                                                        }))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(salesPrices).length === 0 && (
                                        <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-xs">
                                            Primero agrega ítems en el desglose de producción.
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
                                    <button
                                        onClick={() => setShowSalesPriceModal(false)}
                                        className="w-full py-5 rounded-3xl font-black text-sm bg-emerald-600 text-white uppercase tracking-widest hover:bg-black transition shadow-xl shadow-emerald-200 flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-5 h-5" /> Guardar Precios
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DISCHARGE INVENTORY MODAL */}
            <AnimatePresence>
                {showDischargeModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                            onClick={() => setShowDischargeModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 md:p-12">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Descargar de Inventario</h3>
                                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Muestra: {sample.name} ({sample.code || 'SIN CODIGO'})</p>
                                    </div>
                                    <button 
                                        onClick={() => setShowDischargeModal(false)}
                                        className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl transition"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-8">
                                    {discharges.map((d, idx) => {
                                        const material = sample.materials.find((m: any) => m.id === d.materialId);
                                        const variants = material?.product?.variants || [];
                                        
                                        return (
                                            <div key={idx} className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="font-black text-gray-900 uppercase text-sm">{d.name}</span>
                                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black text-xs font-mono">
                                                        Cant. a descargar: {d.quantity}
                                                    </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 gap-4">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seleccionar Variante (Talla/Color)</label>
                                                    <select 
                                                        className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-black text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                                        value={d.variantId}
                                                        onChange={e => {
                                                            const newList = [...discharges];
                                                            newList[idx].variantId = e.target.value;
                                                            setDischarges(newList);
                                                        }}
                                                    >
                                                        <option value="">Seleccionar variante...</option>
                                                        {variants.map((v: any) => (
                                                            <option key={v.id} value={v.id}>
                                                                {v.size} / {v.color} - Stock: {v.stock}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowDischargeModal(false)}
                                        className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleDischargeInventory}
                                        disabled={isDischarging || discharges.some(d => !d.variantId)}
                                        className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition shadow-xl shadow-indigo-200 disabled:opacity-50"
                                    >
                                        {isDischarging ? 'Descargando...' : 'Confirmar Descarga'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* UDP REQUIREMENTS MODAL */}
            <AnimatePresence>
                {showRequirementsModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                            onClick={() => setShowRequirementsModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="p-8 md:px-12 md:py-8 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight italic">
                                        {reqModalMode === 'EDIT' ? 'Requerimientos de UDP' : 'Ficha Técnica de Muestra'}
                                    </h3>
                                    <p className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em] mt-1">Muestra: {sample.code || sample.name}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {reqModalMode === 'EDIT' && (
                                        <button
                                            onClick={handleAddSize}
                                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition active:scale-95 flex items-center gap-2"
                                        >
                                            <Plus className="w-5 h-5" /> Añadir Talla
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowRequirementsModal(false)}
                                        className="p-4 bg-gray-100 text-gray-400 hover:text-gray-900 rounded-2xl transition-all"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {/* PRODUCT SEARCH SECTION - ONLY IN EDIT MODE */}
                                {reqModalMode === 'EDIT' && (
                                    <div className="bg-gray-900 p-10 rounded-[3.5rem] mt-4 mx-8 mb-6 text-white space-y-8">
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                            <div className="flex-1 w-full space-y-3">
                                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">1. Seleccionar Tipo de Inventario</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => setSelectedType('')}
                                                        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
                                                            selectedType === '' 
                                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 scale-105' 
                                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        TODOS
                                                    </button>
                                                    {inventoryTypes.map(type => (
                                                        <button
                                                            key={type}
                                                            onClick={() => setSelectedType(type)}
                                                            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
                                                                selectedType === type 
                                                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 scale-105' 
                                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            {type.replace('_', ' ')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="w-full md:w-1/3 space-y-3">
                                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">2. Buscar Material</h4>
                                                <div className="relative">
                                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Nombre o SKU..."
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-16 pr-6 py-5 font-black text-sm text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/10 transition-all"
                                                        value={reqSearch}
                                                        onChange={e => setReqSearch(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {(selectedType || reqSearch) && (
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">Resultados en {selectedType || 'Todo el Inventario'}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {filteredReqProducts.map(p => (
                                                        <div key={p.id} className="bg-white/5 p-6 rounded-3xl border border-white/10 flex items-center justify-between hover:bg-white/10 transition group">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-black text-white text-xs uppercase truncate tracking-tight">{p.name}</p>
                                                                <p className="text-[9px] font-bold text-white/30 font-mono mt-1">{p.sku}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleAddToPool(p)}
                                                                className="ml-4 p-3 bg-indigo-600/20 text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all transform active:scale-90"
                                                            >
                                                                <Plus className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {filteredReqProducts.length === 0 && (
                                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest pl-2">No se encontraron productos</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* MATERIAL POOL SECTION */}
                                {reqModalMode === 'EDIT' && (
                                    <div className="px-12 space-y-6">
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-tighter italic">Lista de Materiales del Proyecto</h4>
                                            <span className="bg-gray-100 px-4 py-1.5 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                {materialPool.length} ítems cargados
                                            </span>
                                        </div>

                                        {materialPool.length > 0 ? (
                                            <div className="flex flex-wrap gap-3">
                                                {materialPool.map(p => (
                                                    <div key={p.id} className="bg-indigo-50 border border-indigo-100 px-6 py-4 rounded-3xl flex items-center gap-4 transition shadow-sm hover:shadow-md">
                                                        <div>
                                                            <p className="font-black text-indigo-600 text-[10px] uppercase leading-tight">{p.name}</p>
                                                            <p className="text-[9px] font-bold text-indigo-300 font-mono uppercase mt-0.5">{p.sku}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveFromPool(p.id)}
                                                            className="p-1.5 hover:bg-rose-100 hover:text-rose-600 text-indigo-300 rounded-lg transition"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-10 text-center bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                                                <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Agregue materiales arriba para este desarrollo</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* SIZES LIST */}
                                <div className={`px-12 pb-20 space-y-12 ${reqModalMode === 'VIEW' ? 'mt-8' : ''}`}>
                                    <div className="flex items-center justify-between sticky top-0 bg-white z-20 py-4">
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tighter italic">
                                            {reqModalMode === 'EDIT' ? 'Materiales x Talla y Consumos' : 'Desglose de Costos por Talla'}
                                        </h4>
                                    </div>

                                    {udpReqs.map((block, sIdx) => {
                                        const sizeTotalCost = block.items.reduce((acc, item) => acc + ((item.price || 0) * (item.consumption || 0)), 0);

                                        return (
                                            <div key={sIdx} className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-gray-200/40 overflow-hidden">
                                                <div className="bg-gray-900 p-8 flex items-center justify-between">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-12 h-12 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center text-white font-black text-lg rotate-3">
                                                            {block.size?.slice(0, 2) || `T-${sIdx + 1}`}
                                                        </div>
                                                        {reqModalMode === 'EDIT' ? (
                                                            <input
                                                                type="text"
                                                                placeholder="TALLA (Ej: 32, M...)"
                                                                className="bg-white/10 border-none rounded-2xl px-6 py-4 text-white font-black text-base uppercase placeholder:text-white/20 outline-none focus:ring-4 focus:ring-indigo-500/30 min-w-[300px] transition-all"
                                                                value={block.size}
                                                                onChange={e => handleUpdateSizeName(sIdx, e.target.value)}
                                                            />
                                                        ) : (
                                                            <h5 className="text-3xl font-black text-white uppercase tracking-tighter italic">Talla {block.size}</h5>
                                                        )}
                                                    </div>
                                                    <div className="text-right flex items-center gap-8">
                                                        <div>
                                                            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Costo Estimado Prendas</p>
                                                            <p className="text-2xl font-black text-emerald-400 mt-1">S/ {sizeTotalCost.toFixed(2)}</p>
                                                        </div>
                                                        {reqModalMode === 'EDIT' && (
                                                            <button
                                                                onClick={() => handleRemoveSize(sIdx)}
                                                                className="p-3 bg-white/5 text-white/20 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all"
                                                            >
                                                                <Trash2 className="w-6 h-6" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-10 space-y-8">
                                                    {/* Dropdown to pick from pool - ONLY IN EDIT */}
                                                    {reqModalMode === 'EDIT' && (
                                                        <div className="max-w-md space-y-3">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Seleccionar Material de la Lista del Proyecto</label>
                                                            <select
                                                                className="w-full bg-gray-50 border-none rounded-2xl p-5 font-black text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                                                value=""
                                                                onChange={e => {
                                                                    const poolItem = materialPool.find(p => p.id === e.target.value);
                                                                    if (poolItem) handleAddItemToSize(sIdx, poolItem);
                                                                }}
                                                            >
                                                                <option value="">Añadir material a esta talla...</option>
                                                                {materialPool.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="border-b border-gray-100">
                                                                <th className="text-left py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Descripción Material</th>
                                                                <th className="text-left py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Código SKU</th>
                                                                {reqModalMode === 'VIEW' && (
                                                                    <th className="text-right py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">P. Unitario</th>
                                                                )}
                                                                <th className="text-right py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest pr-10">Cantidad (Consumo)</th>
                                                                {reqModalMode === 'VIEW' && (
                                                                    <th className="text-right py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest pr-10">Total</th>
                                                                )}
                                                                {reqModalMode === 'EDIT' && <th className="w-20"></th>}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {block.items.map((item, iIdx) => (
                                                                <tr key={iIdx} className="group hover:bg-gray-50/50 transition-all duration-300">
                                                                    <td className="py-8 pl-4">
                                                                        <div className="flex flex-col">
                                                                            <p className="font-black text-gray-900 text-sm uppercase tracking-tight">{item.name}</p>
                                                                            <p className="text-[10px] font-bold text-gray-400 mt-1 line-clamp-1">{item.description || 'Sin descripción adicional'}</p>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-8">
                                                                        <span className="font-mono font-black text-xs text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-lg uppercase">{item.sku}</span>
                                                                    </td>
                                                                    {reqModalMode === 'VIEW' && (
                                                                        <td className="py-8 text-right font-black text-xs text-gray-400">
                                                                            S/ {(item.price || 0).toFixed(2)}
                                                                        </td>
                                                                    )}
                                                                    <td className="py-8 text-right pr-10">
                                                                        <div className="inline-flex items-center gap-3">
                                                                            {reqModalMode === 'EDIT' ? (
                                                                                <input
                                                                                    type="number"
                                                                                    className="w-28 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3 font-black text-gray-900 text-right outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                                                    value={item.consumption}
                                                                                    onChange={e => handleUpdateItemCons(sIdx, iIdx, parseFloat(e.target.value) || 0)}
                                                                                />
                                                                            ) : (
                                                                                <span className="font-black text-gray-900 text-sm">{item.consumption}</span>
                                                                            )}
                                                                            <span className="text-[10px] font-black text-gray-300 uppercase">UNDS</span>
                                                                        </div>
                                                                    </td>
                                                                    {reqModalMode === 'VIEW' && (
                                                                        <td className="py-8 text-right pr-10 font-black text-sm text-gray-900">
                                                                            S/ {((item.price || 0) * (item.consumption || 0)).toFixed(2)}
                                                                        </td>
                                                                    )}
                                                                    {reqModalMode === 'EDIT' && (
                                                                        <td className="py-8 text-center">
                                                                            <button
                                                                                onClick={() => handleRemoveItemFromSize(sIdx, iIdx)}
                                                                                className="p-3 bg-gray-50 text-gray-300 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                                                                            >
                                                                                <Trash2 className="w-5 h-5" />
                                                                            </button>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))}
                                                            {block.items.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={4} className="py-20 text-center">
                                                                        <div className="max-w-xs mx-auto">
                                                                            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200 mx-auto mb-4 border border-gray-100">
                                                                                <ClipboardList className="w-8 h-8" />
                                                                            </div>
                                                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Talla sin materiales</p>
                                                                            <p className="text-[10px] text-gray-300 font-bold mt-2">
                                                                                Añada materiales a la lista general arriba y luego selecciónelos aquí.
                                                                            </p>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {udpReqs.length === 0 && (
                                        <div className="text-center py-40 bg-gray-50 rounded-[4rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center">
                                            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-8 rotate-12">
                                                <Plus className="w-12 h-12 text-indigo-500" />
                                            </div>
                                            <h4 className="text-2xl font-black text-gray-400 uppercase italic tracking-tighter">Define las tallas del modelo</h4>
                                            <p className="text-sm font-bold text-gray-300 max-w-sm mt-4 text-center leading-relaxed">
                                                Presiona el botón "Añadir Talla" en la esquina superior derecha para empezar a registrar consumos.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 md:px-12 md:py-8 border-t border-gray-100 bg-white flex gap-4">
                                {reqModalMode === 'EDIT' ? (
                                    <>
                                        <button
                                            onClick={() => setShowRequirementsModal(false)}
                                            className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition"
                                        >
                                            Cerrar sin Guardar
                                        </button>
                                        <button
                                            onClick={handleSaveRequirements}
                                            disabled={isSaving}
                                            className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-black transition shadow-2xl shadow-indigo-200"
                                        >
                                            <Save className="w-5 h-5 inline mr-2" /> Guardar Requerimientos en Sistema
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowRequirementsModal(false)}
                                        className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition shadow-2xl shadow-gray-200"
                                    >
                                        Entendido, Cerrar Vista Previa
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
