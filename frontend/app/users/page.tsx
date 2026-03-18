// frontend/app/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import {
    User as UserIcon,
    Plus,
    Search,
    UserPlus,
    Shield,
    Mail,
    Calendar,
    MoreVertical,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle,
    AlertCircle,
    AlertTriangle,
    Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [alertModal, setAlertModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info' | 'success';
        onConfirm?: () => void;
    }>({ show: false, title: '', message: '', type: 'info' });

    const showAlert = (title: string, message: string, type: 'danger' | 'warning' | 'info' | 'success' = 'info', onConfirm?: () => void) => {
        setAlertModal({ show: true, title, message, type, onConfirm });
    };

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        roles: [] as string[]
    });

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchUsers = async () => {
        try {
            const resp = await api.get('/auth/users');
            setUsers(resp.data.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const resp = await api.get('/auth/roles');
            setRoles(resp.data.data);
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    const handleToggleStatus = async (userToToggle: any) => {
        if (userToToggle.id === user?.id) {
            showAlert('Acción No Permitida', 'No puedes desactivar tu propia cuenta mientras estás en sesión.', 'warning');
            return;
        }

        const action = userToToggle.isActive ? 'desactivar' : 'activar';
        showAlert(
            `¿${action.charAt(0).toUpperCase() + action.slice(1)} Usuario?`,
            `Está por ${action} el acceso de ${userToToggle.name}. ¿Desea continuar?`,
            'warning',
            async () => {
                try {
                    await api.post(`/auth/users/${userToToggle.id}/toggle-status`);
                    fetchUsers();
                } catch (error) {
                    showAlert('Error', 'No se pudo actualizar el estado del usuario.', 'danger');
                }
            }
        );
    };

    const handleDelete = async (userId: string, userName: string) => {
        if (userId === user?.id) {
            showAlert('Acción No Permitida', 'No puedes eliminar tu propia cuenta mientras estás en sesión.', 'warning');
            return;
        }

        showAlert(
            'Eliminar Usuario',
            `¿Está seguro de eliminar a ${userName} permanentemente? Esta acción no se puede deshacer.`,
            'danger',
            async () => {
                try {
                    await api.post(`/auth/users/${userId}/delete`);
                    fetchUsers();
                } catch (error: any) {
                    showAlert('Error', error.response?.data?.message || 'Error al eliminar usuario', 'danger');
                }
            }
        );
    };

    const handleEdit = (u: any) => {
        setIsEditing(true);
        setEditingUserId(u.id);
        setFormData({
            name: u.name,
            email: u.email,
            password: '', // Mantener vacío para no cambiar si no se desea
            roles: u.roles.map((r: any) => r.name)
        });
        setShowAddModal(true);
    };

    const handleOpenCreateModal = () => {
        setIsEditing(false);
        setEditingUserId(null);
        setFormData({ name: '', email: '', password: '', roles: [] });
        setShowAddModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editingUserId) {
                // Si es edición y no hay password, no enviarlo o enviarlo vacío (el backend debe manejarlo)
                const data = { ...formData };
                if (!data.password) delete (data as any).password;

                await api.post(`/auth/users/${editingUserId}`, data);
                showAlert('¡Éxito!', 'Los cambios del usuario se han guardado correctamente.', 'success');
            } else {
                await api.post('/auth/users', formData);
                showAlert('¡Éxito!', 'El nuevo usuario ha sido creado correctamente.', 'success');
            }
            setShowAddModal(false);
            setFormData({ name: '', email: '', password: '', roles: [] });
            fetchUsers();
        } catch (error: any) {
            showAlert('Atención', error.response?.data?.message || 'Ocurrió un error al procesar la solicitud.', 'danger');
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const cardClass = "bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300";

    return (
        <Layout>
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
                    <p className="text-gray-500 mt-1">Administra los accesos y roles de tu equipo</p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                    <UserPlus className="w-5 h-5" />
                    <span>Nuevo Usuario</span>
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-8 flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid de Usuarios */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-white animate-pulse rounded-2xl border border-gray-100"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredUsers.map((u) => (
                            <motion.div
                                key={u.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={cardClass}
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-inner ${u.isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'
                                            }`}>
                                            {u.name.charAt(0)}
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEdit(u)}
                                                className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-indigo-600 transition"
                                                title="Editar usuario"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(u)}
                                                disabled={u.id === user?.id}
                                                className={`p-2 rounded-lg transition ${u.id === user?.id
                                                    ? 'text-gray-200 cursor-not-allowed'
                                                    : u.isActive
                                                        ? 'text-amber-400 hover:text-amber-600 hover:bg-gray-50'
                                                        : 'text-green-400 hover:text-green-600 hover:bg-gray-50'
                                                    }`}
                                                title={u.id === user?.id ? "No puedes desactivar tu propia cuenta" : (u.isActive ? "Desactivar usuario" : "Activar usuario")}
                                            >
                                                {u.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u.id, u.name)}
                                                disabled={u.id === user?.id}
                                                className={`p-2 rounded-lg transition ${u.id === user?.id
                                                    ? 'text-gray-200 cursor-not-allowed'
                                                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                title={u.id === user?.id ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario"}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 truncate">{u.name}</h3>
                                    <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span className="truncate">{u.email}</span>
                                    </div>

                                    <div className="mt-6 space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            {u.roles.map((r: any) => (
                                                <span key={r.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                                                    <Shield className="w-3 h-3" />
                                                    {r.name}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                <Calendar className="w-3 h-3" />
                                                <span>Desde: {new Date(u.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${u.isActive ? 'text-green-500' : 'text-red-400'
                                                }`}>
                                                {u.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal Agregar Usuario */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        onClick={() => setShowAddModal(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] flex flex-col"
                    >
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                                </h2>
                                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre Completo</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Corporativo</label>
                                    <input
                                        required
                                        type="email"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="juan@empresa.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        {isEditing ? 'Cambiar Contraseña (opcional)' : 'Contraseña Inicial'}
                                    </label>
                                    <input
                                        required={!isEditing}
                                        type="password"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder={isEditing ? '•••••••• (dejar vacío para no cambiar)' : '••••••••'}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Roles Asignados</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {roles.filter(r => r.name !== 'ODP').map(r => (
                                            <label key={r.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${formData.roles.includes(r.name)
                                                ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                                                : 'border-gray-100 bg-gray-50'
                                                }`}>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={formData.roles.includes(r.name)}
                                                    onChange={() => {
                                                        const newRoles = formData.roles.includes(r.name)
                                                            ? formData.roles.filter(name => name !== r.name)
                                                            : [...formData.roles, r.name];
                                                        setFormData({ ...formData, roles: newRoles });
                                                    }}
                                                />
                                                <Shield className={`w-4 h-4 flex-shrink-0 ${formData.roles.includes(r.name) ? 'text-indigo-600' : 'text-gray-400'}`} />
                                                <span className={`text-sm font-medium ${formData.roles.includes(r.name) ? 'text-indigo-900' : 'text-gray-600'}`}>
                                                    {r.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 sticky bottom-0 bg-white z-10">
                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition active:scale-95"
                                    >
                                        {isEditing ? 'Actualizar Usuario' : 'Guardar Usuario'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal Alerta Personalizado */}
            <AnimatePresence>
                {alertModal.show && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
                            onClick={() => !alertModal.onConfirm && setAlertModal(prev => ({ ...prev, show: false }))}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 text-center">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 
                                    ${alertModal.type === 'danger' ? 'bg-red-50 text-red-500' :
                                        alertModal.type === 'warning' ? 'bg-amber-50 text-amber-500' :
                                            alertModal.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                                                'bg-indigo-50 text-indigo-500'}`}>
                                    {alertModal.type === 'danger' && <Trash2 className="w-8 h-8" />}
                                    {alertModal.type === 'warning' && <AlertTriangle className="w-8 h-8" />}
                                    {alertModal.type === 'success' && <CheckCircle className="w-8 h-8" />}
                                    {alertModal.type === 'info' && <Info className="w-8 h-8" />}
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-2">{alertModal.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8">{alertModal.message}</p>

                                <div className="flex flex-col gap-2">
                                    {alertModal.onConfirm ? (
                                        <>
                                            <button
                                                onClick={() => {
                                                    alertModal.onConfirm?.();
                                                    setAlertModal(prev => ({ ...prev, show: false }));
                                                }}
                                                className={`w-full py-3.5 rounded-2xl font-bold text-white shadow-lg transition active:scale-95
                                                    ${alertModal.type === 'danger' ? 'bg-red-500 shadow-red-500/30 hover:bg-red-600' :
                                                        'bg-indigo-600 shadow-indigo-600/30 hover:bg-indigo-700'}`}
                                            >
                                                Confirmar Acción
                                            </button>
                                            <button
                                                onClick={() => setAlertModal(prev => ({ ...prev, show: false }))}
                                                className="w-full py-3.5 rounded-2xl font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
                                            >
                                                Cancelar
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setAlertModal(prev => ({ ...prev, show: false }))}
                                            className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold hover:bg-gray-800 transition active:scale-95 shadow-lg shadow-gray-900/20"
                                        >
                                            Entendido
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
