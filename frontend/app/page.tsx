// frontend/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/common/Layout';
import { useProducts } from '../hooks/useProducts';
import {
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingBag,
  ArrowUpCircle,
  ArrowDownCircle,
  PlusCircle,
  ScanLine,
  TrendingUp as TrendUp,
  XCircle,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { products, isLoading } = useProducts();
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  // base card class reused for a more consistent look
  const cardClass = "bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all duration-300";


  useEffect(() => {
    // redirect only if we truly have no user and loading complete
    if (!user && !isLoading) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Calcular estadísticas
  const totalProducts = products?.length || 0;
  const totalVariants = products?.reduce((acc, p) => acc + p.variants.length, 0) || 0;
  const totalStock = products?.reduce((acc, p) =>
    acc + p.variants.reduce((sum, v) => sum + v.stock, 0), 0
  ) || 0;

  const lowStockItems = products?.filter(p =>
    p.variants.some(v => v.stock <= p.minStock)
  ).length || 0;

  const outOfStockItems = products?.filter(p =>
    p.variants.some(v => v.stock === 0)
  ).length || 0;

  const totalValue = products?.reduce((acc, p) =>
    acc + p.variants.reduce((sum, v) => sum + (v.stock * p.purchasePrice), 0), 0
  ) || 0;

  const potentialRevenue = products?.reduce((acc, p) =>
    acc + p.variants.reduce((sum, v) => sum + (v.stock * p.sellingPrice), 0), 0
  ) || 0;

  const recentProducts = products?.slice(0, 5) || [];

  // Datos para gráficos
  const stockDistribution = [
    {
      name: 'Stock Óptimo', value: products?.filter(p =>
        p.variants.every(v => v.stock > p.minStock * 2)
      ).length || 0, color: '#10B981'
    },
    {
      name: 'Stock Normal', value: products?.filter(p =>
        p.variants.some(v => v.stock <= p.minStock * 2 && v.stock > p.minStock)
      ).length || 0, color: '#F59E0B'
    },
    { name: 'Stock Bajo', value: lowStockItems, color: '#EF4444' },
    { name: 'Sin Stock', value: outOfStockItems, color: '#6B7280' },
  ].filter(item => item.value > 0);

  const activityData = [
    { name: 'Lun', entradas: 4, salidas: 3 },
    { name: 'Mar', entradas: 3, salidas: 5 },
    { name: 'Mie', entradas: 6, salidas: 4 },
    { name: 'Jue', entradas: 5, salidas: 7 },
    { name: 'Vie', entradas: 8, salidas: 6 },
    { name: 'Sab', entradas: 4, salidas: 3 },
    { name: 'Dom', entradas: 2, salidas: 1 },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <Layout>
      {/* Header con bienvenida personalizada */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ¡Bienvenido, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{user?.name}</span>! 👋
            </h1>
            <p className="text-gray-600 mt-1">
              Aquí tienes el resumen de tu inventario en tiempo real
            </p>
          </div>

          {/* Selector de período */}
          <div className="mt-4 md:mt-0 flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
            {['day', 'week', 'month', 'year'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${selectedPeriod === period
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {period === 'day' ? 'Hoy' :
                  period === 'week' ? 'Semana' :
                    period === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid Principal */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {/* Tarjeta 1 - Productos */}
        <motion.div variants={itemVariants} className="group">
          <div className={cardClass + " hover:-translate-y-1"}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-medium rounded-full">
                +12% vs mes anterior
              </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{totalProducts}</h3>
            <p className="text-gray-600 text-sm font-medium">Productos activos</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Variantes:</span>
                <span className="font-semibold text-gray-900">{totalVariants}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(totalVariants / (totalProducts * 3)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tarjeta 2 - Stock Total */}
        <motion.div variants={itemVariants} className="group">
          <div className={cardClass + " hover:-translate-y-1"}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{totalStock.toLocaleString()}</h3>
            <p className="text-gray-600 text-sm font-medium">Unidades en stock</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <TrendUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">Rotación: <span className="font-semibold text-gray-900">24%</span></span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tarjeta 3 - Alertas */}
        <motion.div variants={itemVariants} className="group">
          <div className={cardClass + " hover:-translate-y-1"}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg shadow-yellow-500/30 group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{lowStockItems}</h3>
            <p className="text-gray-600 text-sm font-medium">Productos con stock bajo</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-gray-600">Sin stock: <span className="font-semibold text-gray-900">{outOfStockItems}</span></span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tarjeta 4 - Valor */}
        <motion.div variants={itemVariants} className="group">
          <div className={cardClass + " hover:-translate-y-1"}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">${totalValue.toLocaleString()}</h3>
            <p className="text-gray-600 text-sm font-medium">Valor del inventario</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Venta potencial:</span>
                <span className="font-semibold text-green-600">${potentialRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Gráficos y Análisis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
      >
        {/* Gráfico de Actividad */}
        <div className={cardClass + " lg:col-span-2"}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Movimientos de inventario</h2>
              <p className="text-sm text-gray-500">Entradas y salidas por día</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Entradas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Salidas</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSalidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area type="monotone" dataKey="entradas" stroke="#3B82F6" fillOpacity={1} fill="url(#colorEntradas)" />
                <Area type="monotone" dataKey="salidas" stroke="#F97316" fillOpacity={1} fill="url(#colorSalidas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución de Stock */}
        <div className={cardClass}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución de stock</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {stockDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {stockDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Alertas de Stock Bajo */}
      {lowStockItems > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800">
                  {lowStockItems} producto{lowStockItems !== 1 ? 's' : ''} con stock bajo
                </h3>
                <p className="text-yellow-600">
                  {outOfStockItems} de ello{outOfStockItems !== 1 ? 's' : ''} están sin stock.
                  Revisa y realiza los pedidos necesarios.
                </p>
              </div>
              <Link
                href="/products?filter=low-stock"
                className="px-6 py-3 bg-yellow-600 text-white rounded-xl font-medium hover:bg-yellow-700 transition shadow-lg shadow-yellow-600/30 whitespace-nowrap"
              >
                Ver productos críticos
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Acciones Rápidas — Fila horizontal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-8"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Acciones rápidas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/inventory?action=entry" className="group">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-green-100/50 hover:-translate-y-1 transition-all duration-300 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <ArrowUpCircle className="w-7 h-7 text-white" />
              </div>
              <p className="font-bold text-gray-900 text-sm">Registrar Entrada</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Nuevo stock a productos</p>
            </div>
          </Link>

          <Link href="/inventory?action=exit" className="group">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-rose-100/50 hover:-translate-y-1 transition-all duration-300 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-rose-400 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform duration-300">
                <ArrowDownCircle className="w-7 h-7 text-white" />
              </div>
              <p className="font-bold text-gray-900 text-sm">Registrar Salida</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Ventas o mermas</p>
            </div>
          </Link>

          <Link href="/products/new" className="group">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 transition-all duration-300 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                <PlusCircle className="w-7 h-7 text-white" />
              </div>
              <p className="font-bold text-gray-900 text-sm">Nuevo Producto</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Agregar al catálogo</p>
            </div>
          </Link>

          <Link href="/inventory/scan" className="group">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-purple-100/50 hover:-translate-y-1 transition-all duration-300 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                <ScanLine className="w-7 h-7 text-white" />
              </div>
              <p className="font-bold text-gray-900 text-sm">Escanear Código</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Registro rápido con lector</p>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Últimos productos — Ancho completo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Últimos productos</h2>
              <p className="text-sm text-gray-500">Productos agregados recientemente</p>
            </div>
            <Link
              href="/products"
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
            >
              Ver todos →
            </Link>
          </div>

          {recentProducts.length > 0 ? (
            <div className="space-y-3">
              {recentProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="group flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-all border border-transparent hover:border-blue-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                      {product.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                          SKU: {product.sku}
                        </span>
                        <span className="text-xs text-gray-500">
                          {product.variants.length} variantes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${product.sellingPrice}</p>
                      <p className="text-xs text-gray-500">
                        Stock: {product.variants.reduce((sum, v) => sum + v.stock, 0)} uni.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-blue-600 transition">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-yellow-600 transition">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <div className="relative inline-block">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <PlusCircle className="w-3 h-3 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay productos aún</h3>
              <p className="text-gray-500 mb-6">Comienza agregando tu primer producto al inventario</p>
              <Link
                href="/products/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition shadow-lg shadow-blue-600/30"
              >
                <PlusCircle className="w-5 h-5" />
                Crear primer producto
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </Layout>
  );
}