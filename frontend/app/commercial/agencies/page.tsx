'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../../components/common/Layout';
import { useAuth } from '../../../hooks/useAuth';
import { agenciesService, Agency } from '../../../services/agencies.service';
import {
    MapPin, Plus, Search, Edit2, Trash2, X, AlertTriangle, Building2,
    Phone, CheckCircle, XCircle, Info, FileText, Filter, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AgenciesPage() {
    const { user } = useAuth();
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [zoneFilter, setZoneFilter] = useState('');

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Modals
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        zone: '',
        ruc: '',
        contactName: ''
    });

    useEffect(() => {
        if (user) {
            // Set default zone based on user role
            if (user.role === 'VENDEDOR_LIMA') setFormData(prev => ({ ...prev, zone: 'LIMA' }));
            else if (user.role === 'VENDEDOR_ORIENTE') setFormData(prev => ({ ...prev, zone: 'ORIENTE' }));
            else setFormData(prev => ({ ...prev, zone: 'COMERCIAL' }));
            
            fetchAgencies();
        }
    }, [user, zoneFilter]);

    const fetchAgencies = async () => {
        setIsLoading(true);
        try {
            const data = await agenciesService.getAll(zoneFilter || undefined);
            setAgencies(data);
        } catch (error) {
            console.error('Error fetching agencies:', error);
            showToast('Error al cargar las agencias', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        const defaultZone = user?.role === 'VENDEDOR_LIMA' ? 'LIMA' : 
                          user?.role === 'VENDEDOR_ORIENTE' ? 'ORIENTE' : 'COMERCIAL';
        setFormData({
            name: '',
            address: '',
            phone: '',
            zone: defaultZone,
            ruc: '',
            contactName: ''
        });
        setEditingId(null);
    };

    const openNewAgency = () => { resetForm(); setShowFormModal(true); };

    const openEditAgency = (a: Agency) => {
        setEditingId(a.id);
        setFormData({
            name: a.name || '',
            address: a.address || '',
            phone: a.phone || '',
            zone: a.zone || 'COMERCIAL',
            ruc: a.ruc || '',
            contactName: a.contactName || ''
        });
        setShowFormModal(true);
    };

    const openDelete = (id: string) => { setDeletingId(id); setShowDeleteModal(true); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await agenciesService.update(editingId, formData);
                showToast('Agencia actualizada', 'success');
            } else {
                await agenciesService.create(formData);
                showToast('Agencia registrada correctamente', 'success');
            }
            setShowFormModal(false);
            resetForm();
            fetchAgencies();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al procesar', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await agenciesService.delete(deletingId);
            showToast('Agencia eliminada', 'success');
            setShowDeleteModal(false);
            setDeletingId(null);
            fetchAgencies();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al eliminar', 'error');
        }
    };

    const filteredAgencies = agencies.filter(a =>
        (a.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (a.ruc || '').includes(searchTerm) ||
        (a.contactName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const isComercialOrAdmin = user?.role === 'COMERCIAL' || user?.role === 'ADMIN';

    return (
        <Layout>
            {/* TOAST */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -40, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -40, x: '-50%' }}
                        className={`fixed top-6 left-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[320px] border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-blue-50 border-blue-200 text-blue-800'
                            }`}>
                        {toast.type === 'success' && <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />}
                        {toast.type === 'error' && <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />}
                        {toast.type === 'info' && <Info className="w-6 h-6 text-blue-500 flex-shrink-0" />}
                        <p className="font-semibold text-sm flex-1">{toast.message}</p>
                        <button onClick={() => setToast(null)} className="p-1 hover:bg-white/50 rounded-lg transition flex-shrink-0"><X className="w-4 h-4" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Agencias de Transporte</h1>
                    <p className="text-gray-500 mt-1 font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        Gestión de agencias por zona · {agencies.length} registros
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {isComercialOrAdmin && (
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select 
                                className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none"
                                value={zoneFilter}
                                onChange={(e) => setZoneFilter(e.target.value)}
                            >
                                <option value="">Todas las Zonas</option>
                                <option value="LIMA">Zona Lima</option>
                                <option value="ORIENTE">Zona Oriente</option>
                                <option value="COMERCIAL">Oficina / Comercial</option>
                            </select>
                        </div>
                    )}

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar agencia..."
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button onClick={openNewAgency}
                        className="flex items-center gap-2 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-lg active:scale-95 bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 whitespace-nowrap">
                        <Plus className="w-5 h-5 text-blue-200" /> Nueva Agencia
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />
                        ))}
                    </div>
                ) : filteredAgencies.length === 0 ? (
                    <div className="text-center py-24 px-6">
                        <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                            <Building2 className="w-12 h-12 text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No se encontraron agencias</h3>
                        <p className="text-gray-500 mb-8 max-w-xs mx-auto font-medium">No hay registros que coincidan con tu búsqueda o filtros actuales.</p>
                        <button onClick={openNewAgency} className="px-8 py-3.5 text-white rounded-2xl font-bold transition bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30">
                            Registrar mi primera Agencia
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-5 text-[11px] uppercase font-black text-gray-400 tracking-[0.1em]">Agencia</th>
                                    <th className="px-8 py-5 text-[11px] uppercase font-black text-gray-400 tracking-[0.1em]">RUC / Documento</th>
                                    <th className="px-8 py-5 text-[11px] uppercase font-black text-gray-400 tracking-[0.1em]">Contacto</th>
                                    <th className="px-8 py-5 text-[11px] uppercase font-black text-gray-400 tracking-[0.1em]">Zona</th>
                                    <th className="px-8 py-5 text-center text-[11px] uppercase font-black text-gray-400 tracking-[0.1em]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredAgencies.map((agency, idx) => (
                                    <motion.tr 
                                        key={agency.id} 
                                        initial={{ opacity: 0, x: -10 }} 
                                        animate={{ opacity: 1, x: 0 }} 
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-blue-50/30 transition-all group"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 font-bold group-hover:scale-110 transition-transform">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-base">{agency.name}</p>
                                                    {agency.address && (
                                                        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1 font-medium">
                                                            <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                                            {agency.address}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-gray-400" />
                                                <span className="font-mono text-sm font-bold text-gray-700 bg-gray-100/50 px-2 py-1 rounded-lg border border-gray-100">
                                                    {agency.ruc || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-gray-900 font-bold">
                                                    <User className="w-4 h-4 text-blue-400" />
                                                    {agency.contactName || 'No asignado'}
                                                </div>
                                                {agency.phone && (
                                                    <div className="flex items-center gap-2 text-gray-500 font-medium text-xs">
                                                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                                        {agency.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase ${
                                                agency.zone === 'LIMA' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                                agency.zone === 'ORIENTE' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                            }`}>
                                                {agency.zone}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => openEditAgency(agency)} 
                                                    className="p-2.5 rounded-xl hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition shadow-sm hover:shadow-amber-200/50" 
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4.5 h-4.5" />
                                                </button>
                                                <button 
                                                    onClick={() => openDelete(agency.id)} 
                                                    className="p-2.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 transition shadow-sm hover:shadow-red-200/50" 
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4.5 h-4.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ===== MODAL FORM ===== */}
            <AnimatePresence>
                {showFormModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setShowFormModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden max-h-[90vh] flex flex-col border border-white">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900">{editingId ? 'Editar Agencia' : 'Nueva Agencia'}</h2>
                                    <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-widest">
                                        {editingId ? 'Gestión de Transportes' : 'Registro de Transportista'}
                                    </p>
                                </div>
                                <button onClick={() => setShowFormModal(false)} className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition shadow-xl shadow-gray-200/30"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Nombre de la Agencia</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                <Building2 className="h-5 w-5 text-blue-400 group-focus-within:text-blue-600 transition-colors" />
                                            </div>
                                            <input required type="text" className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-gray-900"
                                                placeholder="Ej: Agencia Flores, Cruz del Sur..." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">RUC / Documento</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                <FileText className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                            </div>
                                            <input type="text" className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-mono font-bold"
                                                placeholder="RUC de la empresa" value={formData.ruc} onChange={e => setFormData({ ...formData, ruc: e.target.value })} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Zona Asignada</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                                                <MapPin className="h-5 w-5 text-amber-500" />
                                            </div>
                                            <select 
                                                disabled={user?.role !== 'COMERCIAL' && user?.role !== 'ADMIN'}
                                                required 
                                                className="w-full pl-14 pr-10 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-gray-900 appearance-none disabled:opacity-50"
                                                value={formData.zone} 
                                                onChange={e => setFormData({ ...formData, zone: e.target.value })}
                                            >
                                                <option value="LIMA">ZONA LIMA</option>
                                                <option value="ORIENTE">ZONA ORIENTE</option>
                                                <option value="COMERCIAL">OFICINA / COMERCIAL</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Contacto Principal</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                <User className="h-5 w-5 text-indigo-400 group-focus-within:text-blue-600 transition-colors" />
                                            </div>
                                            <input type="text" className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                                placeholder="Nombre del encargado" value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Teléfono</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                <Phone className="h-5 w-5 text-emerald-500 group-focus-within:text-blue-600 transition-colors" />
                                            </div>
                                            <input type="text" className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                                placeholder="Celular o teléfono" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Dirección de la Agencia</label>
                                        <div className="relative group">
                                            <div className="absolute top-4 left-5 pointer-events-none">
                                                <MapPin className="h-5 w-5 text-red-400 group-focus-within:text-blue-600 transition-colors" />
                                            </div>
                                            <textarea className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold min-h-[100px]"
                                                placeholder="Ubicación física / Destino" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-10 flex items-center justify-end gap-4">
                                    <button type="button" onClick={() => setShowFormModal(false)} className="px-8 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition tracking-widest uppercase text-xs">Cerrar</button>
                                    <button type="submit" className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition shadow-2xl shadow-blue-500/40 tracking-widest uppercase text-xs active:scale-95">
                                        {editingId ? 'Confirmar Cambios' : 'Registrar Agencia'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== MODAL DELETE ===== */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 text-center border border-white">
                            <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">¿Eliminar Agencia?</h3>
                            <p className="text-gray-500 mb-8 font-medium">Esta acción no se puede deshacer y el registro se perderá permanentemente.</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleDelete} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition shadow-xl shadow-red-500/30 text-xs uppercase tracking-widest active:scale-95">Sí, Eliminar Registro</button>
                                <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition text-xs uppercase tracking-widest">Cancelar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
