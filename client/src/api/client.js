import axios from 'axios';

// In dev the Vite proxy forwards /api to the local server.
// In production (Vercel) set VITE_API_URL to the Railway backend, e.g. https://xxx.up.railway.app/api
export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const TOKEN_KEY = 'qm_access_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export const api = axios.create({ baseURL: API_BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status === 401 && !original._retried && !original.url.includes('/auth/')) {
      original._retried = true;
      try {
        refreshing = refreshing || axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        const { data } = await refreshing;
        refreshing = null;
        setToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        setToken(null);
        window.dispatchEvent(new Event('qm:logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const errMsg = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;

// Downloads an authenticated file (e.g. QR codes) by fetching it as a blob —
// a plain <a href> would hit the API without the Authorization header.
export async function downloadFile(url, params, filename) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const objectUrl = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
