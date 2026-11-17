'use client';

import React, { useState, useEffect } from 'react';
import { X, Wallet, Upload, Loader2, Search, Check, AlertCircle } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';

interface CreateAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: any[];
}

export function CreateAdvanceModal({
  isOpen,
  onClose,
  onSuccess,
  clients,
}: CreateAdvanceModalProps) {
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [createdAt, setCreatedAt] = useState(new Date().toISOString().split('T')[0]);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client search state
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClientId('');
      setAmount('');
      setPaymentMethod('EFECTIVO');
      setReference('');
      setDescription('');
      setCreatedAt(new Date().toISOString().split('T')[0]);
      setEvidenceUrl('');
      setClientSearch('');
      setShowClientDropdown(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredClients = clients.filter((c) => {
    const term = clientSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.documentNumber && c.documentNumber.includes(term))
    );
  }).slice(0, 8);

  const selectedClient = clients.find((c) => c.id === clientId);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const resp = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEvidenceUrl(resp.data.url);
      toast.success('Comprobante adjuntado');
    } catch (err) {
      console.error('Error subiendo archivo:', err);
      toast.error('Error al subir la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) {
      return toast.error('Selecciona un cliente');
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return toast.error('Ingresa un monto válido mayor a 0');
    }

    setIsSubmitting(true);
    try {
      await api.post('/commercial/advances', {
        clientId,
        amount: parsedAmount,
        paymentMethod,
        reference: reference.trim() || undefined,
        description: description.trim() || undefined,
        evidenceUrl: evidenceUrl || undefined,
        createdAt,
      });

      toast.success('Adelanto registrado correctamente');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error registrando adelanto:', err);
      const msg = err.response?.data?.message || 'Error al registrar el adelanto';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden relative my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 md:p-8 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Registrar Nuevo Adelanto
              </h3>
              <p className="text-xs font-bold text-gray-400">
                Paquete o saldo a favor del cliente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 pt-6 space-y-5">
          {/* Cliente selector */}
          <div className="relative">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">
              Cliente *
            </label>
            {selectedClient ? (
              <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl">
                <div>
                  <p className="text-xs font-black text-gray-900 uppercase">
                    {selectedClient.name}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500">
                    {selectedClient.documentType}: {selectedClient.documentNumber}{' '}
                    {selectedClient.zone ? `• Zona: ${selectedClient.zone}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClientId('');
                    setClientSearch('');
                  }}
                  className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o RUC/DNI..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                  />
                </div>

                {showClientDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {filteredClients.length > 0 ? (
                      filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClientId(c.id);
                            setShowClientDropdown(false);
                          }}
                          className="w-full text-left p-3 hover:bg-indigo-50/60 transition flex items-center justify-between group"
                        >
                          <div>
                            <p className="text-xs font-black text-gray-900 uppercase group-hover:text-indigo-600">
                              {c.name}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400">
                              {c.documentType}: {c.documentNumber}{' '}
                              {c.zone ? `• Zona: ${c.zone}` : ''}
                            </p>
                          </div>
                          <Check className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs font-bold text-gray-400">
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">
                Monto del Adelanto (S/) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500">
                  S/
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">
                Fecha del Adelanto *
              </label>
              <input
                type="date"
                required
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Método de Pago y Referencia */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">
                Método de Recepción *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
              >
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                <option value="DEPOSITO">DEPÓSITO</option>
                <option value="YAPE/PLIN">YAPE/PLIN</option>
                <option value="TARJETA">TARJETA</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">
                N° Operación / Referencia
              </label>
              <input
                type="text"
                placeholder="Ej. OP-982341..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Descripción / Motivo */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">
              Descripción / Motivo (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Paquete de producción de pantalones, adelanto temporada verano..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition resize-none"
            />
          </div>

          {/* Subir Comprobante / Voucher */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">
              Voucher / Comprobante (Opcional)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 py-3 px-4 border-2 border-dashed border-gray-200 hover:border-indigo-500 rounded-2xl flex items-center justify-center gap-2 cursor-pointer bg-gray-50 hover:bg-indigo-50/50 transition">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-600">
                  {isUploading ? 'Subiendo...' : evidenceUrl ? 'Cambiar voucher' : 'Adjuntar voucher'}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
              {evidenceUrl && (
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  Voucher Listo ✓
                </span>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-2xl text-xs uppercase tracking-wider transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !clientId || !amount}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" /> Registrar Adelanto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
