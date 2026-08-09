import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let queue = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve) => queue.push(resolve)).then(() => api(originalRequest))
      }

      isRefreshing = true
      try {
        const resp = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        )
        localStorage.setItem('access_token', resp.data.access_token)
        queue.forEach((resolve) => resolve())
        queue = []
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api

const API_ORIGIN_FOR_MEDIA = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '')

// Cloudinary URLs are already full https:// links; only prepend the API
// origin for any legacy locally-stored paths (pre-Cloudinary uploads).
export function mediaUrl(url) {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_ORIGIN_FOR_MEDIA}${url}`
}

export async function downloadFile(url, filename) {
  try {
    const response = await api.get(url, { responseType: 'blob' })
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = blobUrl
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(blobUrl)
  } catch (err) {
    // Error responses also arrive as a Blob when responseType is 'blob' -
    // read it back as text to recover the actual JSON error message.
    if (err.response?.data instanceof Blob) {
      const text = await err.response.data.text()
      try {
        const parsed = JSON.parse(text)
        throw new Error(parsed.error || 'Could not download this file.')
      } catch {
        throw new Error('Could not download this file.')
      }
    }
    throw err
  }
}
