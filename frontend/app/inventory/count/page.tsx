// frontend/app/inventory/count/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Layout } from '../../../components/common/Layout';
import { useProducts } from '../../../hooks/useProducts';
import api from '../../../lib/axios';
import {
  ClipboardCheck,
  Search,
  Filter,
  Barcode,
  Printer,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  Check,
  X,
  History,
  FileText,
  Boxes,
  Plus,
  Minus,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Package,
  Layers,
  MapPin,
  UploadCloud,
  CheckCheck,
  TrendingDown,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  printAuditBlankSheet,
  exportAuditToExcel,
  printFinalAuditReport,
  AuditReportItem,
  AuditReportData
} from '../../../utils/inventoryAuditReport';

interface CountItem {
  variantId: string;
  productId: string;
  productName: string;
  category: string;
  inventoryType: string;
  variantSku: string;
  size: string;
  color: string;
  location: string;
  systemStock: number;
  countedStock: number;
  difference: number;
  isChecked: boolean;
  observation: string;
}

export default function InventoryCountPage() {
  const queryClient = useQueryClient();
  const { products, isLoading: productsLoading } = useProducts();

  // Estados principales
  const [activeTab, setActiveTab] = useState<'count' | 'history'>('count');
  const [selectedInventoryType, setSelectedInventoryType] = useState('TODOS');
  
  // Periodo (por defecto mes y año actual, ej: 2026-10)
  const currentPeriodDefault = format(new Date(), 'yyyy-MM');
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodDefault);

  // Datos del conteo en memoria
  const [auditId, setAuditId] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState<'EN_PROCESO' | 'CERRADO'>('EN_PROCESO');
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [auditNotes, setAuditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Filtros de tabla
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'checked' | 'diff'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'location' | 'sku' | 'stock_desc' | 'stock_asc'>('name_asc');

  // Escáner de código de barras
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScannedItem, setLastScannedItem] = useState<CountItem | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Modales
  const [showPhysicalUploadModal, setShowPhysicalUploadModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [applyKardexAdjustment, setApplyKardexAdjustment] = useState(true);
  const [finalizeNotes, setFinalizeNotes] = useState('');

  // Historial
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoricalAudit, setSelectedHistoricalAudit] = useState<any | null>(null);

  // Determinar si hoy está dentro del ciclo normal de conteo mensual (del 20 a fin de mes)
  const currentDay = new Date().getDate();
  const isMonthlyWindowActive = currentDay >= 20;

  // Generar opciones de periodos (últimos 12 meses)
  const periodOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      const val = format(d, 'yyyy-MM');
      const label = format(d, 'MMMM yyyy', { locale: es });
      list.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return list;
  }, []);

  const inventoryTypes = [
    { id: 'TODOS', label: 'Todos los Tipos', icon: Package },
    { id: 'AVIOS', label: 'Avíos', icon: Boxes },
    { id: 'MATERIALES', label: 'Materiales', icon: FileText },
    { id: 'TERMINADOS', label: 'Productos de Primera', icon: CheckCircle2 },
    { id: 'SEGUNDA', label: 'De Segunda', icon: RefreshCw },
    { id: 'PROCESO', label: 'En Proceso', icon: Clock },
    { id: 'MAQUINARIA', label: 'Maquinaria', icon: SlidersHorizontal },
    { id: 'OTROS', label: 'Otros', icon: Layers },
  ];

  // 1. Inicializar lista de ítems a partir de productos y cargar sesión activa del backend
  useEffect(() => {
    if (!products || products.length === 0) return;

    const loadAuditSession = async () => {
      setIsLoadingAudit(true);
      try {
        // Flatten all products into variants
        const initialList: CountItem[] = [];

        products.forEach((p: any) => {
          if (p.variants && p.variants.length > 0) {
            p.variants.forEach((v: any) => {
              initialList.push({
                variantId: v.id,
                productId: p.id,
                productName: p.name,
                category: p.category || '',
                inventoryType: p.inventoryType || 'TERMINADOS',
                variantSku: v.variantSku || p.sku || '',
                size: v.size || 'ESTÁNDAR',
                color: v.color || 'ÚNICO',
                location: v.location || p.location || 'A1',
                systemStock: Number(v.stock || 0),
                countedStock: Number(v.stock || 0),
                difference: 0,
                isChecked: false,
                observation: '',
              });
            });
          } else {
            initialList.push({
              variantId: p.id,
              productId: p.id,
              productName: p.name,
              category: p.category || '',
              inventoryType: p.inventoryType || 'TERMINADOS',
              variantSku: p.sku || '',
              size: 'ESTÁNDAR',
              color: 'ÚNICO',
              location: p.location || 'A1',
              systemStock: 0,
              countedStock: 0,
              difference: 0,
              isChecked: false,
              observation: '',
            });
          }
        });

        // Intentar obtener auditoría guardada en backend para este periodo y tipo
        const resp = await api.get(`/inventory/audits/active?period=${selectedPeriod}&type=${selectedInventoryType}`);
        const activeAudit = resp.data;

        if (activeAudit && activeAudit.items) {
          setAuditId(activeAudit.id);
          setAuditStatus(activeAudit.status || 'EN_PROCESO');
          setAuditNotes(activeAudit.notes || '');

          // Mezclar datos guardados con la lista completa
          const itemMap = new Map();
          activeAudit.items.forEach((item: any) => {
            itemMap.set(item.variantId, item);
          });

          const merged = initialList.map(baseItem => {
            const saved = itemMap.get(baseItem.variantId);
            if (saved) {
              const countedStock = Number(saved.countedStock !== undefined ? saved.countedStock : baseItem.systemStock);
              return {
                ...baseItem,
                location: saved.location || baseItem.location,
                countedStock,
                difference: saved.isChecked ? (countedStock - baseItem.systemStock) : 0,
                isChecked: !!saved.isChecked,
                observation: saved.observation || '',
              };
            }
            return baseItem;
          });

          setCountItems(merged);
        } else {
          setAuditId(null);
          setAuditStatus('EN_PROCESO');
          setAuditNotes('');
          setCountItems(initialList);
        }
      } catch (err) {
        console.error('Error al cargar auditoría activa:', err);
      } finally {
        setIsLoadingAudit(false);
      }
    };

    loadAuditSession();
  }, [products, selectedPeriod, selectedInventoryType]);

  // Cargar historial
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const resp = await api.get('/inventory/audits/history');
      setHistoryList(resp.data || []);
    } catch (err) {
      console.error('Error al cargar historial de auditorías:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Filtrado y ordenamiento de ítems en pantalla
  const filteredItems = useMemo(() => {
    return countItems
      .filter(item => {
        // Filtro por tipo de inventario
        if (selectedInventoryType !== 'TODOS' && item.inventoryType !== selectedInventoryType) {
          return false;
        }

        // Filtro por buscador
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const matches =
            item.productName.toLowerCase().includes(s) ||
            item.variantSku.toLowerCase().includes(s) ||
            item.location.toLowerCase().includes(s) ||
            item.category.toLowerCase().includes(s) ||
            item.size.toLowerCase().includes(s) ||
            item.color.toLowerCase().includes(s);
          if (!matches) return false;
        }

        // Filtro por estado
        if (statusFilter === 'pending' && item.isChecked) return false;
        if (statusFilter === 'checked' && !item.isChecked) return false;
        if (statusFilter === 'diff' && (!item.isChecked || Math.abs(item.difference) < 0.001)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.productName.localeCompare(b.productName);
        if (sortBy === 'name_desc') return b.productName.localeCompare(a.productName);
        if (sortBy === 'location') return a.location.localeCompare(b.location);
        if (sortBy === 'sku') return a.variantSku.localeCompare(b.variantSku);
        if (sortBy === 'stock_desc') return b.systemStock - a.systemStock;
        if (sortBy === 'stock_asc') return a.systemStock - b.systemStock;
        return 0;
      });
  }, [countItems, selectedInventoryType, searchTerm, statusFilter, sortBy]);

  // Estadísticas del conteo actual (dentro del tipo seleccionado)
  const stats = useMemo(() => {
    const scopeItems = countItems.filter(i => selectedInventoryType === 'TODOS' || i.inventoryType === selectedInventoryType);
    const total = scopeItems.length;
    const checked = scopeItems.filter(i => i.isChecked).length;
    const matched = scopeItems.filter(i => i.isChecked && Math.abs(i.difference) < 0.001).length;
    const withDiff = scopeItems.filter(i => i.isChecked && Math.abs(i.difference) >= 0.001).length;
    const pending = total - checked;
    const totalDiffUnits = scopeItems
      .filter(i => i.isChecked)
      .reduce((acc, i) => acc + i.difference, 0);

    const missingUnits = scopeItems
      .filter(i => i.isChecked && i.difference < 0)
      .reduce((acc, i) => acc + Math.abs(i.difference), 0);

    const excessUnits = scopeItems
      .filter(i => i.isChecked && i.difference > 0)
      .reduce((acc, i) => acc + i.difference, 0);

    const progressPct = total > 0 ? Math.round((checked / total) * 100) : 0;

    return {
      total,
      checked,
      matched,
      withDiff,
      pending,
      totalDiffUnits,
      missingUnits,
      excessUnits,
      progressPct,
    };
  }, [countItems, selectedInventoryType]);

  // Actualizar ítem individual
  const updateItem = (variantId: string, updates: Partial<CountItem>) => {
    setCountItems(prev =>
      prev.map(item => {
        if (item.variantId === variantId) {
          const updated = { ...item, ...updates };
          const counted = updated.countedStock !== undefined ? Number(updated.countedStock) : item.systemStock;
          const diff = updated.isChecked ? (counted - item.systemStock) : 0;
          return {
            ...updated,
            countedStock: counted,
            difference: diff,
          };
        }
        return item;
      })
    );
  };

  // Marcar / desmarcar check
  const toggleItemCheck = (variantId: string) => {
    const item = countItems.find(i => i.variantId === variantId);
    if (!item) return;
    const nextChecked = !item.isChecked;
    updateItem(variantId, {
      isChecked: nextChecked,
      countedStock: nextChecked && item.countedStock === 0 && item.systemStock > 0 ? item.systemStock : item.countedStock,
    });
  };

  // Marcar todos como conformes (100% OK)
  const markAllAsChecked = () => {
    setCountItems(prev =>
      prev.map(item => {
        if (selectedInventoryType === 'TODOS' || item.inventoryType === selectedInventoryType) {
          return {
            ...item,
            isChecked: true,
            countedStock: item.systemStock,
            difference: 0,
          };
        }
        return item;
      })
    );
    toast.success('Todos los productos marcados como conformes (100% OK)');
  };

  // Desmarcar todos
  const uncheckAll = () => {
    if (!confirm('¿Deseas desmarcar todos los ítems de esta categoría?')) return;
    setCountItems(prev =>
      prev.map(item => {
        if (selectedInventoryType === 'TODOS' || item.inventoryType === selectedInventoryType) {
          return {
            ...item,
            isChecked: false,
            countedStock: item.systemStock,
            difference: 0,
            observation: '',
          };
        }
        return item;
      })
    );
  };

  // Manejador del Escáner de Códigos de Barras
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    // Buscar en los ítems
    const match = countItems.find(
      i =>
        i.variantSku.toUpperCase() === code.toUpperCase() ||
        (i.variantSku.endsWith(code) && code.length >= 6)
    );

    if (match) {
      // Si el ítem no pertenece al tipo actual, advertir pero permitir seleccionarlo
      if (selectedInventoryType !== 'TODOS' && match.inventoryType !== selectedInventoryType) {
        toast((t) => (
          <span className="text-xs">
            El producto pertenece a <b>{match.inventoryType}</b>. Cambia de pestaña para verlo en su sección.
          </span>
        ), { icon: 'ℹ️' });
      }

      // Marcar conforme e incrementar o confirmar stock
      updateItem(match.variantId, {
        isChecked: true,
        countedStock: match.isChecked ? match.countedStock + 1 : match.systemStock,
      });

      setLastScannedItem({
        ...match,
        isChecked: true,
        countedStock: match.isChecked ? match.countedStock + 1 : match.systemStock,
      });
      setShowScanModal(true);
      toast.success(`✓ Identificado: ${match.productName} (Stock: ${match.systemStock})`);
    } else {
      toast.error(`Código no encontrado: ${code}`);
    }

    setBarcodeInput('');
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  };

  // Guardar progreso en backend (Draft / En proceso)
  const handleSaveProgress = async (silent = false) => {
    setIsSaving(true);
    try {
      const scopeItems = countItems.filter(i => selectedInventoryType === 'TODOS' || i.inventoryType === selectedInventoryType);

      const payload = {
        auditId,
        period: selectedPeriod,
        inventoryType: selectedInventoryType,
        notes: auditNotes,
        items: scopeItems.map(i => ({
          variantId: i.variantId,
          productId: i.productId,
          productName: i.productName,
          variantSku: i.variantSku,
          size: i.size,
          color: i.color,
          location: i.location,
          systemStock: i.systemStock,
          countedStock: i.countedStock,
          isChecked: i.isChecked,
          observation: i.observation,
        })),
      };

      const resp = await api.post('/inventory/audits/save', payload);
      setAuditId(resp.data.id);
      if (!silent) {
        toast.success('Progreso de conteo guardado exitosamente.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error al guardar el progreso');
    } finally {
      setIsSaving(false);
    }
  };

  // Finalizar Conteo Oficialmente y Cerrar
  const handleFinalizeAudit = async () => {
    if (!auditId) {
      await handleSaveProgress(true);
    }

    setIsSaving(true);
    try {
      // Guardar primero para asegurar consistencia
      const scopeItems = countItems.filter(i => selectedInventoryType === 'TODOS' || i.inventoryType === selectedInventoryType);
      const saveResp = await api.post('/inventory/audits/save', {
        auditId,
        period: selectedPeriod,
        inventoryType: selectedInventoryType,
        notes: finalizeNotes || auditNotes,
        items: scopeItems.map(i => ({
          variantId: i.variantId,
          productId: i.productId,
          productName: i.productName,
          variantSku: i.variantSku,
          size: i.size,
          color: i.color,
          location: i.location,
          systemStock: i.systemStock,
          countedStock: i.countedStock,
          isChecked: i.isChecked,
          observation: i.observation,
        })),
      });

      const currentAuditId = saveResp.data.id;

      // Finalizar en backend
      const finalizeResp = await api.post(`/inventory/audits/${currentAuditId}/finalize`, {
        applyStockAdjustment: applyKardexAdjustment,
        notes: finalizeNotes || auditNotes,
      });

      setAuditStatus('CERRADO');
      setShowFinalizeModal(false);
      toast.success(
        applyKardexAdjustment
          ? '¡Conteo cerrado y ajuste de stock aplicado en Kardex!'
          : '¡Conteo de inventario cerrado y guardado en historial!'
      );

      // Refrescar inventario general
      queryClient.invalidateQueries('products');

      // Generar e imprimir Acta Oficial
      printFinalAuditReport(finalizeResp.data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al finalizar el conteo');
    } finally {
      setIsSaving(false);
    }
  };

  // Imprimir planilla de conteo físico para ir con papel
  const handlePrintBlankSheet = () => {
    const itemsToPrint: AuditReportItem[] = filteredItems.map(i => ({
      variantSku: i.variantSku,
      productName: i.productName,
      size: i.size,
      color: i.color,
      location: i.location,
      systemStock: i.systemStock,
      observation: i.observation,
    }));

    printAuditBlankSheet({
      period: selectedPeriod,
      inventoryType: selectedInventoryType,
      items: itemsToPrint,
    });
  };

  // Exportar Excel
  const handleExportExcel = () => {
    const itemsToExport: AuditReportItem[] = filteredItems.map(i => ({
      variantSku: i.variantSku,
      productName: i.productName,
      size: i.size,
      color: i.color,
      location: i.location,
      systemStock: i.systemStock,
      countedStock: i.countedStock,
      isChecked: i.isChecked,
      observation: i.observation,
    }));

    exportAuditToExcel({
      period: selectedPeriod,
      inventoryType: selectedInventoryType,
      items: itemsToExport,
    });
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* ── HEADER Y BREADCRUMB ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/inventory"
              className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition shadow-sm"
              title="Volver a Inventario"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Conteo Físico y Auditoría de Inventario
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Control Mensual
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Verifica tus existencias físicas vs. el sistema, ajusta diferencias y genera actas firmadas.
              </p>
            </div>
          </div>

          {/* Selector de Periodo y Tabs Superiores */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-gray-500">Periodo:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-xs font-bold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {periodOptions.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Toggle de Pestañas (Conteo Activo vs Historial) */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center border border-gray-200">
              <button
                onClick={() => setActiveTab('count')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'count'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Conteo Activo
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Historial Mensual
              </button>
            </div>
          </div>
        </div>

        {/* ── ALERTA DE CICLO MENSUAL (DEL 20 A FIN DE MES) ── */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
          isMonthlyWindowActive
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-200'
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white ${isMonthlyWindowActive ? 'bg-emerald-600' : 'bg-blue-600'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                {isMonthlyWindowActive ? 'Ventana de Conteo Oficial Abierta (Del 20 al fin de mes)' : 'Ciclo de Conteo Mensual'}
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/80 border border-gray-300 text-gray-700">
                  Día {currentDay}
                </span>
              </h4>
              <p className="text-xs text-gray-600">
                El conteo mensual inicia formalmente el día 20 de cada mes y se cierra a fin de mes para guardar el registro histórico.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-gray-600">Estado de la sesión:</span>
            <span className={`px-2.5 py-1 rounded-full ${
              auditStatus === 'CERRADO'
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {auditStatus === 'CERRADO' ? '🔒 CERRADO / ARCHIVADO' : '🟢 EN PROCESO'}
            </span>
          </div>
        </div>

        {activeTab === 'count' ? (
          <>
            {/* ── BARRA DE TABS DE TIPOS DE INVENTARIO ── */}
            <div className="flex flex-wrap gap-2">
              {inventoryTypes.map(t => {
                const Icon = t.icon;
                const isActive = selectedInventoryType === t.id;
                const countOfThisType = countItems.filter(i => t.id === 'TODOS' ? true : i.inventoryType === t.id).length;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedInventoryType(t.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                    <span className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {countOfThisType}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── TARJETAS DE ESTADÍSTICAS DEL CONTEO ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Ítems</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{stats.total}</p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.progressPct}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{stats.progressPct}% auditado</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conformes (OK)
                </p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{stats.matched}</p>
                <p className="text-[10px] text-gray-500 mt-1">100% coincidencia</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Con Descuadre
                </p>
                <p className="text-2xl font-black text-red-600 mt-1">{stats.withDiff}</p>
                <p className="text-[10px] text-gray-500 mt-1">Faltan o sobran</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Pendientes
                </p>
                <p className="text-2xl font-black text-amber-600 mt-1">{stats.pending}</p>
                <p className="text-[10px] text-gray-500 mt-1">Por verificar</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Total Faltante
                </p>
                <p className="text-2xl font-black text-rose-600 mt-1">-{stats.missingUnits}</p>
                <p className="text-[10px] text-gray-500 mt-1">Unidades menos</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Total Sobrante
                </p>
                <p className="text-2xl font-black text-blue-600 mt-1">+{stats.excessUnits}</p>
                <p className="text-[10px] text-gray-500 mt-1">Unidades más</p>
              </div>
            </div>

            {/* ── BARRA DE ACCIONES Y ESCÁNER DE CÓDIGO DE BARRAS ── */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Escáner de código de barras USB / Manual */}
                <form onSubmit={handleBarcodeScan} className="flex-1 max-w-md">
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-emerald-600">
                      <Barcode className="w-5 h-5 animate-pulse" />
                    </div>
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="Escanea el código de barras aquí con la lectora..."
                      className="w-full pl-11 pr-24 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      Buscar
                    </button>
                  </div>
                </form>

                {/* Botones de acción principales */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handlePrintBlankSheet}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition shadow-sm"
                    title="Imprimir hoja para conteo manual en almacén"
                  >
                    <Printer className="w-4 h-4 text-gray-600" />
                    Imprimir Planilla (PDF)
                  </button>

                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-sm"
                    title="Descargar Excel con todos los productos"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Excel
                  </button>

                  <button
                    onClick={() => setShowPhysicalUploadModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-600/20"
                    title="Cargar rápidamente el conteo que realizaste con papel"
                  >
                    <UploadCloud className="w-4 h-4" />
                    Subir Reporte Físico
                  </button>

                  <button
                    onClick={() => handleSaveProgress(false)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Guardando...' : 'Guardar Progreso'}
                  </button>

                  <button
                    onClick={() => setShowFinalizeModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-purple-600/25"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Finalizar Conteo
                  </button>
                </div>
              </div>

              {/* Filtros de la Tabla */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <div className="flex-1 w-full sm:max-w-xs relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar producto, SKU o ubicación..."
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Filtro por estado */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 bg-white"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="pending">Solo Pendientes (Sin check)</option>
                    <option value="checked">Solo Conformes (Con check)</option>
                    <option value="diff">Solo con Diferencias (Falta/Sobra)</option>
                  </select>

                  {/* Ordenar por */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 bg-white"
                  >
                    <option value="name_asc">Nombre (A - Z)</option>
                    <option value="name_desc">Nombre (Z - A)</option>
                    <option value="location">Ubicación Almacén (A1...)</option>
                    <option value="sku">SKU</option>
                    <option value="stock_desc">Mayor Stock Sistema</option>
                    <option value="stock_asc">Menor Stock Sistema</option>
                  </select>

                  <button
                    onClick={markAllAsChecked}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 transition"
                  >
                    Marcar Todo OK
                  </button>
                  <button
                    onClick={uncheckAll}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>

            {/* ── TABLA PRINCIPAL DE CONTEO FÍSICO ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-[11px] font-black uppercase text-gray-500 tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">OK</th>
                      <th className="py-3 px-3">Ubicación</th>
                      <th className="py-3 px-3">SKU</th>
                      <th className="py-3 px-4">Producto / Variante</th>
                      <th className="py-3 px-3 text-center">Stock Sistema</th>
                      <th className="py-3 px-4 text-center">Conteo Físico</th>
                      <th className="py-3 px-3 text-center">Diferencia</th>
                      <th className="py-3 px-4">Observaciones</th>
                      <th className="py-3 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-gray-400">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No se encontraron productos para los filtros seleccionados
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const isDiff = item.isChecked && Math.abs(item.difference) >= 0.001;
                        return (
                          <tr
                            key={item.variantId}
                            className={`transition hover:bg-gray-50/80 ${
                              item.isChecked
                                ? isDiff
                                  ? 'bg-red-50/40'
                                  : 'bg-emerald-50/30'
                                : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={item.isChecked}
                                onChange={() => toggleItemCheck(item.variantId)}
                                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>

                            {/* Ubicación */}
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                                <MapPin className="w-3 h-3 text-rose-500" />
                                {item.location || 'A1'}
                              </span>
                            </td>

                            {/* SKU */}
                            <td className="py-3 px-3 font-mono font-semibold text-gray-800">
                              {item.variantSku}
                            </td>

                            {/* Producto y Variante */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-gray-900">{item.productName}</div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                                  Talla: {item.size}
                                </span>
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                                  Color: {item.color}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  ({item.inventoryType})
                                </span>
                              </div>
                            </td>

                            {/* Stock Sistema */}
                            <td className="py-3 px-3 text-center">
                              <span className="font-bold text-gray-900 text-sm">
                                {item.systemStock}
                              </span>
                            </td>

                            {/* Conteo Físico (Input interactivo) */}
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = Math.max(0, item.countedStock - 1);
                                    updateItem(item.variantId, { countedStock: next, isChecked: true });
                                  }}
                                  className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.countedStock}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                                    updateItem(item.variantId, { countedStock: val, isChecked: true });
                                  }}
                                  className={`w-16 px-2 py-1 text-center font-bold text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                                    item.isChecked
                                      ? isDiff
                                        ? 'border-red-300 bg-red-50 text-red-900 focus:ring-red-400'
                                        : 'border-emerald-300 bg-emerald-50 text-emerald-900 focus:ring-emerald-400'
                                      : 'border-gray-200 text-gray-800 focus:ring-blue-400'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = item.countedStock + 1;
                                    updateItem(item.variantId, { countedStock: next, isChecked: true });
                                  }}
                                  className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Diferencia */}
                            <td className="py-3 px-3 text-center">
                              {item.isChecked ? (
                                item.difference === 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                                    0 (OK)
                                  </span>
                                ) : item.difference < 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800">
                                    {item.difference} (Falta)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                                    +{item.difference} (Sobra)
                                  </span>
                                )
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>

                            {/* Observación */}
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={item.observation}
                                onChange={(e) => updateItem(item.variantId, { observation: e.target.value })}
                                placeholder={isDiff ? "Explica la diferencia..." : "Notas opcionales..."}
                                className="w-full px-2.5 py-1 border border-gray-200 rounded-lg text-xs placeholder:text-gray-300 focus:outline-none focus:border-emerald-500"
                              />
                            </td>

                            {/* Acciones */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  updateItem(item.variantId, {
                                    countedStock: item.systemStock,
                                    isChecked: true,
                                    difference: 0,
                                  });
                                  toast.success(`✓ ${item.productName} igualado`);
                                }}
                                className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition"
                                title="Igualar conteo a stock de sistema"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pie de tabla con resumen rápido */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
                <div>
                  Mostrando <span className="font-bold text-gray-800">{filteredItems.length}</span> productos
                  {selectedInventoryType !== 'TODOS' && <span> de tipo <b>{selectedInventoryType}</b></span>}
                </div>
                <div className="flex items-center gap-3">
                  <span>Conformes: <b className="text-emerald-600">{stats.matched}</b></span>
                  <span>Con descuadre: <b className="text-red-600">{stats.withDiff}</b></span>
                  <span>Pendientes: <b className="text-amber-600">{stats.pending}</b></span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ── PESTAÑA HISTORIAL DE AUDITORÍAS / CONTEOS ── */
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Historial de Conteos y Ajustes Mensuales</h3>
                <p className="text-xs text-gray-500">Registro histórico de auditorías realizadas cada mes.</p>
              </div>
              <button
                onClick={fetchHistory}
                disabled={isLoadingHistory}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                Actualizar Historial
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-16 text-center text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
                Cargando historial de conteos...
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-medium text-gray-600">Aún no hay conteos finalizados en el historial</p>
                <p className="text-xs text-gray-400 mt-1">Completa y finaliza un conteo para registrarlo aquí.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-[11px] font-black uppercase text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Periodo</th>
                      <th className="py-3 px-4">Tipo Inventario</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Auditor / Responsable</th>
                      <th className="py-3 px-3 text-center">Ítems</th>
                      <th className="py-3 px-3 text-center">Conformes</th>
                      <th className="py-3 px-3 text-center">Descuadres</th>
                      <th className="py-3 px-3 text-center">Diferencia Neta</th>
                      <th className="py-3 px-4">Fecha Cierre</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyList.map(h => (
                      <tr key={h.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4 font-bold text-gray-900">{h.period}</td>
                        <td className="py-3 px-4 font-semibold text-gray-700">{h.inventoryType}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            h.status === 'CERRADO'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {h.status === 'CERRADO' ? 'Cerrado' : 'En Proceso'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{h.userName || 'Usuario'}</td>
                        <td className="py-3 px-3 text-center font-bold text-gray-800">{h.totalItems}</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600">{h.matchedItems}</td>
                        <td className="py-3 px-3 text-center font-bold text-red-600">{h.mismatchedItems}</td>
                        <td className="py-3 px-3 text-center font-bold">
                          {h.totalDifference > 0 ? `+${h.totalDifference}` : h.totalDifference}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {h.closedAt ? format(new Date(h.closedAt), 'dd/MM/yyyy HH:mm') : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={async () => {
                              try {
                                const resp = await api.get(`/inventory/audits/${h.id}`);
                                printFinalAuditReport(resp.data);
                              } catch (err) {
                                toast.error('Error al generar acta en PDF');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold border border-purple-200 transition"
                            title="Descargar o imprimir acta oficial en PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Acta PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: SUBIR REPORTE FÍSICO REALIZADO (CONTEO EN PAPEL) ── */}
      <AnimatePresence>
        {showPhysicalUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-teal-100 rounded-xl text-teal-700">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Registrar Conteo Físico Realizado</h3>
                    <p className="text-xs text-gray-500">Carga rápida para cuando realizaste el conteo en papel.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPhysicalUploadModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-200/60 text-xs text-teal-900 space-y-2">
                <p className="font-bold">¿Cómo funciona la carga rápida?</p>
                <ol className="list-decimal pl-4 space-y-1 text-teal-800">
                  <li>Haz clic en <b>"Marcar Todos Conformes (100% OK)"</b> para que todos los productos se den por verificados.</li>
                  <li>Luego, usa la tabla principal para buscar los productos que tuvieron faltantes/sobrantes y ajusta su cantidad y nota.</li>
                  <li>Guarda o finaliza el conteo para registrarlo.</li>
                </ol>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    markAllAsChecked();
                    setShowPhysicalUploadModal(false);
                  }}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                >
                  <CheckCheck className="w-5 h-5" />
                  Marcar Todos los Productos como Conformes (100% OK)
                </button>

                <button
                  type="button"
                  onClick={() => setShowPhysicalUploadModal(false)}
                  className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs transition"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: CONFIRMACIÓN DE ESCANEO DE CÓDIGO DE BARRAS ── */}
      <AnimatePresence>
        {showScanModal && lastScannedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">Producto Escaneado</h3>
                </div>
                <button
                  onClick={() => setShowScanModal(false)}
                  className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl space-y-2 text-xs">
                <div>
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Producto:</span>
                  <p className="text-sm font-black text-gray-900">{lastScannedItem.productName}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold">SKU:</span>
                    <p className="font-mono font-bold text-gray-800">{lastScannedItem.variantSku}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Ubicación:</span>
                    <p className="font-bold text-rose-600">{lastScannedItem.location}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Talla / Color:</span>
                    <p className="font-bold text-gray-800">{lastScannedItem.size} / {lastScannedItem.color}</p>
                  </div>
                  <div className="bg-emerald-100/70 p-2 rounded-xl text-center">
                    <span className="text-emerald-800 text-[10px] uppercase font-black">Stock Sistema:</span>
                    <p className="text-base font-black text-emerald-900">{lastScannedItem.systemStock} uds</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowScanModal(false);
                    if (barcodeInputRef.current) barcodeInputRef.current.focus();
                  }}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
                >
                  Listo (Seguir Escaneando)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: RESUMEN Y FINALIZACIÓN DE AUDITORÍA ── */}
      <AnimatePresence>
        {showFinalizeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-100 rounded-xl text-purple-700">
                    <CheckCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Resumen y Cierre de Auditoría</h3>
                    <p className="text-xs text-gray-500">Periodo {selectedPeriod} | {selectedInventoryType}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFinalizeModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Estadísticas de Cierre */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-gray-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Total Ítems</p>
                  <p className="text-xl font-black text-gray-900 mt-0.5">{stats.total}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">Conformes (OK)</p>
                  <p className="text-xl font-black text-emerald-700 mt-0.5">{stats.matched}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-red-600 uppercase">Con Descuadre</p>
                  <p className="text-xl font-black text-red-700 mt-0.5">{stats.withDiff}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Diferencia Neta</p>
                  <p className="text-xl font-black text-blue-700 mt-0.5">
                    {stats.totalDiffUnits > 0 ? `+${stats.totalDiffUnits}` : stats.totalDiffUnits} uds
                  </p>
                </div>
              </div>

              {/* Lista de productos con descuadre si los hay */}
              {stats.withDiff > 0 && (
                <div className="border border-red-200 bg-red-50/30 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Detalle de Discrepancias / Faltantes ({stats.withDiff})
                  </h4>
                  <div className="max-h-40 overflow-y-auto divide-y divide-red-100 text-xs">
                    {countItems
                      .filter(i => i.isChecked && Math.abs(i.difference) >= 0.001)
                      .map(i => (
                        <div key={i.variantId} className="py-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-gray-900">{i.productName} ({i.size} / {i.color})</p>
                            <p className="text-[11px] text-gray-500 font-mono">
                              SKU: {i.variantSku} | Ubicación: {i.location}
                              {i.observation && <span className="ml-2 text-red-700 italic">"{i.observation}"</span>}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`font-black ${i.difference < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {i.difference < 0 ? `${i.difference}` : `+${i.difference}`} uds
                            </span>
                            <p className="text-[10px] text-gray-400">Sis: {i.systemStock} / Fís: {i.countedStock}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Opción de Ajuste Automático en Kardex */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyKardexAdjustment}
                    onChange={(e) => setApplyKardexAdjustment(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900">
                      Aplicar ajuste de inventario en Kardex automáticamente
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Si está marcado, el sistema actualizará el stock físico real y registrará los movimientos de entrada/salida por motivo <b>"Ajuste"</b> en el Kardex.
                    </p>
                  </div>
                </label>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Notas o Conclusiones de la Auditoría:
                  </label>
                  <textarea
                    rows={2}
                    value={finalizeNotes}
                    onChange={(e) => setFinalizeNotes(e.target.value)}
                    placeholder="Escribe conclusiones o motivos de ajustes observados..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold transition"
                >
                  Volver a Revisar
                </button>
                <button
                  type="button"
                  onClick={handleFinalizeAudit}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  {isSaving ? 'Cerrando...' : 'Aceptar y Cerrar Conteo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
