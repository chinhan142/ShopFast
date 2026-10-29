export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  stock: number;
  brand?: string;
  imageUrl?: string;
  isActive: boolean;
  categoryId: string;
  category?: { id: string; name: string; slug: string };
}

export interface OrderItem {
  id: string;
  productId: string;
  product?: { id: string; name: string; sku: string; imageUrl?: string; price?: number };
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  user?: { id: string; fullName: string; email: string; phone?: string };
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: string;
  phone: string;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
