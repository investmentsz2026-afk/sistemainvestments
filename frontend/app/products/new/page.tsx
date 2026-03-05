// frontend/app/products/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '../../../hooks/useProducts';
import { Layout } from '../../../components/common/Layout';
import { ProductForm } from '../../../components/products/ProductForm';
import { ArrowLeft, Package, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NewProductPage() {
  const router = useRouter();
  const { createProduct, isCreating } = useProducts();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    try {
      setError(null);
      await createProduct(data);
      router.push('/products');
    } catch (err: any) {
      setError(err.message || 'Error al crear el producto');
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <Link href="/" className="hover:text-blue-600 transition">Dashboard</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-blue-600 transition">Productos</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Nuevo</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Nuevo Producto</h1>
                <p className="text-sm text-gray-500">Completa los campos para agregar un producto al inventario</p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-medium text-indigo-600">Nuevo registro</span>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl flex items-center gap-3 shadow-sm"
        >
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-sm font-bold">!</span>
          </div>
          <p className="text-sm font-medium">{error}</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ProductForm
          onSubmit={handleSubmit}
          isLoading={isCreating}
        />
      </motion.div>
    </Layout>
  );
}