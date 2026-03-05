// frontend/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../lib/axios';
import { Product } from '../types';
import toast from 'react-hot-toast';

export function useProducts() {
  const queryClient = useQueryClient();

  const { data: products, isLoading, error } = useQuery(
    'products',
    async () => {
      const { data } = await api.get<Product[]>('/products');
      return data;
    },
    {
      onError: (error: any) => {
        toast.error('Error al cargar productos');
        console.error('Error loading products:', error);
      }
    }
  );

  const createProduct = useMutation(
    async (productData: any) => {
      const { data } = await api.post('/products', productData);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        toast.success('Producto creado exitosamente');
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Error al crear producto';
        toast.error(message);
        throw error;
      },
    }
  );

  const updateProduct = useMutation(
    async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const response = await api.patch(`/products/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        toast.success('Producto actualizado exitosamente');
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Error al actualizar producto';
        toast.error(message);
        console.error('Error updating product:', error);
      },
    }
  );

  const deleteProduct = useMutation(
    async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        toast.success('Producto eliminado exitosamente');
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Error al eliminar producto';
        toast.error(message);
        console.error('Error deleting product:', error);
      },
    }
  );

  return {
    products,
    isLoading,
    error,
    createProduct: createProduct.mutate,
    updateProduct: updateProduct.mutate,
    deleteProduct: deleteProduct.mutate,
    isCreating: createProduct.isLoading,
    isUpdating: updateProduct.isLoading,
    isDeleting: deleteProduct.isLoading,
  };
}