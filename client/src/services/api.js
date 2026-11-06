import axios from 'axios';

// Configurable API base URL:
// In browser/local mode, defaults to relative /api
// When deployed or in mobile native app, uses window.DAYBOOK_API_URL or localStorage override
const getBaseURL = () => {
  const customUrl = localStorage.getItem('daybook_api_url');
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '') + '/api';
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL()
});

api.interceptors.request.use((config) => {
  config.baseURL = getBaseURL();
  const token = localStorage.getItem('daybook_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('daybook_token');
      localStorage.removeItem('daybook_user');
      window.dispatchEvent(new Event('auth-change'));
    }
    return Promise.reject(error);
  }
);

export default api;
