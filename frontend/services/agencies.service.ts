import api from '../lib/axios';

export interface Agency {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  zone: string;
  ruc?: string;
  contactName?: string;
  createdById: string;
  createdBy: {
    name: string;
  };
  createdAt: string;
}

export const agenciesService = {
  getAll: async (zone?: string) => {
    const params = zone ? { zone } : {};
    const resp = await api.get<{ success: boolean; data: Agency[] }>('/agencies', { params });
    return resp.data.data;
  },

  getOne: async (id: string) => {
    const resp = await api.get<{ success: boolean; data: Agency }>(`/agencies/${id}`);
    return resp.data.data;
  },

  create: async (data: Partial<Agency>) => {
    const resp = await api.post<{ success: boolean; data: Agency }>('/agencies', data);
    return resp.data.data;
  },

  update: async (id: string, data: Partial<Agency>) => {
    const resp = await api.patch<{ success: boolean; data: Agency }>(`/agencies/${id}`, data);
    return resp.data.data;
  },

  delete: async (id: string) => {
    const resp = await api.delete<{ success: boolean }>(`/agencies/${id}`);
    return resp.data;
  }
};
