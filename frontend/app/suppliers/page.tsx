'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import {
    Users, Plus, Search, Edit2, Trash2, X, AlertTriangle, Building2,
    Mail, Phone, MapPin, CheckCircle, XCircle, Info, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SuppliersPage() {
    const { user } = useAuth();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
        documentType: 'RUC',
        documentNumber: '',
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        category: 'Materiales',
        notes: '',
        isActive: true
    });

    useEffect(() => { fetchSuppliers(); }, []);

    const fetchSuppliers = async () => {
        try {
            const resp = await api.get('/suppliers');
            setSuppliers(resp.data.data || []);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            documentType: 'RUC',
            documentNumber: '',
            name: '',
            contactName: '',
            email: '',
            phone: '',
            address: '',
            category: 'Materiales',
            notes: '',
            isActive: true
        });
        setEditingId(null);
    };

    const openNewSupplier = () => { resetForm(); setShowFormModal(true); };

    const openEditSupplier = (s: any) => {
        setEditingId(s.id);
        setFormData({
            documentType: s.documentType || 'RUC',
            documentNumber: s.documentNumber || '',
            name: s.name || '',
            contactName: s.contactName || '',
            email: s.email || '',
            phone: s.phone || '',
            address: s.address || '',
            category: s.category || 'Materiales',
            notes: s.notes || '',
            isActive: s.isActive ?? true
        });
        setShowFormModal(true);
    };

    const openDelete = (id: string) => { setDeletingId(id); setShowDeleteModal(true); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = editingId
                ? await api.patch(`/suppliers/${editingId}`, formData)
                : await api.post('/suppliers', formData);

            if (response.data.success) {
                showToast(editingId ? 'Proveedor actualizado' : 'Proveedor registrado', 'success');
                setShowFormModal(false);
                resetForm();
                fetchSuppliers();
            } else {
                showToast('Error: ' + response.data.message, 'error');
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al procesar', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            const resp = await api.delete(`/suppliers/${deletingId}`);
            if (resp.data.success) {
                showToast('Proveedor eliminado', 'success');
                setShowDeleteModal(false);
                setDeletingId(null);
                fetchSuppliers();
            }
            else { showToast('Error: ' + resp.data.message, 'error'); }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al eliminar', 'error');
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        (s.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (s.documentNumber || '').includes(searchTerm) ||
        (s.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

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

            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Proveedores</h1>
                    <p className="text-gray-500 mt-1">Gestión de proveedores y contactos · {suppliers.length} registros</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar proveedor..."
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {user?.role === 'ADMIN' && (
                        <button onClick={openNewSupplier}
                            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-semibold transition shadow-lg active:scale-95 bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 whitespace-nowrap">
                            <Plus className="w-5 h-5" /> Nuevo Proveedor
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />)}</div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="text-center py-20">
                        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-1">No hay proveedores registrados</h3>
                        <p className="text-gray-500 mb-6">Agrega tus proveedores de materiales, servicios y maquinarias.</p>
                        {user?.role === 'ADMIN' && (
                            <button onClick={openNewSupplier} className="px-6 py-3 text-white rounded-xl font-semibold transition bg-blue-600 hover:bg-blue-700">
                                Registrar Proveedor
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">Proveedor</th>
                                    <th className="text-left px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">Documento</th>
                                    <th className="text-left px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">Contacto</th>
                                    <th className="text-left px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">Categoría</th>
                                    <th className="text-center px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">Estado</th>
                                    {user?.role === 'ADMIN' && (
                                        <th className="text-center px-6 py-4 text-[11px] uppercase font-black text-gray-400 tracking-wider">Acciones</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredSuppliers.map((s, idx) => (
                                    <motion.tr key={s.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                                        className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                                                    {s.address && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{s.address}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded mr-2">{s.documentType}</span>
                                            <span className="font-mono text-sm text-gray-900">{s.documentNumber}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{s.contactName || '-'}</div>
                                            {(s.phone || s.email) && (
                                                <div className="text-xs text-gray-400 flex flex-col mt-0.5 space-y-0.5">
                                                    {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                                                    {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[11px] font-bold">
                                                {s.category || 'Varios'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                {s.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        {user?.role === 'ADMIN' && (
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => openEditSupplier(s)} className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                                    <button onClick={() => openDelete(s.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        )}
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowFormModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                                    <p className="text-sm font-medium text-blue-600">
                                        {editingId ? 'Modifica los datos del proveedor' : 'Ingresa la información del nuevo proveedor'}
                                    </p>
                                </div>
                                <button onClick={() => setShowFormModal(false)} className="p-2 hover:bg-white rounded-full transition shadow-sm"><X className="w-6 h-6 text-gray-400" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Doc.</label>
                                        <select required className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            value={formData.documentType} onChange={e => setFormData({ ...formData, documentType: e.target.value })}>
                                            <option value="RUC">RUC</option>
                                            <option value="DNI">DNI</option>
                                            <option value="CE">C.E.</option>
                                            <option value="OTROS">Otros</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Nro. Documento</label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input required type="text" className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
                                                placeholder="Ej: 20123456789" value={formData.documentNumber} onChange={e => setFormData({ ...formData, documentNumber: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Razón Social / Nombre Completo</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input required type="text" className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            placeholder="Nombre de la empresa o persona" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Contacto / Representante</label>
                                        <div className="relative">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input type="text" className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                                placeholder="Persona de contacto" value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Categoría Principal</label>
                                        <select required className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                            <option value="Materiales">Materiales y Telas</option>
                                            <option value="Avios">Avíos y Mercería</option>
                                            <option value="Servicios">Servicios y Taller</option>
                                            <option value="Maquinaria">Maquinaria y Repuestos</option>
                                            <option value="Productos Químicos">Productos Químicos</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Correo Electrónico</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input type="email" className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                                placeholder="correo@empresa.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono / Celular</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input type="text" className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                                placeholder="+51 987 654 321" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Dirección</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                        <textarea className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[80px]"
                                            placeholder="Dirección física del proveedor u oficina" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                    </div>
                                </div>

                                {editingId && (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                        <span className="text-sm font-bold text-gray-700">Proveedor Activo</span>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                                    <button type="button" onClick={() => setShowFormModal(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                                    <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/30">
                                        {editingId ? 'Guardar Cambios' : 'Registrar Proveedor'}
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8 text-red-600" /></div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar Proveedor?</h3>
                            <p className="text-gray-500 mb-6 text-sm">Esta acción eliminará al proveedor del sistema definitivamente.</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setShowDeleteModal(false)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                                <button onClick={handleDelete} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-600/30">Sí, eliminar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
