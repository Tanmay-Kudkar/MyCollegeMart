import axios from 'axios';

const RAW_API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  "http://localhost:8080/api";

const DEFAULT_ORIGIN = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:3000';

const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const ensureApiSuffix = (pathName) => {
  const normalized = stripTrailingSlash(pathName || '');

  if (!normalized || normalized === '/') {
    return '/api';
  }

  return /\/api$/i.test(normalized)
    ? normalized
    : `${normalized}/api`;
};

export const API_BASE_URL = (() => {
  try {
    const parsed = new URL(RAW_API_BASE_URL, DEFAULT_ORIGIN);
    parsed.pathname = ensureApiSuffix(parsed.pathname);
    parsed.search = '';
    parsed.hash = '';
    return stripTrailingSlash(parsed.toString());
  } catch {
    const normalized = stripTrailingSlash((RAW_API_BASE_URL || '').trim());
    if (!normalized) {
      return 'http://localhost:8080/api';
    }

    return /\/api$/i.test(normalized)
      ? normalized
      : `${normalized}/api`;
  }
})();

const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL, DEFAULT_ORIGIN).origin;
  } catch {
    return '';
  }
})();

const OAUTH_RETURN_PAGE_KEY = 'mcm.oauth.returnPage';
const OAUTH_RETURN_PARAMS_KEY = 'mcm.oauth.returnParams';
const OAUTH_BACK_GUARD_KEY = 'mcm.oauth.backGuardPending';

const persistOauthReturnState = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPage = localStorage.getItem('mcm.currentPage') || 'Home';
  const currentParams = localStorage.getItem('mcm.pageParams') || '{}';

  localStorage.setItem(OAUTH_RETURN_PAGE_KEY, currentPage);
  localStorage.setItem(OAUTH_RETURN_PARAMS_KEY, currentParams);
  localStorage.setItem(OAUTH_BACK_GUARD_KEY, '1');
};

const startGoogleOAuthRedirect = (accountType = 'INDIVIDUAL') => {
  const encodedAccountType = encodeURIComponent(accountType || 'INDIVIDUAL');
  persistOauthReturnState();
  window.location.replace(`${API_BASE_URL}/auth/google/start?accountType=${encodedAccountType}`);
};

export const resolveMediaUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  if (!API_ORIGIN) {
    return url;
  }

  if (url.startsWith('/api/')) {
    return `${API_ORIGIN}${url}`;
  }

  if (url.startsWith('api/')) {
    return `${API_ORIGIN}/${url}`;
  }

  return url;
};

const normalizeMediaCollection = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    url: resolveMediaUrl(item?.url),
  }));
};

const normalizeProduct = (product) => {
  if (!product || typeof product !== 'object') {
    return product;
  }

  const parsedStockQuantity = product.stockQuantity == null
    ? null
    : Number(product.stockQuantity);

  return {
    ...product,
    imageUrl: resolveMediaUrl(product.imageUrl),
    inStock: product.inStock !== false,
    stockQuantity: Number.isFinite(parsedStockQuantity) ? parsedStockQuantity : null,
  };
};

const normalizeProductsPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeProduct);
  }

  if (payload && typeof payload === 'object' && Array.isArray(payload.items)) {
    return {
      ...payload,
      items: payload.items.map(normalizeProduct),
    };
  }

  return normalizeProduct(payload);
};

const normalizeSkillPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  return {
    ...payload,
    imageUrl: resolveMediaUrl(payload.imageUrl),
    videoUrl: resolveMediaUrl(payload.videoUrl),
    media: normalizeMediaCollection(payload.media),
  };
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const getApiErrorMessage = (error, fallbackMessage) => {
  const payload = error?.response?.data;

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload?.message && typeof payload.message === 'string') {
    return payload.message;
  }

  return fallbackMessage;
};

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Login failed"));
    }
  },
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Registration failed"));
    }
  },
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/user');
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Failed to fetch user"));
    }
  },
  startGoogleLogin: () => {
    startGoogleOAuthRedirect('INDIVIDUAL');
  },
  startGoogleLoginForAccountType: (accountType = 'INDIVIDUAL') => {
    startGoogleOAuthRedirect(accountType);
  },
  updateAccountType: async (accountType) => {
    try {
      const response = await api.post('/auth/account-type', { accountType });
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Failed to update account type"));
    }
  },
  updateMerchantProfile: async (payload) => {
    try {
      const response = await api.post('/auth/merchant-profile', payload);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Failed to update merchant profile"));
    }
  },
};

export const settings = {
  getMe: () => api.get('/settings/me'),
  updateMe: (payload) => api.put('/settings/me', payload)
};

export const ai = {
  chat: async (payload) => {
    try {
      return await api.post('/ai/chat', payload);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'AI assistant request failed'));
    }
  }
};

