'use client';

import { useState } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/axios';
import {
    Plus,
    Camera,
    X,
    ArrowLeft,
    Send,
    FileText,
    Settings,
    Beaker
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/samples', formData);
            toast.success('Muestra enviada a Comercial con éxito');
            router.push('/samples');
        } catch (error) {
            console.error('Error creating sample:', error);
            toast.error('Error al enviar la muestra');
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
                                        <Send className="w-8 h-8" /> Enviar a Comercial
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
