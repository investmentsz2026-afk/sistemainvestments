// frontend/app/products/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '../../../hooks/useProducts';
import { useInventory } from '../../../hooks/useInventory';
import { Layout } from '../../../components/common/Layout';
import { ProductBarcode } from '../../../components/products/Barcode';
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Layers,
  Tag,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Printer,
  Download,
  History,
  X
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { products, deleteProduct, isDeleting } = useProducts();
  const { registerMovement } = useInventory();
  const [product, setProduct] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [movementType, setMovementType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (products) {
      const found = products.find(p => p.id === params.id);
      if (found) {
        setProduct(found);
      }
    }
  }, [products, params.id]);

  const handleDelete = async () => {
    try {
      await deleteProduct(params.id);
      router.push('/products');
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleMovement = async () => {
    if (!selectedVariant) return;
    
    try {
      await registerMovement({
        variantId: selectedVariant.id,
        type: movementType,
        quantity,
        reason,
        reference: reference || undefined
      });
      
      setShowMovementModal(false);
      setSelectedVariant(null);
      setQuantity(1);
      setReason('');
      setReference('');
      
      // Actualizar producto
      const updated = products?.find(p => p.id === params.id);
      if (updated) setProduct(updated);
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
    }
  };

  if (!product) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  const totalStock = product.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
  const totalValue = product.variants.reduce((sum: number, v: any) => sum + (v.stock * product.purchasePrice), 0);
  const hasLowStock = product.variants.some((v: any) => v.stock <= product.minStock);

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600">
              SKU: {product.sku} | 
              Categoría: {product.category}
              {product.op && (
                <> | <span className="text-indigo-600 font-bold">OP: {product.op}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/products/${product.id}/edit`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Alertas de stock bajo */}
      {hasLowStock && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-yellow-800 font-medium">
                Hay variantes con stock bajo
              </p>
              <p className="text-yellow-600 text-sm">
                Revisa las variantes marcadas en amarillo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Stock Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalStock}</p>
          <p className="text-xs text-gray-400 mt-1">{product.variants.length} variantes</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">
              {['TERMINADOS', 'PROCESO', 'SEGUNDA'].includes(product.inventoryType) ? 'Costo de Producción' : 'Precio de Compra'}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">S/ {product.purchasePrice}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Precio Venta</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">S/ {product.sellingPrice}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Layers className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Valor Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">S/ {totalValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Variantes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Variantes del Producto</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {product.variants.map((variant: any) => (
              <div
                key={variant.id}
                className={`border rounded-lg p-4 ${
                  variant.stock <= product.minStock
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Talla: {variant.size} | Color: {variant.color}
                    </h3>
                    <p className="text-sm text-gray-500">SKU: {variant.variantSku}</p>
                  </div>
                  <span className={`text-lg font-bold ${
                    variant.stock <= product.minStock
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}>
                    {variant.stock} uni.
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <ProductBarcode value={variant.variantSku} width={0.6} height={45} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedVariant(variant);
                        setMovementType('ENTRY');
                        setShowMovementModal(true);
                      }}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      title="Registrar entrada"
                    >
                      <ArrowUpCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVariant(variant);
                        setMovementType('EXIT');
                        setShowMovementModal(true);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Registrar salida"
                    >
                      <ArrowDownCircle className="w-5 h-5" />
                    </button>
                    <button
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      title="Imprimir etiqueta"
                      onClick={() => window.print()}
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Información adicional</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-600">Fecha de creación</dt>
              <dd className="font-medium text-gray-900">
                {format(new Date(product.createdAt), 'dd/MM/yyyy HH:mm')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Última actualización</dt>
              <dd className="font-medium text-gray-900">
                {format(new Date(product.updatedAt), 'dd/MM/yyyy HH:mm')}
              </dd>
            </div>
            <div className="flex justify-between text-indigo-600">
              <dt className="font-bold">Orden de Producción (OP)</dt>
              <dd className="font-black uppercase">{product.op || '--'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Stock mínimo</dt>
              <dd className="font-medium text-gray-900">{product.minStock} unidades</dd>
            </div>
            {product.description && (
              <div className="pt-3 border-t border-gray-100">
                <dt className="text-gray-600 mb-1">Descripción</dt>
                <dd className="text-gray-900">{product.description}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
          <div className="space-y-3">
            <Link
              href={`/kardex?product=${product.id}`}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition"
            >
              <History className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Ver Kardex</p>
                <p className="text-xs text-gray-500">Historial completo de movimientos</p>
              </div>
            </Link>
            <button
              onClick={() => {
                const data = product.variants.map((v: any) => ({
                  'Producto': product.name,
                  'OP': product.op || '--',
                  'SKU': v.variantSku,
                  'Talla': v.size,
                  'Color': v.color,
                  'Stock': v.stock,
                  [['TERMINADOS', 'PROCESO', 'SEGUNDA'].includes(product.inventoryType) ? 'Costo de Producción' : 'Precio Compra']: product.purchasePrice,
                  'Precio Venta': product.sellingPrice
                }));
                const csv = data.map(row => Object.values(row).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${product.sku}-variantes.csv`;
                a.click();
              }}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition w-full text-left"
            >
              <Download className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Exportar variantes</p>
                <p className="text-xs text-gray-500">Descargar lista en CSV</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de eliminación */}
      {showDeleteModal && (
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
                <span className="font-semibold text-gray-900">"{product.name}"</span>?
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
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
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

      {/* Modal de movimiento */}
      {showMovementModal && selectedVariant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {movementType === 'ENTRY' ? 'Registrar Entrada' : 'Registrar Salida'}
              </h3>
              <button
                onClick={() => {
                  setShowMovementModal(false);
                  setSelectedVariant(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{product.name}</p>
              <p className="text-sm text-gray-600">
                {selectedVariant.size} / {selectedVariant.color}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Stock actual: <span className="font-medium">{selectedVariant.stock}</span>
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
                  max={movementType === 'EXIT' ? selectedVariant.stock : undefined}
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
                  placeholder={movementType === 'ENTRY' ? 'N° factura, orden...' : 'N° venta, ticket...'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowMovementModal(false);
                  setSelectedVariant(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleMovement}
                disabled={!quantity || !reason}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition ${
                  movementType === 'ENTRY'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}