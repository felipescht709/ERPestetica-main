// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // Seu pool de conexão com o banco de dados
const { authenticateToken } = require('../middleware/auth'); // Importa o middleware de autenticação

// Helper function to generate JWT token
const generateToken = (user) => {
    const payload = {
        user: {
            id: user.cod_usuario,
            role: user.role,
            nome_usuario: user.nome_usuario,
            nome_empresa: user.nome_empresa,
            email: user.email,
            cnpj: user.cnpj,
            cod_usuario_empresa: user.cod_usuario_empresa
        }
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// @route    POST /api/auth/register
// @desc     Registrar um novo usuário (ideal para o primeiro admin da empresa)
// @access   Public (nesta fase, para permitir o registro inicial de uma empresa)
router.post('/register', async (req, res) => {
    const {
        nome_usuario,
        nome_empresa,
        cnpj,
        email,
        senha, // Senha em texto claro vinda do frontend
        role, // Esperamos 'admin' para o registro inicial de empresa
        telefone_contato,
        logo_url,
        codigo_ibge,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf
    } = req.body;

    try {
        // Iniciar transação para garantir a integridade dos dados
        await pool.query('BEGIN');

        // 1. Validação de campos obrigatórios no backend
        if (!nome_usuario || !email || !senha || !nome_empresa || !cnpj || !role) {
            return res.status(400).json({ msg: 'Por favor, preencha todos os campos obrigatórios: Nome de Usuário, Email, Senha, Nome da Empresa, CNPJ, e Role.' });
        }
        if (senha.length < 6) {
            return res.status(400).json({ msg: 'A senha deve ter no mínimo 6 caracteres.' });
        }
        // Para o registro inicial da empresa, apenas a role 'admin' deve ser permitida via esta rota.
        if (role !== 'admin') {
            return res.status(400).json({ msg: 'Role inválida para registro inicial. Apenas "admin" é permitido por esta rota.' });
        }
        // Validação de formato de email e CNPJ (exemplo simplificado, pode ser mais robusto com regex)
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ msg: 'Por favor, insira um email válido.' });
        }
        if (cnpj.length < 14) { // CNPJ com 14 dígitos (sem formatação)
            return res.status(400).json({ msg: 'CNPJ inválido. Deve conter pelo menos 14 caracteres numéricos.' });
        }

        // 3. Gerar hash da senha
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        // 4. Inserir o novo usuário no banco de dados
        const newUserResult = await pool.query(
            `INSERT INTO usuarios (
                nome_usuario, nome_empresa, cnpj, email, senha_hash, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf
            ) VALUES($1, $2, $3, $4, $5, $6, TRUE, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`, // Retorna todos os campos para uso imediato
            [
                nome_usuario, nome_empresa, cnpj, email, senha_hash, role,
                telefone_contato || null, logo_url || null, codigo_ibge || null,
                cep || null, logradouro || null, numero || null, complemento || null,
                bairro || null, cidade || null, uf || null
            ]
        );

        const newUser = newUserResult.rows[0];

        // Atualiza cod_usuario_empresa para o novo usuário registrado
        await pool.query(
            'UPDATE usuarios SET cod_usuario_empresa = $1 WHERE cod_usuario = $1',
            [newUser.cod_usuario]
        );

        // O cod_usuario_empresa agora é o próprio ID do usuário admin
        newUser.cod_usuario_empresa = newUser.cod_usuario;

        // Commit da transação
        await pool.query('COMMIT');

        // 6. Gerar o token e retornar a resposta
        const token = generateToken(newUser);
        const { senha_hash: removedHash, ...userForResponse } = newUser;
        res.status(201).json({ token, user: userForResponse });

    } catch (err) {
        // Em caso de erro, reverte a transação
        await pool.query('ROLLBACK');
        console.error('Erro no registro do usuário:', err);

        if (err.code === '23505') { // Código de erro para violação de unicidade no PostgreSQL
            if (err.constraint === 'usuarios_email_key') {
                return res.status(409).json({ msg: 'Este email já está em uso.' });
            }
            if (err.constraint === 'usuarios_cnpj_key') {
                return res.status(409).json({ msg: 'Este CNPJ já está registrado.' });
            }
        }
        res.status(500).json({ msg: 'Erro interno do servidor durante o registro.', error: err.message });
    }
});


router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email_usuario = $1', [email]);
        if (result.rows.length === 0) {
            // Unifica a mensagem para não dar pistas se o email existe ou não
            return res.status(401).json({ msg: 'Credenciais inválidas.' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(senha, user.senha_hash);
        if (!isMatch) {
            return res.status(401).json({ msg: 'Credenciais inválidas.' });
        }

        const payload = {
            user: {
                id: user.cod_usuario,
                role: user.role,
                cod_usuario_empresa: user.cod_usuario_empresa
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '12h' },
            (err, token) => {
                if (err) {
                    console.error('Erro ao gerar token JWT:', err);
                    return res.status(500).json({ msg: 'Erro ao gerar token de autenticação.' });
                }
                res.json({ token });
            }
        );
    } catch (err) {
        console.error('Erro no servidor ao tentar fazer login:', err.message);
        // Garante que a resposta de erro seja sempre um JSON válido
        res.status(500).json({ msg: 'Erro de Servidor' });
    }
});

// @route    GET /api/auth/me
// @desc     Obter dados do usuário logado usando o token JWT
// @access   Private (requer token válido)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // req.user é populado pelo middleware authenticateToken
        // Retorna todos os campos do usuário, exceto a senha_hash
        const user = await pool.query(
            `SELECT
                cod_usuario, nome_usuario, nome_empresa, cnpj, email, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                created_at, updated_at
            FROM usuarios WHERE cod_usuario = $1`,
            [req.user.id]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado.' });
        }

        res.json(user.rows[0]);
    } catch (err) {
        console.error('Erro ao obter dados do usuário logado:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor ao buscar dados do usuário.' });
    }
});

module.exports = router;