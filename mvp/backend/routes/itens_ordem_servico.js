// backend/routes/itens_ordem_servico.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Helper para recalcular os totais da OS
const recalculateOsTotals = async (cod_ordem_servico, cod_usuario_empresa, client) => {
    const totals = await client.query(
        `SELECT
            COALESCE(SUM(CASE WHEN tipo_item = 'Servico' THEN valor_total ELSE 0 END), 0) AS total_servicos,
            COALESCE(SUM(CASE WHEN tipo_item = 'Produto' THEN valor_total ELSE 0 END), 0) AS total_produtos
         FROM itens_ordem_servico
         WHERE cod_ordem_servico = $1 AND cod_usuario_empresa = $2`,
        [cod_ordem_servico, cod_usuario_empresa]
    );

    const { total_servicos, total_produtos } = totals.rows[0];

    await client.query(
        `UPDATE ordens_servico
         SET valor_total_servicos = $1, valor_total_produtos = $2, updated_at = CURRENT_TIMESTAMP
         WHERE cod_ordem_servico = $3 AND cod_usuario_empresa = $4`,
        [total_servicos, total_produtos, cod_ordem_servico, cod_usuario_empresa]
    );
};

// GET all itens de uma Ordem de Serviço específica
router.get('/os/:cod_ordem_servico', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_ordem_servico } = req.params;
        const { cod_usuario_empresa } = req.user;

        const result = await pool.query(
            `SELECT
                ios.cod_item_os,
                ios.tipo_item,
                ios.quantidade,
                ios.valor_unitario,
                ios.valor_total,
                ios.observacoes_item,
                s.nome_servico,
                s.descricao_servico,
                pe.nome_produto,
                pe.unidade_medida AS produto_unidade_medida
            FROM itens_ordem_servico ios
            LEFT JOIN servicos s ON ios.cod_servico = s.cod_servico
            LEFT JOIN produtos_estoque pe ON ios.cod_produto = pe.cod_produto
            WHERE ios.cod_ordem_servico = $1 AND ios.cod_usuario_empresa = $2
            ORDER BY ios.tipo_item, ios.cod_item_os`,
            [cod_ordem_servico, cod_usuario_empresa]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar itens da Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET um item_ordem_servico por ID
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;

        const result = await pool.query(
            `SELECT
                ios.cod_item_os,
                ios.cod_ordem_servico,
                ios.tipo_item,
                ios.quantidade,
                ios.valor_unitario,
                ios.valor_total,
                ios.observacoes_item,
                s.nome_servico,
                s.descricao_servico,
                pe.nome_produto,
                pe.unidade_medida AS produto_unidade_medida
            FROM itens_ordem_servico ios
            LEFT JOIN servicos s ON ios.cod_servico = s.cod_servico
            LEFT JOIN produtos_estoque pe ON ios.cod_produto = pe.cod_produto
            WHERE ios.cod_item_os = $1 AND ios.cod_usuario_empresa = $2`,
            [id, cod_usuario_empresa]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Item da Ordem de Serviço não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar item da Ordem de Serviço por ID:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new item_ordem_servico
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        cod_ordem_servico, tipo_item, cod_servico, cod_produto, quantidade, valor_unitario, observacoes_item
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    const client = await pool.connect(); // Obter um cliente do pool para a transação

    try {
        await client.query('BEGIN');

        // 1. Verificar se a OS existe e pertence à empresa do usuário
        const osCheck = await client.query(
            'SELECT 1 FROM ordens_servico WHERE cod_ordem_servico = $1 AND cod_usuario_empresa = $2',
            [cod_ordem_servico, cod_usuario_empresa]
        );
        if (osCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Ordem de Serviço não encontrada ou não pertence à sua empresa.' });
        }

        // 2. Validar tipo_item e seus respectivos cod_servico/cod_produto
        if (tipo_item === 'Servico') {
            if (!cod_servico || cod_produto) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: 'Para tipo "Servico", cod_servico é obrigatório e cod_produto deve ser nulo.' });
            }
            const serviceCheck = await client.query('SELECT 1 FROM servicos WHERE cod_servico = $1 AND cod_usuario_empresa = $2', [cod_servico, cod_usuario_empresa]);
            if (serviceCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ msg: 'Serviço não encontrado ou não pertence à sua empresa.' });
            }
        } else if (tipo_item === 'Produto') {
            if (!cod_produto || cod_servico) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: 'Para tipo "Produto", cod_produto é obrigatório e cod_servico deve ser nulo.' });
            }
            const productCheck = await client.query('SELECT 1 FROM produtos_estoque WHERE cod_produto = $1 AND cod_usuario_empresa = $2', [cod_produto, cod_usuario_empresa]);
            if (productCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ msg: 'Produto não encontrado ou não pertence à sua empresa.' });
            }
        } else {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Tipo de item inválido. Deve ser "Servico" ou "Produto".' });
        }

        // 3. Inserir o item da OS
        const result = await client.query(
            `INSERT INTO itens_ordem_servico (
                cod_ordem_servico, tipo_item, cod_servico, cod_produto, quantidade, valor_unitario, observacoes_item, cod_usuario_empresa
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                cod_ordem_servico, tipo_item, cod_servico, cod_produto,
                quantidade, valor_unitario, observacoes_item, cod_usuario_empresa
            ]
        );
        const newItem = result.rows[0];

        // 4. Recalcular e atualizar os totais na tabela ordens_servico
        await recalculateOsTotals(cod_ordem_servico, cod_usuario_empresa, client);

        await client.query('COMMIT');
        res.status(201).json(newItem);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao adicionar item na Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release(); // Liberar o cliente de volta para o pool
    }
});

// PUT (update) um item_ordem_servico
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const {
        quantidade, valor_unitario, observacoes_item
    } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Verificar se o item existe e pertence à empresa do usuário
        const itemCheck = await client.query(
            'SELECT cod_ordem_servico FROM itens_ordem_servico WHERE cod_item_os = $1 AND cod_usuario_empresa = $2',
            [id, cod_usuario_empresa]
        );
        if (itemCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Item da Ordem de Serviço não encontrado.' });
        }
        const cod_ordem_servico = itemCheck.rows[0].cod_ordem_servico;

        // 2. Atualizar o item
        let query = 'UPDATE itens_ordem_servico SET ';
        const params = [];
        let i = 1;

        if (quantidade !== undefined) { query += `quantidade = $${i++}, `; params.push(quantidade); }
        if (valor_unitario !== undefined) { query += `valor_unitario = $${i++}, `; params.push(valor_unitario); }
        if (observacoes_item !== undefined) { query += `observacoes_item = $${i++}, `; params.push(observacoes_item); }
        
        query += `updated_at = CURRENT_TIMESTAMP `;
        query = query.replace(/,\s*$/, "");

        if (params.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido para o item da OS.' });
        }

        query += ` WHERE cod_item_os = $${i++} AND cod_usuario_empresa = $${i++} RETURNING *`;
        params.push(id, cod_usuario_empresa);

        const updatedItem = await client.query(query, params);

        // 3. Recalcular e atualizar os totais na tabela ordens_servico
        await recalculateOsTotals(cod_ordem_servico, cod_usuario_empresa, client);

        await client.query('COMMIT');
        res.json(updatedItem.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar item da Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// DELETE um item_ordem_servico
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Obter o cod_ordem_servico do item antes de deletá-lo
        const itemCheck = await client.query(
            'SELECT cod_ordem_servico FROM itens_ordem_servico WHERE cod_item_os = $1 AND cod_usuario_empresa = $2',
            [id, cod_usuario_empresa]
        );
        if (itemCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Item da Ordem de Serviço não encontrado.' });
        }
        const cod_ordem_servico = itemCheck.rows[0].cod_ordem_servico;

        // 2. Deletar o item
        const deletedItem = await client.query(
            `DELETE FROM itens_ordem_servico WHERE cod_item_os = $1 AND cod_usuario_empresa = $2 RETURNING *`,
            [id, cod_usuario_empresa]
        );
        if (deletedItem.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Item da Ordem de Serviço não encontrado.' });
        }

        // 3. Recalcular e atualizar os totais na tabela ordens_servico
        await recalculateOsTotals(cod_ordem_servico, cod_usuario_empresa, client);

        await client.query('COMMIT');
        res.json({ msg: 'Item da Ordem de Serviço removido com sucesso.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao remover item da Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

module.exports = router;