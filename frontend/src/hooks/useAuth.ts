import { useState, useEffect, useCallback } from 'react'
import { authApi } from '../lib/api'

export interface User {
  id: string
  username: string
  email: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const response = await authApi.me()
      setUser(response.data)
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (username: string, password: string) => {
    const response = await authApi.login({ username, password })
    const { access_token, refresh_token } = response.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    await fetchUser()
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  const register = async (username: string, email: string, password: string) => {
    const response = await authApi.register({ username, email, password })
    return response.data
  }

  return { user, loading, login, logout, register, refetch: fetchUser }
}
