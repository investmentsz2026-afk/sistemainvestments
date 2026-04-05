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
    X,
    FileSpreadsheet,
    Users,
    Upload,
    FileText,
    Check,
    Edit,
    FileEdit,
    Eye,
    ShoppingBag,
    ShieldCheck,
    Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';

export default function ClientsPage() {
    const { user: authUser } = useAuth();
    const router = useRouter();
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [importData, setImportData] = useState<any[]>([]);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [clientSales, setClientSales] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // New client form state
    const [newClient, setNewClient] = useState({
        documentType: 'DNI',
        documentNumber: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        zone: ''
    });

    useEffect(() => {
        if (authUser) {
            fetchClients();
        }
    }, [authUser]);

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
            setNewClient({ documentType: 'DNI', documentNumber: '', name: '', email: '', phone: '', address: '', zone: '' });
            toast.success('Cliente registrado correctamente');
        } catch (error) {
            console.error('Error adding client:', error);
            toast.error('Error al agregar cliente');
        }
    };

    const handleEditClient = (client: any) => {
        setEditingClient({ ...client, zone: client.zone || '' });
        setShowEditModal(true);
        setActiveMenuId(null);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.patch(`/sales/clients/${editingClient.id}`, editingClient);
            setShowEditModal(false);
            setEditingClient(null);
            fetchClients();
            toast.success('Cliente actualizado correctamente');
        } catch (error) {
            console.error('Error updating client:', error);
            toast.error('Error al actualizar cliente');
        }
    };

    const handleOpenDetails = async (client: any) => {
        setEditingClient(client);
        setShowDetailsModal(true);
        setActiveMenuId(null);
        try {
            const resp = await api.get('/sales', { params: { clientId: client.id } });
            setClientSales(resp.data || []);
        } catch (error) {
            console.error('Error fetching client sales:', error);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const bstr = event.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            setImportData(data);
        };
        reader.readAsBinaryString(file);
    };

    const processBulkImport = async () => {
        setIsImporting(true);
        try {
            // Se asume un endpoint que acepte un array o iterar
            // Por ahora iteramos para asegurar compatibilidad
            for (const item of importData) {
                await api.post('/sales/clients', {
                    documentType: item.tipo_doc || item.documentType || 'DNI',
                    documentNumber: String(item.numero || item.documentNumber || ''),
                    name: item.nombre || item.name || '',
                    email: item.correo || item.email || '',
                    phone: String(item.telefono || item.phone || ''),
                    address: item.direccion || item.address || ''
                });
            }
            setShowImportModal(false);
            setImportData([]);
            fetchClients();
            alert('Importación masiva completada con éxito');
        } catch (error) {
            console.error('Error in bulk import:', error);
            alert('Error parcial en la importación');
        } finally {
            setIsImporting(false);
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
                        onClick={() => setShowSelectionModal(true)}
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
                            <div className="absolute top-0 right-0 p-6">
                                <div className="relative">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === client.id ? null : client.id); }}
                                        className="p-3 bg-gray-50/50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-2xl transition-all shadow-sm border border-gray-100"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>

                                    <AnimatePresence>
                                        {activeMenuId === client.id && (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                className="absolute right-0 mt-2 w-56 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                                            >
                                                <div className="p-2">
                                                    <button 
                                                        onClick={() => handleOpenDetails(client)}
                                                        className="w-full flex items-center gap-3 p-4 text-sm font-black text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all rounded-2xl group"
                                                    >
                                                        <div className="p-2 bg-gray-50 group-hover:bg-white rounded-xl transition-colors">
                                                            <Eye className="w-4 h-4" />
                                                        </div>
                                                        VER DETALLES
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEditClient(client)}
                                                        className="w-full flex items-center gap-3 p-4 text-sm font-black text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all rounded-2xl group"
                                                    >
                                                        <div className="p-2 bg-gray-50 group-hover:bg-white rounded-xl transition-colors">
                                                            <Edit className="w-4 h-4" />
                                                        </div>
                                                        EDITAR CLIENTE
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
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

            {/* SELECTION MODAL */}
            <AnimatePresence>
                {showSelectionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                            onClick={() => setShowSelectionModal(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-2xl bg-white rounded-[3rem] p-10 shadow-2xl overflow-hidden"
                        >
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-gray-900 uppercase">¿Cómo deseas agregar?</h2>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-2 px-10">Selecciona el método que mejor se adapte a tu necesidad</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button 
                                    onClick={() => { setShowSelectionModal(false); setShowAddModal(true); }}
                                    className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left flex flex-col group h-full"
                                >
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform">
                                        <Users className="w-7 h-7 text-indigo-600" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Individual</h3>
                                    <p className="text-sm text-gray-400 font-medium font-bold leading-relaxed">Registra un cliente paso a paso llenando el formulario estándar.</p>
                                    <div className="mt-auto pt-6 flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                                        Continuar <ChevronRight className="w-4 h-4" />
                                    </div>
                                </button>

                                <button 
                                    onClick={() => { setShowSelectionModal(false); setShowImportModal(true); }}
                                    className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left flex flex-col group h-full"
                                >
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform">
                                        <FileSpreadsheet className="w-7 h-7 text-indigo-600" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Importe Masivo</h3>
                                    <p className="text-sm text-gray-400 font-medium font-bold leading-relaxed">Carga múltiples clientes desde un archivo Excel o PDF.</p>
                                    <div className="mt-auto pt-6 flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                                        Continuar <ChevronRight className="w-4 h-4" />
                                    </div>
                                </button>
                            </div>

                            <button 
                                onClick={() => setShowSelectionModal(false)}
                                className="mt-10 w-full p-4 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-900 transition"
                            >
                                <X className="w-4 h-4 mx-auto mb-1" /> Cerrar
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD CLIENT MODAL (RESPONSIVE) */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                            className="relative w-full max-w-2xl bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
                        >
                            <div className="bg-gray-900 p-6 md:p-10 text-white relative shrink-0">
                                <button 
                                    onClick={() => setShowAddModal(false)}
                                    className="absolute top-6 md:top-10 right-6 md:right-10 p-2 text-white/40 hover:text-white transition"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Nuevo Cliente</h2>
                                <p className="text-white/40 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Inscripción Individual</p>
                            </div>

                            <form onSubmit={handleAddClient} className="p-6 md:p-10 space-y-6 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo Doc.</label>
                                        <select 
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
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
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                            value={newClient.documentNumber}
                                            onChange={(e) => setNewClient({ ...newClient, documentNumber: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo / Razón Social</label>
                                    <input 
                                        type="text" required
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                        value={newClient.name}
                                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                        <input 
                                            type="email"
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                            value={newClient.email}
                                            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
                                        <input 
                                            type="text"
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                            value={newClient.phone}
                                            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dirección de Entrega / Fiscal</label>
                                    <input 
                                        type="text"
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                        value={newClient.address}
                                        onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                                    />
                                </div>

                                {(authUser?.role === 'ADMIN' || authUser?.role === 'COMERCIAL') && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Zona de Ventas</label>
                                        <select 
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                            value={newClient.zone}
                                            onChange={(e) => setNewClient({ ...newClient, zone: e.target.value })}
                                        >
                                            <option value="">Sin Zona Especificada</option>
                                            <option value="LIMA">LIMA</option>
                                            <option value="ORIENTE">ORIENTE</option>
                                        </select>
                                    </div>
                                )}

                                <div className="pt-6 sticky bottom-0 bg-white pb-6">
                                    <button 
                                        type="submit"
                                        className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-100 ring-4 ring-indigo-50 hover:bg-indigo-700 transition active:scale-95"
                                    >
                                        Registrar Cliente
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DETAILS MODAL */}
            <AnimatePresence>
                {showDetailsModal && editingClient && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                            onClick={() => setShowDetailsModal(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
                        >
                            <div className="bg-gray-900 p-10 text-white relative shrink-0">
                                <button 
                                    onClick={() => setShowDetailsModal(false)}
                                    className="absolute top-10 right-10 p-2 text-white/40 hover:text-white transition"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <div className="flex flex-col md:flex-row md:items-center gap-8">
                                    <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white border border-white/20">
                                        {editingClient.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black uppercase tracking-tight">{editingClient.name}</h2>
                                        <div className="flex flex-wrap items-center gap-4 mt-2">
                                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                                ID: {editingClient.id.slice(-6).toUpperCase()}
                                            </span>
                                            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                                {editingClient.documentType}: {editingClient.documentNumber}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-12 bg-gray-50/50">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                        <div className="w-12 h-12 text-blue-500 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1 truncate">{editingClient.email || 'No registrado'}</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                        <div className="w-12 h-12 text-emerald-500 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Teléfono</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1 truncate">{editingClient.phone || 'No registrado'}</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                        <div className="w-12 h-12 text-amber-500 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dirección</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1 truncate">{editingClient.address || 'No registrado'}</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2rem] border border-indigo-50 shadow-sm ring-1 ring-indigo-50 ring-inset">
                                        <div className="w-12 h-12 text-indigo-500 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registrado Por</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1 truncate">
                                            {editingClient.createdBy?.name || 'Administración'}
                                        </p>
                                        {editingClient.createdBy?.zone && (
                                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase mt-1 inline-block border border-indigo-100">
                                                Zona {editingClient.createdBy.zone}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                                                <ShoppingBag className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 uppercase">Historial de Compras</h3>
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-gray-100">
                                            Total: {clientSales.length} Pedidos
                                        </span>
                                    </div>

                                    {clientSales.length === 0 ? (
                                        <div className="bg-white p-16 text-center rounded-[3rem] border border-gray-100 italic font-black uppercase tracking-[0.2em] text-xs text-gray-300">
                                            Este cliente aún no registra compras
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50/50">
                                                    <tr>
                                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Comp.</th>
                                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto</th>
                                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {clientSales.map((sale: any) => (
                                                        <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-8 py-5 text-sm font-bold text-gray-900">
                                                                {new Date(sale.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                                                                    #{sale.invoiceNumber || sale.id.slice(-6).toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-5 text-sm font-black text-gray-900 text-right">
                                                                S/ {(sale.totalAmount || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                                                    Entregado
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <Toaster position="top-right" />

            {/* EDIT CLIENT MODAL */}
            <AnimatePresence>
                {showEditModal && editingClient && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                            onClick={() => setShowEditModal(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
                        >
                            <div className="bg-indigo-600 p-6 md:p-10 text-white relative shrink-0">
                                <button 
                                    onClick={() => setShowEditModal(false)}
                                    className="absolute top-6 md:top-10 right-6 md:right-10 p-2 text-white/40 hover:text-white transition"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                                        <FileEdit className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Editar Cliente</h2>
                                        <p className="text-white/40 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Actualización de Expediente</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSaveEdit} className="p-6 md:p-10 space-y-6 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo Doc.</label>
                                        <select 
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                            value={editingClient.documentType}
                                            onChange={(e) => setEditingClient({ ...editingClient, documentType: e.target.value })}
                                        >
                                            <option value="DNI">DNI (Persona)</option>
                                            <option value="RUC">RUC (Empresa)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Número</label>
                                        <input 
                                            type="text" required
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                            value={editingClient.documentNumber}
                                            onChange={(e) => setEditingClient({ ...editingClient, documentNumber: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo / Razón Social</label>
                                    <input 
                                        type="text" required
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                        value={editingClient.name}
                                        onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                        <input 
                                            type="email"
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                            value={editingClient.email || ''}
                                            onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
                                        <input 
                                            type="text"
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                            value={editingClient.phone || ''}
                                            onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dirección de Entrega / Fiscal</label>
                                    <input 
                                        type="text"
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                        value={editingClient.address || ''}
                                        onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                                    />
                                </div>

                                {(authUser?.role === 'ADMIN' || authUser?.role === 'COMERCIAL') && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Zona de Ventas</label>
                                        <select 
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 transition shadow-sm"
                                            value={editingClient.zone || ''}
                                            onChange={(e) => setEditingClient({ ...editingClient, zone: e.target.value })}
                                        >
                                            <option value="">Sin Zona Especificada</option>
                                            <option value="LIMA">LIMA</option>
                                            <option value="ORIENTE">ORIENTE</option>
                                        </select>
                                    </div>
                                )}

                                <div className="pt-6 sticky bottom-0 bg-white pb-6">
                                    <button 
                                        type="submit"
                                        className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-100 ring-4 ring-indigo-50 hover:bg-indigo-700 transition active:scale-95"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* BULK IMPORT MODAL */}
            <AnimatePresence>
                {showImportModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                            onClick={() => setShowImportModal(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 p-10 text-white shrink-0 relative">
                                <button onClick={() => setShowImportModal(false)} className="absolute top-10 right-10 p-2 text-white/40 hover:text-white transition">
                                    <X className="w-6 h-6" />
                                </button>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black uppercase">Importe Masivo</h2>
                                </div>
                                <p className="text-white/60 font-medium">Carga tus bases de datos desde archivos Excel o PDF.</p>
                            </div>

                            <div className="p-10 flex-1 overflow-y-auto">
                                {importData.length === 0 ? (
                                    <div className="text-center py-20 border-4 border-dashed border-gray-100 rounded-[3rem]">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FileText className="w-10 h-10 text-gray-300" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Sube tu archivo</h3>
                                        <p className="text-sm text-gray-400 font-bold mb-8 px-20">Aceptamos formatos .xlsx, .xls y archivos tabulares.</p>
                                        <input 
                                            type="file" 
                                            id="fileInput" 
                                            className="hidden" 
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleFileUpload}
                                        />
                                        <label 
                                            htmlFor="fileInput" 
                                            className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer shadow-xl hover:bg-indigo-700 transition active:scale-95 inline-block"
                                        >
                                            Seleccionar Archivo
                                        </label>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                            <div className="flex items-center gap-3">
                                                <Check className="w-5 h-5 text-emerald-600" />
                                                <span className="text-emerald-900 font-black text-sm uppercase tracking-widest">Se cargaron {importData.length} registros</span>
                                            </div>
                                            <button onClick={() => setImportData([])} className="text-emerald-600 font-bold text-xs uppercase hover:underline">Cambiar archivo</button>
                                        </div>

                                        <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Documento</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {importData.slice(0, 5).map((item, idx) => (
                                                        <tr key={idx} className="bg-white">
                                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.nombre || item.name}</td>
                                                            <td className="px-6 py-4 text-xs font-mono text-gray-500">{item.numero || item.documentNumber}</td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-black uppercase">Listo</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {importData.length > 5 && (
                                                <div className="p-4 bg-gray-50 text-center text-xs text-gray-400 font-bold italic uppercase tracking-widest">Y {importData.length - 5} más...</div>
                                            )}
                                        </div>

                                        <button 
                                            onClick={processBulkImport}
                                            disabled={isImporting}
                                            className="w-full py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
                                        >
                                            {isImporting ? 'Procesando...' : 'Iniciar Importación'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
