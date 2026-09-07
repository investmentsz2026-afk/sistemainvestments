// frontend/lib/imageUrl.ts

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '');

export const getImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${SERVER_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};
