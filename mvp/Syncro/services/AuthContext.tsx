import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Carrega o utilizador a partir do armazenamento na inicialização da aplicação
    useEffect(() => {
        const loadUserFromStorage = async () => {
            const token = await AsyncStorage.getItem('autoEsteticaJwt');
            if (token) {
                try {
                    const userData = await api('/auth/me');
                    setUser(userData);
                } catch (error) {
                    await AsyncStorage.removeItem('autoEsteticaJwt');
                }
            }
            setLoadingAuth(false);
        };
        loadUserFromStorage();
    }, []);

    // Função de login robusta que espera a validação
    const login = async (token: string) => {
        setLoadingAuth(true);
        try {
            // 1. ESPERA que o token seja guardado
            await AsyncStorage.setItem('autoEsteticaJwt', token);
            // 2. USA o token para validar e obter os dados do utilizador
            const userData = await api('/auth/me');
            // 3. SÓ DEPOIS do sucesso, define o utilizador, o que liberta o acesso
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