export const products = {
  getAll: () => api.get('/products').then((response) => ({
    ...response,
    data: normalizeProductsPayload(response.data),
  })),
  getById: (id) => api.get(`/products/${id}`).then((response) => ({
    ...response,
    data: normalizeProductsPayload(response.data),
  })),
  create: (product) => api.post('/products', product).then((response) => ({
    ...response,
    data: normalizeProductsPayload(response.data),
  })),
  update: (id, product) => api.put(`/products/${id}`, product),
  updateListing: (id, payload) => {
    const config = payload instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined;

    return api.put(`/products/${id}/listing`, payload, config).then((response) => ({
      ...response,
      data: normalizeProductsPayload(response.data),
    }));
  },
  delete: (id) => api.delete(`/products/${id}`),
  createListing: (formData) => api.post('/products/listing', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then((response) => ({
    ...response,
    data: normalizeProductsPayload(response.data),
  })),
  getMedia: (id) => api.get(`/products/${id}/media`).then((response) => ({
    ...response,
    data: normalizeMediaCollection(response.data),
  })),
  getQuestions: (id) => api.get(`/products/${id}/questions`),
  askQuestion: (id, question) => api.post(`/products/${id}/questions`, { question }),
  answerQuestion: (productId, questionId, answer) =>
    api.post(`/products/${productId}/questions/${questionId}/answers`, { answer }),
  getByBranch: (branch, page = 0, size = 12) => 
    api.get(`/products/branch/${branch}?page=${page}&size=${size}`),
  search: (query) => 
    api.get(`/products/search?q=${query}`),
  addToCart: (productId, quantity = 1, userId = null) => 
    api.post('/cart/add', { productId, quantity, userId })
};

export const cart = {
  get: (userId = null) =>
    api.get('/cart', { params: userId ? { userId } : undefined }),
  updateItemQuantity: (productId, quantity, userId = null) =>
    api.patch(`/cart/item/${productId}`, { quantity, userId }),
  removeItem: (productId, userId = null) =>
    api.delete(`/cart/item/${productId}`, { params: userId ? { userId } : undefined }),
  clear: (userId = null) =>
    api.delete('/cart/clear', { params: userId ? { userId } : undefined })
};

export const seller = {
  getDashboard: () => api.get('/seller/dashboard').then((response) => {
    const payload = response.data && typeof response.data === 'object' ? response.data : {};
    const recentListings = Array.isArray(payload.recentListings)
      ? payload.recentListings.map((item) => normalizeProduct(item))
      : [];

    return {
      ...response,
      data: {
        ...payload,
        recentListings,
      },
    };
  })
};

export const admin = {
  getMerchantRequests: (status = 'PENDING') => api.get('/admin/merchants', {
    params: { status }
  }),
  approveMerchant: (merchantId) => api.post(`/admin/merchants/${merchantId}/approve`),
  rejectMerchant: (merchantId) => api.post(`/admin/merchants/${merchantId}/reject`)
};

export const skills = {
  getAll: () => api.get('/skills').then((response) => ({
    ...response,
    data: Array.isArray(response.data)
      ? response.data.map(normalizeSkillPayload)
      : [],
  })),
  create: (formData) => api.post('/skills', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then((response) => ({
    ...response,
    data: normalizeSkillPayload(response.data),
  }))
};

export const assignmentHelp = {
  submitRequest: (formData) => api.post('/assignment-help/requests', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  createCheckoutOrder: (formData) => api.post('/assignment-help/checkout/create-order', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  verifyCheckoutPayment: (payload) => api.post('/assignment-help/checkout/verify-payment', payload),
  getRequests: () => api.get('/assignment-help/requests').then((response) => ({
    ...response,
    data: Array.isArray(response.data)
      ? response.data.map((request) => ({
        ...request,
        media: normalizeMediaCollection(request?.media),
      }))
      : [],
  }))
};

export const wishlist = {
  get: () => api.get('/wishlist'),
  add: (productId) => api.post(`/wishlist/${productId}`),
  remove: (productId) => api.delete(`/wishlist/${productId}`),
  sync: (productIds = []) => api.post('/wishlist/sync', { productIds })
};

export const checkout = {
  createOrder: (payload) => api.post('/checkout/create-order', payload),
  verifyPayment: (payload) => api.post('/checkout/verify-payment', payload),
  placeCodOrder: (payload) => api.post('/checkout/place-cod', payload)
};

export const orders = {
  getMyOrders: () => api.get('/orders/my')
};

export async function fetchProducts() {
  const res = await fetch(`${API_BASE_URL}/products`);
  if (!res.ok) throw new Error("Failed to fetch products");
  const payload = await res.json();
  return normalizeProductsPayload(payload);
}

export default api;
