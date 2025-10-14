// backend/routes/produtos_estoque.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Importa o pool de conexão com o banco
const { authenticateToken, authorizeRole } = require('../middleware/auth'); // Importa os middlewares de autenticação e autorização

// GET all produtos_estoque (multi-tenant)
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const result = await pool.query(
            `SELECT * FROM produtos_estoque WHERE cod_usuario_empresa = $1 AND ativo = TRUE ORDER BY nome_produto`,
            [cod_usuario_empresa]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar produtos em estoque:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET produtos_estoque by ID (multi-tenant)
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const result = await pool.query(
            `SELECT * FROM produtos_estoque WHERE cod_produto = $1 AND cod_usuario_empresa = $2 AND ativo = TRUE`,
            [id, cod_usuario_empresa]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Produto não encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar produto por ID:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new produtos_estoque (multi-tenant)
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        nome_produto, descricao, tipo_produto, quantidade_estoque, unidade_medida,
        preco_custo, preco_venda, categoria, fornecedor, localizacao_estoque, estoque_minimo
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    try {
        if (!nome_produto || !tipo_produto || quantidade_estoque === undefined || !unidade_medida || preco_custo === undefined) {
            return res.status(400).json({ msg: 'Nome, tipo, quantidade, unidade e preço de custo são obrigatórios.' });
        }

        const result = await pool.query(
            `INSERT INTO produtos_estoque (
                nome_produto, descricao, tipo_produto, quantidade_estoque, unidade_medida,
                preco_custo, preco_venda, categoria, fornecedor, localizacao_estoque, estoque_minimo,
                cod_usuario_empresa
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [
                nome_produto, descricao, tipo_produto, quantidade_estoque, unidade_medida,
                preco_custo, preco_venda, categoria, fornecedor, localizacao_estoque, estoque_minimo,
                cod_usuario_empresa
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao adicionar produto em estoque:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) a produtos_estoque (multi-tenant)
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const {
        nome_produto, descricao, tipo_produto, quantidade_estoque, unidade_medida,
        preco_custo, preco_venda, categoria, fornecedor, localizacao_estoque, estoque_minimo, ativo
    } = req.body;

    try {
        let query = 'UPDATE produtos_estoque SET ';
        const params = [];
        let i = 1;

        if (nome_produto !== undefined) { query += `nome_produto = $${i++}, `; params.push(nome_produto); }
        if (descricao !== undefined) { query += `descricao = $${i++}, `; params.push(descricao); }
        if (tipo_produto !== undefined) { query += `tipo_produto = $${i++}, `; params.push(tipo_produto); }
        if (quantidade_estoque !== undefined) { query += `quantidade_estoque = $${i++}, `; params.push(quantidade_estoque); }
        if (unidade_medida !== undefined) { query += `unidade_medida = $${i++}, `; params.push(unidade_medida); }
        if (preco_custo !== undefined) { query += `preco_custo = $${i++}, `; params.push(preco_custo); }
        if (preco_venda !== undefined) { query += `preco_venda = $${i++}, `; params.push(preco_venda); }
        if (categoria !== undefined) { query += `categoria = $${i++}, `; params.push(categoria); }
        if (fornecedor !== undefined) { query += `fornecedor = $${i++}, `; params.push(fornecedor); }
        if (localizacao_estoque !== undefined) { query += `localizacao_estoque = $${i++}, `; params.push(localizacao_estoque); }
        if (estoque_minimo !== undefined) { query += `estoque_minimo = $${i++}, `; params.push(estoque_minimo); }
        if (ativo !== undefined) { query += `ativo = $${i++}, `; params.push(ativo); }

        query += `updated_at = CURRENT_TIMESTAMP `;
        query = query.replace(/,\s*$/, ""); // Remove a vírgula extra no final
        
        if (params.length === 0) {
            return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
        }

        query += ` WHERE cod_produto = $${i++} AND cod_usuario_empresa = $${i++} RETURNING *`;
        params.push(id, cod_usuario_empresa);

        const updatedProduct = await pool.query(query, params);
        if (updatedProduct.rows.length === 0) {
            return res.status(404).json({ msg: 'Produto não encontrado' });
        }
        res.json(updatedProduct.rows[0]);
    } catch (err) {
        console.error('Erro ao atualizar produto em estoque:', err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE (desativar) um produtos_estoque (multi-tenant)
// Usamos "soft delete" (ativo = FALSE) em vez de exclusão física
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const deletedProduct = await pool.query(
            `UPDATE produtos_estoque SET ativo = FALSE, updated_at = CURRENT_TIMESTAMP 
             WHERE cod_produto = $1 AND cod_usuario_empresa = $2 RETURNING *`,
            [id, cod_usuario_empresa]
        );
        if (deletedProduct.rows.length === 0) {
            return res.status(404).json({ msg: 'Produto não encontrado' });
        }
        res.json({ msg: 'Produto desativado com sucesso (removido da visualização ativa)' });
    } catch (err) {
        console.error('Erro ao desativar produto em estoque:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;