'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import { useMutation, useQueryClient } from 'react-query';
import api from '../../lib/axios';
import {
    User,
    Mail,
    Lock,
    Shield,
    Save,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
    const { user, isLoading: authLoading } = useAuth();
    const queryClient = useQueryClient();

    // General info state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI states
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Initialize data when user loads
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    const updateProfileMutation = useMutation(
        async (data: { name: string, email: string }) => {
            const resp = await api.post('/auth/update-profile', data);
            return resp.data;
        },
        {
            onSuccess: (data) => {
                if (data.success) {
                    queryClient.invalidateQueries('user');
                    setStatus({ type: 'success', message: 'Perfil actualizado exitosamente' });
                    setTimeout(() => setStatus(null), 5000);
                } else {
                    setStatus({ type: 'error', message: data.message });
                }
            },
            onError: (error: any) => {
                setStatus({ type: 'error', message: error.response?.data?.message || 'Error al actualizar perfil' });
            }
        }
    );

    const changePasswordMutation = useMutation(
        async (data: any) => {
            const resp = await api.post('/auth/change-password', data);
            return resp.data;
        },
        {
            onSuccess: (data) => {
                if (data.success) {
                    setStatus({ type: 'success', message: 'Contraseña actualizada exitosamente' });
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setTimeout(() => setStatus(null), 5000);
                } else {
                    setStatus({ type: 'error', message: data.message });
                }
            },
            onError: (error: any) => {
                setStatus({ type: 'error', message: error.response?.data?.message || 'Error al cambiar contraseña' });
            }
        }
    );

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfileMutation.mutate({ name, email });
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setStatus({ type: 'error', message: 'Las contraseñas nuevas no coinciden' });
            return;
        }
        if (newPassword.length < 6) {
            setStatus({ type: 'error', message: 'La nueva contraseña debe tener al menos 6 caracteres' });
            return;
        }
        changePasswordMutation.mutate({ currentPassword, newPassword });
    };

    if (authLoading && !user) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto py-6 px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mi Perfil</h1>
                    <p className="text-gray-500 mt-1">Gestiona tus datos personales y la seguridad de tu cuenta</p>
                </div>

                <AnimatePresence>
                    {status && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className={`mb-8 p-4 rounded-2xl flex items-center gap-3 shadow-sm ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                        >
                            <div className={`p-2 rounded-full ${status.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            </div>
                            <span className="font-semibold">{status.message}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Tarjeta de Usuario Visual */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

                            <div className="relative inline-block mb-6">
                                <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-lg transform group-hover:rotate-6 transition-transform">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-md">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{user?.name}</h2>
                            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-8 tracking-wider uppercase">
                                {user?.role === 'ADMIN' ? 'Administrador' : 'Colaborador'}
                            </span>

                            <div className="space-y-4 pt-8 border-t border-gray-50 text-left">
                                <div className="flex items-center gap-4 group/item">
                                    <div className="p-2 bg-gray-50 rounded-xl group-hover/item:bg-blue-50 transition-colors">
                                        <Mail className="w-4 h-4 text-gray-400 group-hover/item:text-blue-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Email</p>
                                        <p className="text-sm text-gray-700 font-medium truncate">{user?.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group/item">
                                    <div className="p-2 bg-gray-50 rounded-xl group-hover/item:bg-blue-50 transition-colors">
                                        <Shield className="w-4 h-4 text-gray-400 group-hover/item:text-blue-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rol del Sistema</p>
                                        <p className="text-sm text-gray-700 font-medium">{user?.role === 'ADMIN' ? 'Gestión Total' : 'Operativo'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secciones de Edición */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Información General */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
                        >
                            <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-blue-100 rounded-2xl">
                                        <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Datos Personales</h3>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Nombre Completo</label>
                                        <div className="group relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-gray-700"
                                                placeholder="ej. Juan Pérez"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Email Registrado</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                            <input
                                                type="email"
                                                value={email}
                                                className="w-full pl-12 pr-4 py-3.5 bg-gray-100/50 border border-gray-100 rounded-2xl font-medium text-gray-400 cursor-not-allowed"
                                                disabled
                                            />
                                        </div>
                                        <p className="text-[11px] text-gray-400 ml-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            El email es el identificador único y no se puede modificar.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={updateProfileMutation.isLoading}
                                        className="group relative overflow-hidden flex items-center gap-3 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                                    >
                                        {updateProfileMutation.isLoading ? (
                                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                                <span>Actualizar Datos</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>

                        {/* Seguridad */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
                        >
                            <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center gap-4">
                                <div className="p-2.5 bg-orange-100 rounded-2xl">
                                    <Lock className="w-5 h-5 text-orange-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Seguridad y Acceso</h3>
                            </div>

                            <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Contraseña Actual</label>
                                        <div className="group relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 bg-orange-50/30 border-none rounded-2xl focus:ring-4 focus:ring-orange-500/10 transition-all outline-none font-medium"
                                                placeholder="••••••••"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Nueva Contraseña</label>
                                            <div className="group relative">
                                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-orange-50/30 border-none rounded-2xl focus:ring-4 focus:ring-orange-500/10 transition-all outline-none font-medium"
                                                    placeholder="Mín. 6 caracteres"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Confirmar Nueva</label>
                                            <div className="group relative">
                                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-orange-50/30 border-none rounded-2xl focus:ring-4 focus:ring-orange-500/10 transition-all outline-none font-medium"
                                                    placeholder="Repite la contraseña"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={changePasswordMutation.isLoading}
                                        className="flex items-center gap-3 bg-gray-900 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-gray-200"
                                    >
                                        {changePasswordMutation.isLoading ? (
                                            <div className="w-5 h-5 border-3 border-gray-400 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Lock className="w-5 h-5" />
                                                <span>Cambiar Contraseña</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
