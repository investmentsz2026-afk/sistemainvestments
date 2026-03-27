
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '../../../../hooks/useProducts';
import { Layout } from '../../../../components/common/Layout';
import { ProductForm } from '../../../../components/products/ProductForm';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { products, updateProduct, isUpdating } = useProducts();
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (products) {
      const found = products.find(p => p.id === params.id);
      if (found) {
        setProduct(found);
      } else {
        setError('Producto no encontrado');
      }
    }
  }, [products, params.id]);

  const handleSubmit = async (data: any) => {
    try {
      setError(null);
      // Enviar todo incluyendo variantes
      await updateProduct({ id: params.id, ...data });
      router.push('/products');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el producto');
    }
  };

  if (!product) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando producto...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/products"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Producto</h1>
          <p className="text-gray-600">
            {product.name} - SKU: {product.sku}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <ProductForm
        onSubmit={handleSubmit}
        initialData={{
          name: product.name,
          category: product.category,
          sku: product.sku,
          op: product.op || '',
          inventoryType: product.inventoryType,
          description: product.description || '',
          purchasePrice: product.purchasePrice,
          sellingPrice: product.sellingPrice,
          minStock: product.minStock,
          variants: product.variants.map((v: any) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            initialStock: v.stock,
            variantSku: v.variantSku
          }))
        }}
        isLoading={isUpdating}
        isEditing={true}
      />
    </Layout>
  );
}