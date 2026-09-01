import { api, downloadFile } from './client.js';

// Auth
export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.patch('/auth/password', data),
};

// Restaurant
export const restaurantApi = {
  create: (data) => api.post('/restaurant', data),
  get: () => api.get('/restaurant'),
  update: (data) => api.patch('/restaurant', data),
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post('/restaurant/logo', fd);
  },
  stats: () => api.get('/stats'),
};

// Branches
export const branchApi = {
  list: () => api.get('/branches'),
  create: (data) => api.post('/branches', data),
  get: (id) => api.get(`/branches/${id}`),
  update: (id, data) => api.patch(`/branches/${id}`, data),
  remove: (id) => api.delete(`/branches/${id}`),
  items: (id) => api.get(`/branches/${id}/items`),
  updateItem: (id, itemId, data) => api.patch(`/branches/${id}/items/${itemId}`, data),
  qrPreview: (id) => api.get(`/branches/${id}/qr-preview`),
  // Fetches the QR with auth and triggers a browser download
  downloadQr: (id, format = 'png', size = 2048, slug = 'menu') =>
    downloadFile(`/branches/${id}/qr`, { format, size }, `qr-${slug}.${format}`),
};

// Categories & items
export const categoryApi = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.patch(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
  reorder: (order) => api.patch('/categories/reorder', { order }),
};

export const itemApi = {
  list: (categoryId) => api.get('/items', { params: categoryId ? { category: categoryId } : {} }),
  create: (formData) => api.post('/items', formData),
  update: (id, formData) => api.patch(`/items/${id}`, formData),
  remove: (id) => api.delete(`/items/${id}`),
};

// Public
export const publicApi = {
  menu: (slug) => api.get(`/public/menu/${slug}`),
};
