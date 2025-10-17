// backend/routes/itens_ordem_servico.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Helper para recalcular os totais da OS com Knex
const recalculateOsTotals = async (cod_ordem_servico, cod_usuario_empresa, trx) => {
    const totals = await trx('itens_ordem_servico')
        .where({ cod_ordem_servico, cod_usuario_empresa })
        .select(
            db.raw("COALESCE(SUM(CASE WHEN tipo_item = 'Servico' THEN valor_total ELSE 0 END), 0) AS total_servicos"),
            db.raw("COALESCE(SUM(CASE WHEN tipo_item = 'Produto' THEN valor_total ELSE 0 END), 0) AS total_produtos")
        )
        .first();

    const { total_servicos, total_produtos } = totals;

    await trx('ordens_servico')
        .where({ cod_ordem_servico, cod_usuario_empresa })
        .update({
            valor_total_servicos: total_servicos,
            valor_total_produtos: total_produtos,
            updated_at: db.fn.now()
        });
};

// GET all itens de uma Ordem de Serviço específica
router.get('/os/:cod_ordem_servico', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_ordem_servico } = req.params;
        const { cod_usuario_empresa } = req.user;

        const items = await db('itens_ordem_servico as ios')
            .leftJoin('servicos as s', 'ios.cod_servico', 's.cod_servico')
            .leftJoin('produtos_estoque as pe', 'ios.cod_produto', 'pe.cod_produto')
            .where('ios.cod_ordem_servico', cod_ordem_servico)
            .andWhere('ios.cod_usuario_empresa', cod_usuario_empresa)
            .select(
                'ios.cod_item_os',
                'ios.tipo_item',
                'ios.quantidade',
                'ios.valor_unitario',
                'ios.valor_total',
                'ios.observacoes_item',
                's.nome_servico',
                's.descricao_servico',
                'pe.nome_produto',
                'pe.unidade_medida as produto_unidade_medida'
            )
            .orderBy(['ios.tipo_item', 'ios.cod_item_os']);
        
        res.json(items);
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

        const item = await db('itens_ordem_servico as ios')
            .leftJoin('servicos as s', 'ios.cod_servico', 's.cod_servico')
            .leftJoin('produtos_estoque as pe', 'ios.cod_produto', 'pe.cod_produto')
            .where('ios.cod_item_os', id)
            .andWhere('ios.cod_usuario_empresa', cod_usuario_empresa)
            .select(
                'ios.cod_item_os',
                'ios.cod_ordem_servico',
                'ios.tipo_item',
                'ios.quantidade',
                'ios.valor_unitario',
                'ios.valor_total',
                'ios.observacoes_item',
                's.nome_servico',
                's.descricao_servico',
                'pe.nome_produto',
                'pe.unidade_medida as produto_unidade_medida'
            )
            .first();

        if (!item) {
            return res.status(404).json({ msg: 'Item da Ordem de Serviço não encontrado.' });
        }
        res.json(item);
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

    try {
        await db.transaction(async trx => {
            const os = await trx('ordens_servico').where({ cod_ordem_servico, cod_usuario_empresa }).first();
            if (!os) {
                return res.status(404).json({ msg: 'Ordem de Serviço não encontrada ou não pertence à sua empresa.' });
            }

            if (tipo_item === 'Servico') {
                if (!cod_servico || cod_produto) {
                    return res.status(400).json({ msg: 'Para tipo "Servico", cod_servico é obrigatório e cod_produto deve ser nulo.' });
                }
                const service = await trx('servicos').where({ cod_servico, cod_usuario_empresa }).first();
                if (!service) {
                    return res.status(404).json({ msg: 'Serviço não encontrado ou não pertence à sua empresa.' });
                }
            } else if (tipo_item === 'Produto') {
                if (!cod_produto || cod_servico) {
                    return res.status(400).json({ msg: 'Para tipo "Produto", cod_produto é obrigatório e cod_servico deve ser nulo.' });
                }
                const product = await trx('produtos_estoque').where({ cod_produto, cod_usuario_empresa }).first();
                if (!product) {
                    return res.status(404).json({ msg: 'Produto não encontrado ou não pertence à sua empresa.' });
                }
            } else {
                return res.status(400).json({ msg: 'Tipo de item inválido. Deve ser "Servico" ou "Produto".' });
            }

            const [newItem] = await trx('itens_ordem_servico').insert({
                cod_ordem_servico, tipo_item, cod_servico, cod_produto, quantidade, 
                valor_unitario, observacoes_item, cod_usuario_empresa
            }).returning('*');

            await recalculateOsTotals(cod_ordem_servico, cod_usuario_empresa, trx);

            res.status(201).json(newItem);
        });
    } catch (err) {
        console.error('Erro ao adicionar item na Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) um item_ordem_servico
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const { quantidade, valor_unitario, observacoes_item } = req.body;

    try {
        await db.transaction(async trx => {
            const item = await trx('itens_ordem_servico').where({ cod_item_os: id, cod_usuario_empresa }).first();
            if (!item) {
                return res.status(404).json({ msg: 'Item da Ordem de Serviço não encontrado.' });
            }

            const updateData = { ...req.body };
            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
            }
            updateData.updated_at = db.fn.now();

            const [updatedItem] = await trx('itens_ordem_servico')
                .where({ cod_item_os: id, cod_usuario_empresa })
                .update(updateData)
                .returning('*');

            await recalculateOsTotals(item.cod_ordem_servico, cod_usuario_empresa, trx);

            res.json(updatedItem);
        });
    } catch (err) {
        console.error('Erro ao atualizar item da Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE um item_ordem_servico
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;

    try {
        await db.transaction(async trx => {
            const item = await trx('itens_ordem_servico').where({ cod_item_os: id, cod_usuario_empresa }).first();
            if (!item) {
                return res.status(404).json({ msg: 'Item da Ordem de Serviço não encontrado.' });
            }

            await trx('itens_ordem_servico').where({ cod_item_os: id }).del();

            await recalculateOsTotals(item.cod_ordem_servico, cod_usuario_empresa, trx);

            res.json({ msg: 'Item da Ordem de Serviço removido com sucesso.' });
        });
    } catch (err) {
        console.error('Erro ao remover item da Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;