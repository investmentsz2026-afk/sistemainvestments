// frontend/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../lib/axios';
import { AuthResponse, LoginCredentials, RegisterCredentials } from '../types';

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
      // backend wraps result in { success, message, data }
      const resp = await api.post('/auth/login', credentials);
      return resp.data.data as AuthResponse; // unwrap payload
    },
    {
      onSuccess: (data) => {
        console.log('Login successful:', data);
        localStorage.setItem('token', data.token);
        refetch();
        // Forzar redirección
        window.location.href = '/';
      },
      onError: (error: any) => {
        console.error('Login error:', error);
        alert(error.response?.data?.message || 'Error al iniciar sesión');
      },
    }
  );

  const registerMutation = useMutation(
    async (credentials: RegisterCredentials) => {
      const resp = await api.post('/auth/register', credentials);
      return resp.data.data as AuthResponse;
    },
    {
      onSuccess: (data) => {
        localStorage.setItem('token', data.token);
        refetch();
        window.location.href = '/';
      },
      onError: (error: any) => {
        console.error('Register error:', error);
        alert(error.response?.data?.message || 'Error al registrarse');
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
    isLoading: loginMutation.isLoading || registerMutation.isLoading || userLoading,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    isAuthenticated,
  };
}