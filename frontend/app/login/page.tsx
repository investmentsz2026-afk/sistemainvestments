// frontend/app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Package, AlertCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, selectRole, isLoading, isSelectingRole, isAuthenticated } = useAuth();
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [tempUser, setTempUser] = useState<any>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await login({ email, password });
      if (data.roles && data.roles.length > 0) {
        setAvailableRoles(data.roles);
        setTempUser(data.user);
        setShowRoleSelection(true);
        toast.success('Paso 1: Credenciales verificadas');
      }
    } catch (error: any) {
      setShowErrorModal(true);
      console.error('Login failed', error);
    }
  };

  const handleCloseError = () => {
    setShowErrorModal(false);
    setEmail('');
    setPassword('');
  };

  const handleRoleSelect = (roleName: string) => {
    if (tempUser) {
      selectRole({ userId: tempUser.id, roleName });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>

      {/* Main Container - Perfectly Centered */}
      <div className="relative w-full max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          <div className="flex flex-col lg:flex-row">

            {/* Left Side - Branding (visible en desktop) */}
            <div className="hidden lg:flex lg:w-6/12 bg-gradient-to-br from-indigo-600 to-sky-600 p-12 relative overflow-hidden flex-col justify-between">
              {/* Pattern Overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                  backgroundSize: '30px 30px'
                }}></div>
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col justify-between text-white">
                <div>
                  <div className="flex items-center gap-3 mb-12">
                    <div className="bg-white/20 p-3 rounded-2xl">
                      <Package className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-white">StockMaster</span>
                  </div>

                  <h2 className="text-3xl font-bold text-white mb-3">
                    Gestiona tu inventario
                    <span className="block text-sky-200 font-medium">de manera inteligente</span>
                  </h2>

                  <p className="text-white/90 text-base mb-6">
                    Control total de tu tienda con sistema de códigos de barras y kardex automático.
                  </p>

                  <div className="space-y-4">
                    {[
                      '📦 Gestión por talla y color',
                      '📊 Kardex automático',
                      '🏷️ Códigos de barras',
                      '📱 Escaneo USB'
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 text-white/90">
                        <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full"></div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>


              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-6/12 p-8 lg:p-12 flex items-center">
              <div className="max-w-md mx-auto w-full">
                {/* Logo móvil */}
                <div className="lg:hidden flex justify-center mb-8">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-2xl">
                    <Package className="w-8 h-8 text-white" />
                  </div>
                </div>

                {showRoleSelection ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecciona un rol</h2>
                      <p className="text-gray-600">¿Como qué perfil deseas ingresar hoy?</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {availableRoles.map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRoleSelect(role)}
                          disabled={isSelectingRole}
                          className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              <span className="font-bold text-sm">{role.charAt(0)}</span>
                            </div>
                            <span className="font-semibold text-gray-800">{role}</span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowRoleSelection(false)}
                      className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                    >
                      Volver al login
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-6 bg-white p-6 rounded-xl shadow-sm"
                  >
                    {/* Email Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition bg-gray-50"
                          placeholder="ejemplo@correo.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition bg-gray-50"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember & Forgot */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Recordarme</span>
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Checkeando...</span>
                        </>
                      ) : (
                        <>
                          <span>Iniciar Sesión</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>


                    {/* Trust Badges */}
                    <div className="flex items-center justify-center gap-6 pt-4">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>SSL Secure</span>
                      </div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>100% Seguro</span>
                      </div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>24/7 Soporte</span>
                      </div>
                    </div>
                  </motion.form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE ERROR DE LOGIN MODERNO */}
      <AnimatePresence>
        {showErrorModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={handleCloseError} 
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-8 text-center border border-red-50"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-3 uppercase tracking-tight">Acceso Denegado</h3>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed text-sm">
                El <span className="text-red-600 font-bold">Email</span> o la <span className="text-red-600 font-bold">Contraseña</span> son incorrectos. Por favor, verifica tus credenciales e intenta de nuevo.
              </p>

              <button 
                onClick={handleCloseError}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition transform active:scale-95 shadow-lg shadow-red-200"
              >
                Aceptar y Reintentar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}