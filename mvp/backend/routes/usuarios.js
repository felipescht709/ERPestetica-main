// routes/usuarios.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET all users
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const users = await db('usuarios')
            .where('cod_usuario_empresa', req.user.cod_usuario_empresa)
            .select(
                'cod_usuario', 'nome_usuario', 'nome_empresa', 'cnpj', 'email', 'role', 'ativo',
                'telefone_contato', 'logo_url', 'codigo_ibge', 'cep', 'logradouro', 'numero', 
                'complemento', 'bairro', 'cidade', 'uf', 'created_at', 'updated_at'
            )
            .orderBy('nome_usuario');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET user by ID
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    if (req.user.role !== 'admin' && req.user.id.toString() !== id) {
        return res.status(403).json({ msg: 'Acesso negado.' });
    }
    try {
        const user = await db('usuarios')
            .where({ cod_usuario: id, cod_usuario_empresa: req.user.cod_usuario_empresa })
            .select(
                'cod_usuario', 'nome_usuario', 'nome_empresa', 'cnpj', 'email', 'role', 'ativo',
                'telefone_contato', 'logo_url', 'codigo_ibge', 'cep', 'logradouro', 'numero', 
                'complemento', 'bairro', 'cidade', 'uf', 'created_at', 'updated_at'
            )
            .first();

        if (!user) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new user
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const {
        nome_usuario, email, senha, role, ativo = true, telefone_contato, logo_url,
        codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf
    } = req.body;
    const { cod_usuario_empresa, nome_empresa, cnpj } = req.user;

    if (!nome_usuario || !email || !senha || !role) {
        return res.status(400).json({ msg: 'Por favor, preencha todos os campos obrigatórios.' });
    }
    if (!['admin', 'gerente', 'atendente', 'tecnico', 'gestor'].includes(role)) {
        return res.status(400).json({ msg: 'Role inválida fornecida.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        const [newUser] = await db('usuarios').insert({
            nome_usuario, nome_empresa, cnpj, email, senha_hash, role, ativo,
            telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, 
            complemento, bairro, cidade, uf, cod_usuario_empresa
        }).returning('*');

        const { senha_hash: returnedSenhaHash, ...userWithoutHash } = newUser;
        res.status(201).json(userWithoutHash);
    } catch (err) {
        console.error('Erro ao criar usuário:', err);
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({ msg: 'Este email já está em uso.' });
        }
        res.status(500).json({ msg: 'Erro interno do servidor ao criar usuário.', error: err.message });
    }
});

// PUT (update) a user
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { senha, ...updateData } = req.body;

    if (req.user.role !== 'admin' && req.user.id.toString() !== id) {
        return res.status(403).json({ msg: 'Acesso negado.' });
    }
    if (req.user.role !== 'admin' && (updateData.role !== undefined || updateData.ativo !== undefined)) {
        return res.status(403).json({ msg: 'Acesso negado. Você não pode alterar sua própria role ou status.' });
    }

    try {
        if (senha) {
            const salt = await bcrypt.genSalt(10);
            updateData.senha_hash = await bcrypt.hash(senha, salt);
        }
        updateData.updated_at = db.fn.now();

        const [updatedUser] = await db('usuarios')
            .where({ cod_usuario: id, cod_usuario_empresa: req.user.cod_usuario_empresa })
            .update(updateData)
            .returning('*');

        if (!updatedUser) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }

        const { senha_hash, ...userWithoutHash } = updatedUser;
        res.json(userWithoutHash);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE a user
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { id } = req.params;
    if (req.user.id.toString() === id) {
        return res.status(400).json({ msg: 'Não é possível deletar seu próprio usuário de administrador.' });
    }

    try {
        const numDeleted = await db('usuarios')
            .where({ cod_usuario: id, cod_usuario_empresa: req.user.cod_usuario_empresa })
            .del();

        if (numDeleted === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        res.json({ msg: 'Usuário deletado com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;