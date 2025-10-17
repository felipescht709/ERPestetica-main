// backend/routes/produtos_estoque.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET all produtos_estoque
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const produtos = await db('produtos_estoque')
            .where({ cod_usuario_empresa, ativo: true })
            .orderBy('nome_produto');
        res.json(produtos);
    } catch (err) {
        console.error('Erro ao buscar produtos em estoque:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET produtos_estoque by ID
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const produto = await db('produtos_estoque')
            .where({ cod_produto: id, cod_usuario_empresa, ativo: true })
            .first();

        if (!produto) {
            return res.status(404).json({ msg: 'Produto não encontrado' });
        }
        res.json(produto);
    } catch (err) {
        console.error('Erro ao buscar produto por ID:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new produtos_estoque
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        nome_produto, descricao, tipo_produto, quantidade_estoque, unidade_medida,
        preco_custo, preco_venda, categoria, fornecedor, localizacao_estoque, estoque_minimo
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    if (!nome_produto || !tipo_produto || quantidade_estoque === undefined || !unidade_medida || preco_custo === undefined) {
        return res.status(400).json({ msg: 'Nome, tipo, quantidade, unidade e preço de custo são obrigatórios.' });
    }

    try {
        const [newProduct] = await db('produtos_estoque').insert({
            nome_produto, descricao, tipo_produto, quantidade_estoque, unidade_medida,
            preco_custo, preco_venda, categoria, fornecedor, localizacao_estoque, estoque_minimo,
            cod_usuario_empresa
        }).returning('*');
        
        res.status(201).json(newProduct);
    } catch (err) {
        console.error('Erro ao adicionar produto em estoque:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) a produtos_estoque
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const updateData = { ...req.body };

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
    }

    try {
        updateData.updated_at = db.fn.now();
        const [updatedProduct] = await db('produtos_estoque')
            .where({ cod_produto: id, cod_usuario_empresa })
            .update(updateData)
            .returning('*');

        if (!updatedProduct) {
            return res.status(404).json({ msg: 'Produto não encontrado' });
        }
        res.json(updatedProduct);
    } catch (err) {
        console.error('Erro ao atualizar produto em estoque:', err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE (desativar) um produtos_estoque
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const [deletedProduct] = await db('produtos_estoque')
            .where({ cod_produto: id, cod_usuario_empresa })
            .update({
                ativo: false,
                updated_at: db.fn.now()
            })
            .returning('*');

        if (!deletedProduct) {
            return res.status(404).json({ msg: 'Produto não encontrado' });
        }
        res.json({ msg: 'Produto desativado com sucesso (removido da visualização ativa)' });
    } catch (err) {
        console.error('Erro ao desativar produto em estoque:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;