'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/common/Layout';
import api from '../../../lib/axios';
import { toast } from 'react-hot-toast';
import {
    TrendingUp,
    TrendingDown,
    Package,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    ArrowUpRight,
    Loader2,
    Printer,
    Download,
    Users,
    Activity,
    Award
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid
} from 'recharts';

export default function PredictionsPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [year, setYear] = useState('2026');
    const [month, setMonth] = useState('ALL');
    const [activeTab, setActiveTab] = useState<'production' | 'clients'>('production');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            fetchPredictions();
        }
    }, [isMounted, year, month]);

    const fetchPredictions = async () => {
        setIsLoading(true);
        try {
            const params: any = { year };
            if (month !== 'ALL') {
                params.month = month;
            }
            const resp = await api.get('/sales/predictions', { params });
            setData(resp.data);
        } catch (error) {
            console.error('Error fetching predictions data:', error);
            toast.error('No se pudo cargar la información de analítica');
        } finally {
            setIsLoading(false);
        }
    };

    const bestSeller = useMemo(() => {
        if (!data || !data.bestSellers || data.bestSellers.length === 0) return null;
        return data.bestSellers[0];
    }, [data]);

    const totalRecommendedProduction = useMemo(() => {
        if (!data || !data.recommendations) return 0;
        return data.recommendations.reduce((acc: number, item: any) => acc + item.recommendedProduction, 0);
    }, [data]);

    const handlePrintReport = () => {
        window.print();
    };

    const handleExportCSV = () => {
        if (!data || !data.recommendations) return;
        
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Modelo,Categoria,Unidades Vendidas,Stock Actual,Produccion Recomendada,Estado,Analisis\n';
        
        data.recommendations.forEach((item: any) => {
            csvContent += `"${item.modelName}","${item.category}",${item.unitsSold},${item.currentStock},${item.recommendedProduction},"${item.status}","${item.reason}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `predicciones_produccion_${year}_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filtered monthly data to avoid empty rendering or format labels
    const chartData = useMemo(() => {
        if (!data || !data.monthlyTrend) return [];
        return data.monthlyTrend;
    }, [data]);

    const top5ModelsData = useMemo(() => {
        if (!data || !data.bestSellers) return [];
        return data.bestSellers.slice(0, 5);
    }, [data]);

    return (
        <Layout>
            <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-16 print:p-0 print:bg-white print:max-w-full">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6 print:border-none print:pb-2">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <TrendingUp className="w-8 h-8 text-indigo-600 print:text-black" />
                            Predicciones de Producción
                        </h1>
                        <p className="text-slate-500 font-medium mt-1.5 text-sm print:hidden">
                            Monitorea la velocidad de ventas de tus prendas y planifica producciones inteligentes basadas en stock real.
                        </p>
                    </div>

                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center gap-3 print:hidden">
                        {/* Year selector */}
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm">
                            <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                            <select
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="2026">Año 2026</option>
                                <option value="2025">Año 2025</option>
                            </select>
                        </div>

                        {/* Month selector */}
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm">
                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="ALL">Todo el Año</option>
                                <option value="1">Enero</option>
                                <option value="2">Febrero</option>
                                <option value="3">Marzo</option>
                                <option value="4">Abril</option>
                                <option value="5">Mayo</option>
                                <option value="6">Junio</option>
                                <option value="7">Julio</option>
                                <option value="8">Agosto</option>
                                <option value="9">Septiembre</option>
                                <option value="10">Octubre</option>
                                <option value="11">Noviembre</option>
                                <option value="12">Diciembre</option>
                            </select>
                        </div>

                        {/* Action buttons */}
                        <button
                            onClick={handlePrintReport}
                            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-black rounded-xl transition-all shadow-sm active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-black rounded-xl transition-all shadow-sm active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            Exportar CSV
                        </button>
                    </div>
                </div>

                {/* Tabs Bar */}
                <div className="flex border-b border-slate-200 gap-6 print:hidden">
                    <button
                        onClick={() => setActiveTab('production')}
                        className={`pb-4 text-xs font-black uppercase tracking-wider border-b-4 transition-all duration-200 ${
                            activeTab === 'production' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Predicciones de Producción
                    </button>
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`pb-4 text-xs font-black uppercase tracking-wider border-b-4 transition-all duration-200 ${
                            activeTab === 'clients' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Análisis de Clientes
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Analizando historial de ventas...</p>
                    </div>
                ) : activeTab === 'production' ? (
                    <>
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
                            {/* Best Seller Card */}
                            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                                <div>
                                    <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-full">
                                        Modelo Estrella
                                    </span>
                                    <h2 className="text-2xl font-black mt-4 truncate uppercase tracking-tight">
                                        {bestSeller ? bestSeller.modelName : 'Sin Datos'}
                                    </h2>
                                </div>
                                <div className="flex items-end justify-between mt-4 border-t border-white/10 pt-4">
                                    <div>
                                        <p className="text-[10px] text-indigo-300 font-bold uppercase">Vendidos</p>
                                        <p className="text-xl font-black">{bestSeller ? `${bestSeller.quantity} unds` : '0'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-indigo-300 font-bold uppercase">Participación</p>
                                        <p className="text-xl font-black text-indigo-300">{bestSeller ? `${bestSeller.percentage}%` : '0%'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Growth Trend Card */}
                            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between min-h-[160px] hover:border-slate-300 transition-all duration-300">
                                <div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full">
                                        Volumen Total
                                    </span>
                                    <h2 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
                                        {data?.totalGlobalSold || 0} <span className="text-xs font-bold text-slate-400">Unds.</span>
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 text-emerald-600 font-black text-xs border-t border-slate-100 pt-4 mt-4">
                                    <ArrowUpRight className="w-4 h-4" />
                                    <span>Demanda Activa Proyectada</span>
                                </div>
                            </div>

                            {/* Restock Production suggestion Card */}
                            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between min-h-[160px] hover:border-slate-300 transition-all duration-300">
                                <div>
                                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50 px-2.5 py-1 rounded-full">
                                        Producción Sugerida
                                    </span>
                                    <h2 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
                                        {totalRecommendedProduction} <span className="text-xs font-bold text-slate-400">Unds.</span>
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 text-amber-600 font-black text-xs border-t border-slate-100 pt-4 mt-4">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Basado en rotación y stock actual</span>
                                </div>
                            </div>
                        </div>

                        {/* Charts Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
                            {/* Trend Line Curve Chart */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Curva de Demanda Mensual</h3>
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Evolución de ventas en el tiempo</p>
                                    </div>
                                </div>

                                <div className="h-64">
                                    {isMounted && chartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#0f172a',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        color: '#fff',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                                <Area type="monotone" dataKey="Total" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-400 text-xs">Sin información mensual</div>
                                    )}
                                </div>
                            </div>

                            {/* Bar Chart comparing top 5 models */}
                            <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Comparativa de Modelos</h3>
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Top 5 más rotados</p>
                                    </div>
                                </div>

                                <div className="h-64">
                                    {isMounted && top5ModelsData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={top5ModelsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="modelName" stroke="#94a3b8" fontSize={8} fontWeight="black" tickFormatter={(v) => v.slice(0, 8)} axisLine={false} tickLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#0f172a',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        color: '#fff',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                                <Bar dataKey="quantity" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-400 text-xs">Sin información de modelos</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Detailed Table & AI recommendations */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between print:pb-2 print:p-0">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Análisis Inteligente y Sugerencia de Producción</h3>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Comparación detallada de rotación vs stock físico disponible</p>
                                </div>
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full print:hidden">
                                    IA Forecast Activo
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 uppercase tracking-wider text-[10px] font-black">
                                            <th className="px-6 py-4 text-left">Modelo</th>
                                            <th className="px-6 py-4 text-left">Categoría</th>
                                            <th className="px-6 py-4 text-right">Uds. Vendidas</th>
                                            <th className="px-6 py-4 text-right">Promedio Mensual</th>
                                            <th className="px-6 py-4 text-right">Stock Actual</th>
                                            <th className="px-6 py-4 text-right">Producción Sugerida</th>
                                            <th className="px-6 py-4 text-center">Estado de Demanda</th>
                                            <th className="px-6 py-4 text-left w-1/3">Análisis y Recomendación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                        {data?.recommendations && data.recommendations.length > 0 ? (
                                            data.recommendations.map((item: any, idx: number) => {
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-black text-slate-900 uppercase truncate max-w-[150px]">{item.modelName}</td>
                                                        <td className="px-6 py-4 uppercase text-slate-400 font-black">{item.category}</td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-900">{item.unitsSold}</td>
                                                        <td className="px-6 py-4 text-right text-slate-500">{item.monthlyAverage} / mes</td>
                                                        <td className={`px-6 py-4 text-right font-black ${
                                                            item.currentStock <= item.monthlyAverage * 0.5 ? 'text-rose-600' : 'text-slate-900'
                                                        }`}>
                                                            {item.currentStock}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {item.recommendedProduction > 0 ? (
                                                                <span className="font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                                                    + {item.recommendedProduction}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                item.status === 'CRÍTICO' 
                                                                    ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                                                    : item.status === 'ALTA DEMANDA' 
                                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                                                        : item.status === 'REPOSICIÓN SUGERIDA'
                                                                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                            }`}>
                                                                {item.status === 'CRÍTICO' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                                                                {item.status === 'SUFICIENTE' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 font-medium text-xs leading-normal">
                                                            {item.reason}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-black uppercase tracking-widest text-xs">
                                                    No hay ventas registradas en el período seleccionado
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Clients KPI Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Total Clients Card */}
                            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between min-h-[160px] hover:border-slate-300 transition-all duration-300">
                                <div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full">
                                        Total Clientes Analizados
                                    </span>
                                    <h2 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
                                        {data?.clientAnalytics?.length || 0} <span className="text-xs font-bold text-slate-400">Clientes</span>
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-600 font-black text-xs border-t border-slate-100 pt-4 mt-4">
                                    <Users className="w-4 h-4" />
                                    <span>Cartera Comercial</span>
                                </div>
                            </div>

                            {/* Active Clients Card */}
                            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between min-h-[160px] hover:border-slate-300 transition-all duration-300">
                                <div>
                                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full">
                                        Clientes Activos
                                    </span>
                                    <h2 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
                                        {data?.clientAnalytics?.filter((c: any) => c.status === 'ACTIVO').length || 0} <span className="text-xs font-bold text-slate-400">Activos</span>
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 text-emerald-600 font-black text-xs border-t border-slate-100 pt-4 mt-4">
                                    <Activity className="w-4 h-4" />
                                    <span>Interacción Comercial Alta</span>
                                </div>
                            </div>

                            {/* Top Client VIP Card */}
                            <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                                <div>
                                    <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-full">
                                        Cliente VIP (Mayor Compra)
                                    </span>
                                    <h2 className="text-xl font-black mt-4 truncate uppercase tracking-tight">
                                        {data?.clientAnalytics?.[0]?.name || 'Sin Datos'}
                                    </h2>
                                </div>
                                <div className="flex items-end justify-between mt-4 border-t border-white/10 pt-4">
                                    <div>
                                        <p className="text-[10px] text-blue-300 font-bold uppercase">Prendas Compradas</p>
                                        <p className="text-lg font-black">{data?.clientAnalytics?.[0]?.totalQuantity || 0} unds</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-blue-300 font-bold uppercase">Inversión Total</p>
                                        <p className="text-lg font-black text-blue-300">S/. {data?.clientAnalytics?.[0]?.totalAmount?.toLocaleString() || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Client Analytics Table */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Fidelización de Clientes y Frecuencia de Compra</h3>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Métricas de volumen comprado, frecuencia y última actividad comercial</p>
                                </div>
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                                    Clientes VIP Clasificados
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 uppercase tracking-wider text-[10px] font-black">
                                            <th className="px-6 py-4 text-center">Rango</th>
                                            <th className="px-6 py-4 text-left">Cliente</th>
                                            <th className="px-6 py-4 text-center">Frecuencia de Compra</th>
                                            <th className="px-6 py-4 text-right">Volumen Comprado</th>
                                            <th className="px-6 py-4 text-right">Monto Total Facturado</th>
                                            <th className="px-6 py-4 text-center">Última Compra</th>
                                            <th className="px-6 py-4 text-center">Estado Comercial</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                        {data?.clientAnalytics && data.clientAnalytics.length > 0 ? (
                                            data.clientAnalytics.map((client: any, idx: number) => {
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 text-center">
                                                            {idx === 0 ? (
                                                                <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 rounded-full font-black">🥇</span>
                                                            ) : idx === 1 ? (
                                                                <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-700 rounded-full font-black">🥈</span>
                                                            ) : idx === 2 ? (
                                                                <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-50 text-amber-800 rounded-full font-black">🥉</span>
                                                            ) : (
                                                                <span>{idx + 1}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-left">
                                                            <div className="font-black text-slate-900 uppercase">{client.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold">RUC/DNI: {client.docNumber}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="text-slate-900 font-black">{client.purchaseCount}</span> compras
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-900">{client.totalQuantity} unds</td>
                                                        <td className="px-6 py-4 text-right text-indigo-700 font-black">S/. {client.totalAmount.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-center text-slate-500">{client.lastPurchase}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                client.status === 'ACTIVO' 
                                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                                    : client.status === 'REGULAR' 
                                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                                                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                            }`}>
                                                                {client.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-black uppercase tracking-widest text-xs">
                                                    No hay compras registradas en el sistema
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
