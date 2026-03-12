'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../../components/common/Layout';
import api from '../../../lib/axios';
import {
    Plus,
    Search,
    User,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    MoreVertical,
    ChevronRight,
    ArrowLeft,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClientsPage() {
    const router = useRouter();
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    // New client form state
    const [newClient, setNewClient] = useState({
        documentType: 'DNI',
        documentNumber: '',
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const resp = await api.get('/sales/clients');
            setClients(resp.data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/sales/clients', newClient);
            setShowAddModal(false);
            fetchClients();
            setNewClient({ documentType: 'DNI', documentNumber: '', name: '', email: '', phone: '', address: '' });
        } catch (error) {
            console.error('Error adding client:', error);
            alert('Error al agregar cliente');
        }
    };

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.documentNumber.includes(searchTerm)
    );

    const cardClass = "bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20";

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.back()}
                            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 shadow-sm transition active:scale-90"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Directorio de Clientes</h1>
                            <p className="text-gray-500 font-medium text-lg mt-1">Gestión de cartera y datos de facturación.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl hover:bg-indigo-700 transition active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> Nuevo Cliente
                    </button>
                </div>

                {/* SEARCH BAR */}
                <div className={`${cardClass} p-4 flex items-center gap-4`}>
                    <div className="flex-1 relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre o número de documento..."
                            className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-6 py-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* CLIENTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="col-span-full py-20 text-center opacity-50 italic uppercase font-black tracking-widest text-xs">No se encontraron clientes</div>
                    ) : filteredClients.map((client) => (
                        <motion.div 
                            key={client.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`${cardClass} p-8 group hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-300 relative overflow-hidden`}
                        >
                            <div className="absolute top-0 right-0 p-4">
                                <button className="text-gray-300 hover:text-gray-600 transition">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-2xl font-black text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    {client.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-lg line-clamp-1">{client.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                                            {client.documentType}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-indigo-400">{client.documentNumber}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                                    <Mail className="w-4 h-4 text-indigo-300" />
                                    <span className="truncate">{client.email || 'Sin correo registrado'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                                    <Phone className="w-4 h-4 text-indigo-300" />
                                    <span>{client.phone || 'Sin teléfono'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                                    <MapPin className="w-4 h-4 text-indigo-300" />
                                    <span className="truncate">{client.address || 'Sin dirección'}</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                     <CreditCard className="w-4 h-4 text-emerald-400" />
                                     <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Cartera Activa</span>
                                </div>
                                <button className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:translate-x-1 transition-transform">
                                    Ver Ventas <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* ADD CLIENT MODAL */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
                        >
                            <div className="bg-gray-900 p-10 text-white relative">
                                <button 
                                    onClick={() => setShowAddModal(false)}
                                    className="absolute top-10 right-10 p-2 text-white/40 hover:text-white transition"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <h2 className="text-3xl font-black uppercase tracking-tight">Nuevo Cliente</h2>
                                <p className="text-white/40 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Inscripción en el sistema</p>
                            </div>

                            <form onSubmit={handleAddClient} className="p-10 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo Doc.</label>
                                        <select 
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition"
                                            value={newClient.documentType}
                                            onChange={(e) => setNewClient({ ...newClient, documentType: e.target.value })}
                                        >
                                            <option value="DNI">DNI (Persona)</option>
                                            <option value="RUC">RUC (Empresa)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Número</label>
                                        <input 
                                            type="text" required
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition"
                                            value={newClient.documentNumber}
                                            onChange={(e) => setNewClient({ ...newClient, documentNumber: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo / Razón Social</label>
                                    <input 
                                        type="text" required
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition"
                                        value={newClient.name}
                                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                        <input 
                                            type="email"
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition"
                                            value={newClient.email}
                                            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
                                        <input 
                                            type="text"
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition"
                                            value={newClient.phone}
                                            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dirección de Entrega / Fiscal</label>
                                    <input 
                                        type="text"
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition"
                                        value={newClient.address}
                                        onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                                    />
                                </div>

                                <div className="pt-6">
                                    <button 
                                        type="submit"
                                        className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition active:scale-95"
                                    >
                                        Registrar Cliente
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
