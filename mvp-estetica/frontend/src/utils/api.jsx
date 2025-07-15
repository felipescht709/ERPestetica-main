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

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
        body: options.body,
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('autoEsteticaJwt');
        window.location.href = '/login';
        throw new Error('Sessão expirada ou acesso negado.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido.' }));
        throw new Error(errorData.message || `Erro na requisição: ${response.status} ${response.statusText}`);
    }

    try {
        return await response.json();
    } catch (e) {
        return {};
    }
};

export default api;





