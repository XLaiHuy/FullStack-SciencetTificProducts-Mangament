import axios from 'axios';

// Create a configured Axios instance
export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000, // 10 seconds
});

// Interceptor for attaching auth token (setup ready for future use)
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('nckh_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor for intercepting errors (like 401 Unauthorized)
axiosClient.interceptors.response.use(
  (response) => {
    // If the backend wraps data in { data: ..., success: true }, extract it
    // Our backend uses apiResponse formats with { success: true, data: ... }
    if (response.data && response.data.success !== undefined) {
      if (response.data.success) {
        return response.data; // Return the full wrapper or just data depending on frontend needs
      }
      return Promise.reject(new Error(response.data.error || 'Server error'));
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (redirect to login)
      localStorage.removeItem('nckh_token');
      localStorage.removeItem('nckh_user');
      localStorage.removeItem('nckh_council_role');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data?.error || error.message);
  }
);
