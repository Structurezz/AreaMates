import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://areaconnectapi-production.up.railway.app/api',
  withCredentials: true,
});

// Attach access token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    // Resident no longer has a unit (or never got one) — sign them out with the reason
    if (err.response?.data?.code === 'NO_UNIT' && !original.url?.includes('/auth/login')) {
      localStorage.removeItem('accessToken');
      try { sessionStorage.setItem('authNotice', err.response.data.message); } catch {}
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return Promise.reject(err);
    }
    // Household head suspended — family members are signed out with the reason
    if (err.response?.data?.code === 'HOUSEHOLD_INACTIVE') {
      localStorage.removeItem('accessToken');
      try { sessionStorage.setItem('authNotice', err.response.data.message); } catch {}
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return Promise.reject(err);
    }
    // The household head changed this member's access — pick up the new list
    if (err.response?.data?.code === 'HOUSEHOLD_NO_ACCESS') {
      window.dispatchEvent(new CustomEvent('auth:refresh'));
    }
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'https://areaconnectapi-production.up.railway.app/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        localStorage.setItem('accessToken', data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    return Promise.reject(err);
  }
);

export default api;
