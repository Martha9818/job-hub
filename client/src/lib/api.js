// 开发环境走 Vite 代理(/api)，生产环境直接请求 Railway 后端
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || `请求失败 (${status})`);
    this.status = status;
    this.body = body;
  }
}

async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }

  return res.json();
}

export const apiClient = {
  get: (path) => api(path),
  post: (path, data) => api(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => api(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (path) => api(path, { method: 'DELETE' }),
  upload: async (path, file, fieldName = 'resume') => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append(fieldName, file);
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body);
    }
    return res.json();
  },
};

export { ApiError };
