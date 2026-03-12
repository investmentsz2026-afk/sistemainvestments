// frontend/app/settings/page.tsx
'use client';

import React, { useState } from 'react';
import { Layout } from '../../components/common/Layout';
import {
    Settings,
    User,
    Bell,
    Lock,
    Palette,
    Globe,
    Shield,
    Save,
    Building,
    Smartphone,
    Mail,
    Moon,
    Sun,
    Monitor,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'perfil', label: 'Empresa', icon: Building },
        { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
        { id: 'seguridad', label: 'Seguridad', icon: Shield },
        { id: 'apariencia', label: 'Apariencia', icon: Palette },
    ];

    const handleSave = () => {
        setIsSaving(true);
        // Simular guardado
        setTimeout(() => {
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }, 1000);
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-gray-900 rounded-2xl shadow-lg">
                                <Settings className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Configuración</h1>
                        </div>
                        <p className="text-gray-500 font-medium text-sm">Gestiona las preferencias de tu cuenta y la configuración del sistema.</p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Nav */}
                    <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-white text-blue-600 shadow-lg shadow-gray-200/50 border border-blue-50'
                                    : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
                                    }`}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden"
                            >
                                {activeTab === 'general' && (
                                    <div className="p-8 space-y-8">
                                        <section>
                                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                                <Globe className="w-5 h-5 text-blue-500" />
                                                Ajustes del Sistema
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Idioma del Sistema</label>
                                                    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition">
                                                        <option>Español (Perú)</option>
                                                        <option>English (US)</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Zona Horaria</label>
                                                    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition">
                                                        <option>(GMT-05:00) Lima, Bogotá, Quito</option>
                                                        <option>(GMT-04:00) La Paz, Santiago</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Símbolo de Moneda</label>
                                                    <input type="text" defaultValue="S/ (Soles)" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition" />
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {activeTab === 'perfil' && (
                                    <div className="p-8 space-y-8">
                                        <section>
                                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                                <Building className="w-5 h-5 text-indigo-500" />
                                                Información de la Empresa
                                            </h3>
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-6 pb-6 border-b border-gray-50">
                                                    <div className="w-24 h-24 bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center p-4">
                                                        Subir Logo
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-gray-900 mb-1">Logo Institucional</h4>
                                                        <p className="text-xs text-gray-500 mb-3">Recomendado: PNG 512x512px (Max 2MB)</p>
                                                        <button className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition">Cambiar Imagen</button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                                                        <input type="text" defaultValue="StockMaster PRO" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">RUC / Identificación</label>
                                                        <input type="text" defaultValue="20123456789" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                                                    </div>
                                                    <div className="space-y-2 md:col-span-2">
                                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Dirección Fiscal</label>
                                                        <input type="text" placeholder="Av. Principal 123, Lima, Perú" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {activeTab === 'apariencia' && (
                                    <div className="p-8">
                                        <h3 className="text-lg font-bold text-gray-900 mb-8 flex items-center gap-2">
                                            <Palette className="w-5 h-5 text-purple-500" />
                                            Personalización Visual
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <button className="relative group p-4 rounded-3xl border-2 border-blue-500 bg-blue-50/10 flex flex-col items-center gap-3 transition-all">
                                                <div className="w-full aspect-video bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-2 flex gap-1">
                                                    <div className="w-4 h-full bg-blue-500 rounded-sm"></div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="h-1 bg-gray-100 rounded w-1/2"></div>
                                                        <div className="h-4 bg-gray-50 rounded"></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Sun className="w-4 h-4 text-blue-600" />
                                                    <span className="text-sm font-bold text-blue-700">Modo Claro</span>
                                                </div>
                                                <div className="absolute top-2 right-2 p-1 bg-blue-500 rounded-full text-white">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            </button>

                                            <button className="group p-4 rounded-3xl border-2 border-transparent bg-gray-50 flex flex-col items-center gap-3 hover:border-gray-200 transition-all">
                                                <div className="w-full aspect-video bg-gray-900 rounded-xl shadow-sm overflow-hidden p-2 flex gap-1">
                                                    <div className="w-4 h-full bg-gray-800 rounded-sm"></div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="h-1 bg-gray-800 rounded w-1/2"></div>
                                                        <div className="h-4 bg-gray-800 rounded"></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Moon className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm font-bold text-gray-400 group-hover:text-gray-600">Modo Oscuro</span>
                                                </div>
                                            </button>

                                            <button className="group p-4 rounded-3xl border-2 border-transparent bg-gray-50 flex flex-col items-center gap-3 hover:border-gray-200 transition-all">
                                                <div className="w-full aspect-video bg-gradient-to-br from-white to-gray-900 rounded-xl shadow-sm overflow-hidden p-2 flex gap-1">
                                                    <div className="w-4 h-full bg-blue-500 rounded-sm"></div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="h-1 bg-gray-200 rounded w-1/2"></div>
                                                        <div className="h-4 bg-gray-100 rounded"></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Monitor className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm font-bold text-gray-400 group-hover:text-gray-600">Sistema</span>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="mt-10 p-6 bg-gradient-to-r from-gray-900 to-blue-900 rounded-3xl text-white">
                                            <h4 className="font-bold mb-2">Tema Premium</h4>
                                            <p className="text-xs text-blue-200 mb-4 opacity-80">El sistema adapta automáticamente los colores para una mejor experiencia visual.</p>
                                            <div className="flex gap-2">
                                                {[
                                                    'bg-blue-500',
                                                    'bg-indigo-500',
                                                    'bg-purple-500',
                                                    'bg-emerald-500',
                                                    'bg-amber-500'
                                                ].map(c => (
                                                    <div key={c} className={`w-8 h-8 ${c} rounded-full border-2 border-white/20 cursor-pointer hover:scale-110 transition`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Fallback for other tabs */}
                                {['notificaciones', 'seguridad'].includes(activeTab) && (
                                    <div className="p-20 text-center">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Lock className="w-10 h-10 text-gray-200" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Sección Asegurada</h3>
                                        <p className="text-gray-400 text-sm max-w-xs mx-auto">Esta sección de {activeTab} está siendo optimizada para ofrecerte máxima seguridad.</p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Success Notification */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-10 right-10 z-[200] bg-gray-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10"
                    >
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black">¡Cambios Guardados!</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">La configuración se actualizó correctamente</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
