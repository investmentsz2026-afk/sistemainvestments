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
    Settings
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function NewSamplePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        characteristics: '',
        images: [] as string[]
    });

    const [materials, setMaterials] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [customMatName, setCustomMatName] = useState('');

    const [imageUrl, setImageUrl] = useState('');

    const addImage = () => {
        if (!imageUrl) return;
        setFormData({ ...formData, images: [...formData.images, imageUrl] });
        setImageUrl('');
        toast.success('Imagen añadida');
    };

    const removeImage = (index: number) => {
        setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });
        toast.error('Imagen eliminada');
    };

    const handleSearchMaterials = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const resp = await api.get(`/products/search?q=${q}`);
            setSearchResults(resp.data);
        } catch (error) {
            console.error('Error searching products:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const addMaterial = (prod: any) => {
        if (materials.some(m => m.productId === prod.id)) {
            toast.error('Este material ya está en la lista');
            return;
        }
        setMaterials([...materials, {
            productId: prod.id,
            name: prod.name,
            quantity: 1,
            unitPriceAtTime: prod.purchasePrice || 0,
            customMaterial: null
        }]);
        setSearchQuery('');
        setSearchResults([]);
        toast.success(`${prod.name} añadido`);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/samples', {
                ...formData,
                materials: materials.map(m => ({
                    productId: m.productId,
                    customMaterial: m.customMaterial,
                    quantity: m.quantity,
                    unitPriceAtTime: m.unitPriceAtTime
                }))
            });
            toast.success(materials.length > 0 ? 'Solicitud enviada a Administrador' : 'Muestra creada con éxito');
            router.push('/samples');
        } catch (error) {
            console.error('Error creating sample:', error);
            toast.error('Error al enviar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    const cardClass = "bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-xl shadow-gray-200/20";

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
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Nuevo Prototipo</h1>
                        <p className="text-gray-500 font-medium text-lg mt-1">Registra una nueva muestra para evaluación comercial.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={cardClass}>
                    <div className="space-y-8">
                        {/* NAME */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre de la Muestra / Prototipo</label>
                            <div className="relative">
                                <Beaker className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                <input 
                                    type="text" required
                                    placeholder="Ej: Camisa Slim Fit Algodón Pima V1"
                                    className="w-full bg-gray-50 border-none rounded-[1.5rem] pl-16 pr-6 py-6 font-black text-lg text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* CHARACTERISTICS */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ficha Técnica / Características</label>
                            <div className="relative">
                                <Settings className="absolute left-6 top-8 w-5 h-5 text-indigo-400" />
                                <textarea 
                                    required
                                    placeholder="Detalles de tela, avios, puntadas, medidas críticas..."
                                    className="w-full bg-gray-50 border-none rounded-[1.5rem] pl-16 pr-6 py-6 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner min-h-[150px] resize-none"
                                    value={formData.characteristics}
                                    onChange={e => setFormData({ ...formData, characteristics: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* DESCRIPTION */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción del Desarrollo</label>
                            <div className="relative">
                                <FileText className="absolute left-6 top-8 w-5 h-5 text-indigo-400" />
                                <textarea 
                                    placeholder="Contexto del diseño, inspiración o notas generales..."
                                    className="w-full bg-gray-50 border-none rounded-[1.5rem] pl-16 pr-6 py-6 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner min-h-[120px] resize-none"
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
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                    <input 
                                        type="text"
                                        placeholder="Buscar materiales en inventario (nombre o SKU)..."
                                        className="w-full bg-gray-50 border-none rounded-2xl pl-16 pr-6 py-5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                                        value={searchQuery}
                                        onChange={e => handleSearchMaterials(e.target.value)}
                                    />
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto p-2 space-y-1">
                                        {searchResults.map(prod => (
                                            <button
                                                key={prod.id}
                                                type="button"
                                                onClick={() => addMaterial(prod)}
                                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition text-left group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">
                                                        <Box className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm uppercase">{prod.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter uppercase">{prod.sku} • S/ {prod.purchasePrice}</p>
                                                    </div>
                                                </div>
                                                <Plus className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition" />
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
                                    className="flex-1 bg-gray-50 border-none rounded-xl px-6 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                                    value={customMatName}
                                    onChange={e => setCustomMatName(e.target.value)}
                                />
                                <button 
                                    type="button"
                                    onClick={addCustomMaterial}
                                    className="px-6 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"
                                >
                                    Agregar Manual
                                </button>
                            </div>

                            {/* MATERIALS LIST */}
                            <div className="space-y-3">
                                {materials.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${m.productId ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {m.productId ? <Box className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 text-sm uppercase">{m.name}</p>
                                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                                    {m.productId ? 'De Inventario' : 'Manual / Externo'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
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
                                            <div className="text-right min-w-[80px]">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio Unit.</p>
                                                <p className="font-black text-emerald-600">S/ {m.unitPriceAtTime || 0}</p>
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
                                ))}
                                
                                {materials.length > 0 && (
                                    <div className="flex justify-end p-6 bg-gray-900 rounded-[2rem] text-white mt-6 shadow-xl shadow-gray-200">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Costo Estimado de Insumos</p>
                                            <div className="flex items-center justify-end gap-3">
                                                <DollarSign className="w-6 h-6 text-emerald-400" />
                                                <span className="text-3xl font-black">
                                                    S/ {materials.reduce((acc, m) => acc + (m.quantity * m.unitPriceAtTime), 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* IMAGES */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fotos y Evidencias</label>
                            <div className="flex gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Pegar URL de la imagen (o subir archivo en versión final)..."
                                    className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    value={imageUrl}
                                    onChange={e => setImageUrl(e.target.value)}
                                />
                                <button 
                                    type="button"
                                    onClick={addImage}
                                    className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition"
                                >
                                    <Plus className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mt-6">
                                {formData.images.map((img, i) => (
                                    <div key={i} className="aspect-square bg-gray-100 rounded-2xl relative group overflow-hidden border border-gray-100">
                                        <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                        <button 
                                            type="button"
                                            onClick={() => removeImage(i)}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow-lg"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {formData.images.length === 0 && (
                                    <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-300">
                                        <Camera className="w-8 h-8 mb-2" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Añadir Fotos</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SUBMIT */}
                        <div className="pt-10">
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-8 bg-gray-900 text-white rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-4 shadow-2xl hover:bg-black transition active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>Enviando...</>
                                ) : (
                                    <>
                                        <Send className="w-8 h-8" /> {materials.length > 0 ? 'Enviar a Administrador' : 'Enviar a Comercial'}
                                    </>
                                )}
                            </button>
                            <p className="text-center text-[10px] text-gray-400 font-bold mt-6 uppercase tracking-[0.2em]">
                                Al enviar, el equipo comercial recibirá una notificación para su revisión.
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
