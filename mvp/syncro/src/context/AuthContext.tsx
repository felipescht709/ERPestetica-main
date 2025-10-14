import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api'; // 👈 Usando a nossa camada de API centralizada

// Tipos
interface User {
    cod_usuario: number;
    nome_usuario: string;
    role: string;
    cod_usuario_empresa: number; 
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loadingAuth: boolean;
    login: (email: string, senha: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// Hook useAuth
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Componente AuthProvider
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Efeito para carregar o usuário ao iniciar o app
    useEffect(() => {
      const loadUserFromStorage = async () => {
        const token = await AsyncStorage.getItem('autoEsteticaJwt');
        if (token) {
          try {
            const userData = await api('/auth/me'); 
            setUser(userData);
          } catch (error) {
            console.error("Falha ao validar token, fazendo logout:", error);
            setUser(null); // O api.ts já removeu o token inválido
          }
        }
        setLoadingAuth(false);
      };

      loadUserFromStorage();
    }, []);

    // Função de Login
    const login = async (email: string, senha: string) => {
        setLoadingAuth(true);
        try {
            const data = await api('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, senha }),
            });

            const token = data.token;
            if (!token) {
                throw new Error("Token não recebido do servidor.");
            }

            await AsyncStorage.setItem('autoEsteticaJwt', token);

            const userData = await api('/auth/me');
            setUser(userData);

        } catch (e) {
            await AsyncStorage.removeItem('autoEsteticaJwt');
            setUser(null);
            throw e; 
        } finally {
            setLoadingAuth(false);
        }
    };

    // Função de Logout
    const logout = async () => {
        setLoadingAuth(true);
        await AsyncStorage.removeItem('autoEsteticaJwt');
        setUser(null);
        setLoadingAuth(false);
    };

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loadingAuth, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
