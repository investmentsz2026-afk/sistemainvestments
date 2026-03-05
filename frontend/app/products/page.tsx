// frontend/app/products/page.tsx
'use client';

import { useState } from 'react';
import { Layout } from '../../components/common/Layout';
import { ProductCard } from '../../components/products/ProductCard';
import { BarcodeModal } from '../../components/products/BarcodeModal';
import { useProducts } from '../../hooks/useProducts';
import { Plus, Search, Package, Barcode, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const { products, isLoading, deleteProduct, isDeleting } = useProducts();

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.inventoryType.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleViewBarcodes = (product: any) => {
    setSelectedProduct(product);
    setShowBarcodeModal(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600 mt-1">
            Gestiona tu catálogo de productos
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Producto
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
          />
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onViewBarcodes={() => handleViewBarcodes(product)}
              onEdit={() => {
                window.location.href = `/products/${product.id}/edit`;
              }}
              onDelete={() => {
                setProductToDelete(product);
                setShowDeleteModal(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay productos
          </h3>
          <p className="text-gray-600 mb-6">
            Comienza agregando tu primer producto al inventario
          </p>
          <Link
            href="/products/new"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar Primer Producto
          </Link>
        </div>
      )}

      {/* Modal de Códigos de Barras */}
      {showBarcodeModal && selectedProduct && (
        <BarcodeModal
          product={selectedProduct}
          onClose={() => {
            setShowBarcodeModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Modal de eliminación */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-in">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 p-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center">
                Eliminar Producto
              </h3>
            </div>

            {/* Contenido */}
            <div className="p-8">
              <p className="text-gray-600 text-center mb-6">
                ¿Estás completamente seguro de que deseas eliminar el producto{' '}
                <span className="font-semibold text-gray-900">"{productToDelete.name}"</span>?
              </p>

              <p className="text-sm text-gray-500 text-center mb-6">
                Esta acción es irreversible y se eliminarán:
              </p>

              <ul className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-8 space-y-2">
                <li className="text-sm text-red-700 flex items-start gap-2">
                  <span className="font-bold">•</span>
                  Todas las variantes del producto
                </li>
                <li className="text-sm text-red-700 flex items-start gap-2">
                  <span className="font-bold">•</span>
                  El historial completo de movimientos
                </li>
                <li className="text-sm text-red-700 flex items-start gap-2">
                  <span className="font-bold">•</span>
                  Registros de inventario asociados
                </li>
              </ul>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await deleteProduct(productToDelete.id);
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Eliminando...
                    </span>
                  ) : (
                    'Eliminar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}