// frontend/components/products/ProductCard.tsx
import React from 'react';
import { Edit, Trash2, Eye, AlertTriangle, Barcode, Image as ImageIcon, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '../../lib/imageUrl';
import { getUnitSymbol } from '../../utils/units';

interface ProductCardProps {
  product: any;
  onViewBarcodes: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onZoomImage?: (product: any) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onViewBarcodes,
  onEdit,
  onDelete,
  onZoomImage,
}) => {
  const totalStock = product.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
  const hasLowStock = product.variants.some((v: any) => v.stock <= product.minStock);

  const isAvio =
    product.inventoryType === 'AVIOS' ||
    product.inventoryType?.toLowerCase() === 'avios' ||
    product.inventoryType?.toLowerCase() === 'avíos' ||
    product.category?.toLowerCase() === 'avios' ||
    product.category?.toLowerCase() === 'avíos';

  const isTelas =
    product.inventoryType === 'MATERIALES' ||
    product.category?.toLowerCase().includes('tela');

  const getInventoryTypeBadge = (type: string) => {
    switch (type) {
      case 'TERMINADOS':
        return { text: '1ra Calidad', color: 'bg-green-100 text-green-800' };
      case 'SEGUNDA':
        return { text: '2da Calidad', color: 'bg-yellow-100 text-yellow-800' };
      case 'PROCESO':
        return { text: 'En Proceso', color: 'bg-blue-100 text-blue-800' };
      case 'TALLAS ESPECIALES':
        return { text: 'Plus Size', color: 'bg-indigo-100 text-indigo-800' };
      case 'MAQUINARIA':
        return { text: 'Maquinaria', color: 'bg-gray-100 text-gray-800' };
      case 'MATERIALES':
        return { text: 'Materiales', color: 'bg-orange-100 text-orange-800' };
      case 'AVIOS':
        return { text: 'Avíos', color: 'bg-purple-100 text-purple-800' };
      case 'OTROS':
        return { text: 'Otros', color: 'bg-slate-100 text-slate-800' };
      default:
        return { text: type, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const badge = getInventoryTypeBadge(product.inventoryType);
  const isMaterialOrMachinery = ['MATERIALES', 'MAQUINARIA', 'AVIOS', 'OTROS'].includes(product.inventoryType) && !(product.category || '').toLowerCase().includes('correa');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header con Imagen */}
      <div className="relative h-48 bg-gray-100 flex items-center justify-center">
        {product.imageUrl ? (
          <>
            <img
              src={getImageUrl(product.imageUrl)}
              alt={product.name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => onZoomImage?.(product)}
            />
            {onZoomImage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoomImage(product);
                }}
                className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition opacity-80 hover:opacity-100"
                title="Ampliar imagen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="w-12 h-12 mb-1" />
            <span className="text-xs">Sin foto</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>
            {badge.text}
          </span>
          {product.op && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              OP: {product.op}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title and Category */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 mr-2">
            <Link href={`/products/${product.id}`} className="block">
              <h3 className="font-semibold text-gray-900 truncate hover:text-blue-600 transition">
                {product.name}
              </h3>
            </Link>
            <p className="text-xs text-gray-500 truncate">{product.category}</p>
            <p className="text-xs font-mono text-gray-400 mt-0.5">SKU: {product.sku}</p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onViewBarcodes}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Ver códigos de barras"
            >
              <Barcode className="w-4 h-4" />
            </button>
            <Link
              href={`/products/${product.id}`}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
              title="Ver detalle"
            >
              <Eye className="w-4 h-4" />
            </Link>
            <button
              onClick={onEdit}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
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
            <p
              className={`text-lg font-bold ${
                totalStock === 0 ? 'text-red-600' : hasLowStock ? 'text-yellow-600' : 'text-green-600'
              }`}
            >
              {totalStock} <span className="text-xs font-normal text-gray-500">{getUnitSymbol(product.unit)}</span>
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-xs text-gray-500">{isMaterialOrMachinery ? 'Costo Unit.' : 'Precio Venta'}</p>
            <p className="text-lg font-bold text-gray-900">
              S/ {(isMaterialOrMachinery ? product.purchasePrice : (product.sellingPrice || product.purchasePrice || 0)).toFixed(2)}
            </p>
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
                <span
                  className="text-gray-600 truncate flex-1 min-w-0 mr-2"
                  title={`${variant.size} / ${variant.color}`}
                >
                  {variant.size} / {variant.color}
                </span>
                <span
                  className={`font-medium flex-shrink-0 ${
                    variant.stock <= product.minStock ? 'text-yellow-600' : 'text-gray-900'
                  }`}
                >
                  {variant.stock} {getUnitSymbol(product.unit)}
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