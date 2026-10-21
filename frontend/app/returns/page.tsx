'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';
import {
  RefreshCw,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Upload,
  Info,
  Calendar,
  User,
  ShoppingBag,
  Clock,
  ArrowRight,
  Search,
  FileText,
  Check,
  RotateCcw,
  Receipt,
  X,
  ChevronDown
} from 'lucide-react';

export default function ReturnsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  
  // Create / Edit Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<'INVOICE' | 'MANUAL'>('INVOICE');

  // Searchable Client State
  const [formClientId, setFormClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  // Searchable Invoice State
  const [clientSales, setClientSales] = useState<any[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState(false);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<Record<string, { selected: boolean; returnQty: number; item: any }>>({});

  const [formReason, setFormReason] = useState('');
  const [formEvidenceUrl, setFormEvidenceUrl] = useState('');
  const [formItems, setFormItems] = useState<any[]>([
    { modelName: '', color: '', s28: 0, m30: 0, l32: 0, xl34: 0, xxl36: 0, size38: 0, size40: 0, size42: 0, size44: 0, size46: 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Review states
  const [rejectionReason, setRejectionReason] = useState('');
  const [qualityObservations, setQualityObservations] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  useEffect(() => {
    fetchData();
    if (user?.role.startsWith('VENDEDOR') || user?.role === 'ADMIN') {
      fetchClientsAndProducts();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resp = await api.get('/returns');
      setRequests(resp.data);
    } catch (e) {
      console.error('Error fetching returns:', e);
      toast.error('No se pudo cargar la lista de devoluciones');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClientsAndProducts = async () => {
    try {
      const [clientsResp, productsResp] = await Promise.all([
        api.get('/sales/clients'),
        api.get('/products')
      ]);
      setClients(clientsResp.data);
      setProducts(productsResp.data);
    } catch (e) {
      console.error('Error loading form metadata:', e);
    }
  };

  const getFileUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:3001';
    return `${baseUrl}${url}`;
  };

  const getAvailableColorsForModel = (modelName: string) => {
    if (!modelName) return [];
    const product = products.find(p => p.name.trim().toUpperCase() === modelName.trim().toUpperCase());
    if (!product) return [];
    const prodColors = product.colors || [];
    const variantColors = (product.variants || []).map((v: any) => v.color);
    return Array.from(new Set([...prodColors, ...variantColors])).filter(Boolean) as string[];
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const resp = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormEvidenceUrl(resp.data.url);
      toast.success('Evidencia fotográfica subida');
    } catch (err) {
      console.error('Error uploading evidence:', err);
      toast.error('No se pudo subir la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  // Dynamic row editing in matrix
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormItems(newItems);
  };

  const addFormRow = () => {
    setFormItems([...formItems, {
      modelName: '', color: '', s28: 0, m30: 0, l32: 0, xl34: 0, xxl36: 0, size38: 0, size40: 0, size42: 0, size44: 0, size46: 0
    }]);
  };

  const removeFormRow = (idx: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  // Helper to fetch sales for a specific client
  const fetchSalesForClient = async (clientId: string) => {
    if (!clientId) {
      setClientSales([]);
      return;
    }
    setIsLoadingSales(true);
    try {
      const resp = await api.get('/sales', { params: { clientId } });
      const list = Array.isArray(resp.data) ? resp.data : [];
      setClientSales(list);
    } catch (err) {
      console.error('Error fetching client sales:', err);
      toast.error('Error al cargar ventas del cliente');
      setClientSales([]);
    } finally {
      setIsLoadingSales(false);
    }
  };

  const handleSelectClient = (client: any) => {
    setFormClientId(client.id);
    setSelectedClient(client);
    setClientSearch('');
    setIsClientDropdownOpen(false);
    setSelectedInvoice(null);
    setInvoiceSearch('');
    setSelectedInvoiceItems({});
    fetchSalesForClient(client.id);
  };

  const handleClearClient = () => {
    setFormClientId('');
    setSelectedClient(null);
    setClientSearch('');
    setClientSales([]);
    setSelectedInvoice(null);
    setInvoiceSearch('');
    setSelectedInvoiceItems({});
  };

  const handleSelectSale = async (sale: any) => {
    setSelectedInvoice(sale);
    setIsInvoiceDropdownOpen(false);
    setInvoiceSearch('');

    let saleWithItems = sale;
    if (!sale.items || sale.items.length === 0 || !sale.items[0]?.variant) {
      try {
        const resp = await api.get(`/sales/${sale.id}`);
        if (resp.data) {
          saleWithItems = resp.data;
          setSelectedInvoice(resp.data);
        }
      } catch (err) {
        console.error('Error fetching sale details:', err);
      }
    }

    const initialSelected: Record<string, { selected: boolean; returnQty: number; item: any }> = {};
    (saleWithItems.items || []).forEach((item: any) => {
      initialSelected[item.id] = {
        selected: false,
        returnQty: item.quantity || 1,
        item
      };
    });
    setSelectedInvoiceItems(initialSelected);
  };

  const handleClearInvoice = () => {
    setSelectedInvoice(null);
    setInvoiceSearch('');
    setSelectedInvoiceItems({});
  };

  const toggleSelectInvoiceItem = (itemId: string) => {
    setSelectedInvoiceItems(prev => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: {
          ...current,
          selected: !current.selected,
          returnQty: current.returnQty > 0 ? current.returnQty : (current.item.quantity || 1)
        }
      };
    });
  };

  const updateItemReturnQty = (itemId: string, qty: number) => {
    setSelectedInvoiceItems(prev => {
      const current = prev[itemId];
      if (!current) return prev;
      const max = current.item.quantity || 1;
      const validQty = Math.max(1, Math.min(max, isNaN(qty) ? 1 : qty));
      return {
        ...prev,
        [itemId]: {
          ...current,
          returnQty: validQty
        }
      };
    });
  };

  const selectAllInvoiceItems = (select: boolean) => {
    setSelectedInvoiceItems(prev => {
      const next: Record<string, any> = {};
      Object.entries(prev).forEach(([id, val]) => {
        next[id] = {
          ...val,
          selected: select,
          returnQty: val.returnQty > 0 ? val.returnQty : (val.item.quantity || 1)
        };
      });
      return next;
    });
  };

  const getSizeField = (rawSize: string): string => {
    if (!rawSize) return 's28';
    const clean = rawSize.toString().trim().toUpperCase();
    if (clean === '28' || clean === 'S') return 's28';
    if (clean === '30' || clean === 'M') return 'm30';
    if (clean === '32' || clean === 'L') return 'l32';
    if (clean === '34' || clean === 'XL') return 'xl34';
    if (clean === '36' || clean === 'XXL' || clean === '2XL') return 'xxl36';
    if (clean === '38' || clean === 'XXXL' || clean === '3XL') return 'size38';
    if (clean === '40') return 'size40';
    if (clean === '42') return 'size42';
    if (clean === '44') return 'size44';
    if (clean === '46') return 'size46';
    if (clean === '48') return 'size48';
    if (clean === '50') return 'size50';
    if (clean === '52') return 'size52';

    const num = parseInt(clean);
    if (!isNaN(num)) {
      if (num <= 28) return 's28';
      if (num <= 30) return 'm30';
      if (num <= 32) return 'l32';
      if (num <= 34) return 'xl34';
      if (num <= 36) return 'xxl36';
      if (num <= 38) return 'size38';
      if (num <= 40) return 'size40';
      if (num <= 42) return 'size42';
      if (num <= 44) return 'size44';
      if (num <= 46) return 'size46';
      if (num <= 48) return 'size48';
      if (num <= 50) return 'size50';
      return 'size52';
    }
    return 's28';
  };

  // Submit create or edit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId) return toast.error('Selecciona un cliente');
    if (!formReason.trim()) return toast.error('Ingresa una explicación o motivo de la devolución');

    let filteredItems: any[] = [];

    if (creationMode === 'INVOICE' && selectedInvoice) {
      const selectedList = Object.values(selectedInvoiceItems).filter(x => x.selected && x.returnQty > 0);
      if (selectedList.length === 0) {
        return toast.error('Debes seleccionar al menos una prenda de la factura para devolver');
      }

      // Group by modelName and color
      const grouped: Record<string, any> = {};
      selectedList.forEach(({ item, returnQty }) => {
        const modelName = (item.variant?.product?.name || item.name || 'Prenda').trim();
        const color = (item.variant?.color || 'UN').trim().toUpperCase();
        const rawSize = item.variant?.size || '28';
        const sizeField = getSizeField(rawSize);

        const key = `${modelName.toUpperCase()}___${color.toUpperCase()}`;
        if (!grouped[key]) {
          grouped[key] = {
            modelName,
            color,
            s28: 0, m30: 0, l32: 0, xl34: 0, xxl36: 0, size38: 0, size40: 0, size42: 0, size44: 0, size46: 0, size48: 0, size50: 0, size52: 0
          };
        }
        grouped[key][sizeField] = (grouped[key][sizeField] || 0) + returnQty;
      });

      filteredItems = Object.values(grouped);
    } else {
      // Manual mode
      filteredItems = formItems.filter(item => item.modelName);
      if (filteredItems.length === 0) return toast.error('Agrega al menos una prenda con modelo válido');
    }

    setIsSubmitting(true);
    try {
      const invoicePrefix = selectedInvoice?.invoiceNumber
        ? `[Comprobante: ${selectedInvoice.invoiceNumber}] `
        : '';
      const finalReason = formReason.startsWith('[Comprobante:')
        ? formReason
        : `${invoicePrefix}${formReason}`.trim();

      const payload = {
        clientId: formClientId,
        reason: finalReason,
        evidenceUrl: formEvidenceUrl,
        items: filteredItems
      };

      if (isEditing && editId) {
        await api.patch(`/returns/${editId}`, payload);
        toast.success('Devolución modificada y reenviada');
      } else {
        await api.post('/returns', payload);
        toast.success('Devolución registrada correctamente');
      }

      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al procesar la devolución');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormClientId('');
    setSelectedClient(null);
    setClientSearch('');
    setIsClientDropdownOpen(false);
    setClientSales([]);
    setSelectedInvoice(null);
    setInvoiceSearch('');
    setIsInvoiceDropdownOpen(false);
    setSelectedInvoiceItems({});
    setCreationMode('INVOICE');
    setFormReason('');
    setFormEvidenceUrl('');
    setFormItems([
      { modelName: '', color: '', s28: 0, m30: 0, l32: 0, xl34: 0, xxl36: 0, size38: 0, size40: 0, size42: 0, size44: 0, size46: 0, size48: 0, size50: 0, size52: 0 }
    ]);
  };

  const handleEditClick = (req: any) => {
    setIsEditing(true);
    setEditId(req.id);
    setFormClientId(req.clientId);
    const client = clients.find(c => c.id === req.clientId);
    setSelectedClient(client || null);
    if (client) {
      fetchSalesForClient(client.id);
    }
    setCreationMode('MANUAL');
    setFormReason(req.reason);
    setFormEvidenceUrl(req.evidenceUrl || '');
    setFormItems(req.items.map((item: any) => ({
      modelName: item.modelName,
      color: item.color,
      s28: item.s28,
      m30: item.m30,
      l32: item.l32,
      xl34: item.xl34,
      xxl36: item.xxl36,
      size38: item.size38,
      size40: item.size40,
      size42: item.size42,
      size44: item.size44,
      size46: item.size46,
      size48: item.size48,
      size50: item.size50,
      size52: item.size52
    })));
    setShowCreateModal(true);
  };

  const handleViewDetails = (req: any) => {
    setSelectedRequest(req);
    setRejectionReason('');
    setQualityObservations('');
    setShowRejectionInput(false);
    setShowDetailModal(true);
  };

  // State transitions triggers
  const handleComercialReview = async (action: 'APPROVE' | 'REJECT') => {
    if (action === 'REJECT' && !rejectionReason) {
      setShowRejectionInput(true);
      return toast.error('Ingresa el motivo de rechazo');
    }

    try {
      await api.post(`/returns/${selectedRequest.id}/comercial-review`, {
        action,
        rejectionReason: action === 'REJECT' ? rejectionReason : undefined
      });
      toast.success(action === 'APPROVE' ? 'Devolución aprobada y enviada a Administración' : 'Devolución rechazada');
      setShowDetailModal(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error en revisión');
    }
  };

  const handleAdminReview = async (action: 'APPROVE' | 'REJECT') => {
    if (action === 'REJECT' && !rejectionReason) {
      setShowRejectionInput(true);
      return toast.error('Ingresa el motivo de rechazo');
    }

    try {
      await api.post(`/returns/${selectedRequest.id}/admin-review`, {
        action,
        rejectionReason: action === 'REJECT' ? rejectionReason : undefined
      });
      toast.success(action === 'APPROVE' ? 'Devolución aprobada y enviada a Calidad (UDP)' : 'Devolución rechazada');
      setShowDetailModal(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error en revisión');
    }
  };

  const handleUdpReview = async (action: 'APPROVE' | 'REJECT') => {
    if (action === 'APPROVE' && !qualityObservations) {
      return toast.error('Ingresa las observaciones de calidad física');
    }
    if (action === 'REJECT' && !rejectionReason) {
      setShowRejectionInput(true);
      return toast.error('Ingresa el motivo de rechazo');
    }

    try {
      await api.post(`/returns/${selectedRequest.id}/udp-review`, {
        action,
        observations: qualityObservations,
        rejectionReason: action === 'REJECT' ? rejectionReason : undefined
      });
      toast.success(action === 'APPROVE' ? 'Devolución aprobada y enviada a Logística' : 'Devolución rechazada y devuelta a Admin');
      setShowDetailModal(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error en revisión');
    }
  };

  const handleLogisticsReceive = async () => {
    try {
      await api.post(`/returns/${selectedRequest.id}/logistics-receive`);
      toast.success('Mercadería ingresada al inventario del almacén correctamente');
      setShowDetailModal(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al procesar ingreso');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, JSX.Element> = {
      PENDIENTE_COMERCIAL: <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-wider">Pendiente Comercial</span>,
      RECHAZADO_COMERCIAL: <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[10px] font-black uppercase tracking-wider">Rechazado Comercial</span>,
      PENDIENTE_ADMIN: <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-wider">Pendiente Admin</span>,
      RECHAZADO_ADMIN: <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[10px] font-black uppercase tracking-wider">Rechazado por Admin</span>,
      PENDIENTE_UDP: <span className="px-3 py-1 bg-purple-50 text-purple-600 border border-purple-100 rounded-full text-[10px] font-black uppercase tracking-wider">Calidad (UDP)</span>,
      RECHAZADO_UDP: <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[10px] font-black uppercase tracking-wider">Rechazado Calidad</span>,
      PENDIENTE_LOGISTICA: <span className="px-3 py-1 bg-orange-50 text-orange-600 border border-orange-100 rounded-full text-[10px] font-black uppercase tracking-wider">Listo p/ Almacén</span>,
      COMPLETADO: <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-wider">Ingresado Inventario</span>,
    };
    return badges[status] || <span>{status}</span>;
  };

  return (
    <Layout>
      <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-600" />
              Gestión de Devoluciones
            </h1>
            <p className="text-slate-500 font-medium mt-1 text-sm">
              Control y flujo integrado de logística inversa: Devolución de prendas, control de calidad y reingreso de stock.
            </p>
          </div>

          {(user?.role.startsWith('VENDEDOR') || user?.role === 'ADMIN') && (
            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              Nueva Devolución
            </button>
          )}
        </div>

        {/* List Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando devoluciones...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 uppercase tracking-wider text-[10px] font-black">
                    <th className="px-6 py-4 text-left">Código</th>
                    <th className="px-6 py-4 text-left">Cliente</th>
                    <th className="px-6 py-4 text-left">Vendedor</th>
                    <th className="px-6 py-4 text-left">Fecha Solicitud</th>
                    <th className="px-6 py-4 text-right">Cant. Total</th>
                    <th className="px-6 py-4 text-center">Estado del Flujo</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {requests.length > 0 ? (
                    requests.map((req) => {
                      const totalQty = req.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
                      return (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-black text-slate-900 tracking-tight uppercase block">{req.returnNumber}</span>
                            {req.reason && req.reason.match(/\[Comprobante:\s*([^\]]+)\]/i) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md mt-1">
                                <Receipt className="w-3 h-3 text-indigo-500" />
                                {req.reason.match(/\[Comprobante:\s*([^\]]+)\]/i)?.[1]}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 truncate max-w-[200px] uppercase">{req.client?.name}</td>
                          <td className="px-6 py-4 text-slate-500 uppercase">{req.seller?.name}</td>
                          <td className="px-6 py-4 text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-900">{totalQty} unds</td>
                          <td className="px-6 py-4 text-center">{getStatusBadge(req.status)}</td>
                          <td className="px-6 py-4 text-center space-x-2">
                            <button
                              onClick={() => handleViewDetails(req)}
                              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver Detalle
                            </button>
                            {req.status === 'RECHAZADO_COMERCIAL' && (user?.role.startsWith('VENDEDOR') || user?.role === 'ADMIN') && (
                              <button
                                onClick={() => handleEditClick(req)}
                                className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg transition-all"
                              >
                                Editar y Corregir
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400 uppercase tracking-widest text-xs">
                        No hay solicitudes de devolución registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CREATE / EDIT MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl p-6 md:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-indigo-600" />
                    {isEditing ? 'Editar y Corregir Devolución' : 'Registrar Nueva Devolución'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Selecciona el cliente y la factura de venta para cargar las prendas vendidas automáticamente.
                  </p>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setCreationMode('INVOICE')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                        creationMode === 'INVOICE'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      🧾 Por Factura / Boleta
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreationMode('MANUAL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                        creationMode === 'MANUAL'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      ✍️ Ingreso Manual
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* ── 1. BUSCADOR DE CLIENTE ── */}
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      1. Cliente que devuelve <span className="text-rose-500">*</span>
                    </label>
                    {selectedClient && (
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        Cliente Seleccionado
                      </span>
                    )}
                  </div>

                  {selectedClient ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-indigo-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                          <Check className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase">{selectedClient.name}</p>
                          <p className="text-[11px] text-slate-500 font-bold">
                            {selectedClient.documentType || 'RUC/DNI'}: {selectedClient.documentNumber}
                            {selectedClient.zone && ` • Zona: ${selectedClient.zone}`}
                          </p>
                        </div>
                      </div>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={handleClearClient}
                          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all self-end sm:self-center"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Cambiar Cliente
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Escribe el nombre o RUC/DNI del cliente para buscar..."
                          value={clientSearch}
                          onChange={(e) => {
                            setClientSearch(e.target.value);
                            setIsClientDropdownOpen(true);
                          }}
                          onFocus={() => setIsClientDropdownOpen(true)}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all text-xs"
                        />
                        {clientSearch && (
                          <button
                            type="button"
                            onClick={() => setClientSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown de Clientes */}
                      {isClientDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {clients
                            .filter(c =>
                              !clientSearch.trim() ||
                              (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                              (c.documentNumber || '').toLowerCase().includes(clientSearch.toLowerCase())
                            )
                            .slice(0, 30)
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectClient(c)}
                                className="w-full text-left px-4 py-3 hover:bg-indigo-50/70 transition-colors flex items-center justify-between gap-3 group"
                              >
                                <div>
                                  <p className="text-xs font-black text-slate-800 group-hover:text-indigo-600 uppercase">
                                    {c.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                    {c.documentType || 'RUC/DNI'}: {c.documentNumber}
                                  </p>
                                </div>
                                {c.zone && (
                                  <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase">
                                    {c.zone}
                                  </span>
                                )}
                              </button>
                            ))
                          }
                          {clients.filter(c =>
                            !clientSearch.trim() ||
                            (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                            (c.documentNumber || '').toLowerCase().includes(clientSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
                              No se encontraron clientes con "{clientSearch}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── 2. BUSCADOR DE FACTURA / BOLETA (MODO FACTURA) ── */}
                {creationMode === 'INVOICE' && selectedClient && (
                  <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                        2. Factura o Boleta de Venta <span className="text-rose-500">*</span>
                      </label>
                      {selectedInvoice && (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          Factura Vinculada
                        </span>
                      )}
                    </div>

                    {isLoadingSales ? (
                      <div className="flex items-center justify-center py-6 gap-2 text-indigo-600 font-bold text-xs bg-white rounded-xl border border-slate-200">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Buscando facturas y boletas del cliente...
                      </div>
                    ) : clientSales.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 flex items-center justify-between gap-3 text-xs">
                        <span>Este cliente no tiene facturas o boletas registradas en el sistema.</span>
                        <button
                          type="button"
                          onClick={() => setCreationMode('MANUAL')}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                        >
                          Usar Modo Manual
                        </button>
                      </div>
                    ) : selectedInvoice ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-indigo-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                            <FileText className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black text-slate-900 uppercase">
                                {selectedInvoice.invoiceNumber || `Comprobante #${selectedInvoice.id.slice(0, 8)}`}
                              </p>
                              {selectedInvoice.paymentStatus && (
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                  selectedInvoice.paymentStatus === 'CANCELADO'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {selectedInvoice.paymentStatus}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                              Fecha: {new Date(selectedInvoice.createdAt).toLocaleDateString()} • Total Venta: S/ {(selectedInvoice.totalAmount || 0).toFixed(2)} • {selectedInvoice.items?.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0) || 0} prendas
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearInvoice}
                          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all self-end sm:self-center"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Cambiar Factura
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Escribe el N° de factura, boleta o fecha (ej: F001-000123)..."
                            value={invoiceSearch}
                            onChange={(e) => {
                              setInvoiceSearch(e.target.value);
                              setIsInvoiceDropdownOpen(true);
                            }}
                            onFocus={() => setIsInvoiceDropdownOpen(true)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all text-xs"
                          />
                          {invoiceSearch && (
                            <button
                              type="button"
                              onClick={() => setInvoiceSearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Lista de Facturas del Cliente */}
                        <div className="bg-white border border-slate-200 rounded-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 shadow-sm">
                          {clientSales
                            .filter(s =>
                              !invoiceSearch.trim() ||
                              (s.invoiceNumber || '').toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                              new Date(s.createdAt).toLocaleDateString().includes(invoiceSearch)
                            )
                            .map((sale) => {
                              const totalQty = sale.items?.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0) || 0;
                              return (
                                <button
                                  key={sale.id}
                                  type="button"
                                  onClick={() => handleSelectSale(sale)}
                                  className="w-full text-left px-4 py-3 hover:bg-indigo-50/70 transition-colors flex items-center justify-between gap-3 group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                      <Receipt className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-black text-slate-900 group-hover:text-indigo-600 uppercase">
                                        {sale.invoiceNumber || `Comprobante #${sale.id.slice(0, 8)}`}
                                      </p>
                                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                        Fecha: {new Date(sale.createdAt).toLocaleDateString()} • {totalQty} prendas vendidas
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-black text-slate-900">
                                      S/ {(sale.totalAmount || 0).toFixed(2)}
                                    </p>
                                    <span className="text-[9px] font-bold text-slate-400">
                                      {sale.paymentStatus || 'Emitido'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          }
                          {clientSales.filter(s =>
                            !invoiceSearch.trim() ||
                            (s.invoiceNumber || '').toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                            new Date(s.createdAt).toLocaleDateString().includes(invoiceSearch)
                          ).length === 0 && (
                            <div className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
                              No se encontraron comprobantes con "{invoiceSearch}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── 3. LISTADO DE PRENDAS DE LA FACTURA (MODO FACTURA) ── */}
                {creationMode === 'INVOICE' && selectedInvoice && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-indigo-600" />
                          Prendas de la Factura a Devolver
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Marca las prendas que el cliente devuelve y especifica cuántas unidades regresa:
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => selectAllInvoiceItems(true)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded bg-indigo-50"
                        >
                          Seleccionar todas
                        </button>
                        <button
                          type="button"
                          onClick={() => selectAllInvoiceItems(false)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded bg-slate-100"
                        >
                          Deseleccionar
                        </button>
                      </div>
                    </div>

                    {(!selectedInvoice.items || selectedInvoice.items.length === 0) ? (
                      <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 font-medium">
                        Esta factura no tiene prendas detalladas. Puedes usar el modo manual.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {selectedInvoice.items.map((item: any) => {
                          const sel = selectedInvoiceItems[item.id] || { selected: false, returnQty: item.quantity || 1, item };
                          const isChecked = sel.selected;
                          const productName = item.variant?.product?.name || item.name || 'Prenda';
                          const size = item.variant?.size || 'UN';
                          const color = item.variant?.color || 'UN';
                          const sku = item.variant?.variantSku || item.variant?.product?.sku || 'S/SKU';
                          const maxQty = item.quantity || 1;

                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isChecked
                                  ? 'bg-indigo-50/50 border-indigo-300 shadow-sm'
                                  : 'bg-white border-slate-200 hover:border-slate-300 opacity-80'
                              }`}
                            >
                              <div
                                className="flex items-center gap-3 cursor-pointer flex-1"
                                onClick={() => toggleSelectInvoiceItem(item.id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectInvoiceItem(item.id)}
                                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                                <div>
                                  <p className="text-xs font-black text-slate-900 uppercase">
                                    {productName}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    <span className="px-2 py-0.5 bg-slate-100 font-black text-slate-700 rounded-md text-[10px]">
                                      Talla: {size}
                                    </span>
                                    <span className="px-2 py-0.5 bg-indigo-100/70 text-indigo-700 font-black rounded-md text-[10px] uppercase">
                                      Color: {color}
                                    </span>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-mono rounded-md text-[9px]">
                                      SKU: {sku}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold ml-1">
                                      (Vendidas: {maxQty} unds)
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Cantidad a devolver */}
                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {isChecked ? (
                                  <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-indigo-200 shadow-sm">
                                    <button
                                      type="button"
                                      onClick={() => updateItemReturnQty(item.id, (sel.returnQty || 1) - 1)}
                                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 font-black text-xs text-slate-700 flex items-center justify-center transition-colors"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      max={maxQty}
                                      value={sel.returnQty || 1}
                                      onChange={(e) => updateItemReturnQty(item.id, parseInt(e.target.value) || 1)}
                                      className="w-12 text-center font-black text-xs text-slate-900 outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateItemReturnQty(item.id, (sel.returnQty || 1) + 1)}
                                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 font-black text-xs text-slate-700 flex items-center justify-center transition-colors"
                                    >
                                      +
                                    </button>
                                    <span className="text-[10px] font-bold text-slate-400 ml-1">
                                      / máx {maxQty}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold italic">
                                    No seleccionada
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Resumen de Selección */}
                    {Object.values(selectedInvoiceItems).filter(x => x.selected && x.returnQty > 0).length > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800">
                        <span className="flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          {Object.values(selectedInvoiceItems).filter(x => x.selected && x.returnQty > 0).length} prenda(s) seleccionada(s) de la factura
                        </span>
                        <span className="font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px]">
                          Total: {Object.values(selectedInvoiceItems).filter(x => x.selected && x.returnQty > 0).reduce((sum, x) => sum + x.returnQty, 0)} unidades a devolver
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── 4. MODO MANUAL DE PRENDAS (RESPALDO / EDICIÓN) ── */}
                {(creationMode === 'MANUAL' || isEditing) && (
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-500 tracking-wider mb-4 border-b pb-2">
                      Prendas a Devolver (Ingreso Manual)
                    </h3>
                    
                    <div className="space-y-4">
                      {formItems.map((item, idx) => (
                        <div key={idx} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 relative space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Modelo</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Buscar modelo..."
                                  value={activeSearchIdx === idx ? searchQuery : item.modelName}
                                  onFocus={() => {
                                    setActiveSearchIdx(idx);
                                    setSearchQuery(item.modelName || '');
                                  }}
                                  onBlur={() => {
                                    setTimeout(() => {
                                      setActiveSearchIdx(null);
                                    }, 250);
                                  }}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSearchQuery(val);
                                    handleItemChange(idx, 'modelName', val);
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 outline-none text-xs uppercase"
                                  required={creationMode === 'MANUAL'}
                                />
                                {activeSearchIdx === idx && searchQuery.trim() !== '' && (
                                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                                    {products
                                      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                      .map(p => (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => {
                                            handleItemChange(idx, 'modelName', p.name);
                                            setActiveSearchIdx(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase"
                                        >
                                          {p.name}
                                        </button>
                                      ))
                                    }
                                    {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                      <div className="px-4 py-2 text-xs text-slate-400 font-medium">No se encontraron modelos</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Color</label>
                              {getAvailableColorsForModel(item.modelName).length > 0 ? (
                                <select
                                  value={item.color}
                                  onChange={(e) => handleItemChange(idx, 'color', e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 outline-none text-xs"
                                  required={creationMode === 'MANUAL'}
                                >
                                  <option value="">Seleccione Color</option>
                                  {getAvailableColorsForModel(item.modelName).map((color) => (
                                    <option key={color} value={color}>{color.toUpperCase()}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Escribe Color..."
                                  value={item.color}
                                  onChange={(e) => handleItemChange(idx, 'color', e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 outline-none text-xs uppercase"
                                  required={creationMode === 'MANUAL'}
                                  disabled={!item.modelName}
                                />
                              )}
                            </div>
                          </div>

                          {/* Sizes Matrix */}
                          <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Cantidad por Tallas</label>
                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                              {['s28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46', 'size48', 'size50', 'size52'].map((size) => {
                                const labelMap: Record<string, string> = {
                                  s28: '28', m30: '30', l32: '32', xl34: '34', xxl36: '36',
                                  size38: '38', size40: '40', size42: '42', size44: '44', size46: '46',
                                  size48: '48', size50: '50', size52: '52'
                                };
                                return (
                                  <div key={size} className="text-center">
                                    <label className="block text-[9px] font-black text-slate-500 mb-1">{labelMap[size]}</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item[size] || 0}
                                      onChange={(e) => handleItemChange(idx, size, parseInt(e.target.value) || 0)}
                                      className="w-full text-center bg-white border border-slate-200 rounded-lg py-1 font-bold text-xs"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFormRow(idx)}
                            className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 text-xs font-black"
                            disabled={formItems.length === 1}
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addFormRow}
                      className="mt-4 text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 active:scale-95"
                    >
                      + Agregar otra prenda
                    </button>
                  </div>
                )}

                {/* ── MOTIVO / DESCARGO ── */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                    Motivo / Descargo de la Devolución <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="Explique el motivo detallado de la devolución (ej: falla de costura en pretina, cambio de talla, prenda descosida, etc.)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all text-xs min-h-[70px]"
                    required
                  />
                </div>

                {/* ── EVIDENCIA FOTOGRÁFICA ── */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                    Imagen de Evidencia (Opcional)
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl cursor-pointer text-xs font-black transition-all shadow-sm">
                      <Upload className="w-4 h-4" />
                      {isUploading ? 'Subiendo...' : 'Seleccionar Imagen'}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {formEvidenceUrl && (
                      <div className="flex items-center gap-2">
                        <img src={getFileUrl(formEvidenceUrl)} className="w-12 h-12 object-cover rounded-lg border" />
                        <span className="text-[10px] text-emerald-600 font-black">¡Subida con éxito!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
                    disabled={isSubmitting || (creationMode === 'INVOICE' && !selectedInvoice && !isEditing)}
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmar Envío
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DETAILS & REVIEW MODAL */}
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[2.5rem] w-full max-w-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    Devolución {selectedRequest.returnNumber}
                  </h2>
                  <p className="text-slate-500 font-bold uppercase tracking-wide text-[10px] mt-1">
                    Registrado el {new Date(selectedRequest.createdAt).toLocaleString()}
                  </p>
                </div>
                {getStatusBadge(selectedRequest.status)}
              </div>

              {/* Body */}
              <div className="space-y-6">
                {/* Meta details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cliente que devuelve</p>
                      <p className="text-xs font-black text-slate-800 uppercase">{selectedRequest.client?.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold">RUC: {selectedRequest.client?.documentNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Registrado por (Vendedor)</p>
                      <p className="text-xs font-black text-slate-800 uppercase">{selectedRequest.seller?.name}</p>
                    </div>
                  </div>
                </div>

                {/* Reason description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Explicación de la Devolución (Descargo)</h3>
                    {selectedRequest.reason && selectedRequest.reason.match(/\[Comprobante:\s*([^\]]+)\]/i) && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
                        <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                        Comprobante: {selectedRequest.reason.match(/\[Comprobante:\s*([^\]]+)\]/i)?.[1]}
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border font-medium text-xs text-slate-700 italic break-all break-words whitespace-pre-wrap">
                    "{selectedRequest.reason ? selectedRequest.reason.replace(/\[Comprobante:\s*([^\]]+)\]\s*/i, '') : ''}"
                  </div>
                </div>

                {/* Evidence Image */}
                {selectedRequest.evidenceUrl && (
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Evidencia Fotográfica</h3>
                    <a href={getFileUrl(selectedRequest.evidenceUrl)} target="_blank" rel="noopener noreferrer">
                      <img
                        src={getFileUrl(selectedRequest.evidenceUrl)}
                        className="max-w-[200px] max-h-[150px] object-cover rounded-xl border border-slate-200 hover:scale-105 transition-all shadow-md"
                        alt="Evidencia"
                      />
                    </a>
                  </div>
                )}

                {/* Observations list */}
                {selectedRequest.rejectionReason && (
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 break-all break-words whitespace-pre-wrap">
                    <p className="text-[10px] font-black uppercase tracking-wider mb-1">Motivo de Rechazo Anterior:</p>
                    <p className="text-xs font-bold leading-normal">"{selectedRequest.rejectionReason}"</p>
                  </div>
                )}

                {selectedRequest.qualityObservations && (
                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-purple-700 break-all break-words whitespace-pre-wrap">
                    <p className="text-[10px] font-black uppercase tracking-wider mb-1">Observaciones de Calidad Física (UDP):</p>
                    <p className="text-xs font-bold leading-normal">"{selectedRequest.qualityObservations}"</p>
                  </div>
                )}

                {/* Items detail list */}
                <div>
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Detalle de Prendas</h3>
                  <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[9px] font-black border-b border-slate-100">
                          <th className="px-4 py-3 text-left">Modelo</th>
                          <th className="px-4 py-3 text-left">Color</th>
                          <th className="px-2 py-3">28</th>
                          <th className="px-2 py-3">30</th>
                          <th className="px-2 py-3">32</th>
                          <th className="px-2 py-3">34</th>
                          <th className="px-2 py-3">36</th>
                          <th className="px-2 py-3">38</th>
                          <th className="px-2 py-3">40</th>
                          <th className="px-2 py-3">42</th>
                          <th className="px-2 py-3">44</th>
                          <th className="px-2 py-3">46</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {selectedRequest.items.map((item: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-900 uppercase font-black text-left break-words whitespace-normal max-w-[200px]">{item.modelName}</td>
                            <td className="px-4 py-3 text-slate-400 uppercase text-left break-words whitespace-normal max-w-[150px]">{item.color}</td>
                            <td className="px-2 py-3">{item.s28 || <span className="text-slate-300">—</span>}</td>
                            <td className="px-2 py-3">{item.m30 || <span className="text-slate-300">—</span>}</td>
                            <td className="px-2 py-3">{item.l32 || <span className="text-slate-300">—</span>}</td>
                            <td className="px-2 py-3">{item.xl34 || <span className="text-slate-300">—</span>}</td>
                            <td className="px-2 py-3">{item.xxl36 || <span className="text-slate-300">—</span>}</td>
                            <td className="px-2 py-3">{item.size38 || <span className="text-slate-300">—</span>}</td>
                            <td className="px-2 py-3">{item.size40 || <span className="text-slate-300">—</span>}</td>
                            <td className="px-2 py-3">{item.size42 || <span className="text-slate-300">—</span>}</td>
                            <td className="px-2 py-3">{item.size44 || <span className="text-slate-300">—</span>}</td>
                            <td className="px-2 py-3">{item.size46 || <span className="text-slate-300">—</span>}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-black">{item.quantity} unds</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* State action review inputs */}
                {showRejectionInput && (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Especifica la razón del rechazo</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Escribe por qué se rechaza esta devolución..."
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-rose-500"
                      required
                    />
                  </div>
                )}

                {/* UDP observations form */}
                {selectedRequest.status === 'PENDIENTE_UDP' && (user?.role === 'UDP' || user?.role === 'ADMIN') && (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Observaciones de Control de Calidad</label>
                    <textarea
                      value={qualityObservations}
                      onChange={(e) => setQualityObservations(e.target.value)}
                      placeholder="Escribe observaciones sobre el estado físico de la mercadería recibida..."
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                )}

                {/* Footer review buttons depending on status and role */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-xl text-xs"
                  >
                    Cerrar
                  </button>

                  {/* 1. COMERCIAL review option */}
                  {(selectedRequest.status === 'PENDIENTE_COMERCIAL' || selectedRequest.status === 'RECHAZADO_ADMIN') && (user?.role === 'COMERCIAL' || user?.role === 'ADMIN') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleComercialReview('REJECT')}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black px-5 py-2.5 rounded-xl text-xs transition-all"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleComercialReview('APPROVE')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs transition-all shadow-md"
                      >
                        Aprobar y Enviar a Admin
                      </button>
                    </div>
                  )}

                  {/* 2. ADMIN review option */}
                  {(selectedRequest.status === 'PENDIENTE_ADMIN' || selectedRequest.status === 'RECHAZADO_UDP') && (user?.role === 'ADMIN') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdminReview('REJECT')}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black px-5 py-2.5 rounded-xl text-xs transition-all"
                      >
                        Rechazar a Comercial
                      </button>
                      <button
                        onClick={() => handleAdminReview('APPROVE')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs transition-all shadow-md"
                      >
                        Aprobar y Enviar a Calidad (UDP)
                      </button>
                    </div>
                  )}

                  {/* 3. UDP (Quality) review option */}
                  {selectedRequest.status === 'PENDIENTE_UDP' && (user?.role === 'UDP' || user?.role === 'ADMIN') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUdpReview('REJECT')}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black px-5 py-2.5 rounded-xl text-xs transition-all"
                      >
                        Rechazar y Devolver a Admin
                      </button>
                      <button
                        onClick={() => handleUdpReview('APPROVE')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs transition-all shadow-md"
                      >
                        Aprobar Control de Calidad
                      </button>
                    </div>
                  )}

                  {/* 4. LOGISTICA final receive option */}
                  {selectedRequest.status === 'PENDIENTE_LOGISTICA' && (user?.role === 'LOGISTICA' || user?.role === 'ADMIN') && (
                    <button
                      onClick={handleLogisticsReceive}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirmar Reingreso al Inventario
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
