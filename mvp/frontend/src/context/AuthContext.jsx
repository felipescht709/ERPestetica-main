import { createContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('autoEsteticaJwt'))
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const userData = await api('/auth/me', { method: 'GET' })
          setUser(userData)
          if (['/', '/login', '/register'].includes(window.location.pathname)) {
            navigate('/home', { replace: true })
          }
        } catch (err) {
          console.error('Erro ao verificar token:', err)
          logout()
        } finally {
          setLoadingAuth(false)
        }
      } else {
        setLoadingAuth(false)
        if (!['/', '/login', '/register'].includes(window.location.pathname)) {
          navigate('/login', { replace: true })
        }
      }
    }
    verifyAuth()
    // eslint-disable-next-line
  }, [token])

  const login = async (tokenReceived) => {
    localStorage.setItem('autoEsteticaJwt', tokenReceived)
    setToken(tokenReceived)
  }

  const logout = () => {
    localStorage.removeItem('autoEsteticaJwt')
    setToken(null)
    setUser(null)
    navigate('/login', { replace: true })
  }

  const isAuthenticated = !!token && !!user
  const userRole = user?.role || null

  return (
    <AuthContext.Provider value={{
      token,
      setToken,
      user,
      setUser,
      loadingAuth,
      login,
      logout,
      isAuthenticated,
      userRole
    }}>
      {children}
    </AuthContext.Provider>
  )
}