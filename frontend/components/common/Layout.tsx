// frontend/components/common/Layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import {
  Package,
  ShoppingCart,
  BarChart3,
  LogOut,
  Menu,
  X,
  Home,
  Bell,
  Settings,
  User,
  ChevronDown,
  BookOpen,
  CreditCard,
  Truck,
  Loader2,
  Building2,
  ShieldCheck,
  FileSearch,
  Users,
  Beaker
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTopUserMenu, setShowTopUserMenu] = useState(false);
  const [showSidebarUserMenu, setShowSidebarUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'LOGISTICA' || user?.role === 'UDP' || user?.role === 'COMERCIAL') {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const resp = await api.get('/notifications/unread-count');
      setUnreadNotifications(resp.data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogoutClick = () => {
    setShowTopUserMenu(false);
    setShowSidebarUserMenu(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    // Pequeño delay para mostrar la animación
    setTimeout(() => {
      logout();
    }, 1500);
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    ...(user?.role === 'ADMIN' || user?.role === 'LOGISTICA' ? [
      { name: 'Productos', href: '/products', icon: Package },
      { name: 'Inventario', href: '/inventory', icon: ShoppingCart },
      { name: 'Kardex', href: '/kardex', icon: BookOpen },
      { name: 'Reportes', href: '/reports', icon: BarChart3 },
    ] : []),
    ...(user?.role === 'ADMIN' || user?.role === 'LOGISTICA' ? [
      { name: 'Compras', href: '/purchases', icon: CreditCard },
      { name: 'Despacho', href: '/dispatch', icon: Truck }
    ] : []),
    ...(user?.role === 'ADMIN' || user?.role === 'UDP' || user?.role === 'COMERCIAL' ? [
      { name: 'Muestras', href: '/samples', icon: Beaker }
    ] : []),
    ...(user?.role === 'ADMIN' || user?.role === 'UDP' ? [
      { name: 'Calidad', href: '/quality', icon: ShieldCheck },
      { name: 'Auditoría', href: '/audit', icon: FileSearch }
    ] : []),
    ...(user?.role === 'ADMIN' || user?.role === 'COMERCIAL' ? [
      { name: 'Ventas', href: '/sales', icon: ShoppingCart },
      { name: 'Clientes', href: '/sales/clients', icon: Users }
    ] : []),
    ...(user?.role === 'ADMIN' ? [
      { name: 'Proveedores', href: '/suppliers', icon: Building2 },
      { name: 'Usuarios', href: '/users', icon: User }
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden px-4 text-gray-500 focus:outline-none"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Logo */}
              <div className="flex items-center lg:hidden">
                <Package className="w-8 h-8 text-blue-600" />
                <span className="ml-2 text-lg font-bold text-gray-900">StockMaster</span>
              </div>
            </div>

            {/* Right side icons */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <Link 
                href={(user?.role === 'ADMIN' || user?.role === 'LOGISTICA' || user?.role === 'UDP' || user?.role === 'COMERCIAL') ? '/notifications' : '#'}
                className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 relative"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Link>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowTopUserMenu(!showTopUserMenu);
                    setShowSidebarUserMenu(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700">
                    {user?.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {/* Dropdown menu */}
                {showTopUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowTopUserMenu(false)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      Ver perfil
                    </Link>
                    <button
                      onClick={handleLogoutClick}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2 border-t border-gray-100"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-0 z-50 ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <span className="text-lg font-bold text-gray-900">StockMaster</span>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          <nav className="p-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg mb-1 ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section (Mobile Sidebar Bottom) */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
            <button
              onClick={() => {
                setShowSidebarUserMenu(!showSidebarUserMenu);
                setShowTopUserMenu(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 group"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{user?.role || 'User'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showSidebarUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded Profile Menu for Mobile */}
            {showSidebarUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
              >
                <Link
                  href="/profile"
                  onClick={() => {
                    setShowSidebarUserMenu(false);
                    setSidebarOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-semibold">Ver perfil</span>
                </Link>
                <button
                  onClick={handleLogoutClick}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 border-t border-gray-100 transition-colors"
                >
                  <div className="p-1.5 bg-red-100/50 rounded-lg">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span className="font-bold">Cerrar sesión</span>
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white border-r">
          <div className="flex items-center h-16 px-4 border-b">
            <Package className="w-8 h-8 text-blue-600" />
            <span className="ml-2 text-lg font-bold text-gray-900">StockMaster</span>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/10'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section (Sidebar Bottom) */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={() => {
                setShowSidebarUserMenu(!showSidebarUserMenu);
                setShowTopUserMenu(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 group"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{user?.role || 'User'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showSidebarUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded Profile Menu */}
            {showSidebarUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
              >
                <Link
                  href="/profile"
                  onClick={() => setShowSidebarUserMenu(false)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-semibold">Ver perfil</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setShowSidebarUserMenu(false)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <div className="p-1.5 bg-gray-50 rounded-lg">
                    <Settings className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="font-semibold">Ajustes</span>
                </Link>
                <button
                  onClick={handleLogoutClick}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 border-t border-gray-100 transition-colors"
                >
                  <div className="p-1.5 bg-red-100/50 rounded-lg">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span className="font-bold">Cerrar sesión</span>
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 pt-16">
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setShowLogoutConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <LogOut className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Cerrar Sesión?</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Estás a punto de salir del sistema. Tendrás que volver a ingresar tus credenciales para acceder nuevamente.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmLogout}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-500/30 transition-all active:scale-95"
                >
                  Sí, cerrar sesión
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl font-bold transition-all"
                >
                  No, mantener sesión
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logging Out Animation Overlay */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[110] bg-white flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [1, 0.8, 1]
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex flex-col items-center"
            >
              <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] shadow-2xl shadow-indigo-600/40 flex items-center justify-center mb-8">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Cerrando sesión</h2>
              <p className="text-gray-400 font-medium">Finalizando tu sesión de forma segura...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};