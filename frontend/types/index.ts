// frontend/types/index.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  inventoryType: string;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  minStock: number;
  isActive: boolean;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  stock: number;
  variantSku: string;
  product?: Product;
}

export interface Movement {
  id: string;
  type: 'ENTRY' | 'EXIT';
  quantity: number;
  reason: string;
  reference?: string;
  previousStock: number;
  newStock: number;
  variantId: string;
  userId: string;
  createdAt: string;
  variant: ProductVariant & { product: Product };
  user: User;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
