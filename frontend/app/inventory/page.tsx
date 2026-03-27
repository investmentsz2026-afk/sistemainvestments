// frontend/app/inventory/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Layout } from '../../components/common/Layout';
import { useProducts } from '../../hooks/useProducts';
import { useInventory } from '../../hooks/useInventory';
import {
  Search,
  Filter,
  Package,
  Barcode,
  ArrowUpCircle,
  ArrowDownCircle,
  Download,
  Printer,
  RefreshCw,
  X,
  ChevronDown,
  Calendar,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  MoreVertical,
  FileText,
  Truck,
  ShoppingCart,
  DollarSign,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Boxes
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InventoryPage() {
  const { products, isLoading } = useProducts();
  const { registerMovement } = useInventory();

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [selectedSize, setSelectedSize] = useState('todas');
  const [selectedColor, setSelectedColor] = useState('todos');
  const [stockFilter, setStockFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('nombre');
  const [selectedInventoryType, setSelectedInventoryType] = useState('TODOS');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Obtener todas las categorías únicas
  const categories = products
    ? ['todas', ...Array.from(new Set(products.map(p => p.category)))]
    : ['todas'];

  // Obtener todas las tallas únicas
  const sizes = products
    ? ['todas', ...Array.from(new Set(products.flatMap(p => p.variants.map(v => v.size))))]
    : ['todas'];

  // Obtener todos los colores únicos
  const colors = products
    ? ['todos', ...Array.from(new Set(products.flatMap(p => p.variants.map(v => v.color))))]
    : ['todos'];

  // Filtrar productos
  const filteredProducts = products?.filter(product => {
    // Filtro por búsqueda
    const matchesSearch = searchTerm === '' ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.variants.some(v =>
        v.variantSku.toLowerCase().includes(searchTerm.toLowerCase())
      );

    // Filtro por categoría
    const matchesCategory = selectedCategory === 'todas' || product.category === selectedCategory;

    // Filtro por talla
    const matchesSize = selectedSize === 'todas' ||
      product.variants.some(v => v.size === selectedSize);

    // Filtro por color
    const matchesColor = selectedColor === 'todos' ||
      product.variants.some(v => v.color === selectedColor);

    // Filtro por stock
    let matchesStock = true;
    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    if (stockFilter === 'bajo') {
      matchesStock = product.variants.some(v => v.stock <= product.minStock);
    } else if (stockFilter === 'agotado') {
      matchesStock = totalStock === 0;
    } else if (stockFilter === 'disponible') {
      matchesStock = totalStock > 0;
    }

    // Filtro por tipo de inventario
    const matchesInventoryType = selectedInventoryType === 'TODOS' || product.inventoryType === selectedInventoryType;

    return matchesSearch && matchesCategory && matchesSize && matchesColor && matchesStock && matchesInventoryType;
  }) || [];

  // Ordenar productos
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'nombre') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'stock-asc') {
      const stockA = a.variants.reduce((sum, v) => sum + v.stock, 0);
      const stockB = b.variants.reduce((sum, v) => sum + v.stock, 0);
      return stockA - stockB;
    } else if (sortBy === 'stock-desc') {
      const stockA = a.variants.reduce((sum, v) => sum + v.stock, 0);
      const stockB = b.variants.reduce((sum, v) => sum + v.stock, 0);
      return stockB - stockA;
    } else if (sortBy === 'precio') {
      return b.sellingPrice - a.sellingPrice;
    }
    return 0;
  });

  // Paginación
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Resetear a la primera página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedSize, selectedColor, stockFilter, selectedInventoryType, sortBy]);

  // Estadísticas
  const totalProducts = products?.length || 0;
  const totalVariants = products?.reduce((acc, p) => acc + p.variants.length, 0) || 0;
  const totalStock = products?.reduce((acc, p) =>
    acc + p.variants.reduce((sum, v) => sum + v.stock, 0), 0
  ) || 0;
  const lowStockCount = products?.filter(p =>
    p.variants.some(v => v.stock <= p.minStock)
  ).length || 0;
  const outOfStockCount = products?.filter(p =>
    p.variants.every(v => v.stock === 0)
  ).length || 0;
  const totalValue = products?.reduce((acc, p) =>
    acc + p.variants.reduce((sum, v) => sum + (v.stock * p.purchasePrice), 0), 0
  ) || 0;

  const inventoryTypes = [
    { id: 'TODOS', label: 'Todos', icon: Package },
    { id: 'TERMINADOS', label: 'Terminados', icon: CheckCircle },
    { id: 'PROCESO', label: 'En Proceso', icon: Clock },
    { id: 'SEGUNDA', label: 'De Segunda', icon: RefreshCw },
    { id: 'MATERIALES', label: 'Materiales', icon: FileText },
    { id: 'MAQUINARIA', label: 'Maquinaria', icon: Truck },
    { id: 'AVIOS', label: 'Avíos', icon: Boxes },
    { id: 'OTROS', label: 'Otros', icon: MoreVertical },
  ];

  const handleMovement = async () => {
    if (!selectedProduct || !selectedVariant) return;

    try {
      await registerMovement({
        variantId: selectedVariant.id,
        type: movementType,
        quantity,
        reason,
        reference: reference || undefined
      });

      setShowMovementModal(false);
      setSelectedProduct(null);
      setSelectedVariant(null);
      setQuantity(1);
      setReason('');
      setReference('');
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
    }
  };

  const exportToExcel = () => {
    const data = sortedProducts.flatMap(product =>
      product.variants.map(variant => ({
        'Producto': product.name,
        'OP': product.op || '--',
        'SKU': variant.variantSku,
        'Categoría': product.category,
        'Tipo': product.inventoryType,
        'Talla': variant.size,
        'Color': variant.color,
        'Stock': variant.stock,
        'Stock Mín.': product.minStock,
        'P. Venta': product.sellingPrice,
        [['TERMINADOS', 'PROCESO', 'SEGUNDA'].includes(product.inventoryType) ? 'Costo de Producción' : 'P. Compra']: product.purchasePrice,
        'Valor Total': (variant.stock * product.purchasePrice)
      }))
    );

    const ws = XLSX.utils.json_to_sheet(data);
    // Column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `INVENTARIO_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    setShowExportModal(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('REPORTE DE INVENTARIO', 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generado: ${format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}`, 14, 25);
    doc.text(`Total productos: ${totalProducts} | Stock total: ${totalStock} | Valor: S/ ${totalValue.toLocaleString()}`, 14, 30);

    const headers = [['Producto', 'OP', 'SKU', 'Categoría', 'Tipo', 'Talla', 'Color', 'Stock', 'Costo/Compra', 'P. Venta', 'Valor']];
    const body = sortedProducts.flatMap(product =>
      product.variants.map(variant => [
        product.name,
        product.op || '--',
        variant.variantSku,
        product.category,
        product.inventoryType,
        variant.size,
        variant.color,
        variant.stock,
        `S/ ${product.purchasePrice.toFixed(2)}`,
        `S/ ${product.sellingPrice.toFixed(2)}`,
        `S/ ${(variant.stock * product.purchasePrice).toFixed(2)}`
      ])
    );

    autoTable(doc, {
      startY: 36,
      head: headers,
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        6: { halign: 'center', fontStyle: 'bold' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right', fontStyle: 'bold' }
      },
      didDrawPage: (data) => {
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Página ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 8);
      }
    });

    doc.save(`INVENTARIO_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    setShowExportModal(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando inventario...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
        <p className="text-gray-600 mt-1">
          Gestiona el stock de todos tus productos
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/inventory/scan"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          <Barcode className="w-5 h-5 mr-2" />
          Registrar con Código
        </Link>
        {/* Otros botones... */}
      </div>

      {/* Inventory Type Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 mt-6">
        {inventoryTypes.map((type) => {
          const Icon = type.icon;
          const isActive = selectedInventoryType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedInventoryType(type.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm border ${isActive
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
              {!isActive && products && (
                <span className="ml-1 text-xs text-gray-400">
                  ({products.filter(p => type.id === 'TODOS' ? true : p.inventoryType === type.id).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              Total
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{totalProducts}</h3>
          <p className="text-gray-600 text-sm">Productos</p>
          <p className="text-xs text-gray-400 mt-1">{totalVariants} variantes</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              Stock
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{totalStock}</h3>
          <p className="text-gray-600 text-sm">Unidades en stock</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
              Alerta
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{lowStockCount}</h3>
          <p className="text-gray-600 text-sm">Stock bajo</p>
          <p className="text-xs text-gray-400 mt-1">{outOfStockCount} agotados</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
              Valor
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            ${totalValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-gray-600 text-sm">Valor del inventario</p>
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
              placeholder="Buscar por nombre, SKU, categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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

          {/* Botones de acción */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 border rounded-lg flex items-center gap-2 transition ${showFilters
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="nombre">Ordenar por nombre</option>
              <option value="stock-asc">Stock: menor a mayor</option>
              <option value="stock-desc">Stock: mayor a menor</option>
              <option value="precio">Precio: mayor a menor</option>
            </select>

            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
              title="Exportar inventario"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <button
              onClick={() => window.location.reload()}
              className="p-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filtros expandibles */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Categoría
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'todas' ? 'Todas las categorías' : cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Talla
                </label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {sizes.map(size => (
                    <option key={size} value={size}>
                      {size === 'todas' ? 'Todas las tallas' : size}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Color
                </label>
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {colors.map(color => (
                    <option key={color} value={color}>
                      {color === 'todos' ? 'Todos los colores' : color}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Estado del stock
                </label>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="todos">Todos</option>
                  <option value="disponible">Con stock</option>
                  <option value="bajo">Stock bajo</option>
                  <option value="agotado">Agotado</option>
                </select>
              </div>
            </div>

            {/* Filtros activos */}
            {(selectedCategory !== 'todas' || selectedSize !== 'todas' || selectedColor !== 'todos' || stockFilter !== 'todos') && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">Filtros activos:</span>
                {selectedCategory !== 'todas' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                    Categoría: {selectedCategory}
                    <button onClick={() => setSelectedCategory('todas')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedSize !== 'todas' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                    Talla: {selectedSize}
                    <button onClick={() => setSelectedSize('todas')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedColor !== 'todos' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                    Color: {selectedColor}
                    <button onClick={() => setSelectedColor('todos')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {stockFilter !== 'todos' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                    Stock: {
                      stockFilter === 'bajo' ? 'Bajo' :
                        stockFilter === 'agotado' ? 'Agotado' :
                          'Disponible'
                    }
                    <button onClick={() => setStockFilter('todos')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resultados y tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-medium">{sortedProducts.length}</span> de{' '}
              <span className="font-medium">{products?.length || 0}</span> productos
            </p>
            <p className="text-sm text-gray-500">
              Total unidades: {sortedProducts.reduce((acc, p) =>
                acc + p.variants.reduce((sum, v) => sum + v.stock, 0), 0
              )}
            </p>
          </div>
        </div>

        {sortedProducts.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      OP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variantes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedProducts.map((product) => {
                    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                    const hasLowStock = product.variants.some(v => v.stock <= product.minStock);
                    const isOutOfStock = totalStock === 0;

                    let stockStatus = 'ok';
                    let statusColor = 'text-green-600 bg-green-50';
                    let statusText = 'Stock normal';

                    if (isOutOfStock) {
                      stockStatus = 'out';
                      statusColor = 'text-red-600 bg-red-50';
                      statusText = 'Agotado';
                    } else if (hasLowStock) {
                      stockStatus = 'low';
                      statusColor = 'text-yellow-600 bg-yellow-50';
                      statusText = 'Stock bajo';
                    }

                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 max-w-[250px]">
                          <div>
                            <p className="font-medium text-gray-900 truncate" title={product.name}>
                              {product.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 truncate max-w-[100px]" title={product.category}>
                                {product.category}
                              </span>
                              <span className="w-1 h-1 bg-gray-300 rounded-full flex-shrink-0"></span>
                              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded truncate flex-shrink-0">
                                {inventoryTypes.find(t => t.id === product.inventoryType)?.label || product.inventoryType}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                            {product.op || '--'}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {product.sku}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {product.variants.map((variant, idx) => (
                              <div
                                key={variant.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs"
                                title={`Stock: ${variant.stock}`}
                              >
                                <span>{variant.size}</span>
                                <span className="text-gray-400">/</span>
                                <span>{variant.color}</span>
                                <span className={`ml-1 font-medium ${variant.stock <= product.minStock ? 'text-yellow-600' : 'text-green-600'
                                  }`}>
                                  ({variant.stock})
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-medium ${isOutOfStock ? 'text-red-600' :
                            hasLowStock ? 'text-yellow-600' :
                              'text-gray-900'
                            }`}>
                            {totalStock}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            {stockStatus === 'out' && <X className="w-3 h-3 mr-1" />}
                            {stockStatus === 'low' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {stockStatus === 'ok' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">
                            ${(totalStock * product.purchasePrice).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            ${product.sellingPrice} c/u
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setSelectedVariant(product.variants[0] || null);
                                setMovementType('ENTRY');
                                setShowMovementModal(true);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Registrar entrada"
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setSelectedVariant(product.variants[0] || null);
                                setMovementType('EXIT');
                                setShowMovementModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Registrar salida"
                            >
                              <ArrowDownCircle className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/products/${product.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/products/${product.id}/edit`}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginación */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-500">
                  Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedProducts.length)}</span> de{' '}
                  <span className="font-medium">{sortedProducts.length}</span> resultados
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                    title="Primera página"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 mx-2">
                    <span className="text-sm text-gray-600">Página</span>
                    <span className="text-sm font-bold text-gray-900">{currentPage}</span>
                    <span className="text-sm text-gray-600">de {totalPages}</span>
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                    title="Última página"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedCategory !== 'todas' || selectedSize !== 'todas' || selectedColor !== 'todos' || stockFilter !== 'todos'
                ? 'Intenta con otros filtros o búsqueda'
                : 'Comienza agregando tu primer producto'}
            </p>
            {!searchTerm && selectedCategory === 'todas' && selectedSize === 'todas' && selectedColor === 'todos' && stockFilter === 'todos' && (
              <Link
                href="/products/new"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Package className="w-5 h-5 mr-2" />
                Agregar Producto
              </Link>
            )}
          </div>
        )
        }
      </div >

      {/* Modal para movimientos */}
      {
        showMovementModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {movementType === 'ENTRY' ? 'Registrar Entrada' : 'Registrar Salida'}
                </h3>
                <button
                  onClick={() => {
                    setShowMovementModal(false);
                    setSelectedProduct(null);
                    setSelectedVariant(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedProduct.name}</p>

                {/* Selector de variante */}
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar variante</label>
                  <select
                    value={selectedVariant?.id || ''}
                    onChange={(e) => {
                      const v = selectedProduct.variants.find((x: any) => x.id === e.target.value);
                      setSelectedVariant(v || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Seleccionar variante --</option>
                    {selectedProduct.variants.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.size} / {v.color} (Stock: {v.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-sm text-gray-600 mt-3">
                  Stock actual: <span className="font-medium">{selectedVariant ? selectedVariant.stock : '—'}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={movementType === 'EXIT' ? selectedVariant?.stock : undefined}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar motivo</option>
                    {movementType === 'ENTRY' ? (
                      <>
                        <option value="Compra">Compra a proveedor</option>
                        <option value="Devolución">Devolución de cliente</option>
                        <option value="Ajuste">Ajuste de inventario</option>
                        <option value="Transferencia">Transferencia</option>
                      </>
                    ) : (
                      <>
                        <option value="Venta">Venta</option>
                        <option value="Merma">Merma</option>
                        <option value="Ajuste">Ajuste de inventario</option>
                        <option value="Transferencia">Transferencia</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referencia (opcional)
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={movementType === 'ENTRY' ? 'N° factura, orden de compra...' : 'N° venta, ticket...'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowMovementModal(false);
                    setSelectedProduct(null);
                    setSelectedVariant(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMovement}
                  disabled={!quantity || !reason}
                  className={`flex-1 px-4 py-2 rounded-lg text-white transition ${movementType === 'ENTRY'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Modal de Exportación */}
      {
        showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Download className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Exportar Inventario</h3>
                    <p className="text-xs text-gray-400">Selecciona el formato de exportación</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  {/* Opción Excel */}
                  <button
                    onClick={exportToExcel}
                    className="group flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all duration-300 text-left"
                  >
                    <div className="p-3 bg-emerald-100 rounded-xl group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Microsoft Excel (.xlsx)</h4>
                      <p className="text-xs text-gray-500">Hoja de cálculo con todos los datos detallados</p>
                    </div>
                  </button>

                  {/* Opción PDF */}
                  <button
                    onClick={exportToPDF}
                    className="group flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-red-500 hover:bg-red-50/50 transition-all duration-300 text-left"
                  >
                    <div className="p-3 bg-red-100 rounded-xl group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Documento PDF (.pdf)</h4>
                      <p className="text-xs text-gray-500">Reporte visual listo para imprimir o enviar</p>
                    </div>
                  </button>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </Layout >
  );
}