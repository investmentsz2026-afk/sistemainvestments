// frontend/app/inventory/cost-bank/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Layout } from '../../../components/common/Layout';
import { 
  Barcode, 
  Search, 
  DollarSign, 
  Package, 
  TrendingUp, 
  Info, 
  Layers, 
  Truck, 
  Calendar,
  AlertCircle,
  ArrowRight,
  TrendingDown,
  PieChart as PieChartIcon,
  ChevronRight,
  Printer,
  Download,
  Loader2,
  Building2,
  RefreshCw
} from 'lucide-react';
import api from '../../../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';

interface CostItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  total: number;
  supplier: string;
  date: string;
}

interface CostBreakdown {
  product: any;
  op: string;
  materials: CostItem[];
  services: CostItem[];
  totalMaterialCost: number;
  totalServiceCost: number;
  totalCost: number;
  message?: string;
}

export default function CostBankPage() {
  const [skuInput, setSkuInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    
    // Load history from local storage
    const history = localStorage.getItem('cost_bank_history');
    if (history) setSearchHistory(JSON.parse(history));
  }, []);

  const fetchBreakdown = async (sku: string) => {
    if (!sku.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await api.get(`/products/cost-breakdown/${sku.trim()}`);
      setBreakdown(response.data);
      
      // Update history
      const newHistory = [sku.trim(), ...searchHistory.filter(s => s !== sku.trim())].slice(0, 5);
      setSearchHistory(newHistory);
      localStorage.setItem('cost_bank_history', JSON.stringify(newHistory));
      
      setSkuInput('');
    } catch (error: any) {
      console.error('Error fetching cost breakdown:', error);
      toast.error(error.response?.data?.message || 'No se encontró el producto o variante');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBreakdown(skuInput);
  };

  // Charts data
  const pieData = breakdown ? [
    { name: 'Materiales', value: breakdown.totalMaterialCost, color: '#3B82F6' },
    { name: 'Servicios', value: breakdown.totalServiceCost, color: '#F59E0B' },
  ].filter(d => d.value > 0) : [];

  const categoryData = breakdown ? [
    ...breakdown.materials.reduce((acc: any[], m) => {
      const existing = acc.find(a => a.name === m.category);
      if (existing) existing.value += m.total;
      else acc.push({ name: m.category || 'Otros', value: m.total });
      return acc;
    }, []),
    ...breakdown.services.reduce((acc: any[], s) => {
      const existing = acc.find(a => a.name === s.name);
      if (existing) existing.value += s.total;
      else acc.push({ name: s.name, value: s.total });
      return acc;
    }, [])
  ] : [];

  const margin = breakdown ? ((breakdown.product.sellingPrice - breakdown.totalCost) / breakdown.product.sellingPrice * 100).toFixed(1) : '0';

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
                <DollarSign className="w-6 h-6" />
              </div>
              Banco de Costos
            </h1>
            <p className="text-gray-500 mt-1 font-medium">Análisis detallado de costos de producción y margen de utilidad</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-white rounded-lg border border-gray-200 shadow-sm">
              <Printer className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-green-600 transition-colors bg-white rounded-lg border border-gray-200 shadow-sm">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="relative group">
            <input
              ref={inputRef}
              type="text"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              placeholder="Escanea el código de barras o escribe el SKU..."
              className="w-full pl-14 pr-32 py-5 bg-white border-2 border-gray-100 rounded-3xl shadow-xl shadow-gray-200/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-xl font-medium placeholder:text-gray-400"
            />
            <div className="absolute left-5 top-1/2 -translate-y-1/2">
              {isLoading ? (
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              ) : (
                <Barcode className="w-6 h-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !skuInput.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              Consultar
            </button>
          </form>
          
          {searchHistory.length > 0 && !breakdown && (
            <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Recientes:</span>
              {searchHistory.map((h, i) => (
                <button
                  key={i}
                  onClick={() => fetchBreakdown(h)}
                  className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs font-bold transition-colors"
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {breakdown ? (
            <motion.div
              key={breakdown.product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 pb-12"
            >
              {/* Product Overview Card */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Package className="w-48 h-48" />
                  </div>
                  
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-slate-100 to-slate-200 rounded-[2.5rem] flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                    <Package className="w-16 h-16 md:w-20 md:h-20" />
                  </div>
                  
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">{breakdown.product.category}</span>
                        {breakdown.op && (
                          <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">OP: {breakdown.op}</span>
                        )}
                      </div>
                      <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-none">{breakdown.product.name}</h2>
                      <p className="text-gray-500 font-medium mt-2 text-lg">SKU: <span className="font-bold text-gray-700">{breakdown.product.sku}</span></p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Precio Venta</p>
                        <p className="text-2xl font-black text-gray-900">S/ {breakdown.product.sellingPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Costo Total</p>
                        <p className="text-2xl font-black text-blue-600">S/ {breakdown.totalCost.toFixed(2)}</p>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Margen Est.</p>
                        <div className="flex items-center gap-2">
                          <p className={`text-2xl font-black ${Number(margin) > 30 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {margin}%
                          </p>
                          {Number(margin) > 30 ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-amber-500" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col justify-between">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-blue-500" />
                    Composición de Costo
                  </h3>
                  
                  <div className="h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-2xl font-black text-gray-900">S/ {breakdown.totalCost.toFixed(0)}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    {pieData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">{item.name}</span>
                        </div>
                        <span className="text-sm font-black text-gray-900">S/ {item.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Message if no OP */}
              {breakdown.message && (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex items-center gap-4">
                  <AlertCircle className="w-8 h-8 text-amber-500 shrink-0" />
                  <p className="text-amber-800 font-medium">{breakdown.message}</p>
                </div>
              )}

              {/* Breakdown Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Materials Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-600" />
                      Materiales e Insumos
                    </h3>
                    <span className="px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-black">
                      S/ {breakdown.totalMaterialCost.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    {breakdown.materials.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Material</th>
                              <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Cant.</th>
                              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio</th>
                              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {breakdown.materials.map((mat) => (
                              <tr key={mat.id} className="hover:bg-blue-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                  <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{mat.name}</p>
                                  <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                                    <Truck className="w-3 h-3" /> {mat.supplier}
                                  </p>
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-gray-600">
                                  {mat.quantity}
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-500 font-medium">
                                  S/ {mat.price.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right font-black text-gray-900">
                                  S/ {mat.total.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-12 text-center text-gray-400 space-y-2">
                        <AlertCircle className="w-12 h-12 mx-auto opacity-20" />
                        <p className="font-bold">No se registraron materiales específicos</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Services Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-amber-600" />
                      Procesos y Servicios
                    </h3>
                    <span className="px-4 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-black">
                      S/ {breakdown.totalServiceCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    {breakdown.services.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Proceso</th>
                              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo</th>
                              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {breakdown.services.map((ser) => (
                              <tr key={ser.id} className="hover:bg-amber-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                  <p className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">{ser.name}</p>
                                  <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> {ser.supplier}
                                  </p>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-gray-900">
                                  S/ {ser.total.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">
                                    {new Date(ser.date).toLocaleDateString()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-12 text-center text-gray-400 space-y-2">
                        <AlertCircle className="w-12 h-12 mx-auto opacity-20" />
                        <p className="font-bold">No se registraron servicios externos</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Category Breakdown (Vertical Bar Chart) */}
                  {categoryData.length > 0 && (
                    <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-200/50 border border-gray-100">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Análisis por Categoría</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={categoryData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                            <Tooltip 
                              cursor={{ fill: '#f9fafb' }}
                              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-32 h-32 bg-gray-100 rounded-[2.5rem] flex items-center justify-center text-gray-300 mb-8 animate-pulse">
                <Search className="w-16 h-16" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Consulta un producto</h3>
              <p className="text-gray-500 max-w-sm font-medium">Escanea una prenda o ingresa su SKU para ver el desglose total de materiales y procesos.</p>
              
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">Escaneo Rápido</h4>
                  <p className="text-xs text-gray-400">Compatible con lectores de código de barras USB.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Truck className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">Trazabilidad</h4>
                  <p className="text-xs text-gray-400">Identifica proveedores y costos unitarios.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">Análisis Real</h4>
                  <p className="text-xs text-gray-400">Calcula el margen real vs el precio de venta.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </Layout>
  );
}
