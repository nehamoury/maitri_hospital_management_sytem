import axios from 'axios'

export const TOKEN_KEY = 'ahms_token'
export const USER_KEY = 'ahms_user'
export const REFRESH_TOKEN_KEY = 'ahms_refresh_token'

export const PORTAL_TOKEN_KEY = 'ahms_portal_token'
export const PORTAL_USER_KEY = 'ahms_portal_user'
export const PORTAL_REFRESH_TOKEN_KEY = 'ahms_portal_refresh_token'

export interface ApiUser {
  id: string
  full_name: string
  email: string
  mobile: string
  role_name: string
  permissions: string[]
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in_seconds: number
  user: ApiUser
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  error?: string
  data: T
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getPortalToken(): string | null {
  return localStorage.getItem(PORTAL_TOKEN_KEY)
}

export function getPortalRefreshToken(): string | null {
  return localStorage.getItem(PORTAL_REFRESH_TOKEN_KEY)
}

export function saveAuth(data: LoginResponse, portal = false) {
  const tk = portal ? PORTAL_TOKEN_KEY : TOKEN_KEY
  const uk = portal ? PORTAL_USER_KEY : USER_KEY
  const rk = portal ? PORTAL_REFRESH_TOKEN_KEY : REFRESH_TOKEN_KEY
  localStorage.setItem(tk, data.access_token)
  localStorage.setItem(uk, JSON.stringify(data.user))
  localStorage.setItem(rk, data.refresh_token)
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function clearPortalAuth() {
  localStorage.removeItem(PORTAL_TOKEN_KEY)
  localStorage.removeItem(PORTAL_USER_KEY)
  localStorage.removeItem(PORTAL_REFRESH_TOKEN_KEY)
}

export function getPortalUser(): ApiUser | null {
  const raw = localStorage.getItem(PORTAL_USER_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ApiUser>
    return { permissions: [], ...parsed } as ApiUser
  } catch {
    return null
  }
}

export const api = axios.create({
  baseURL: '/api/v1',
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const portalApi = axios.create({
  baseURL: '/api/v1',
})

portalApi.interceptors.request.use((config) => {
  const token = getPortalToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---------------------------------------------------------------------------
// Refresh-token logic: prevent concurrent refresh attempts with a shared
// promise so multiple simultaneous 401s only trigger one refresh call.
// ---------------------------------------------------------------------------
let adminRefreshPromise: Promise<string> | null = null
let portalRefreshPromise: Promise<string> | null = null

function doRefresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  return axios
    .post<{ data: { access_token: string; refresh_token: string } }>('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    })
    .then((res) => res.data.data)
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      const rt = getRefreshToken()
      if (!rt) {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }
      originalRequest._retry = true

      if (!adminRefreshPromise) {
        adminRefreshPromise = doRefresh(rt)
          .then((tokens) => {
            localStorage.setItem(TOKEN_KEY, tokens.access_token)
            localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
            return tokens.access_token
          })
          .catch((err) => {
            clearAuth()
            window.location.href = '/login'
            return Promise.reject(err)
          })
          .finally(() => {
            adminRefreshPromise = null
          })
      }

      return adminRefreshPromise.then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      })
    }
    return Promise.reject(error)
  },
)

portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      const rt = getPortalRefreshToken()
      if (!rt) {
        clearPortalAuth()
        window.location.href = '/portal/login'
        return Promise.reject(error)
      }
      originalRequest._retry = true

      if (!portalRefreshPromise) {
        portalRefreshPromise = doRefresh(rt)
          .then((tokens) => {
            localStorage.setItem(PORTAL_TOKEN_KEY, tokens.access_token)
            localStorage.setItem(PORTAL_REFRESH_TOKEN_KEY, tokens.refresh_token)
            return tokens.access_token
          })
          .catch((err) => {
            clearPortalAuth()
            window.location.href = '/portal/login'
            return Promise.reject(err)
          })
          .finally(() => {
            portalRefreshPromise = null
          })
      }

      return portalRefreshPromise.then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return portalApi(originalRequest)
      })
    }
    return Promise.reject(error)
  },
)

export function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiResponse<unknown> | undefined
    if (data?.error) return data.error
    if (data?.message) return data.message
  }
  return fallback
}

// openPrescriptionPrint fetches the backend-rendered HTML slip (auth header
// included via the axios instance) and opens it in a print-ready new tab.
export async function openPrescriptionPrint(id: string): Promise<void> {
  const res = await api.get<string>(`/prescriptions/${id}/print`, { responseType: 'text' })
  const win = window.open('', '_blank')
  if (!win) throw new Error('Popup blocked')
  win.document.open()
  win.document.write(res.data)
  win.document.close()
  win.focus()
}
