'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import {
    Plus,
    Search,
    UserPlus,
    Mail,
    Shield,
    Trash2,
    CheckCircle,
    XCircle,
    ShieldCheck,
    MapPin,
    AlertCircle,
    Edit3,
    Power,
    Calendar,
    UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UsersPage() {
    const { user: authUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [roles, setRoles] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        id: '',
        name: '',
        email: '',
        password: '',
        roles: [] as string[],
        zone: ''
    });

    const [alertModal, setAlertModal] = useState({
        show: false,
        title: '',
        message: '',
        type: 'success' as 'success' | 'danger' | 'warning',
        onConfirm: null as (() => void) | null
    });

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchUsers = async () => {
        try {
            const resp = await api.get('/auth/users');
            const usersData = resp.data.data || resp.data;
            setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (error) {
            console.error(error);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const resp = await api.get('/auth/roles');
            const rolesData = resp.data.data || resp.data;
            setRoles(Array.isArray(rolesData) ? rolesData : []);
        } catch (error) {
            console.error(error);
            setRoles([]);
        }
    };

    const showAlert = (title: string, message: string, type: 'success' | 'danger' | 'warning' = 'success', onConfirm?: () => void) => {
        setAlertModal({ show: true, title, message, type, onConfirm: onConfirm || null });
    };

    const handleEdit = (user: any) => {
        setIsEditing(true);
        setFormData({
            id: user.id,
            name: user.name,
            email: user.email,
            password: '',
            roles: user.roles.map((r: any) => r.name),
            zone: user.zone || ''
        });
        setShowAddModal(true);
    };

    const handleDelete = (id: string) => {
        showAlert(
            '¿Eliminar Usuario?',
            'Esta acción no se puede deshacer. El usuario perderá acceso al sistema.',
            'danger',
            async () => {
                try {
                    await api.post(`/auth/users/${id}/delete`);
                    fetchUsers();
                    showAlert('Eliminado', 'Usuario eliminado correctamente', 'success');
                } catch (error) {
                    showAlert('Error', 'No se pudo eliminar el usuario', 'danger');
                }
            }
        );
    };

    const handleToggleStatus = (user: any) => {
        const action = user.isActive ? 'desactivar' : 'activar';
        const type = user.isActive ? 'warning' : 'success';
        
        showAlert(
            `¿${action.charAt(0).toUpperCase() + action.slice(1)} Usuario?`,
            user.isActive 
                ? 'El usuario no tendrá acceso al sistema ni podrá iniciar sesión con sus credenciales hasta ser reactivado.'
                : 'El usuario recuperará su acceso y podrá iniciar sesión normalmente.',
            type,
            async () => {
                try {
                    await api.post(`/auth/users/${user.id}/toggle-status`);
                    fetchUsers();
                } catch (error) {
                    showAlert('Error', 'No se pudo cambiar el estado', 'danger');
                }
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                const updateData: any = { ...formData };
                if (!updateData.password) delete updateData.password;
                await api.post(`/auth/users/${formData.id}`, updateData);
                showAlert('Actualizado', 'Usuario actualizado correctamente');
            } else {
                await api.post('/auth/users', formData);
                showAlert('Creado', 'Usuario registrado correctamente');
            }
            setShowAddModal(false);
            fetchUsers();
        } catch (error: any) {
            showAlert('Error', error.response?.data?.message || 'Ocurrió un error', 'danger');
        }
    };

    const filteredUsers = (Array.isArray(users) ? users : []).filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-0">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Gestión de Usuarios</h1>
                        <p className="text-gray-500 font-medium text-lg mt-1">Control de acceso y auditoría del sistema.</p>
                    </div>
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setFormData({ id: '', name: '', email: '', password: '', roles: [], zone: '' });
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl hover:bg-indigo-700 transition active:scale-95"
                    >
                        <UserPlus className="w-5 h-5" /> Nuevo Usuario
                    </button>
                </div>

                {/* SEARCH */}
                <div className="relative group max-w-2xl">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-gray-200/20 outline-none focus:ring-4 focus:ring-indigo-50 transition font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* USER CARDS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence>
                        {filteredUsers.map((user) => (
                            <motion.div
                                key={user.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 hover:shadow-2xl hover:shadow-indigo-100 transition-all flex flex-col overflow-hidden"
                            >
                                {/* CARD HEADER (Avatar + Actions) */}
                                <div className="p-8 pb-4 flex justify-between items-start">
                                    <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-3xl font-black text-indigo-600 border border-indigo-100/50">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleEdit(user)}
                                            className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                                            title="Editar"
                                        >
                                            <Edit3 className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleToggleStatus(user)}
                                            className={`p-2.5 rounded-xl transition ${user.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                            title={user.isActive ? 'Desactivar' : 'Activar'}
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(user.id)}
                                            className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* CARD BODY (Info) */}
                                <div className="px-8 pb-8 flex-1 space-y-4">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 leading-none mb-2">{user.name}</h3>
                                        <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                                            <Mail className="w-4 h-4" />
                                            <span>{user.email}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {user.roles.map((r: any) => (
                                            <div key={r.id} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full border border-indigo-100 shadow-sm">
                                                <Shield className="w-3.5 h-3.5" />
                                                <span className="text-xs font-black uppercase tracking-widest">{r.name}</span>
                                            </div>
                                        ))}
                                        {user.zone && (
                                            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100 shadow-sm">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span className="text-xs font-black uppercase tracking-widest">Zona {user.zone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* CARD FOOTER (Date + Status) */}
                                <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-2 text-gray-400 font-black text-[10px] uppercase tracking-widest">
                                        <Calendar className="w-4 h-4" />
                                        <span>Desde: {new Date(user.createdAt).toLocaleDateString('es-PE')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <span className={`font-black text-[11px] uppercase tracking-widest ${user.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {user.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin shadow-2xl shadow-indigo-200" />
                        <p className="text-indigo-600 font-black uppercase tracking-widest text-sm translate-y-2">Cargando Usuarios...</p>
                    </div>
                )}
            </div>

            {/* FORM MODAL */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
                        >
                            <div className="p-10 overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-center mb-10">
                                    <h2 className="text-3xl font-black text-gray-900 uppercase">
                                        {isEditing ? 'Configurar Perfil' : 'Alta de Usuario'}
                                    </h2>
                                    <button onClick={() => setShowAddModal(false)} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition active:scale-90">
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition shadow-sm placeholder:text-gray-300"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ej. Juan Pérez"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Corporativo</label>
                                        <input
                                            required
                                            type="email"
                                            className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition shadow-sm placeholder:text-gray-300"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="usuario@empresa.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                            {isEditing ? 'Cambiar Contraseña (Opcional)' : 'Contraseña Inicial'}
                                        </label>
                                        <input
                                            required={!isEditing}
                                            type="password"
                                            className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition shadow-sm"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    {(formData.roles.includes('VENDEDOR_LIMA') || formData.roles.includes('VENDEDOR_ORIENTE')) && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-2 overflow-hidden"
                                        >
                                            <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1">Zona Asignada (Obligatoria)</label>
                                            <select
                                                className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-black text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition shadow-sm"
                                                value={formData.zone || ''}
                                                onChange={e => setFormData({ ...formData, zone: e.target.value })}
                                                required
                                            >
                                                <option value="">Seleccionar Zona...</option>
                                                <option value="LIMA">LIMA</option>
                                                <option value="ORIENTE">ORIENTE</option>
                                            </select>
                                        </motion.div>
                                    )}

                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1">Roles Asignados</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {roles.filter(r => r.name !== 'ODP').map(r => (
                                                <label key={r.id} className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${formData.roles.includes(r.name)
                                                    ? 'border-indigo-600 bg-indigo-50/30'
                                                    : 'border-transparent bg-gray-50'
                                                    }`}>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={formData.roles.includes(r.name)}
                                                        onChange={() => {
                                                            const newRoles = formData.roles.includes(r.name)
                                                                ? formData.roles.filter(name => name !== r.name)
                                                                : [...formData.roles, r.name];
                                                            
                                                            let newZone = formData.zone;
                                                            if (r.name === 'VENDEDOR_LIMA' && !formData.roles.includes('VENDEDOR_LIMA')) newZone = 'LIMA';
                                                            else if (r.name === 'VENDEDOR_ORIENTE' && !formData.roles.includes('VENDEDOR_ORIENTE')) newZone = 'ORIENTE';
                                                            
                                                            if (!newRoles.includes('VENDEDOR_LIMA') && !newRoles.includes('VENDEDOR_ORIENTE')) {
                                                                newZone = '';
                                                            }
                                                            setFormData({ ...formData, roles: newRoles, zone: newZone });
                                                        }}
                                                    />
                                                    <Shield className={`w-5 h-5 transition-colors ${formData.roles.includes(r.name) ? 'text-indigo-600' : 'text-gray-300'}`} />
                                                    <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${formData.roles.includes(r.name) ? 'text-indigo-900' : 'text-gray-500'}`}>
                                                        {r.name}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <button
                                            type="submit"
                                            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-2xl hover:bg-indigo-700 transition active:scale-95 shadow-indigo-200 uppercase tracking-widest"
                                        >
                                            {isEditing ? 'Guardar Cambios' : 'Registrar Miembro'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ALERT MODAL */}
            <AnimatePresence>
                {alertModal.show && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                            onClick={() => !alertModal.onConfirm && setAlertModal(prev => ({ ...prev, show: false }))}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100"
                        >
                            <div className="p-10 text-center">
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner
                                    ${alertModal.type === 'danger' ? 'bg-red-50 text-red-500' :
                                        alertModal.type === 'warning' ? 'bg-amber-50 text-amber-500' :
                                            alertModal.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                                                'bg-indigo-50 text-indigo-500'}`}>
                                    {alertModal.type === 'danger' && <Trash2 className="w-10 h-10" />}
                                    {alertModal.type === 'warning' && <AlertCircle className="w-10 h-10" />}
                                    {alertModal.type === 'success' && <CheckCircle className="w-10 h-10" />}
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-widest mb-2">{alertModal.title}</h3>
                                <p className="text-gray-500 font-medium leading-relaxed">{alertModal.message}</p>
                            </div>
                            <div className="p-8 bg-gray-50 flex gap-4">
                                {alertModal.onConfirm ? (
                                    <>
                                        <button 
                                            onClick={() => setAlertModal(prev => ({ ...prev, show: false }))}
                                            className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={() => {
                                                alertModal.onConfirm?.();
                                                setAlertModal(prev => ({ ...prev, show: false }));
                                            }}
                                            className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition active:scale-95
                                                ${alertModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                        >
                                            Confirmar
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => setAlertModal(prev => ({ ...prev, show: false }))}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition active:scale-95"
                                    >
                                        Entendido
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
