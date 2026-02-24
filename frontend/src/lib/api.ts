import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          })
          const { access_token, refresh_token } = response.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/api/auth/login', data),
  refresh: (refresh_token: string) =>
    api.post('/api/auth/refresh', { refresh_token }),
  me: () => api.get('/api/auth/me'),
}

// Repositories
export const repoApi = {
  list: () => api.get('/api/repos'),
  create: (data: { name: string; slug?: string; description?: string; is_public: boolean }) =>
    api.post('/api/repos', data),
  get: (slug: string) => api.get(`/api/repos/${slug}`),
  update: (slug: string, data: { name?: string; description?: string; is_public?: boolean }) =>
    api.put(`/api/repos/${slug}`, data),
  delete: (slug: string) => api.delete(`/api/repos/${slug}`),
  getMembers: (slug: string) => api.get(`/api/repos/${slug}/members`),
  addMember: (slug: string, data: { user_id: string; role: string }) =>
    api.post(`/api/repos/${slug}/members`, data),
  removeMember: (slug: string, userId: string) =>
    api.delete(`/api/repos/${slug}/members/${userId}`),
}

// Documents
export const docApi = {
  list: (repoSlug: string) => api.get(`/api/repos/${repoSlug}/docs`),
  create: (repoSlug: string, data: { title: string; slug?: string; current_content: string }) =>
    api.post(`/api/repos/${repoSlug}/docs`, data),
  get: (repoSlug: string, docSlug: string) =>
    api.get(`/api/repos/${repoSlug}/docs/${docSlug}`),
  update: (repoSlug: string, docSlug: string, data: { title?: string; current_content?: string; commit_message?: string }) =>
    api.put(`/api/repos/${repoSlug}/docs/${docSlug}`, data),
  delete: (repoSlug: string, docSlug: string) =>
    api.delete(`/api/repos/${repoSlug}/docs/${docSlug}`),
  getVersions: (repoSlug: string, docSlug: string) =>
    api.get(`/api/repos/${repoSlug}/docs/${docSlug}/versions`),
  getVersion: (repoSlug: string, docSlug: string, versionNumber: number) =>
    api.get(`/api/repos/${repoSlug}/docs/${docSlug}/versions/${versionNumber}`),
}

// DURs
export const durApi = {
  list: (repoSlug: string, status?: string) =>
    api.get(`/api/repos/${repoSlug}/durs`, { params: status ? { status } : {} }),
  create: (repoSlug: string, data: { document_id: string; title: string; description?: string; proposed_content: string }) =>
    api.post(`/api/repos/${repoSlug}/durs`, data),
  get: (repoSlug: string, durId: string) =>
    api.get(`/api/repos/${repoSlug}/durs/${durId}`),
  approve: (repoSlug: string, durId: string, data: { review_comment?: string }) =>
    api.post(`/api/repos/${repoSlug}/durs/${durId}/approve`, data),
  reject: (repoSlug: string, durId: string, data: { review_comment?: string }) =>
    api.post(`/api/repos/${repoSlug}/durs/${durId}/reject`, data),
  addComment: (repoSlug: string, durId: string, content: string) =>
    api.post(`/api/repos/${repoSlug}/durs/${durId}/comments`, { content }),
  getComments: (repoSlug: string, durId: string) =>
    api.get(`/api/repos/${repoSlug}/durs/${durId}/comments`),
}

// Users
export const userApi = {
  list: () => api.get('/api/users'),
  get: (id: string) => api.get(`/api/users/${id}`),
}
