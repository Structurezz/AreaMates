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
    // Hotel guest's stay is over (checked out) — sign out with the reason
    if (err.response?.data?.code === 'STAY_ENDED') {
      localStorage.removeItem('accessToken');
      try {
        sessionStorage.setItem('authNotice', err.response.data.message || 'Your stay has ended. Thanks for staying with us!');
        sessionStorage.setItem('authNoticeTone', 'stay');
      } catch {}
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return Promise.reject(err);
    }
    // The manager switched this feature off for the site — re-read the site config
    if (err.response?.status === 403 && err.response?.data?.code === 'MODULE_OFF') {
      window.dispatchEvent(new CustomEvent('site:refresh'));
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
      } catch (refreshErr) {
        localStorage.removeItem('accessToken');
        // Refresh refused because the guest's stay ended — keep the reason for the login screen
        if (refreshErr.response?.data?.code === 'STAY_ENDED') {
          try {
            sessionStorage.setItem('authNotice', refreshErr.response.data.message || 'Your stay has ended. Thanks for staying with us!');
            sessionStorage.setItem('authNoticeTone', 'stay');
          } catch {}
        }
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    return Promise.reject(err);
  }
);

export default api;
