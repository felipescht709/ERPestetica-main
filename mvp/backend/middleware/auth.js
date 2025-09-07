// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ msg: 'Acesso negado. Token de autenticação não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // GARANTA QUE O PAYLOAD DO JWT CONTÉM user.id E user.role
        // O payload que você cria no auth.js (login/register) deve ser: { user: { id: ..., role: ... } }
        req.user = decoded.user; // Anexa o objeto user decodificado (com id e role) à requisição
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Token expirado. Por favor, faça login novamente.' });
        }
        return res.status(403).json({ msg: 'Token inválido. Acesso negado.' });
    }
};

const authorizeRole = (requiredRoles) => {
    return (req, res, next) => {
        // VERIFIQUE SE req.user E req.user.role ESTÃO DISPONÍVEIS AQUI
        if (!req.user || !req.user.role) {
            return res.status(403).json({ msg: 'Acesso negado. Informações de role do usuário não disponíveis.' });
        }

        // VERIFIQUE SE A ROLE DO USUÁRIO ESTÁ INCLUÍDA NAS ROLES NECESSÁRIAS
        if (!requiredRoles.includes(req.user.role)) {
            // Logar a role para depuração:
            console.warn(`Acesso negado para role: ${req.user.role}. Roles requeridas: ${requiredRoles.join(', ')}`);
            return res.status(403).json({ msg: 'Acesso negado. Você não possui as permissões necessárias.' });
        }
        next();
    };
};


module.exports = {
    authenticateToken,
    authorizeRole
};