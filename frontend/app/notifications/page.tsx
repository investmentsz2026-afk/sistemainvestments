'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import { 
    Bell, 
    Check, 
    Clock, 
    AlertCircle, 
    CheckCircle2, 
    XCircle,
    ChevronRight,
    ArrowLeft,
    Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const allowedRoles = ['ADMIN', 'LOGISTICA', 'UDP', 'COMERCIAL'];
        if (user && !allowedRoles.includes(user.role)) {
            router.push('/dashboard');
            return;
        }
        fetchNotifications();
    }, [user, router]);

    const fetchNotifications = async () => {
        try {
            const resp = await api.get('/notifications');
            setNotifications(resp.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('No se pudieron cargar las notificaciones');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleAction = (notification: any) => {
        handleMarkAsRead(notification.id);
        if (notification.referenceId) {
            if (notification.type.startsWith('AUDIT_')) {
                router.push(`/audit/${notification.referenceId}`);
            } else if (notification.type.startsWith('SAMPLE_')) {
                router.push(`/samples/${notification.referenceId}`);
            }
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto pb-20">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.back()}
                            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 shadow-sm transition active:scale-90"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Centro de Notificaciones</h1>
                            <p className="text-gray-500 font-medium">Gestiona las alertas y aprobaciones pendientes</p>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="bg-white p-20 rounded-[3rem] border border-gray-100 text-center shadow-xl shadow-gray-200/20">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Bell className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Todo al día</h3>
                        <p className="text-gray-400 font-medium max-w-xs mx-auto">
                            No tienes notificaciones pendientes por el momento.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence>
                            {notifications.map((notification) => (
                                <motion.div
                                    key={notification.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`group relative bg-white p-6 rounded-3xl border transition-all hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer ${
                                        notification.isRead ? 'border-gray-100' : 'border-indigo-100 bg-indigo-50/10'
                                    }`}
                                    onClick={() => handleAction(notification)}
                                >
                                    {!notification.isRead && (
                                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-sm" />
                                    )}
                                    <div className="flex items-start gap-5">
                                        <div className={`p-4 rounded-2xl ${
                                            notification.type.includes('REJECTED') || notification.type.includes('OBSERVED') ? 'bg-rose-100 text-rose-600' : 
                                            notification.type.includes('APPROVED') || notification.type.includes('FINALIZED') || notification.type.includes('DELIVERED') ? 'bg-emerald-100 text-emerald-600' : 
                                            'bg-indigo-100 text-indigo-600'
                                        }`}>
                                            {notification.type.includes('REJECTED') ? <XCircle className="w-6 h-6" /> : 
                                             notification.type.includes('APPROVED') ? <CheckCircle2 className="w-6 h-6" /> : 
                                             notification.type.includes('REQUEST') ? <Bell className="w-6 h-6" /> :
                                             <Bell className="w-6 h-6" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-black text-gray-900 uppercase tracking-tight truncate">
                                                    {notification.title}
                                                </h4>
                                                <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                                                    {new Date(notification.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-500 line-clamp-2 leading-relaxed">
                                                {notification.message}
                                            </p>
                                        </div>
                                        <div className="flex items-center self-center transition-transform group-hover:translate-x-1">
                                            <ChevronRight className="w-5 h-5 text-gray-300" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </Layout>
    );
}
