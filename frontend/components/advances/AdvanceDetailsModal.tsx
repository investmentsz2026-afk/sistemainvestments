'use client';

import React from 'react';
import { X, Wallet, FileText, Calendar, User, ExternalLink, ArrowDownRight, Tag } from 'lucide-react';

interface AdvanceDetailsModalProps {
  advance: any | null;
  onClose: () => void;
}

export function AdvanceDetailsModal({ advance, onClose }: AdvanceDetailsModalProps) {
  if (!advance) return null;

  const serverUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString('es-PE');
  };

  const usages = advance.usages || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl border border-gray-100 overflow-hidden relative my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 md:p-8 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">
                  Adelanto {advance.code}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(
                    advance.status
                  )}`}
                >
                  {advance.status}
                </span>
              </div>
              <p className="text-xs font-bold text-gray-400">
                Registrado el {formatDate(advance.createdAt)}
                {advance.createdBy?.name ? ` por ${advance.createdBy.name}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Client Card */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                Cliente Asociado
              </span>
              <p className="text-sm font-black text-gray-900 uppercase">
                {advance.client?.name || 'Cliente no disponible'}
              </p>
              <p className="text-xs font-bold text-gray-500">
                {advance.client?.documentType}: {advance.client?.documentNumber}{' '}
                {advance.client?.zone ? `• Zona: ${advance.client.zone}` : ''}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                Método de Recepción
              </span>
              <p className="text-xs font-black text-indigo-600 uppercase">
                {advance.paymentMethod}
              </p>
              {advance.reference && (
                <p className="text-[10px] font-bold text-gray-500">
                  Ref: {advance.reference}
                </p>
              )}
            </div>
          </div>

          {/* Balances Card */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">
                Monto Original
              </span>
              <p className="text-lg font-black text-indigo-900">
                S/ {advance.amount?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">
                Saldo Disponible
              </span>
              <p className="text-lg font-black text-emerald-700">
                S/ {advance.remainingAmount?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                Total Consumido
              </span>
              <p className="text-lg font-black text-gray-700">
                S/ {advance.usedAmount?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Description & Evidence */}
          {(advance.description || advance.evidenceUrl) && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              {advance.description && (
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                    Descripción / Motivo
                  </span>
                  <p className="text-xs font-medium text-gray-700 leading-relaxed">
                    {advance.description}
                  </p>
                </div>
              )}
              {advance.evidenceUrl && (
                <div className="pt-2">
                  <a
                    href={`${serverUrl}${advance.evidenceUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-black text-indigo-600 hover:bg-indigo-50 transition shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" /> Ver Voucher / Comprobante Adjunto
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Usage History */}
          <div>
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-indigo-600" />
              Historial de Aplicación en Ventas ({usages.length})
            </h4>

            {usages.length === 0 ? (
              <div className="py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                <p className="text-xs font-bold text-gray-400">
                  Este adelanto aún no ha sido utilizado en ninguna venta.
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  El saldo completo (S/ {advance.amount?.toFixed(2)}) se encuentra 100% disponible.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                {usages.map((u: any, idx: number) => (
                  <div key={u.id || idx} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-900 uppercase">
                          Venta {u.sale?.invoiceNumber || (u.sale?.id ? `#${u.sale.id.slice(-6).toUpperCase()}` : 'N/A')}
                        </span>
                        {u.sale?.paymentStatus && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                            {u.sale.paymentStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                        {formatDate(u.createdAt)} • {u.notes || 'Aplicación directa de adelanto'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-rose-600">
                        - S/ {u.amount?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-gray-900 hover:bg-black text-white font-black rounded-2xl text-xs uppercase tracking-wider transition shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
