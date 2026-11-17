'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/common/Layout';
import {
  Wallet,
  Plus,
  Search,
  Eye,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Users,
  AlertCircle
} from 'lucide-react';
import api from '../../../lib/axios';
import { toast } from 'react-hot-toast';
import { CreateAdvanceModal } from '../../../components/advances/CreateAdvanceModal';
import { AdvanceDetailsModal } from '../../../components/advances/AdvanceDetailsModal';
import { DeleteAdvanceModal } from '../../../components/advances/DeleteAdvanceModal';

export default function AdvancesPage() {
  const [advances, setAdvances] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalRecaudado: 0,
    totalDisponible: 0,
    totalConsumido: 0,
    totalActivos: 0,
    totalCount: 0,
  });
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DISPONIBLE' | 'PARCIAL' | 'AGOTADO'>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdvanceDetails, setSelectedAdvanceDetails] = useState<any | null>(null);
  const [advanceToDelete, setAdvanceToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchClients = async () => {
    try {
      const resp = await api.get('/sales/clients');
      setClients(resp.data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchAdvances = async () => {
    setIsLoading(true);
    try {
      const [advancesResp, statsResp] = await Promise.all([
        api.get('/commercial/advances'),
        api.get('/commercial/advances/stats'),
      ]);
      setAdvances(advancesResp.data || []);
      setStats(statsResp.data || {});
    } catch (err) {
      console.error('Error fetching advances:', err);
      toast.error('Error al cargar la información de adelantos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchAdvances();
  }, []);

  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => {
      const matchesStatus = statusFilter === 'ALL' || adv.status === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        adv.code?.toLowerCase().includes(term) ||
        adv.client?.name?.toLowerCase().includes(term) ||
        adv.client?.documentNumber?.toLowerCase().includes(term) ||
        adv.reference?.toLowerCase().includes(term) ||
        adv.description?.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [advances, statusFilter, searchTerm]);

  const handleDeleteConfirm = async () => {
    if (!advanceToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/commercial/advances/${advanceToDelete.id}`);
      toast.success('Adelanto eliminado correctamente');
      setAdvanceToDelete(null);
      await fetchAdvances();
    } catch (err: any) {
      console.error('Error deleting advance:', err);
      const msg = err.response?.data?.message || 'Error al eliminar el adelanto';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString('es-PE');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISPONIBLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PARCIAL':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'AGOTADO':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                  GESTIÓN DE ADELANTOS
                </h1>
                <p className="text-xs font-bold text-gray-400">
                  Control de saldos a favor de clientes para aplicación en ventas y pedidos.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2.5 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/25 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Registrar Adelanto
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
              Total Recaudado
            </span>
            <p className="text-2xl font-black text-gray-900 tracking-tight">
              S/ {stats.totalRecaudado?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] font-bold text-gray-400 mt-2 block">
              Monto global registrado
            </span>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-xl shadow-emerald-500/5">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">
              Saldo a Favor Disponible
            </span>
            <p className="text-2xl font-black text-emerald-600 tracking-tight">
              S/ {stats.totalDisponible?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] font-bold text-emerald-600/70 mt-2 block">
              Listo para aplicar a ventas
            </span>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
              Consumido en Ventas
            </span>
            <p className="text-2xl font-black text-gray-900 tracking-tight">
              S/ {stats.totalConsumido?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] font-bold text-gray-400 mt-2 block">
              Total aplicado en pagos
            </span>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">
              Adelantos Activos
            </span>
            <p className="text-2xl font-black text-indigo-600 tracking-tight">
              {stats.totalActivos} / {stats.totalCount}
            </p>
            <span className="text-[10px] font-bold text-gray-400 mt-2 block">
              Con saldo disponible
            </span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/10 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, cliente, RUC o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 border border-gray-100 rounded-2xl w-full md:w-auto overflow-x-auto">
            {(['ALL', 'DISPONIBLE', 'PARCIAL', 'AGOTADO'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  statusFilter === st
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {st === 'ALL' ? 'Todos' : st === 'DISPONIBLE' ? 'Disponibles' : st === 'PARCIAL' ? 'Parciales' : 'Agotados'}
              </button>
            ))}
          </div>
        </div>

        {/* Table / List */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Cargando adelantos...
              </p>
            </div>
          ) : filteredAdvances.length === 0 ? (
            <div className="py-20 text-center">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-base font-black text-gray-700 uppercase tracking-tight">
                No se encontraron adelantos
              </p>
              <p className="text-xs font-bold text-gray-400 mt-1 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Intenta cambiar los filtros de búsqueda para ver más resultados.'
                  : 'Aún no se han registrado adelantos. Presiona "+ Registrar Adelanto" para comenzar.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Código
                    </th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Cliente
                    </th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                      Monto Inicial
                    </th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                      Saldo Disponible
                    </th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                      Consumido
                    </th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Método / Ref
                    </th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Fecha
                    </th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Estado
                    </th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-bold">
                  {filteredAdvances.map((adv) => {
                    const isAvailable = adv.remainingAmount > 0.009;
                    const canDelete = adv.usedAmount <= 0.01 && (!adv.usages || adv.usages.length === 0);

                    return (
                      <tr key={adv.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                            {adv.code}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-black text-gray-900 uppercase">
                              {adv.client?.name || 'Cliente no disponible'}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400">
                              {adv.client?.documentType}: {adv.client?.documentNumber}
                              {adv.client?.zone ? ` • ${adv.client.zone}` : ''}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-gray-900">
                          S/ {adv.amount?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span
                            className={`font-black text-sm ${
                              isAvailable ? 'text-emerald-600' : 'text-gray-400'
                            }`}
                          >
                            S/ {adv.remainingAmount?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-gray-500">
                          S/ {adv.usedAmount?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <span className="text-[10px] font-black text-indigo-600 uppercase">
                              {adv.paymentMethod}
                            </span>
                            {adv.reference && (
                              <p className="text-[10px] font-bold text-gray-400 truncate max-w-[130px]">
                                {adv.reference}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600 font-bold">
                          {formatDate(adv.createdAt)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(
                              adv.status
                            )}`}
                          >
                            {adv.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedAdvanceDetails(adv)}
                              className="p-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl transition shadow-sm"
                              title="Ver Detalle e Historial de Usos"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setAdvanceToDelete(adv)}
                                className="p-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition shadow-sm"
                                title="Eliminar Adelanto No Usado"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modals */}
        <CreateAdvanceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchAdvances}
          clients={clients}
        />

        <AdvanceDetailsModal
          advance={selectedAdvanceDetails}
          onClose={() => setSelectedAdvanceDetails(null)}
        />

        {advanceToDelete && (
          <DeleteAdvanceModal
            advanceCode={advanceToDelete.code}
            clientName={advanceToDelete.client?.name}
            amount={advanceToDelete.amount}
            isDeleting={isDeleting}
            onConfirm={handleDeleteConfirm}
            onClose={() => !isDeleting && setAdvanceToDelete(null)}
          />
        )}
      </div>
    </Layout>
  );
}
