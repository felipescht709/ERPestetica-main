import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.0.102:3001/api';

const getAuthToken = async () => {
    return AsyncStorage.getItem('autoEsteticaJwt');
};

const api = async (url: string, options: RequestInit = {}) => {
    // --- LOG A: ANTES DE QUALQUER CHAMADA ---
    console.log(`[API] Preparando requisição para: ${API_BASE_URL}${url}`);
    
    const token = await getAuthToken();

    // --- LOG B: VERIFICAR O TOKEN ENCONTRADO ---
    console.log(`[API] Token lido do AsyncStorage: ${token ? `...${token.slice(-10)}` : 'NENHUM TOKEN ENCONTRADO'}`);

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    // --- LOG C: VERIFICAR OS CABEÇALHOS FINAIS ---
    console.log('[API] Cabeçalhos enviados:', headers);

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers,
        });

        if (response.status === 401 || response.status === 403) {
            // Em React Native, a camada de UI (AuthContext) deve lidar com o logout.
            // A API apenas remove o token e lança o erro.
            await AsyncStorage.removeItem('autoEsteticaJwt');
            throw new Error('Sessão expirada ou acesso negado.');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw errorData; 
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        }
        return {};

    } catch (error) {
        // --- LOG D: ERRO NA CHAMADA FETCH ---
        console.error(`[API] Erro final na chamada para ${url}:`, error);
        throw error;
    }
};

export default api;