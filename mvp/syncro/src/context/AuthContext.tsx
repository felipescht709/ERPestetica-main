// AuthContext.tsx (VERSÃO CORRIGIDA E RECOMENDADA)

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api'; // 👈 IMPORTANTE: Usando sua camada de API centralizada

// 1. Tipos (permanecem os mesmos)
interface User {
    cod_usuario: number;
    nome_usuario: string;
    role: string;
    // Adicione outros campos que a rota /me retorna, como cod_usuario_empresa
    cod_usuario_empresa: number; 
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loadingAuth: boolean;
    login: (email: string, senha: string) => Promise<void>; // Corrigido o tipo da função login
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// Hook useAuth (permanece o mesmo, mas corrigi o tipo do login)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- COMPONENTE PRINCIPAL CORRIGIDO ---
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null); // Tipando o estado
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Efeito para carregar o usuário ao iniciar o app
    useEffect(() => {
      const loadUserFromStorage = async () => {
        const token = await AsyncStorage.getItem('autoEsteticaJwt');
        if (token) {
          try {
            // ✅ USA A CAMADA DE API: A URL e o token são gerenciados pelo `api.ts`
            const userData = await api('/auth/me'); 
            setUser(userData);
          } catch (error) {
            // Se a chamada falhar (token inválido), o `api.ts` já lida com a remoção do token
            console.error("Falha ao validar token, fazendo logout:", error);
            setUser(null);
          }
        }
        setLoadingAuth(false);
      };

      loadUserFromStorage();
    }, []);

    // Função de Login refatorada
    const login = async (email: string, senha: string) => {
        setLoadingAuth(true);
        try {
            // 1️⃣ Envia email/senha para o backend usando a camada de API
            const data = await api('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, senha }),
            });

            const token = data.token;
            if (!token) {
                throw new Error("Token não recebido do servidor.");
            }

            // 2️⃣ Armazena o token
            await AsyncStorage.setItem('autoEsteticaJwt', token);

            // 3️⃣ Busca dados do usuário com o token recém-salvo
            // O `api.ts` vai ler o token do AsyncStorage e adicioná-lo automaticamente
            const userData = await api('/auth/me');
            setUser(userData);

        } catch (e) {
            // Limpa o estado em caso de erro
            await AsyncStorage.removeItem('autoEsteticaJwt');
            setUser(null);
            throw e; // Re-lança o erro para a tela de Login poder exibi-lo
        } finally {
            setLoadingAuth(false);
        }
    };

    // Função de Logout (permanece a mesma)
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
