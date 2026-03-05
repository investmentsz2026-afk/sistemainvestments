// frontend/app/kardex/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import { useProducts } from '../../hooks/useProducts';
import { useMovements } from '../../hooks/useMovements';
import {
  Search,
  Filter,
  Calendar,
  Package,
  TrendingUp,
  Download,
  Printer,
  RefreshCw,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  FileText,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  User,
  Hash,
  Tag,
  Layers,
  DollarSign,
  PieChart,
  Activity,
  BookOpen,
  CheckCircle,
  Truck,
  MoreVertical
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface KardexFilters {
  productId: string;
  variantId: string;
  dateRange: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'custom';
  startDate: string;
  endDate: string;
  movementType: 'all' | 'ENTRY' | 'EXIT';
  inventoryType: string;
}

export default function KardexPage() {
  const { products, isLoading: productsLoading } = useProducts();
  const { movements, isLoading: movementsLoading } = useMovements();

  const [filters, setFilters] = useState<KardexFilters>({
    productId: 'todos',
    variantId: 'todas',
    dateRange: 'last30days',
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    movementType: 'all',
    inventoryType: 'TODOS'
  });

  const [showFilters, setShowFilters] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'analytics'>('table');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Aplicar filtros de fecha
  useEffect(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (filters.dateRange) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case 'last7days':
        start = startOfDay(subDays(now, 7));
        end = endOfDay(now);
        break;
      case 'last30days':
        start = startOfDay(subDays(now, 30));
        end = endOfDay(now);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = endOfDay(now);
        break;
      case 'custom':
        return;
    }

    setFilters(prev => ({
      ...prev,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    }));
  }, [filters.dateRange]);

  // Filtrar productos por búsqueda
  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.inventoryType.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Filtrar movimientos para Kardex
  const filteredMovements = movements?.filter(movement => {
    const movementDate = new Date(movement.createdAt);
    const startDateTime = new Date(`${filters.startDate}T00:00:00`);
    const endDateTime = new Date(`${filters.endDate}T23:59:59`);

    const matchesDate = movementDate >= startDateTime && movementDate <= endDateTime;
    const matchesProduct = filters.productId === 'todos' || movement.variant.productId === filters.productId;
    const matchesVariant = filters.variantId === 'todas' || movement.variantId === filters.variantId;
    const matchesType = filters.movementType === 'all' || movement.type === filters.movementType;
    const matchesInventoryType = filters.inventoryType === 'TODOS' || movement.variant.product.inventoryType === filters.inventoryType;

    return matchesDate && matchesProduct && matchesVariant && matchesType && matchesInventoryType;
  }) || [];

  // Ordenar movimientos
  const sortedMovements = [...filteredMovements].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Calcular estadísticas del Kardex
  const kardexStats = {
    totalMovements: filteredMovements.length,
    entries: filteredMovements.filter(m => m.type === 'ENTRY').length,
    exits: filteredMovements.filter(m => m.type === 'EXIT').length,
    totalQuantity: filteredMovements.reduce((sum, m) => sum + m.quantity, 0),
    entryQuantity: filteredMovements.filter(m => m.type === 'ENTRY').reduce((sum, m) => sum + m.quantity, 0),
    exitQuantity: filteredMovements.filter(m => m.type === 'EXIT').reduce((sum, m) => sum + m.quantity, 0),
    uniqueProducts: new Set(filteredMovements.map(m => m.variant.productId)).size,
    byReason: filteredMovements.reduce((acc: any, m) => {
      acc[m.reason] = (acc[m.reason] || 0) + m.quantity;
      return acc;
    }, {})
  };

  // Calcular running stock para cada producto/variante
  const getKardexWithRunningStock = () => {
    const movementsByVariant: { [key: string]: any[] } = {};

    // Agrupar movimientos por variante
    sortedMovements.forEach(m => {
      if (!movementsByVariant[m.variantId]) {
        movementsByVariant[m.variantId] = [];
      }
      movementsByVariant[m.variantId].push(m);
    });

    // Calcular running stock para cada grupo
    const result: any[] = [];
    Object.values(movementsByVariant).forEach((variantMovements: any[]) => {
      let runningStock = 0;
      variantMovements.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      variantMovements.forEach(m => {
        runningStock = m.newStock;
        result.push({
          ...m,
          runningStock
        });
      });
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  };

  const kardexWithRunningStock = getKardexWithRunningStock();

  // Search filter — searches across ALL records regardless of page
  const searchFilteredKardex = kardexWithRunningStock.filter(m => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      m.variant.product.name.toLowerCase().includes(s) ||
      m.variant.product.sku.toLowerCase().includes(s) ||
      m.variant.variantSku.toLowerCase().includes(s) ||
      m.variant.size.toLowerCase().includes(s) ||
      m.variant.color.toLowerCase().includes(s) ||
      m.reason.toLowerCase().includes(s) ||
      (m.reference || '').toLowerCase().includes(s) ||
      m.user.name.toLowerCase().includes(s) ||
      (m.type === 'ENTRY' ? 'entrada' : 'salida').includes(s)
    );
  });

  // Pagination on search-filtered results
  const totalPages = Math.max(1, Math.ceil(searchFilteredKardex.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedKardex = searchFilteredKardex.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  // Exportar a Excel
  const exportToExcel = () => {
    const data = kardexWithRunningStock.map(m => ({
      'Fecha': format(new Date(m.createdAt), 'dd/MM/yyyy HH:mm'),
      'Tipo': m.type === 'ENTRY' ? 'Entrada' : 'Salida',
      'Producto': m.variant.product.name,
      'SKU': m.variant.variantSku,
      'Talla': m.variant.size,
      'Color': m.variant.color,
      'Cantidad': m.quantity,
      'Motivo': m.reason,
      'Referencia': m.reference || '-',
      'Stock Anterior': m.previousStock,
      'Stock Nuevo': m.newStock,
      'Stock Correlativo': m.runningStock,
      'Usuario': m.user.name
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kardex');
    XLSX.writeFile(wb, `kardex-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`);
  };

  // Exportar a PDF
  const exportToPDF = () => {
    try {
      // Crear nuevo documento PDF
      const doc = new jsPDF();

      // Título
      doc.setFontSize(18);
      doc.text('Kardex de Inventario', 14, 15);

      // Subtítulo con fechas
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Período: ${filters.startDate} al ${filters.endDate}`, 14, 25);
      doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 32);

      // Definir columnas y filas para la tabla
      const tableColumn = [
        'Fecha',
        'Tipo',
        'Producto',
        'Talla/Color',
        'Cantidad',
        'Stock Anterior',
        'Stock Nuevo',
        'Motivo'
      ];

      const tableRows = kardexWithRunningStock.slice(0, 50).map(m => [
        format(new Date(m.createdAt), 'dd/MM/yyyy HH:mm'),
        m.type === 'ENTRY' ? 'Entrada' : 'Salida',
        m.variant.product.name,
        `${m.variant.size} / ${m.variant.color}`,
        m.quantity.toString(),
        m.previousStock.toString(),
        m.newStock.toString(),
        m.reason
      ]);

      // Generar la tabla con autoTable
      autoTable(doc, { // <-- USAR autoTable DIRECTAMENTE
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        margin: { top: 40, right: 10, bottom: 30, left: 10 },
        didDrawPage: (data) => {
          // Número de página
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Página ${data.pageNumber}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 10
          );
        }
      });

      // Resumen al final
      const finalY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Resumen del Período:', 14, finalY);

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total movimientos: ${kardexStats.totalMovements}`, 14, finalY + 7);
      doc.text(`Entradas: ${kardexStats.entries} (${kardexStats.entryQuantity} unidades)`, 14, finalY + 14);
      doc.text(`Salidas: ${kardexStats.exits} (${kardexStats.exitQuantity} unidades)`, 14, finalY + 21);
      doc.text(`Productos afectados: ${kardexStats.uniqueProducts}`, 14, finalY + 28);

      // Guardar el PDF
      doc.save(`kardex-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF. Por favor intente nuevamente.');
    }
  };

  const inventoryTypes = [
    { id: 'TODOS', label: 'Todos', icon: Package },
    { id: 'TERMINADOS', label: 'Terminados', icon: CheckCircle },
    { id: 'PROCESO', label: 'En Proceso', icon: Clock },
    { id: 'MATERIALES', label: 'Materiales', icon: FileText },
    { id: 'MAQUINARIA', label: 'Maquinaria', icon: Truck },
    { id: 'OTROS', label: 'Otros', icon: MoreVertical },
  ];

  if (productsLoading || movementsLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando Kardex...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Kardex</h1>
        </div>
        <p className="text-gray-600">
          Historial completo de movimientos y control de inventario
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-blue-100 text-sm mb-1">Total Movimientos</p>
          <p className="text-2xl font-bold">{kardexStats.totalMovements}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <p className="text-green-100 text-sm mb-1">Entradas</p>
          <p className="text-2xl font-bold">{kardexStats.entries}</p>
          <p className="text-xs text-green-100">{kardexStats.entryQuantity} unidades</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <p className="text-red-100 text-sm mb-1">Salidas</p>
          <p className="text-2xl font-bold">{kardexStats.exits}</p>
          <p className="text-xs text-red-100">{kardexStats.exitQuantity} unidades</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <p className="text-purple-100 text-sm mb-1">Productos</p>
          <p className="text-2xl font-bold">{kardexStats.uniqueProducts}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white">
          <p className="text-yellow-100 text-sm mb-1">Unidades</p>
          <p className="text-2xl font-bold">{kardexStats.totalQuantity}</p>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Selector de vista */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg border transition ${viewMode === 'table'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              Tabla
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-lg border transition ${viewMode === 'cards'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 rounded-lg border transition ${viewMode === 'analytics'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              Análisis
            </button>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              title={sortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        {/* Filtros */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Producto */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Producto
                </label>
                <select
                  value={filters.productId}
                  onChange={(e) => {
                    setFilters({ ...filters, productId: e.target.value, variantId: 'todas' });
                    const product = products?.find(p => p.id === e.target.value);
                    setSelectedProduct(product);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="todos">Todos los productos</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Variante */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Variante
                </label>
                <select
                  value={filters.variantId}
                  onChange={(e) => setFilters({ ...filters, variantId: e.target.value })}
                  disabled={!selectedProduct}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="todas">Todas las variantes</option>
                  {selectedProduct?.variants.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.size} / {v.color} (Stock: {v.stock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rango de fecha */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Período
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="today">Hoy</option>
                  <option value="yesterday">Ayer</option>
                  <option value="last7days">Últimos 7 días</option>
                  <option value="last30days">Últimos 30 días</option>
                  <option value="thisMonth">Este mes</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {/* Tipo de movimiento */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Tipo
                </label>
                <select
                  value={filters.movementType}
                  onChange={(e) => setFilters({ ...filters, movementType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="ENTRY">Solo entradas</option>
                  <option value="EXIT">Solo salidas</option>
                </select>
              </div>

              {/* Tipo de inventario */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Inventario
                </label>
                <select
                  value={filters.inventoryType}
                  onChange={(e) => setFilters({ ...filters, inventoryType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {inventoryTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fechas personalizadas */}
            {filters.dateRange === 'custom' && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vista de Tabla */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Fecha
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      Tipo
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      Producto
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Layers className="w-4 h-4" />
                      Variante
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Hash className="w-4 h-4" />
                      Cantidad
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Anterior
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Nuevo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      Stock Correlativo
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Motivo
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Usuario
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedKardex.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(movement.createdAt), 'dd/MM/yyyy')}
                      <br />
                      <span className="text-xs text-gray-400">
                        {format(new Date(movement.createdAt), 'HH:mm')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${movement.type === 'ENTRY'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {movement.type === 'ENTRY' ? (
                          <><ArrowUpCircle className="w-3 h-3 mr-1" /> Entrada</>
                        ) : (
                          <><ArrowDownCircle className="w-3 h-3 mr-1" /> Salida</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{movement.variant.product.name}</p>
                      <p className="text-xs text-gray-500">SKU: {movement.variant.product.sku}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="bg-gray-100 px-2 py-1 rounded text-xs inline-block">
                        {movement.variant.size} / {movement.variant.color}
                      </div>
                      <br />
                      <code className="text-xs text-gray-500">{movement.variant.variantSku}</code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-lg font-bold ${movement.type === 'ENTRY' ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {movement.type === 'ENTRY' ? '+' : '-'}{movement.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{movement.previousStock}</td>
                    <td className="px-6 py-4 text-gray-600">{movement.newStock}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-blue-600">{movement.runningStock}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{movement.reason}</p>
                      {movement.reference && (
                        <p className="text-xs text-gray-500">Ref: {movement.reference}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {movement.user.name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">{movement.user.name}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {searchFilteredKardex.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-500">
                Mostrando <span className="text-blue-600 font-bold">{((safeCurrentPage - 1) * ITEMS_PER_PAGE) + 1}</span> - <span className="text-blue-600 font-bold">{Math.min(safeCurrentPage * ITEMS_PER_PAGE, searchFilteredKardex.length)}</span> de <span className="text-blue-600 font-bold">{searchFilteredKardex.length}</span> registros{searchTerm.trim() ? ` (filtrado de ${kardexWithRunningStock.length} total)` : ''}
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >«</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                ><ChevronLeft className="w-4 h-4" /></button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) { page = i + 1; }
                  else if (safeCurrentPage <= 3) { page = i + 1; }
                  else if (safeCurrentPage >= totalPages - 2) { page = totalPages - 4 + i; }
                  else { page = safeCurrentPage - 2 + i; }
                  return (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${page === safeCurrentPage
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                    >{page}</button>
                  );
                })}

                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                ><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >»</button>
              </div>
            </div>
          )}

          {searchFilteredKardex.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm.trim() ? 'Sin resultados de búsqueda' : 'No hay movimientos'}
              </h3>
              <p className="text-gray-500">
                {searchTerm.trim()
                  ? `No se encontraron registros para "${searchTerm}"`
                  : 'No se encontraron movimientos para los filtros seleccionados'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Vista de Tarjetas */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kardexWithRunningStock.map((movement) => (
            <div key={movement.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${movement.type === 'ENTRY'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {movement.type === 'ENTRY' ? 'ENTRADA' : 'SALIDA'}
                  </span>
                  <p className="text-sm text-gray-500 mt-2">
                    {format(new Date(movement.createdAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <span className={`text-2xl font-bold ${movement.type === 'ENTRY' ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {movement.type === 'ENTRY' ? '+' : '-'}{movement.quantity}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="font-medium text-gray-900">{movement.variant.product.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {movement.variant.size} / {movement.variant.color}
                  </span>
                  <code className="text-xs text-gray-500">{movement.variant.variantSku}</code>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-gray-500">Anterior</p>
                  <p className="font-medium">{movement.previousStock}</p>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-blue-600">Nuevo</p>
                  <p className="font-medium text-blue-600">{movement.newStock}</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-green-600">Correlativo</p>
                  <p className="font-medium text-green-600">{movement.runningStock}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Motivo:</span> {movement.reason}
                </p>
                {movement.reference && (
                  <p className="text-sm text-gray-500 mt-1">Ref: {movement.reference}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">
                      {movement.user.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">{movement.user.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vista de Análisis */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          {/* Gráfico de movimientos por motivo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Movimientos por Motivo</h2>
            <div className="space-y-4">
              {(Object.entries(kardexStats.byReason) as [string, number][]).map(([reason, quantity]) => {
                const percentage = (Number(quantity) / kardexStats.totalQuantity) * 100;
                return (
                  <div key={reason}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{reason}</span>
                      <span className="font-medium text-gray-900">{quantity} unidades ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen por producto */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen por Producto</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Movimientos</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Entradas</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Salidas</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Stock Actual</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rotación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products?.map(product => {
                    const productMovements = filteredMovements.filter(m => m.variant.productId === product.id);
                    const entries = productMovements.filter(m => m.type === 'ENTRY').reduce((sum, m) => sum + m.quantity, 0);
                    const exits = productMovements.filter(m => m.type === 'EXIT').reduce((sum, m) => sum + m.quantity, 0);
                    const currentStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                    const rotation = currentStock > 0 ? (exits / currentStock).toFixed(2) : '0';

                    return (
                      <tr key={product.id}>
                        <td className="px-4 py-2 font-medium text-gray-900">{product.name}</td>
                        <td className="px-4 py-2">{productMovements.length}</td>
                        <td className="px-4 py-2 text-green-600">{entries}</td>
                        <td className="px-4 py-2 text-red-600">{exits}</td>
                        <td className="px-4 py-2">{currentStock}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${Number(rotation) > 2 ? 'bg-green-100 text-green-800' :
                            Number(rotation) > 1 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                            {rotation}x
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Línea de tiempo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Línea de Tiempo</h2>
            <div className="space-y-4">
              {kardexWithRunningStock.slice(0, 10).map((movement, index) => (
                <div key={movement.id} className="flex gap-4">
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${movement.type === 'ENTRY' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    {index < 9 && (
                      <div className="absolute top-4 left-1.5 w-0.5 h-12 bg-gray-200 -translate-x-1/2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {movement.variant.product.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(movement.createdAt), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {movement.type === 'ENTRY' ? 'Entrada' : 'Salida'} de {movement.quantity} unidades
                      {movement.reason && ` - ${movement.reason}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      Stock: {movement.previousStock} → {movement.newStock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}