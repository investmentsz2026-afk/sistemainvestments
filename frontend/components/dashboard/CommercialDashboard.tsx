'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/axios';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronRight,
  ArrowUpRight,
  CreditCard,
  Target,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export function CommercialDashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    salesCount: 0,
    pendingApprovals: 0,
    activeClients: 0
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [pendingAudits, setPendingAudits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // For now using mock or basic API calls
      const [salesResp, auditsResp, clientsResp] = await Promise.all([
        api.get('/sales'),
        api.get('/process-audits?approvalStatus=PENDIENTE'),
        api.get('/sales/clients')
      ]);

      const sales = salesResp.data || [];
      const audits = auditsResp.data || [];
      const clients = clientsResp.data || [];

      const total = sales.reduce((acc, s) => acc + s.totalAmount, 0);
      
      setStats({
        totalSales: total,
        salesCount: sales.length,
        pendingApprovals: audits.length,
        activeClients: clients.length
      });

      setPendingAudits(audits.slice(0, 5));
      
      // Group sales by day for chart
      const chartData = [
        { name: 'Lun', total: 4500 },
        { name: 'Mar', total: 5200 },
        { name: 'Mie', total: 4800 },
        { name: 'Jue', total: 6100 },
        { name: 'Vie', total: 5900 },
        { name: 'Sab', total: 7200 },
        { name: 'Dom', total: 3100 },
      ];
      setSalesData(chartData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cardClass = "bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20";

  return (
    <div className="space-y-8 pb-20">
      {/* WELCOME SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Panel Comercial</h1>
          <p className="text-gray-500 font-medium text-lg mt-1">Monitorea tus ventas y aprobaciones pendientes.</p>
        </div>
        <div className="flex items-center gap-3">
           <Link href="/sales/new" className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition active:scale-95">
             <Plus className="w-5 h-5" /> Nueva Venta
           </Link>
           <Link href="/sales/clients" className="flex items-center gap-2 bg-white text-gray-900 px-6 py-3.5 rounded-2xl font-bold border border-gray-100 shadow-sm hover:bg-gray-50 transition">
             <Users className="w-5 h-5" /> Clientes
           </Link>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Ventas Totales', value: `$${stats.totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+15.4%' },
          { label: 'Pedidos Realizados', value: stats.salesCount, icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+8%' },
          { label: 'Auditorías Pendientes', value: stats.pendingApprovals, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Prioridad Alta' },
          { label: 'Clientes Activos', value: stats.activeClients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'Crecimiento linear' },
        ].map((item, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cardClass}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-4 ${item.bg} rounded-2xl`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <span className={`text-xs font-black uppercase tracking-widest ${item.color === 'text-amber-600' ? 'text-amber-500' : 'text-emerald-500'}`}>
                {item.trend}
              </span>
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
            <h3 className="text-3xl font-black text-gray-900">{item.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* REVENUE CHART */}
        <div className={`${cardClass} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Rendimiento Semanal</h2>
              <p className="text-gray-400 text-sm font-semibold">Ventas brutas acumuladas por día</p>
            </div>
            <select className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-gray-600 outline-none">
              <option>Esta Semana</option>
              <option>Mes Pasado</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: '800', fontSize: 12}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: '800', color: '#4f46e5' }}
                />
                <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PENDING AUDITS - ACTION LIST */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Auditorías a Aprobar</h2>
            <Link href="/audit" className="text-xs font-black text-indigo-600 hover:underline">Ver Todo</Link>
          </div>
          <div className="space-y-4">
            {pendingAudits.length === 0 ? (
              <div className="text-center py-10 opacity-50 italic text-sm">No hay auditorías pendientes de revisión</div>
            ) : (
              pendingAudits.map((audit: any) => (
                <Link key={audit.id} href={`/audit/${audit.id}`} className="group block p-4 bg-gray-50 rounded-2xl hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{audit.process}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500">{new Date(audit.auditDate).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{audit.product?.name}</h4>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] font-mono font-bold text-gray-400 uppercase">OP: {audit.op}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-50">
            <Link href="/sales" className="flex items-center justify-center gap-2 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition shadow-lg shadow-gray-200">
               <TrendingUp className="w-5 h-5" /> Ver Todas las Ventas
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK LINKS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className={`${cardClass} bg-indigo-600 border-none`}>
          <div className="flex items-start justify-between">
            <div className="p-3 bg-white/10 rounded-xl">
              <Target className="w-6 h-6 text-white" />
            </div>
            <ArrowUpRight className="w-6 h-6 text-white opacity-40" />
          </div>
          <h3 className="text-xl font-black text-white mt-6 mb-2 uppercase tracking-tight">Metas de Ventas</h3>
          <p className="text-indigo-100 text-sm font-medium mb-6">Vas en el 82% de tu meta mensual. ¡Buen trabajo!</p>
          <div className="w-full bg-indigo-900/40 rounded-full h-2">
            <div className="bg-white h-2 rounded-full" style={{ width: '82%' }}></div>
          </div>
        </div>

        <div className={`${cardClass} border-dashed border-2 border-indigo-100 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-indigo-400 transition-all`}>
           <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-all">
             <FileText className="w-8 h-8 text-indigo-400 group-hover:text-inherit" />
           </div>
           <h3 className="font-black text-gray-900 uppercase tracking-tight">Catálogo Digital</h3>
           <p className="text-gray-400 text-xs font-bold mt-1">Sincronizado con inventario</p>
        </div>

        <div className={`${cardClass} border-dashed border-2 border-emerald-100 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-emerald-400 transition-all`}>
           <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-all">
             <CreditCard className="w-8 h-8 text-emerald-400 group-hover:text-inherit" />
           </div>
           <h3 className="font-black text-gray-900 uppercase tracking-tight">Reporte de Caja</h3>
           <p className="text-gray-400 text-xs font-bold mt-1">Cierre diario y arqueo</p>
        </div>
      </div>
    </div>
  );
}
