// backend/routes/ordens_servico.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET all Ordens de Serviço
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const { status_os, cod_cliente, cod_veiculo, data_inicio, data_fim } = req.query;

        const query = db('ordens_servico as os')
            .join('clientes as c', 'os.cod_cliente', 'c.cod_cliente')
            .leftJoin('veiculos as v', 'os.cod_veiculo', 'v.cod_veiculo')
            .leftJoin('usuarios as u', 'os.cod_funcionario_responsavel', 'u.cod_usuario')
            .where('os.cod_usuario_empresa', cod_usuario_empresa)
            .select(
                'os.cod_ordem_servico',
                'os.data_abertura',
                'os.data_conclusao_prevista',
                'os.data_conclusao_efetiva as data_conclusao_real', // Corrigido para nome do campo no BD
                'os.status_os',
                db.raw('(os.valor_total_servicos + os.valor_total_produtos) as valor_total_os'), // Calculado
                'c.nome_cliente',
                'v.placa as veiculo_placa',
                'v.modelo as veiculo_modelo',
                'u.nome_usuario as funcionario_responsavel_nome'
            );

        if (status_os) query.andWhere('os.status_os', status_os);
        if (cod_cliente) query.andWhere('os.cod_cliente', cod_cliente);
        if (cod_veiculo) query.andWhere('os.cod_veiculo', cod_veiculo);
        if (data_inicio) query.andWhere('os.data_abertura', '>=', data_inicio);
        if (data_fim) query.andWhere('os.data_abertura', '<=', data_fim);

        const ordens = await query.orderBy('os.data_abertura', 'desc');
        res.json(ordens);
    } catch (err) {
        console.error('Erro ao buscar Ordens de Serviço:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET Ordem de Serviço by ID
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;

    try {
        const os = await db('ordens_servico as os')
            .join('clientes as c', 'os.cod_cliente', 'c.cod_cliente')
            .leftJoin('veiculos as v', 'os.cod_veiculo', 'v.cod_veiculo')
            .leftJoin('usuarios as u', 'os.cod_funcionario_responsavel', 'u.cod_usuario')
            .where('os.cod_ordem_servico', id)
            .andWhere('os.cod_usuario_empresa', cod_usuario_empresa)
            .select('os.*', 'c.nome_cliente', 'v.placa as veiculo_placa', 'v.modelo as veiculo_modelo', 'u.nome_usuario as funcionario_responsavel_nome')
            .first();

        if (!os) {
            return res.status(404).json({ msg: 'Ordem de Serviço não encontrada.' });
        }

        const itens = await db('itens_ordem_servico as ios')
            .leftJoin('servicos as s', 'ios.cod_servico', 's.cod_servico')
            .leftJoin('produtos_estoque as pe', 'ios.cod_produto', 'pe.cod_produto')
            .where({ 'ios.cod_ordem_servico': id, 'ios.cod_usuario_empresa': cod_usuario_empresa })
            .select('ios.*', 's.nome_servico', 'pe.nome_produto');

        const checklist = await db('os_checklist_itens')
            .where({ cod_ordem_servico: id, cod_usuario_empresa })
            .orderBy('cod_item_checklist', 'asc');

        res.json({ ...os, itens, checklist });

    } catch (err) {
        console.error('Erro ao buscar Ordem de Serviço por ID:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET Ordem de Serviço by cod_agendamento
router.get('/por-agendamento/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;

        const os = await db('ordens_servico')
            .where({ cod_agendamento: id, cod_usuario_empresa })
            .select('cod_ordem_servico')
            .first();

        if (!os) {
            return res.status(404).json({ msg: 'Nenhuma Ordem de Serviço encontrada para este agendamento.' });
        }

        res.json(os);
    } catch (err) {
        console.error('Erro ao buscar Ordem de Serviço por agendamento:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new Ordem de Serviço
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        cod_cliente, cod_veiculo, data_conclusao_prevista, status_os,
        observacoes, cod_funcionario_responsavel, itens
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    if (!cod_cliente || !status_os || !Array.isArray(itens)) {
        return res.status(400).json({ msg: 'Cliente, status e itens da OS são obrigatórios.' });
    }

    try {
        await db.transaction(async trx => {
            let valor_total_servicos = 0;
            let valor_total_produtos = 0;

            for (const item of itens) {
                const valor_total_item = item.quantidade * item.valor_unitario;
                if (item.tipo_item === 'Servico') {
                    valor_total_servicos += valor_total_item;
                } else if (item.tipo_item === 'Produto') {
                    valor_total_produtos += valor_total_item;
                } else {
                    throw new Error('Tipo de item inválido.');
                }
            }

            const [novaOS] = await trx('ordens_servico').insert({
                cod_cliente, cod_veiculo, data_conclusao_prevista, status_os,
                valor_total_servicos, valor_total_produtos, observacoes, 
                cod_funcionario_responsavel, cod_usuario_empresa
            }).returning('*');

            const itensParaInserir = itens.map(item => ({
                ...item,
                cod_ordem_servico: novaOS.cod_ordem_servico,
                cod_usuario_empresa
            }));

            await trx('itens_ordem_servico').insert(itensParaInserir);

            res.status(201).json(novaOS);
        });
    } catch (err) {
        console.error('Erro ao criar Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) uma Ordem de Serviço
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const { checklist, ...updateData } = req.body;

    try {
        await db.transaction(async trx => {
            if (updateData.status_os === 'Em Andamento') {
                const checklistPendente = await trx('os_checklist_itens')
                    .where({ cod_ordem_servico: id, concluido: false })
                    .first();
                if (checklistPendente) {
                    return res.status(400).json({ msg: 'Todos os itens do checklist devem ser concluídos antes de iniciar o serviço.' });
                }
            }

            if (Array.isArray(checklist)) {
                for (const item of checklist) {
                    await trx('os_checklist_itens')
                        .where({ cod_item_checklist: item.cod_item_checklist, cod_ordem_servico: id, cod_usuario_empresa })
                        .update({ concluido: item.concluido, observacoes: item.observacoes });
                }
            }

            if (Object.keys(updateData).length > 0) {
                updateData.updated_at = db.fn.now();
                const [updatedOS] = await trx('ordens_servico')
                    .where({ cod_ordem_servico: id, cod_usuario_empresa })
                    .update(updateData)
                    .returning('*');

                if (!updatedOS) {
                    return res.status(404).json({ msg: 'Ordem de Serviço não encontrada.' });
                }
                 res.json(updatedOS);
            } else {
                // Se só atualizou o checklist, busca a OS para retornar o estado atual
                const os = await trx('ordens_servico').where({cod_ordem_servico: id}).first();
                res.json(os);
            }
        });
    } catch (err) {
        console.error('Erro ao atualizar Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE (cancelar) uma Ordem de Serviço
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;

        const [deletedOS] = await db('ordens_servico')
            .where({ cod_ordem_servico: id, cod_usuario_empresa })
            .update({
                status_os: 'Cancelada',
                updated_at: db.fn.now()
            })
            .returning('*');

        if (!deletedOS) {
            return res.status(404).json({ msg: 'Ordem de Serviço não encontrada.' });
        }
        res.json({ msg: 'Ordem de Serviço cancelada com sucesso.' });
    } catch (err) {
        console.error('Erro ao cancelar Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;