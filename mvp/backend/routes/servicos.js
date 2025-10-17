// routes/servicos.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET all services
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const servicos = await db('servicos')
            .where('cod_usuario_empresa', req.user.cod_usuario_empresa)
            .orderBy('nome_servico');
        res.json(servicos);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET service by ID
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const service = await db('servicos')
            .where({ cod_servico: id, cod_usuario_empresa: req.user.cod_usuario_empresa })
            .first();
        if (!service) {
            return res.status(404).json({ msg: 'Serviço não encontrado' });
        }
        res.json(service);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new service
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const {
        nome_servico, descricao_servico, duracao_minutos, preco, categoria, ativo = true,
        custo_material = 0, custo_mao_de_obra = 0, garantia_dias, observacoes_internas, 
        imagem_url, ordem_exibicao, requer_aprovacao = false
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    // Validações
    if (!nome_servico || !duracao_minutos || !preco || !categoria) {
        return res.status(400).json({ msg: 'Nome, duração, preço e categoria são obrigatórios.' });
    }

    try {
        await db.transaction(async trx => {
            const serviceExists = await trx('servicos')
                .where({ nome_servico, cod_usuario_empresa })
                .first();

            if (serviceExists) {
                return res.status(400).json({ msg: 'Já existe um serviço com este nome para a sua empresa.' });
            }

            const [newService] = await trx('servicos').insert({
                nome_servico, descricao_servico, duracao_minutos, preco, categoria, ativo,
                custo_material, custo_mao_de_obra, garantia_dias, observacoes_internas, 
                imagem_url, ordem_exibicao, requer_aprovacao, cod_usuario_empresa
            }).returning('*');

            res.status(201).json(newService);
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) a service
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const { nome_servico, ...updateData } = req.body;

    if (Object.keys(updateData).length === 0 && !nome_servico) {
        return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
    }

    try {
        await db.transaction(async trx => {
            if (nome_servico) {
                const serviceExists = await trx('servicos')
                    .where({ nome_servico, cod_usuario_empresa })
                    .andWhereNot('cod_servico', id)
                    .first();
                if (serviceExists) {
                    return res.status(400).json({ msg: 'Já existe outro serviço com este nome.' });
                }
                updateData.nome_servico = nome_servico;
            }

            updateData.updated_at = db.fn.now();

            const [updatedService] = await trx('servicos')
                .where({ cod_servico: id, cod_usuario_empresa })
                .update(updateData)
                .returning('*');

            if (!updatedService) {
                return res.status(404).json({ msg: 'Serviço não encontrado' });
            }
            res.json(updatedService);
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE a service (soft delete)
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const [deletedService] = await db('servicos')
            .where({ cod_servico: id, cod_usuario_empresa })
            .update({
                ativo: false,
                updated_at: db.fn.now()
            })
            .returning('cod_servico');

        if (!deletedService) {
            return res.status(404).json({ msg: 'Serviço não encontrado' });
        }
        res.json({ msg: 'Serviço desativado com sucesso (não deletado fisicamente)' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;