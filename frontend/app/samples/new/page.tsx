'use client';

import { useState } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/axios';
import {
    Beaker,
    Search,
    Trash2,
    DollarSign,
    Box,
    Plus,
    Camera,
    X,
    ArrowLeft,
    Send,
    FileText,
    Settings,
    Upload,
    Loader2
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../../lib/imageUrl';
import { SelectVariantModal } from '../../../components/samples/SelectVariantModal';

export default function NewSamplePage() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isExisting = searchParams.get('existing') === 'true';
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        characteristics: '',
        images: [] as string[]
    });

    const [materials, setMaterials] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [customMatName, setCustomMatName] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [pendingVariantProduct, setPendingVariantProduct] = useState<any>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploadingImage(true);
        const uploadedUrls: string[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const uploadFormData = new FormData();
                uploadFormData.append('file', file);

                const resp = await api.post('/uploads', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (resp.data?.url) {
                    uploadedUrls.push(resp.data.url);
                }
            }

            if (uploadedUrls.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, ...uploadedUrls]
                }));
                toast.success(uploadedUrls.length === 1 ? 'Foto subida correctamente' : `${uploadedUrls.length} fotos subidas`);
            }
        } catch (err) {
            console.error('Error uploading image:', err);
            toast.error('Error al subir la(s) foto(s)');
        } finally {
            setIsUploadingImage(false);
            e.target.value = '';
        }
    };

    const removeImage = (index: number) => {
        setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });
        toast.error('Foto eliminada');
    };

    const handleSearchMaterials = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const url = isExisting ? `/products/search-materials?q=${q}` : `/products/search?q=${q}`;
            const resp = await api.get(url);
            setSearchResults(resp.data);
        } catch (error) {
            console.error('Error searching products:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectMaterialProduct = (prod: any) => {
        const variants = prod.variants || [];
        const multipleRealVariants = variants.length > 1 || variants.some((v: any) => v.color && v.color !== 'ÚNICO');

        if (multipleRealVariants && variants.length > 1) {
            setPendingVariantProduct(prod);
        } else if (variants.length === 1) {
            applyAddMaterial(prod, variants[0]);
        } else {
            applyAddMaterial(prod, null);
        }
    };

    const applyAddMaterial = (prod: any, variant: any) => {
        const variantColor = variant && variant.color !== 'ÚNICO' ? variant.color : null;
        const displayName = variantColor ? `${prod.name} (${variantColor})` : prod.name;
        const skuToUse = variant?.variantSku || prod.sku;

        if (materials.some(m => (m.variantId && m.variantId === variant?.id) || (!m.variantId && m.productId === prod.id && !variantColor))) {
            toast.error('Este material / variante ya está en la lista');
            return;
        }

        setMaterials(prev => [...prev, {
            productId: prod.id,
            variantId: variant?.id || null,
            name: displayName,
            imageUrl: prod.imageUrl,
            sku: skuToUse,
            quantity: 1,
            unitPriceAtTime: prod.purchasePrice || 0,
            customMaterial: null
        }]);
        setSearchQuery('');
        setSearchResults([]);
        setPendingVariantProduct(null);
        toast.success(`${displayName} añadido`);
    };

    const addCustomMaterial = () => {
        if (!customMatName) return;
        setMaterials([...materials, {
            productId: null,
            name: customMatName,
            customMaterial: customMatName,
            quantity: 1,
            unitPriceAtTime: 0
        }]);
        setCustomMatName('');
        toast.success('Material personalizado añadido');
    };

    const removeMaterial = (index: number) => {
        setMaterials(materials.filter((_, i) => i !== index));
    };

    const updateMaterialQty = (index: number, qty: number) => {
        const newMats = [...materials];
        newMats[index].quantity = qty;
        setMaterials(newMats);
    };

    const updateMaterialPrice = (index: number, price: number) => {
        const newMats = [...materials];
        newMats[index].unitPriceAtTime = price;
        setMaterials(newMats);
    };

    const generateCode = () => {
        const random = Math.floor(1000 + Math.random() * 9000);
        const prefix = formData.name ? formData.name.substring(0, 3).toUpperCase() : 'SMP';
        setFormData({ ...formData, code: `${prefix}-${random}` });
        toast.success('Código generado');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/samples', {
                ...formData,
                isExisting,
                materials: materials.map(m => ({
                    productId: m.productId,
                    customMaterial: m.customMaterial,
                    quantity: m.quantity,
                    unitPriceAtTime: m.unitPriceAtTime
                }))
            });
            toast.success(isExisting ? 'Muestra existente registrada con éxito' : (materials.length > 0 ? 'Solicitud enviada a Administrador' : 'Muestra creada con éxito'));
            router.push('/samples');
        } catch (error) {
            console.error('Error creating sample:', error);
            toast.error('Error al enviar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    const cardClass = isExisting 
        ? "bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-xl shadow-gray-200/20" 
        : "bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-xl shadow-gray-200/20";

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* HEADER */}
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.back()}
                        className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 shadow-sm transition active:scale-90"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">
                            {isExisting ? 'Crear Muestra Existente' : 'Nuevo Prototipo'}
                        </h1>
                        <p className="text-gray-500 font-medium text-lg mt-1">
                            {isExisting 
                                ? 'Registra una muestra ya fabricada anteriormente para asociar sus requerimientos.'
                                : 'Registra una nueva muestra para evaluación comercial.'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={cardClass}>
                    <div className={isExisting ? 'space-y-4' : 'space-y-8'}>
                        {/* NAME */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre de la Muestra / Prototipo</label>
                            <div className="relative">
                                <Beaker className={`absolute ${isExisting ? 'left-4 w-4 h-4' : 'left-6 w-5 h-5'} top-1/2 -translate-y-1/2 text-indigo-400`} />
                                <input 
                                    type="text" required
                                    placeholder="Ej: Camisa Slim Fit Algodón Pima V1"
                                    className={`w-full bg-gray-50 border-none ${isExisting ? 'rounded-xl pl-12 pr-4 py-3 text-sm font-bold shadow-sm' : 'rounded-[1.5rem] pl-16 pr-6 py-6 font-black text-lg shadow-inner'} text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition`}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* CODE */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Código de Muestra</label>
                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <FileText className={`absolute ${isExisting ? 'left-4 w-4 h-4' : 'left-6 w-5 h-5'} top-1/2 -translate-y-1/2 text-indigo-400`} />
                                    <input 
                                        type="text" required
                                        placeholder="Ej: SMP-2024-001"
                                        className={`w-full bg-gray-50 border-none ${isExisting ? 'rounded-xl pl-12 pr-4 py-3 text-sm font-bold shadow-sm' : 'rounded-[1.5rem] pl-16 pr-6 py-6 font-black text-lg shadow-inner'} text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition`}
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={generateCode}
                                    className={`${isExisting ? 'px-4 py-3 rounded-xl font-bold text-xs' : 'px-8 py-6 rounded-[1.5rem] font-black'} bg-indigo-50 text-indigo-600 transition shadow-sm border border-indigo-100`}
                                >
                                    Generar Código
                                </button>
                            </div>
                        </div>

                        {/* CHARACTERISTICS */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ficha Técnica / Características</label>
                            <div className="relative">
                                <Settings className={`absolute ${isExisting ? 'left-4 top-4 w-4 h-4' : 'left-6 top-8 w-5 h-5'} text-indigo-400`} />
                                <textarea 
                                    required
                                    placeholder="Detalles de tela, avios, puntadas, medidas críticas..."
                                    className={`w-full bg-gray-50 border-none ${isExisting ? 'rounded-xl pl-12 pr-4 py-3 text-sm font-bold shadow-sm min-h-[70px]' : 'rounded-[1.5rem] pl-16 pr-6 py-6 font-bold shadow-inner min-h-[150px]'} text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none`}
                                    value={formData.characteristics}
                                    onChange={e => setFormData({ ...formData, characteristics: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* DESCRIPTION */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción del Desarrollo</label>
                            <div className="relative">
                                <FileText className={`absolute ${isExisting ? 'left-4 top-4 w-4 h-4' : 'left-6 top-8 w-5 h-5'} text-indigo-400`} />
                                <textarea 
                                    placeholder="Contexto del diseño, inspiración o notas generales..."
                                    className={`w-full bg-gray-50 border-none ${isExisting ? 'rounded-xl pl-12 pr-4 py-3 text-sm font-bold shadow-sm min-h-[60px]' : 'rounded-[1.5rem] pl-16 pr-6 py-6 font-bold shadow-inner min-h-[120px]'} text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none`}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* MATERIALS REQUIREMENTS */}
                        <div className="space-y-6 pt-10 border-t border-gray-100">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Requerimientos de Materiales</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Busca en inventario o agrega insumos adicionales</p>
                            </div>

                            <div className="relative">
                                <div className="relative">
                                    <Search className={`absolute ${isExisting ? 'left-4 w-4 h-4' : 'left-6 w-5 h-5'} top-1/2 -translate-y-1/2 text-indigo-400`} />
                                    <input 
                                        type="text"
                                        placeholder="Buscar materiales en inventario (nombre o SKU)..."
                                        className={`w-full bg-gray-50 border-none ${isExisting ? 'rounded-xl pl-12 pr-4 py-3 text-sm' : 'rounded-2xl pl-16 pr-6 py-5 font-bold'} text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner`}
                                        value={searchQuery}
                                        onChange={e => handleSearchMaterials(e.target.value)}
                                    />
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-72 overflow-y-auto p-2 space-y-1">
                                        {searchResults.map(prod => (
                                            <button
                                                key={prod.id}
                                                type="button"
                                                onClick={() => handleSelectMaterialProduct(prod)}
                                                className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 rounded-xl transition text-left group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-12 h-12 bg-indigo-50/70 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs overflow-hidden border border-gray-100 shrink-0">
                                                        {prod.imageUrl ? (
                                                            <img src={getImageUrl(prod.imageUrl)} alt={prod.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Box className="w-6 h-6 text-indigo-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-black text-gray-900 text-sm uppercase truncate">{prod.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter uppercase mt-0.5">{prod.sku} • S/ {prod.purchasePrice}</p>
                                                    </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-indigo-600 flex items-center justify-center text-gray-400 group-hover:text-white transition shrink-0 ml-3">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CUSTOM MATERIAL OPTION */}
                            <div className="flex gap-4">
                                <input 
                                    type="text"
                                    placeholder="Otro material no encontrado en inventario..."
                                    className={`flex-1 bg-gray-50 border-none ${isExisting ? 'rounded-xl px-4 py-2.5 text-sm' : 'rounded-xl px-6 py-4 font-bold'} text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner`}
                                    value={customMatName}
                                    onChange={e => setCustomMatName(e.target.value)}
                                />
                                <button 
                                    type="button"
                                    onClick={addCustomMaterial}
                                    className={`${isExisting ? 'px-4 py-2.5 rounded-xl text-sm' : 'px-6 py-4 rounded-xl font-bold'} bg-gray-100 text-gray-600 hover:bg-gray-200 transition`}
                                >
                                    Agregar Manual
                                </button>
                            </div>

                            {/* MATERIALS LIST / TABLE */}
                            <div className="space-y-3">
                                {isExisting ? (
                                    materials.length > 0 && (
                                        <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                                        <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Material / Insumo</th>
                                                        <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center w-24">Cantidad</th>
                                                        <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center w-36">Precio Unit.</th>
                                                        <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right w-24">Total</th>
                                                        <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center w-12"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {materials.map((m, i) => (
                                                        <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/20 transition-colors">
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                                                                        {m.imageUrl ? (
                                                                            <img src={getImageUrl(m.imageUrl)} alt={m.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <Box className="w-4 h-4 text-gray-400" />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-gray-900 text-[11px] uppercase">{m.name}</p>
                                                                        <p className="text-[8.5px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">
                                                                            {m.productId ? 'De Inventario' : 'Manual / Externo'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-center">
                                                                <input 
                                                                    type="number"
                                                                    min="0.01"
                                                                    step="any"
                                                                    value={m.quantity}
                                                                    onChange={e => updateMaterialQty(i, parseFloat(e.target.value) || 1)}
                                                                    className="w-16 bg-gray-50 border border-gray-100 rounded-lg py-1 px-1.5 font-black text-[11px] text-center outline-none focus:border-indigo-500"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2.5 text-center">
                                                                <div className="flex items-center justify-center bg-gray-50 border border-gray-100 rounded-lg py-1 px-1.5 w-24 mx-auto">
                                                                    <span className="text-[9px] font-black text-emerald-600 mr-1">S/</span>
                                                                    <input 
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={m.unitPriceAtTime}
                                                                        onChange={e => updateMaterialPrice(i, parseFloat(e.target.value) || 0)}
                                                                        className="w-14 bg-transparent font-black text-center outline-none text-emerald-600 text-[11px]"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right font-black text-gray-900 text-[11px]">
                                                                S/ {(m.quantity * m.unitPriceAtTime).toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-center">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => removeMaterial(i)}
                                                                    className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                                ) : (
                                    materials.map((m, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                                                    {m.imageUrl ? (
                                                        <img src={getImageUrl(m.imageUrl)} alt={m.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        m.productId ? <Box className="w-6 h-6 text-emerald-600" /> : <Plus className="w-6 h-6 text-amber-600" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-gray-900 text-sm uppercase truncate">{m.name}</p>
                                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                                        {m.productId ? 'De Inventario' : 'Manual / Externo'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 shrink-0">
                                                <div className="flex items-center bg-gray-50 rounded-xl p-1 px-3">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase mr-3">Cant</span>
                                                    <input 
                                                        type="number"
                                                        min="1"
                                                        value={m.quantity}
                                                        onChange={e => updateMaterialQty(i, parseFloat(e.target.value) || 1)}
                                                        className="w-12 bg-transparent font-black text-center outline-none"
                                                    />
                                                </div>
                                                <div className="text-right min-w-[100px]">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Precio Unit.</p>
                                                    <div className="flex items-center bg-gray-50 rounded-xl p-1 px-3">
                                                        <span className="text-[10px] font-black text-emerald-600 mr-1">S/</span>
                                                        <input 
                                                            type="number"
                                                            step="0.01"
                                                            value={m.unitPriceAtTime}
                                                            onChange={e => updateMaterialPrice(i, parseFloat(e.target.value) || 0)}
                                                            className="w-16 bg-transparent font-black text-center outline-none text-emerald-600"
                                                        />
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => removeMaterial(i)}
                                                    className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                                
                                {materials.length > 0 && (
                                    <div className={`flex justify-end ${isExisting ? 'p-4 rounded-2xl mt-4' : 'p-6 rounded-[2rem] mt-6'} bg-gray-900 text-white shadow-xl shadow-gray-200`}>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Costo Estimado de Insumos</p>
                                            <div className="flex items-center justify-end gap-2">
                                                <DollarSign className={`text-emerald-400 ${isExisting ? 'w-5 h-5' : 'w-6 h-6'}`} />
                                                <span className={`font-black ${isExisting ? 'text-xl' : 'text-3xl'}`}>
                                                    S/ {materials.reduce((acc, m) => acc + (m.quantity * m.unitPriceAtTime), 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* IMAGES & EVIDENCES (PHONE / PC UPLOAD) */}
                        <div className="space-y-4 pt-8 border-t border-gray-100">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fotos y Evidencias</label>
                                <p className="text-xs text-gray-400 font-bold mt-0.5">
                                    Sube fotos directamente desde la cámara o galería de tu celular o desde tu PC
                                </p>
                            </div>

                            {/* HIDDEN FILE INPUT */}
                            <input 
                                type="file" 
                                id="sample-file-upload"
                                accept="image/*" 
                                multiple
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={isUploadingImage}
                            />

                            {/* UPLOAD TRIGGER CARD */}
                            <label 
                                htmlFor="sample-file-upload"
                                className={`w-full border-2 border-dashed rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                                    isUploadingImage 
                                        ? 'bg-indigo-50/60 border-indigo-300 cursor-wait' 
                                        : 'bg-gray-50/60 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30'
                                }`}
                            >
                                {isUploadingImage ? (
                                    <>
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                        <div className="text-center">
                                            <p className="text-sm font-black text-indigo-600 uppercase tracking-wider">Subiendo foto(s)...</p>
                                            <p className="text-[11px] text-gray-400 font-bold mt-1">Por favor espera un momento</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition">
                                            <Camera className="w-8 h-8" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm md:text-base font-black text-gray-900 uppercase tracking-wide">
                                                📷 Seleccionar / Tomar Foto (Celular o PC)
                                            </p>
                                            <p className="text-[11px] text-gray-400 font-bold mt-1">
                                                JPG, PNG, WEBP (puedes seleccionar una o varias imágenes)
                                            </p>
                                        </div>
                                    </>
                                )}
                            </label>

                            {/* GALLERY OF UPLOADED PHOTOS */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                                {formData.images.map((img, i) => (
                                    <div key={i} className="aspect-square bg-gray-100 rounded-2xl relative group overflow-hidden border border-gray-200 shadow-sm">
                                        <img src={getImageUrl(img)} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                                        <button 
                                            type="button"
                                            onClick={() => removeImage(i)}
                                            className="absolute top-2 right-2 p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg transition active:scale-90"
                                            title="Eliminar foto"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-[9px] font-black text-white uppercase tracking-wider">
                                            Foto {i + 1}
                                        </div>
                                    </div>
                                ))}

                                {formData.images.length > 0 && !isUploadingImage && (
                                    <label 
                                        htmlFor="sample-file-upload"
                                        className="aspect-square bg-gray-50 hover:bg-indigo-50 border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-indigo-600 cursor-pointer transition"
                                    >
                                        <Plus className="w-8 h-8" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Añadir más</span>
                                    </label>
                                )}

                                {formData.images.length === 0 && !isUploadingImage && (
                                    <div className="col-span-full py-8 text-center text-gray-400">
                                        <p className="text-xs font-bold uppercase tracking-widest">No has subido fotos todavía</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SUBMIT */}
                        <div className={isExisting ? 'pt-6' : 'pt-10'}>
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className={`w-full ${isExisting ? 'py-4 rounded-2xl text-lg gap-2' : 'py-8 rounded-[2.5rem] text-2xl gap-4'} bg-gray-900 text-white font-black flex items-center justify-center shadow-2xl hover:bg-black transition active:scale-95 disabled:opacity-50`}
                            >
                                {isLoading ? (
                                    <>Enviando...</>
                                ) : (
                                    <>
                                        <Send className={isExisting ? 'w-5 h-5' : 'w-8 h-8'} /> {isExisting ? 'Enviar a Comercial' : (materials.length > 0 ? 'Enviar a Administrador' : 'Enviar a Comercial')}
                                    </>
                                )}
                            </button>
                            <p className="text-center text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-[0.2em]">
                                Al enviar, el equipo comercial recibirá una notificación para su revisión.
                            </p>
                        </div>
                    </div>
                </form>
            </div>

            {/* VARIANT SELECTOR MODAL */}
            {pendingVariantProduct && (
                <SelectVariantModal
                    product={pendingVariantProduct}
                    onSelectVariant={(variant) => applyAddMaterial(pendingVariantProduct, variant)}
                    onClose={() => setPendingVariantProduct(null)}
                />
            )}
        </Layout>
    );
}
