import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { useContext } from 'react';

// 1. Definir os tipos para o usuário e para o valor do contexto
interface User {
    cod_usuario: number;
    nome_usuario: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loadingAuth: boolean;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return {
    user: context.user,
    loading: context.loadingAuth,
    isAuthenticated: context.isAuthenticated,
    login: context.login,
    logout: context.logout,
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
  const loadUserFromStorage = async () => {
    const token = await AsyncStorage.getItem('autoEsteticaJwt');
    if (token) {
      try {
        // Chamada ao backend enviando o token
        const res = await fetch('http://192.168.0.102:3001/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Sessão expirada ou acesso negado.');
        }

        const userData = await res.json();
        setUser(userData);
      } catch (error) {
        await AsyncStorage.removeItem('autoEsteticaJwt');
        setUser(null);
      }
    }
    setLoadingAuth(false);
  };

  loadUserFromStorage();
}, []);

   const login = async (email: string, senha: string) => {
    setLoadingAuth(true);
    try {
        // 1️⃣ Envia email/senha para o backend
        const res = await fetch('http://192.168.0.102:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
        });

        if (!res.ok) {
        throw new Error('Usuário ou senha inválidos.');
        }

        const data = await res.json(); // deve retornar { token: '...' }
        const token = data.token;

        // 2️⃣ Armazena o token
        await AsyncStorage.setItem('autoEsteticaJwt', token);

        // 3️⃣ Busca dados do usuário com token
        const meRes = await fetch('http://192.168.0.102:3001/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
        });

        if (!meRes.ok) {
        throw new Error('Sessão expirada ou acesso negado.');
        }

        const userData = await meRes.json();
        setUser(userData);

    } catch (e) {
        await AsyncStorage.removeItem('autoEsteticaJwt');
        setUser(null);
        throw e;
    } finally {
        setLoadingAuth(false);
    }
    };


    const logout = async () => {
        setLoadingAuth(true);
        await AsyncStorage.removeItem('autoEsteticaJwt');
        setUser(null);
        setLoadingAuth(false);
    };

    // A autenticação agora depende da existência do objeto 'user'
    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loadingAuth, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
    
};