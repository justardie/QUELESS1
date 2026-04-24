import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API = `${BASE}/api`;
const TOKEN_KEY = 'qms_token';

export async function setToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}
export async function getToken(): Promise<string | null> { return AsyncStorage.getItem(TOKEN_KEY); }

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const detail = (data && data.detail) || res.statusText || 'Request failed';
    const msg = Array.isArray(detail)
      ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
      : typeof detail === 'string' ? detail : JSON.stringify(detail);
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  // settings
  getSettings: () => request('/settings'),
  getAdminFullSettings: () => request('/admin/settings/full'),
  updateSettings: (body: any) => request('/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),

  // auth
  register: (body: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  oauthProcess: (session_id: string) => request('/auth/oauth/process', { method: 'POST', body: JSON.stringify({ session_id }) }),
  me: () => request('/auth/me'),

  // merchants
  publicMerchants: () => request('/merchants'),
  myMerchants: () => request('/merchants/mine'),
  merchant: (id: string) => request(`/merchants/${id}`),
  createMerchant: (body: any) => request('/merchants', { method: 'POST', body: JSON.stringify(body) }),
  updateMerchant: (id: string, body: any) => request(`/merchants/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  addCategory: (id: string, body: any) => request(`/merchants/${id}/categories`, { method: 'POST', body: JSON.stringify(body) }),
  deleteCategory: (id: string, catId: string) => request(`/merchants/${id}/categories/${catId}`, { method: 'DELETE' }),

  // queue
  joinQueue: (body: any) => request('/queue/join', { method: 'POST', body: JSON.stringify(body) }),
  getQueueEntry: (id: string) => request(`/queue/${id}`),
  myActiveQueues: () => request('/queue/mine/active'),
  merchantQueue: (id: string) => request(`/merchants/${id}/queue`),
  callNext: (id: string, categoryId?: string) => request(`/merchants/${id}/queue/next${categoryId ? `?category_id=${categoryId}` : ''}`, { method: 'POST' }),
  serveEntry: (id: string, entryId: string) => request(`/merchants/${id}/queue/${entryId}/serve`, { method: 'POST' }),
  skipEntry: (id: string, entryId: string) => request(`/merchants/${id}/queue/${entryId}/skip`, { method: 'POST' }),
  tv: (id: string) => request(`/merchants/${id}/queue/tv`),

  // packages & subscriptions
  packages: () => request('/packages'),
  adminPackages: () => request('/admin/packages'),
  createPackage: (body: any) => request('/admin/packages', { method: 'POST', body: JSON.stringify(body) }),
  updatePackage: (id: string, body: any) => request(`/admin/packages/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePackage: (id: string) => request(`/admin/packages/${id}`, { method: 'DELETE' }),
  mySubscriptions: () => request('/subscriptions/mine'),
  adminSubscriptions: () => request('/admin/subscriptions'),
  adminUpdateSubscription: (id: string, body: any) => request(`/admin/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  adminDeleteSubscription: (id: string) => request(`/admin/subscriptions/${id}`, { method: 'DELETE' }),
  adminDeleteUser: (id: string) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  adminCleanupOrphans: () => request('/admin/cleanup-orphans', { method: 'POST' }),

  // payments
  createPayment: (body: any) => request('/payments/create', { method: 'POST', body: JSON.stringify(body) }),
  getPayment: (id: string) => request(`/payments/${id}`),
  confirmPayment: (id: string) => request(`/payments/${id}/confirm`, { method: 'POST' }),
  checkPayment: (id: string) => request(`/payments/${id}/check`, { method: 'POST' }),

  // admin
  adminUsers: () => request('/admin/users'),
  adminMerchants: () => request('/admin/merchants'),
  adminUpdateMerchantStatus: (id: string, status: string) => request(`/admin/merchants/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  adminStats: () => request('/admin/stats'),
  adminQueueStats: () => request('/admin/queue-stats'),
};
