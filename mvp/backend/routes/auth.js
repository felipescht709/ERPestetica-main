const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db'); // A nossa instância centralizada do Knex
const { authenticateToken } = require('../middleware/auth');

// Função helper para gerar o token JWT (sem alterações, está ótima)
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
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
};

// @route    POST /api/auth/register
// @desc     Registrar um novo usuário e empresa (REFATORADO COM TRANSAÇÃO KNEX)
router.post('/register', async (req, res) => {
    const {
        nome_usuario, nome_empresa, cnpj, email, senha, role, telefone_contato,
        logo_url, codigo_ibge, cep, logradouro, numero, complemento,
        bairro, cidade, uf
    } = req.body;

    // Validações de entrada (sem alterações)
    if (!nome_usuario || !email || !senha || !nome_empresa || !cnpj || !role) {
        return res.status(400).json({ msg: 'Por favor, preencha todos os campos obrigatórios.' });
    }
    if (senha.length < 6) {
        return res.status(400).json({ msg: 'A senha deve ter no mínimo 6 caracteres.' });
    }
    if (role !== 'admin') {
        return res.status(400).json({ msg: 'Role inválida para registro inicial.' });
    }

    try {
        // O Knex.js gere a transação. Se ocorrer um erro, ele faz o rollback automaticamente.
        const registeredUser = await db.transaction(async (trx) => {
            // Verifica se o email ou CNPJ já existem usando a transação (trx)
            const existingUser = await trx('usuarios').where({ email }).orWhere({ cnpj }).first();
            if (existingUser) {
                if (existingUser.email === email) {
                    // Lança um erro para acionar o rollback
                    throw new Error('Este email já está em uso.');
                }
                if (existingUser.cnpj === cnpj) {
                    throw new Error('Este CNPJ já está registrado.');
                }
            }
            
            // Gera o hash da senha
            const salt = await bcrypt.genSalt(10);
            const senha_hash = await bcrypt.hash(senha, salt);

            // Insere o novo utilizador e retorna todos os seus dados
            const [newUser] = await trx('usuarios')
                .insert({
                    nome_usuario, nome_empresa, cnpj, email, senha_hash, role, ativo: true,
                    telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero,
                    complemento, bairro, cidade, uf
                })
                .returning('*');

            // Atualiza o cod_usuario_empresa para ser o próprio ID do admin
            const [updatedUser] = await trx('usuarios')
                .where({ cod_usuario: newUser.cod_usuario })
                .update({ cod_usuario_empresa: newUser.cod_usuario })
                .returning('*');
            
            return updatedUser;
        });

        // Se a transação for bem-sucedida, gera o token
        const token = generateToken(registeredUser);
        const { senha_hash, ...userForResponse } = registeredUser;

        res.status(201).json({ token, user: userForResponse });

    } catch (err) {
        console.error('Erro no registro do usuário:', err);
        // Responde com a mensagem de erro específica que foi lançada na transação
        if (err.message.includes('email') || err.message.includes('CNPJ')) {
            return res.status(409).json({ msg: err.message });
        }
        res.status(500).json({ msg: 'Erro interno do servidor durante o registro.' });
    }
});


// @route    POST /api/auth/login
// @desc     Autenticar usuário e obter token (CORRIGIDO)
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ msg: 'Por favor, forneça email e senha.' });
    }

    try {
        const user = await db('usuarios').where({ email }).first();
        if (!user) {
            return res.status(401).json({ msg: 'Credenciais inválidas.' });
        }

        const isMatch = await bcrypt.compare(senha, user.senha_hash);
        if (!isMatch) {
            return res.status(401).json({ msg: 'Credenciais inválidas.' });
        }
        
        const token = generateToken(user);
        const { senha_hash, ...userForResponse } = user;
        
        res.json({ token, user: userForResponse });
    } catch (err) {
        console.error('Erro no servidor ao tentar fazer login:', err);
        res.status(500).json({ msg: 'Erro interno do servidor.' });
    }
});

// @route    GET /api/auth/me
// @desc     Obter dados do usuário logado (CORRIGIDO)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await db('usuarios')
            .where({ cod_usuario: req.user.id })
            .select(
                'cod_usuario', 'nome_usuario', 'nome_empresa', 'cnpj', 'email', 'role', 'ativo',
                'telefone_contato', 'logo_url', 'codigo_ibge', 'cep', 'logradouro', 'numero', 
                'complemento', 'bairro', 'cidade', 'uf', 'created_at', 'updated_at', 'cod_usuario_empresa'
            )
            .first();

        if (!user) {
            return res.status(404).json({ msg: 'Utilizador não encontrado.' });
        }
        res.json(user);
    } catch (err) {
        console.error('Erro ao obter dados do utilizador logado:', err);
        res.status(500).json({ msg: 'Erro interno do servidor.' });
    }
});

module.exports = router;