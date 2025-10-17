// routes/clientes.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs'); // Adicionado bcryptjs

// GET all clients
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    try {
        const clientes = await db('clientes')
            .where('cod_usuario_empresa', req.user.cod_usuario_empresa)
            .orderBy('nome_cliente');
        res.json(clientes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET client by ID
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    try {
        const { id } = req.params;
        const cliente = await db('clientes')
            .where({ cod_cliente: id, cod_usuario_empresa: req.user.cod_usuario_empresa })
            .first();
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente não encontrado' });
        }
        res.json(cliente);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET client by CPF
router.get('/cpf/:cpf', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    try {
        const { cpf } = req.params;
        const cliente = await db('clientes')
            .where({ cpf: cpf, cod_usuario_empresa: req.user.cod_usuario_empresa })
            .first();
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente não encontrado' });
        }
        res.json(cliente);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new client
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        cpf, nome_cliente, data_nascimento, email, telefone, codigo_ibge, cep, 
        logradouro, numero, complemento, bairro, cidade, uf, senha, ativo = true, 
        observacoes_gerais, indicado_por, genero
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    if (!cpf || !nome_cliente || !email || !telefone) {
        return res.status(400).json({ msg: 'CPF, nome, email e telefone são campos obrigatórios.' });
    }

    try {
        await db.transaction(async trx => {
            const existingClient = await trx('clientes')
                .where({ cod_usuario_empresa })
                .andWhere(function() {
                    this.where('cpf', cpf).orWhere('email', email);
                })
                .first();

            if (existingClient) {
                if (existingClient.cpf === cpf) {
                    return res.status(400).json({ msg: 'CPF já está em uso.' });
                }
                if (existingClient.email === email) {
                    return res.status(400).json({ msg: 'Email já está em uso.' });
                }
            }

            let senha_hash = null;
            if (senha) {
                const salt = await bcrypt.genSalt(10);
                senha_hash = await bcrypt.hash(senha, salt);
            }

            const [newClient] = await trx('clientes').insert({
                cpf, nome_cliente, data_nascimento, email, telefone, codigo_ibge, cep,
                logradouro, numero, complemento, bairro, cidade, uf, senha_hash, ativo,
                observacoes_gerais, indicado_por, genero, cod_usuario_empresa
            }).returning('*');

            const { senha_hash: returnedSenhaHash, ...clientWithoutHash } = newClient;
            res.status(201).json(clientWithoutHash);
        });
    } catch (err) {
        console.error(err.message);
        // Verifica erros específicos do banco de dados (ex: violação de constraint única)
        if (err.code === '23505') { // Código de erro do PostgreSQL para unique_violation
            if (err.constraint.includes('cpf')) {
                return res.status(400).json({ msg: 'CPF já está em uso.' });
            }
            if (err.constraint.includes('email')) {
                return res.status(400).json({ msg: 'Email já está em uso.' });
            }
        }
        res.status(500).send('Server Error');
    }
});

// PUT (update) a client
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const {
        cpf, nome_cliente, data_nascimento, email, telefone, codigo_ibge, cep,
        logradouro, numero, complemento, bairro, cidade, uf, senha, ativo,
        observacoes_gerais, indicado_por, genero
    } = req.body;

    try {
        await db.transaction(async trx => {
            if (cpf) {
                const cpfExists = await trx('clientes')
                    .where('cpf', cpf)
                    .andWhere('cod_usuario_empresa', cod_usuario_empresa)
                    .andWhereNot('cod_cliente', id)
                    .first();
                if (cpfExists) {
                    return res.status(400).json({ msg: 'CPF já está em uso por outro cliente.' });
                }
            }
            if (email) {
                const emailExists = await trx('clientes')
                    .where('email', email)
                    .andWhere('cod_usuario_empresa', cod_usuario_empresa)
                    .andWhereNot('cod_cliente', id)
                    .first();
                if (emailExists) {
                    return res.status(400).json({ msg: 'Email já está em uso por outro cliente.' });
                }
            }

            const updateData = { ...req.body };
            delete updateData.senha; // Remove a senha para não ser atualizada diretamente

            if (senha) {
                const salt = await bcrypt.genSalt(10);
                updateData.senha_hash = await bcrypt.hash(senha, salt);
            }
            
            updateData.updated_at = db.fn.now();

            const [updatedClient] = await trx('clientes')
                .where({ cod_cliente: id, cod_usuario_empresa })
                .update(updateData)
                .returning('*');

            if (!updatedClient) {
                return res.status(404).json({ msg: 'Cliente não encontrado' });
            }

            const { senha_hash, ...clientWithoutHash } = updatedClient;
            res.json(clientWithoutHash);
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE a client (soft delete)
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const [deletedClient] = await db('clientes')
            .where({ cod_cliente: id, cod_usuario_empresa: req.user.cod_usuario_empresa })
            .update({
                ativo: false,
                updated_at: db.fn.now()
            })
            .returning('cod_cliente');

        if (!deletedClient) {
            return res.status(404).json({ msg: 'Cliente não encontrado' });
        }
        res.json({ msg: 'Cliente desativado com sucesso (não deletado fisicamente)' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;