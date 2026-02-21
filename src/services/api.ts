import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add Bearer token if present in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url: string = error.config?.url ?? '';

    // Skip redirect for auth-related endpoints — let them fail silently
    const isAuthEndpoint =
      url.includes('/auth/me') ||
      url.includes('/auth/login') ||
      url.includes('/auth/logout') ||
      url.includes('/auth/register');

    // Also skip if we're already on the signin page (avoids infinite loop)
    const alreadyOnSignin = window.location.pathname.includes('/signin');

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !isAuthEndpoint &&
      !alreadyOnSignin
    ) {
      // Clear token and redirect
      localStorage.removeItem('token');
      try {
        await axios.post('http://localhost:5000/api/auth/logout', {}, {
          withCredentials: true,
        });
      } catch {
        // Ignore logout errors
      }
      window.location.href = '/signin';
    }

    return Promise.reject(error);
  }
);

export default api;
