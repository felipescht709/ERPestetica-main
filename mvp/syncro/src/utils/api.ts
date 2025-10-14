import AsyncStorage from '@react-native-async-storage/async-storage';

// --- CORREÇÃO PRINCIPAL AQUI ---
// Adicionei o prefixo '/api' à URL base.
const API_BASE_URL = 'https://erpestetica-main-72067591277.southamerica-east1.run.app/api';

const api = async (endpoint: string, options: RequestInit = {}) => {
    // --- LOG A: ANTES DE QUALQUER CHAMADA ---
    console.log(`[API] Preparando requisição para: ${API_BASE_URL}${endpoint}`);
    
    const token = await AsyncStorage.getItem('autoEsteticaJwt');

    // --- LOG B: VERIFICAR O TOKEN ENCONTRADO ---
    console.log(`[API] Token lido do AsyncStorage: ${token ? `...${token.slice(-10)}` : 'NENHUM TOKEN ENCONTRADO'}`);

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // --- LOG C: VERIFICAR OS CABEÇALHOS FINAIS ---
    console.log(`[API] Cabeçalhos enviados para ${endpoint}:`, headers);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        // Tratamento de Respostas de Sucesso
        if (response.ok) {
            if (response.status === 204) { // Lida com sucesso sem conteúdo (ex: DELETE)
                return null;
            }
            return response.json(); // Para todas as outras respostas de sucesso
        }

        // Tratamento de Respostas de Erro
        // Se o token for inválido, o AuthContext irá tratar o logout.
        if (response.status === 401 || response.status === 403) {
            await AsyncStorage.removeItem('autoEsteticaJwt');
        }
        
        // Tenta obter uma mensagem de erro do corpo da resposta, com um fallback.
        const errorBody = await response.json().catch(() => ({
            msg: `Erro ${response.status}: O servidor não retornou uma mensagem de erro detalhada.`
        }));

        // Lança um erro padronizado para ser capturado pelo AuthContext.
        throw new Error(errorBody.msg || 'Ocorreu um erro na requisição.');

    } catch (error) {
        // --- LOG D: ERRO NA CHAMADA FETCH ---
        console.error(`[API] Erro final na chamada para ${endpoint}:`, error);
        // Re-lança o erro para que o AuthContext possa lidar com ele.
        throw error;
    }
};

export default api;

