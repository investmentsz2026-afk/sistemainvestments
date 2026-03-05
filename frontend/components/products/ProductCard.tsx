// frontend/components/products/ProductCard.tsx
import { Edit, Trash2, Eye, AlertTriangle, Package, Barcode } from 'lucide-react';
import Link from 'next/link';

interface ProductCardProps {
  product: any;
  onViewBarcodes: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onViewBarcodes,
  onEdit,
  onDelete
}) => {
  const totalStock = product.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
  const hasLowStock = product.variants.some((v: any) => v.stock <= product.minStock);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group">
      <div className="p-5">
        {/* Header con acciones */}
        <div className="flex items-start justify-between mb-3 gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate" title={product.name}>
              {product.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                {product.category}
              </span>
              <span className="text-xs text-gray-400 truncate">SKU: {product.sku}</span>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={onViewBarcodes}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Ver códigos de barras"
            >
              <Barcode className="w-4 h-4" />
            </button>
            <Link
              href={`/products/${product.id}`}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Ver detalles"
            >
              <Eye className="w-4 h-4" />
            </Link>
            <button
              onClick={onEdit}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-xs text-gray-500">Stock Total</p>
            <p className={`text-lg font-bold ${totalStock === 0 ? 'text-red-600' :
              hasLowStock ? 'text-yellow-600' :
                'text-green-600'
              }`}>
              {totalStock}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-xs text-gray-500">Precio Venta</p>
            <p className="text-lg font-bold text-gray-900">${product.sellingPrice}</p>
          </div>
        </div>

        {/* Alerta de stock bajo */}
        {hasLowStock && (
          <div className="mb-3 flex items-center gap-1.5 text-yellow-600 bg-yellow-50 px-2 py-1.5 rounded-lg text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-medium">Stock bajo en algunas variantes</span>
          </div>
        )}

        {/* Variantes preview */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Variantes ({product.variants.length})
          </p>
          <div className="space-y-1.5">
            {product.variants.slice(0, 3).map((variant: any) => (
              <div key={variant.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate flex-1 min-w-0 mr-2" title={`${variant.size} / ${variant.color}`}>
                  {variant.size} / {variant.color}
                </span>
                <span className={`font-medium flex-shrink-0 ${variant.stock <= product.minStock ? 'text-yellow-600' : 'text-gray-900'
                  }`}>
                  {variant.stock} uni.
                </span>
              </div>
            ))}
            {product.variants.length > 3 && (
              <p className="text-xs text-gray-400 mt-1">
                +{product.variants.length - 3} variantes más
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};