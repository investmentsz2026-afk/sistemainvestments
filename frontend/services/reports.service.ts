import api from '../lib/axios';

export interface DateRange {
    startDate?: string;
    endDate?: string;
}

export interface ReportFilters extends DateRange {
    category?: string;
    productId?: string;
    inventoryType?: string;
}

export const reportsService = {
    getCurrentStock: async (filters: ReportFilters = {}) => {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.category && filters.category !== 'todas') params.append('category', filters.category);
        if (filters.productId && filters.productId !== 'todos') params.append('productId', filters.productId);
        if (filters.inventoryType && filters.inventoryType !== 'TODOS') params.append('inventoryType', filters.inventoryType);

        const response = await api.get(`/reports/stock/current?${params.toString()}`);
        return response.data;
    },

    getValuedStock: async (filters: ReportFilters = {}) => {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.category && filters.category !== 'todas') params.append('category', filters.category);
        if (filters.productId && filters.productId !== 'todos') params.append('productId', filters.productId);
        if (filters.inventoryType && filters.inventoryType !== 'TODOS') params.append('inventoryType', filters.inventoryType);

        const response = await api.get(`/reports/stock/valued?${params.toString()}`);
        return response.data;
    },

    getMovements: async (filters: ReportFilters) => {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.category && filters.category !== 'todas') params.append('category', filters.category);
        if (filters.productId && filters.productId !== 'todos') params.append('productId', filters.productId);
        if (filters.inventoryType && filters.inventoryType !== 'TODOS') params.append('inventoryType', filters.inventoryType);

        const response = await api.get(`/reports/movements?${params.toString()}`);
        return response.data;
    },
};
