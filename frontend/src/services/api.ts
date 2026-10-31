import { Product, Category, Order, OrderStatus } from '../types';

const API_BASE = '/api/v1';

export class ApiService {
  private static token: string | null = localStorage.getItem('shopfast_token');
  private static refreshToken: string | null = localStorage.getItem('shopfast_refresh_token');
  private static isRefreshing = false;

  static setToken(token: string | null, refreshToken?: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('shopfast_token', token);
    } else {
      localStorage.removeItem('shopfast_token');
    }

    if (refreshToken !== undefined) {
      this.refreshToken = refreshToken;
      if (refreshToken) {
        localStorage.setItem('shopfast_refresh_token', refreshToken);
      } else {
        localStorage.removeItem('shopfast_refresh_token');
      }
    }
  }

  static getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('shopfast_token');
    }
    return this.token;
  }

  static getRefreshToken(): string | null {
    if (!this.refreshToken) {
      this.refreshToken = localStorage.getItem('shopfast_refresh_token');
    }
    return this.refreshToken;
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // Auto Refresh Token Interceptor: When Access Token expires (401), automatically call /auth/refresh
    if (response.status === 401 && !isRetry && endpoint !== '/auth/login' && endpoint !== '/auth/refresh' && endpoint !== '/auth/register') {
      const rfToken = this.getRefreshToken();
      if (rfToken && !this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rfToken }),
          });
          const rfJson = await refreshRes.json();
          const rfData = rfJson.data || rfJson;

          if (refreshRes.ok && rfData.accessToken) {
            this.setToken(rfData.accessToken, rfData.refreshToken || rfToken);
            this.isRefreshing = false;
            // Retry the original failed request with the new access token
            return this.request<T>(endpoint, options, true);
          }
        } catch {
          // Refresh failed
        } finally {
          this.isRefreshing = false;
        }
      }
      // If refresh token is missing or expired, clean session
      this.setToken(null, null);
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = json.message || json.error || `Lỗi yêu cầu (${response.status})`;
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }

    // Unpack standard response wrapper { success: true, data: T }
    return (json.data !== undefined ? json.data : json) as T;
  }

  // --- Auth ---
  static async login(email: string, password: string) {
    const res = await this.request<{ user: any; tokens: { accessToken: string; refreshToken: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.tokens.accessToken, res.tokens.refreshToken);
    return res;
  }

  static async register(data: { email: string; password: string; fullName: string; phone?: string }) {
    const res = await this.request<{ user: any; tokens: { accessToken: string; refreshToken: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.tokens.accessToken, res.tokens.refreshToken);
    return res;
  }

  static async getProfile() {
    return this.request<any>('/auth/profile');
  }

  static async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null, null);
    }
  }

  // --- Products ---
  static async getProducts(params?: { search?: string; categoryId?: string; brand?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    return this.request<{ items: Product[]; meta: any }>(`/products?${query.toString()}`);
  }

  static async getCategories() {
    return this.request<Category[]>('/products/categories');
  }

  static async getProductBySku(sku: string) {
    return this.request<Product>(`/products/sku/${sku}`);
  }

  // --- Orders ---
  static async createOrder(data: { items: { productId: string; quantity: number }[]; shippingAddress: string; phone: string; notes?: string }) {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getMyOrders(page = 1, limit = 10) {
    return this.request<{ items: Order[]; meta: any }>(`/orders/my-orders?page=${page}&limit=${limit}`);
  }

  static async getAllOrders(status?: OrderStatus, page = 1, limit = 20) {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    query.append('page', String(page));
    query.append('limit', String(limit));
    return this.request<{ items: Order[]; meta: any }>(`/orders?${query.toString()}`);
  }

  static async getOrderById(id: string) {
    return this.request<Order>(`/orders/${id}`);
  }

  static async getOrderByCode(code: string) {
    return this.request<Order>(`/orders/code/${code}`);
  }

  static async updateOrderStatus(id: string, status: OrderStatus) {
    return this.request<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // --- AI Agent ---
  static async chatWithAi(message: string, history?: { role: 'user' | 'assistant'; content: string }[]) {
    return this.request<{ reply: string; usedTools: string[] }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  }

  // --- Health ---
  static async getHealth() {
    return this.request<any>('/health');
  }
}
