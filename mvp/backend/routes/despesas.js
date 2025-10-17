// backend/routes/despesas.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET all despesas
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const { startDate, endDate, status_pagamento, tipo_despesa } = req.query;

        const query = db('despesas').where({ cod_usuario_empresa });

        if (startDate && endDate) {
            query.whereBetween('data_pagamento', [startDate, endDate]);
        }
        if (status_pagamento) {
            query.andWhere({ status_pagamento });
        }
        if (tipo_despesa) {
            query.andWhere({ tipo_despesa });
        }

        const despesas = await query.orderBy('data_vencimento', 'desc');
        res.json(despesas);
    } catch (err) {
        console.error('Erro ao buscar despesas:', err.message);
        res.status(500).json({ msg: 'Erro ao buscar despesas.', error: err.message });
    }
});

// GET despesa by ID
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const despesa = await db('despesas')
            .where({ cod_despesa: id, cod_usuario_empresa })
            .first();

        if (!despesa) {
            return res.status(404).json({ msg: 'Despesa não encontrada.' });
        }
        res.json(despesa);
    } catch (err) {
        console.error('Erro ao buscar despesa por ID:', err.message);
        res.status(500).json({ msg: 'Erro ao buscar despesa por ID.', error: err.message });
    }
});

// POST a new despesa
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const {
        descricao, valor, data_vencimento, data_pagamento, status_pagamento, tipo_despesa, observacoes
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    if (!descricao || valor === undefined || valor < 0 || !status_pagamento) {
        return res.status(400).json({ msg: 'Descrição, valor e status de pagamento são obrigatórios.' });
    }

    try {
        const [newDespesa] = await db('despesas')
            .insert({
                descricao, valor, data_vencimento, data_pagamento, status_pagamento, 
                tipo_despesa, observacoes, cod_usuario_empresa
            })
            .returning('*');
        res.status(201).json(newDespesa);
    } catch (err) {
        console.error('Erro ao adicionar despesa:', err.message);
        res.status(500).json({ msg: 'Erro ao adicionar despesa.', error: err.message });
    }
});

// PUT (update) uma despesa
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const updateData = { ...req.body };

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
    }

    try {
        const [updatedExpense] = await db('despesas')
            .where({ cod_despesa: id, cod_usuario_empresa })
            .update(updateData)
            .returning('*');

        if (!updatedExpense) {
            return res.status(404).json({ msg: 'Despesa não encontrada.' });
        }
        res.json(updatedExpense);
    } catch (err) {
        console.error('Erro ao atualizar despesa:', err.message);
        res.status(500).json({ msg: 'Erro ao atualizar despesa.', error: err.message });
    }
});

// DELETE uma despesa
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const numDeleted = await db('despesas')
            .where({ cod_despesa: id, cod_usuario_empresa })
            .del();

        if (numDeleted === 0) {
            return res.status(404).json({ msg: 'Despesa não encontrada para exclusão.' });
        }
        res.json({ msg: 'Despesa excluída com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir despesa:', err.message);
        res.status(500).json({ msg: 'Erro ao excluir despesa.', error: err.message });
    }
});

module.exports = router;