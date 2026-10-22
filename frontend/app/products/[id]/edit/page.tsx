
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '../../../../hooks/useProducts';
import { Layout } from '../../../../components/common/Layout';
import { ProductForm } from '../../../../components/products/ProductForm';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import api from '../../../../lib/axios';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { products, updateProduct, isUpdating } = useProducts();
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const resp = await api.get(`/products/${params.id}`);
        if (resp.data) {
          setProduct(resp.data);
        } else {
          setError('Producto no encontrado');
        }
      } catch (err: any) {
        console.error('Error fetching product for edit:', err);
        // Fallback al cache de products
        if (products) {
          const found = products.find(p => p.id === params.id);
          if (found) setProduct(found);
          else setError('Producto no encontrado');
        }
      }
    };
    fetchProduct();
  }, [params.id]);

  const handleSubmit = async (data: any) => {
    try {
      setError(null);
      // Extraer campos que no deben enviarse al backend para evitar errores de validación de DTO (non-whitelisted fields)
      const { opVariants, importedStockQuantities, purchaseItemId, ...cleanData } = data;
      cleanData.location = (cleanData.location && cleanData.location.trim()) ? cleanData.location.trim().toUpperCase() : 'A1';
      await updateProduct({ id: params.id, ...cleanData });
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

  // Extraer todos los colores presentes tanto en product.colors como en todas sus variantes
  const variantColors = (product.variants || [])
    .map((v: any) => v.color)
    .filter((c: string) => c && c.trim() && c.trim() !== 'ÚNICO');
  const existingColors = (product.colors || [])
    .filter((c: string) => c && c.trim() && c.trim() !== 'ÚNICO');
  const allProductColors = Array.from(new Set([...existingColors, ...variantColors]));

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
          location: product.location || '',
          weight: product.weight !== undefined && product.weight !== null ? product.weight : undefined,
          correlative: (product.sku ? (product.sku.match(/^[A-Za-z]{2}(\d{4})/)?.[1] || (product.sku.replace(/\D/g, '').length >= 4 ? product.sku.replace(/\D/g, '').slice(-4) : product.sku.replace(/\D/g, '').padStart(4, '0') || '') || '') : ''),
          op: product.op || '',
          unit: product.unit || 'UND',
          entalle: product.entalle || '',
          inventoryType: product.inventoryType,
          description: product.description || '',
          purchasePrice: product.purchasePrice,
          sellingPrice: product.sellingPrice,
          realPrice: product.realPrice,
          minStock: product.minStock,
          imageUrl: product.imageUrl || '',
          sizes: product.sizes || [],
          colors: allProductColors,
          variants: (product.variants || []).map((v: any) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            initialStock: v.stock !== undefined ? v.stock : 0,
            stock: v.stock !== undefined ? v.stock : 0,
            variantSku: v.variantSku,
            location: v.location || product.location || ''
          }))
        }}
        isLoading={isUpdating}
        isEditing={true}
      />
    </Layout>
  );
}