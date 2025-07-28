// backend/routes/despesas.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth'); // Importa os middlewares

// GET all despesas (multi-tenant)
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const { startDate, endDate, status_pagamento, tipo_despesa } = req.query;

        let query = `
            SELECT * FROM despesas
            WHERE cod_usuario_empresa = $1 AND ativo = TRUE
        `;
        const params = [cod_usuario_empresa];
        let paramIndex = 2;

        if (startDate && endDate) {
            query += ` AND data_pagamento BETWEEN $${paramIndex++}::date AND $${paramIndex++}::date`;
            params.push(startDate, endDate);
        }
        if (status_pagamento) {
            query += ` AND status_pagamento = $${paramIndex++}`;
            params.push(status_pagamento);
        }
        if (tipo_despesa) {
            query += ` AND tipo_despesa = $${paramIndex++}`;
            params.push(tipo_despesa);
        }

        query += ` ORDER BY data_vencimento DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar despesas:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET despesa by ID (multi-tenant)
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const result = await pool.query(
            `SELECT * FROM despesas WHERE cod_despesa = $1 AND cod_usuario_empresa = $2 AND ativo = TRUE`,
            [id, cod_usuario_empresa]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Despesa não encontrada.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar despesa por ID:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new despesa (multi-tenant)
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const {
        descricao, valor, data_vencimento, data_pagamento, status_pagamento, tipo_despesa, observacoes
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    try {
        if (!descricao || valor === undefined || valor < 0 || !status_pagamento) {
            return res.status(400).json({ msg: 'Descrição, valor e status de pagamento são obrigatórios.' });
        }

        const result = await pool.query(
            `INSERT INTO despesas (
                descricao, valor, data_vencimento, data_pagamento, status_pagamento, tipo_despesa, observacoes, cod_usuario_empresa
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                descricao, valor, data_vencimento, data_pagamento, status_pagamento, tipo_despesa, observacoes, cod_usuario_empresa
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao adicionar despesa:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) uma despesa (multi-tenant)
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const {
        descricao, valor, data_vencimento, data_pagamento, status_pagamento, tipo_despesa, observacoes, ativo
    } = req.body;

    try {
        let query = 'UPDATE despesas SET ';
        const params = [];
        let i = 1;

        if (descricao !== undefined) { query += `descricao = $${i++}, `; params.push(descricao); }
        if (valor !== undefined) { query += `valor = $${i++}, `; params.push(valor); }
        if (data_vencimento !== undefined) { query += `data_vencimento = $${i++}, `; params.push(data_vencimento); }
        if (data_pagamento !== undefined) { query += `data_pagamento = $${i++}, `; params.push(data_pagamento); }
        if (status_pagamento !== undefined) { query += `status_pagamento = $${i++}, `; params.push(status_pagamento); }
        if (tipo_despesa !== undefined) { query += `tipo_despesa = $${i++}, `; params.push(tipo_despesa); }
        if (observacoes !== undefined) { query += `observacoes = $${i++}, `; params.push(observacoes); }
        if (ativo !== undefined) { query += `ativo = $${i++}, `; params.push(ativo); }

        query += `updated_at = CURRENT_TIMESTAMP `;
        query = query.replace(/,\s*$/, ""); // Remove a vírgula extra no final
        
        if (params.length === 0) {
            return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
        }

        query += ` WHERE cod_despesa = $${i++} AND cod_usuario_empresa = $${i++} RETURNING *`;
        params.push(id, cod_usuario_empresa);

        const updatedExpense = await pool.query(query, params);
        if (updatedExpense.rows.length === 0) {
            return res.status(404).json({ msg: 'Despesa não encontrada.' });
        }
        res.json(updatedExpense.rows[0]);
    } catch (err) {
        console.error('Erro ao atualizar despesa:', err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE (desativar) uma despesa (multi-tenant)
// Usamos "soft delete" (ativo = FALSE) em vez de exclusão física
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const deletedExpense = await pool.query(
            `UPDATE despesas SET ativo = FALSE, updated_at = CURRENT_TIMESTAMP 
             WHERE cod_despesa = $1 AND cod_usuario_empresa = $2 RETURNING *`,
            [id, cod_usuario_empresa]
        );
        if (deletedExpense.rows.length === 0) {
            return res.status(404).json({ msg: 'Despesa não encontrada.' });
        }
        res.json({ msg: 'Despesa desativada com sucesso (removida da visualização ativa).' });
    } catch (err) {
        console.error('Erro ao desativar despesa:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;