// frontend/hooks/useMovements.ts
import { useQuery } from 'react-query';
import api from '../lib/axios';
import { Movement } from '../types';

export function useMovements(filters?: {
  productId?: string;
  variantId?: string;
  type?: 'ENTRY' | 'EXIT';
  startDate?: string;
  endDate?: string;
}) {
  const { data: movements, isLoading } = useQuery(
    ['movements', filters],
    async () => {
      const params = new URLSearchParams();
      if (filters?.productId) params.append('productId', filters.productId);
      if (filters?.variantId) params.append('variantId', filters.variantId);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      
      const { data } = await api.get<Movement[]>(`/movements?${params}`);
      return data;
    }
  );

  const { data: kardex, isLoading: kardexLoading } = useQuery(
    ['kardex', filters?.variantId],
    async () => {
      if (!filters?.variantId) return [];
      const { data } = await api.get(`/movements/kardex/${filters.variantId}`);
      return data;
    },
    {
      enabled: !!filters?.variantId,
    }
  );

  return {
    movements,
    kardex,
    isLoading: isLoading || kardexLoading,
  };
}