// frontend/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../lib/axios';
import { AuthResponse, LoginCredentials } from '../types';
import toast from 'react-hot-toast';

export function useAuth() {
  const router = useRouter();

  const { data: user, refetch, isLoading: userLoading } = useQuery(
    'user',
    async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        return null;
      }
      try {
        const resp = await api.get('/auth/me');
        return resp.data.data; // actual user object
      } catch (error) {
        console.error('Error fetching user:', error);
        localStorage.removeItem('token');
        return null;
      }
    },
    {
      staleTime: Infinity,
      retry: false,
    }
  );

  // derive auth flag from user
  const isAuthenticated = !!user;

  const loginMutation = useMutation(
    async (credentials: LoginCredentials) => {
      const resp = await api.post('/auth/login', credentials);
      return resp.data.data;
    },
    {
      onError: (error: any) => {
        console.error('Login error:', error);
      },
    }
  );

  const selectRoleMutation = useMutation(
    async ({ userId, roleName }: { userId: string; roleName: string }) => {
      const resp = await api.post('/auth/select-role', { userId, roleName });
      return resp.data.data;
    },
    {
      onSuccess: (data) => {
        localStorage.setItem('token', data.token);
        refetch();
        toast.success('Sesión iniciada correctamente');
        window.location.href = '/';
      },
      onError: (error: any) => {
        console.error('Role selection error:', error);
        toast.error(error.response?.data?.message || 'Error al seleccionar rol');
      },
    }
  );


  const queryClient = useQueryClient();

  const logout = () => {
    // remove token and invalidate cached user data
    localStorage.removeItem('token');
    queryClient.clear();
    queryClient.setQueryData('user', null);

    // navigate to login and reload to ensure no stale state
    // use both router and window.location for reliability
    router.push('/login');
    window.location.href = '/login';
  };

  return {
    user,
    isLoading: loginMutation.isLoading || userLoading,
    login: loginMutation.mutateAsync, // Switch to mutateAsync for better control in component
    selectRole: selectRoleMutation.mutate,
    isSelectingRole: selectRoleMutation.isLoading,
    logout,
    isAuthenticated,
  };
}