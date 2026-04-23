import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API = `${BASE}/api`;

const TOKEN_KEY = 'qms_token';

export async function setToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as any),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data && data.detail) || res.statusText || 'Request failed';
    const msg = Array.isArray(detail)
      ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
      : typeof detail === 'string'
      ? detail
      : JSON.stringify(detail);
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  // auth
  register: (body: { email: string; password: string; name: string; role: 'customer' | 'merchant' }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),

  // merchants
  publicMerchants: () => request('/merchants'),
  myMerchants: () => request('/merchants/mine'),
  merchant: (id: string) => request(`/merchants/${id}`),
  createMerchant: (body: any) => request('/merchants', { method: 'POST', body: JSON.stringify(body) }),
  updateMerchant: (id: string, body: any) =>
    request(`/merchants/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  addCategory: (id: string, body: { name: string; avg_service_minutes: number }) =>
    request(`/merchants/${id}/categories`, { method: 'POST', body: JSON.stringify(body) }),
  deleteCategory: (id: string, catId: string) =>
    request(`/merchants/${id}/categories/${catId}`, { method: 'DELETE' }),

  // queue
  joinQueue: (body: { merchant_id: string; category_id: string; customer_name?: string }) =>
    request('/queue/join', { method: 'POST', body: JSON.stringify(body) }),
  getQueueEntry: (id: string) => request(`/queue/${id}`),
  myActiveQueues: () => request('/queue/mine/active'),
  merchantQueue: (id: string) => request(`/merchants/${id}/queue`),
  callNext: (id: string, categoryId?: string) =>
    request(`/merchants/${id}/queue/next${categoryId ? `?category_id=${categoryId}` : ''}`, {
      method: 'POST',
    }),
  serveEntry: (id: string, entryId: string) =>
    request(`/merchants/${id}/queue/${entryId}/serve`, { method: 'POST' }),
  skipEntry: (id: string, entryId: string) =>
    request(`/merchants/${id}/queue/${entryId}/skip`, { method: 'POST' }),
  tv: (id: string) => request(`/merchants/${id}/queue/tv`),

  // admin
  adminUsers: () => request('/admin/users'),
  adminMerchants: () => request('/admin/merchants'),
  adminUpdateMerchantStatus: (id: string, status: string) =>
    request(`/admin/merchants/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  adminStats: () => request('/admin/stats'),
};
