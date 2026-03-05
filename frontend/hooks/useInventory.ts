// frontend/hooks/useInventory.ts
import { useMutation, useQueryClient } from 'react-query';
import api from '../lib/axios';
import toast from 'react-hot-toast';

export function useInventory() {
  const queryClient = useQueryClient();

  const registerMovement = useMutation(
    async (movementData: any) => {
      const { data } = await api.post('/inventory/movements', movementData);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        queryClient.invalidateQueries('movements');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al registrar movimiento');
        throw error;
      },
    }
  );

  const registerBulkMovement = useMutation(
    async (bulkData: any) => {
      const { data } = await api.post('/inventory/movements/bulk', bulkData);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        queryClient.invalidateQueries('movements');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al registrar movimiento');
        throw error;
      },
    }
  );

  return {
    registerMovement: registerMovement.mutate,
    registerBulkMovement: registerBulkMovement.mutate,
    isRegistering: registerMovement.isLoading || registerBulkMovement.isLoading,
  };
}