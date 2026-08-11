/* oxlint-disable react/only-export-components -- context + hook live in one file */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { api, getToken, saveAuth, clearAuth, type ApiUser } from './api'

interface AuthContextValue {
  user: ApiUser | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (patch: Partial<ApiUser>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function storedUser(): ApiUser | null {
  const raw = localStorage.getItem('ahms_user')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ApiUser>
    return { permissions: [], ...parsed } as ApiUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(storedUser())
  const [token, setToken] = useState<string | null>(getToken())

  const login = async (email: string, password: string) => {
    const res = await api.post<{ data: import('./api').LoginResponse }>(
      '/auth/login',
      { email, password },
    )
    const data = res.data.data
    saveAuth({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in_seconds: data.expires_in_seconds,
      user: {
        id: data.user.id,
        full_name: data.user.full_name,
        email: data.user.email,
        mobile: data.user.mobile,
        role_name: data.user.role_name,
        permissions: data.user.permissions ?? [],
      },
    })
    setUser({
      id: data.user.id,
      full_name: data.user.full_name,
      email: data.user.email,
      mobile: data.user.mobile,
      role_name: data.user.role_name,
      permissions: data.user.permissions ?? [],
    })
    setToken(data.access_token)
  }

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Best-effort: proceed with local cleanup even if server call fails
    }
    clearAuth()
    setUser(null)
    setToken(null)
  }, [])

  const updateUser = useCallback((patch: Partial<ApiUser>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      localStorage.setItem('ahms_user', JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
