import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }
        const res = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/users/token/refresh/`,
          new URLSearchParams({ refresh })
        );
        const newToken = res.data.access;
        localStorage.setItem('access_token', newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return API(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;