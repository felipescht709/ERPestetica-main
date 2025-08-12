// frontend/src/utils/api.jsx (VERSÃO CORRETA USANDO FETCH)

const API_BASE_URL = 'http://localhost:3001/api';

const getAuthToken = () => {
    return localStorage.getItem('autoEsteticaJwt');
};

const api = async (url, options = {}) => {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers,
        });

        // Tratamento para sessão expirada ou acesso negado
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('autoEsteticaJwt');
            window.location.href = '/login';
            // Lança um erro que será pego pelo bloco catch geral
            throw new Error('Sessão expirada ou acesso negado.');
        }

        // Se a resposta NÃO for OK (ex: 400, 409, 500), entra aqui
        if (!response.ok) {
            // Tenta extrair o corpo do erro (o nosso JSON com a propriedade "msg")
            const errorData = await response.json();
            // Lança um erro contendo o objeto de erro do backend.
            // Isso permite que o componente (AppointmentModal) leia a 'msg'.
            throw errorData; 
        }

        // Se a resposta for OK, tenta retornar o JSON.
        // Se o corpo for vazio (ex: resposta 204 No Content), retorna um objeto vazio.
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        }
        return {}; // Retorna objeto vazio se não houver JSON

    } catch (error) {
        // Este bloco 'catch' agora vai capturar tanto os erros de rede
        // quanto os erros que lançamos (errorData).
        // Ele repassa o erro para a função que chamou a API (handleSubmit).
        console.error("Erro na chamada da API:", error);
        throw error;
    }
};

export default api;