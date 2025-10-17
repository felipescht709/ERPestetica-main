const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Adicionar proprietário atual a um veículo
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { cod_veiculo, cod_cliente } = req.body;
    const { cod_usuario_empresa } = req.user;

    try {
        await db.transaction(async trx => {
            const vehicle = await trx('veiculos').where({ cod_veiculo, cod_usuario_empresa }).first();
            if (!vehicle) {
                return res.status(404).json({ msg: 'Veículo não encontrado ou não pertence à sua empresa.' });
            }

            const client = await trx('clientes').where({ cod_cliente, cod_usuario_empresa }).first();
            if (!client) {
                return res.status(404).json({ msg: 'Cliente não encontrado ou não pertence à sua empresa.' });
            }

            await trx('veiculos_clientes')
                .where({ cod_veiculo, cod_usuario_empresa, is_proprietario_atual: true })
                .update({ is_proprietario_atual: false, data_fim_posse: db.fn.now() });

            const [newOwner] = await trx('veiculos_clientes').insert({
                cod_veiculo, cod_cliente, is_proprietario_atual: true, 
                data_inicio_posse: db.fn.now(), cod_usuario_empresa
            }).returning('*');

            res.status(201).json(newOwner);
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Listar proprietários de um veículo
router.get('/:cod_veiculo', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    try {
        const { cod_veiculo } = req.params;
        const owners = await db('veiculos_clientes as vc')
            .join('clientes as c', 'vc.cod_cliente', 'c.cod_cliente')
            .where('vc.cod_veiculo', cod_veiculo)
            .andWhere('vc.cod_usuario_empresa', req.user.cod_usuario_empresa)
            .select('vc.*', 'c.nome_cliente')
            .orderBy('vc.data_inicio_posse', 'desc');
        res.json(owners);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Listar veículos de um cliente
router.get('/by-client/:cod_cliente', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_cliente } = req.params;
        const vehicles = await db('veiculos_clientes as vc')
            .join('veiculos as v', 'vc.cod_veiculo', 'v.cod_veiculo')
            .where('vc.cod_cliente', cod_cliente)
            .andWhere('vc.cod_usuario_empresa', req.user.cod_usuario_empresa)
            .select(
                'vc.cod_veiculo_cliente', 'vc.cod_cliente', 'vc.cod_veiculo', 'vc.data_inicio_posse',
                'vc.data_fim_posse', 'vc.is_proprietario_atual', 'v.marca', 'v.modelo', 'v.placa', 'v.ano', 'v.cor'
            )
            .orderBy([{
                column: 'vc.is_proprietario_atual', order: 'desc'
            }, {
                column: 'vc.data_inicio_posse', order: 'desc'
            }]);
        res.json(vehicles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Remover proprietário atual (encerra posse)
router.put('/remover', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { cod_veiculo, cod_cliente } = req.body;
    try {
        const [result] = await db('veiculos_clientes')
            .where({
                cod_veiculo, 
                cod_cliente, 
                cod_usuario_empresa: req.user.cod_usuario_empresa, 
                is_proprietario_atual: true
            })
            .update({
                is_proprietario_atual: false,
                data_fim_posse: db.fn.now()
            })
            .returning('*');

        if (!result) {
            return res.status(404).json({ msg: 'Proprietário atual não encontrado para este veículo.' });
        }
        res.json({ msg: 'Propriedade encerrada com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;