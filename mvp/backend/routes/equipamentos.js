// backend/routes/equipamentos.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET all equipamentos
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'tecnico']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const equipamentos = await db('equipamentos')
            .where({ cod_usuario_empresa, ativo: true })
            .orderBy('nome_equipamento');
        res.json(equipamentos);
    } catch (err) {
        console.error('Erro ao buscar equipamentos:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET equipamento by ID
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const equipamento = await db('equipamentos')
            .where({ cod_equipamento: id, cod_usuario_empresa, ativo: true })
            .first();

        if (!equipamento) {
            return res.status(404).json({ msg: 'Equipamento não encontrado' });
        }
        res.json(equipamento);
    } catch (err) {
        console.error('Erro ao buscar equipamento por ID:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new equipamento
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const {
        nome_equipamento, descricao, numero_serie, data_aquisicao, valor_aquisicao,
        vida_util_anos, status_operacional, proxima_manutencao, localizacao_atual, responsavel_cod
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    if (!nome_equipamento || !data_aquisicao || valor_aquisicao === undefined || !status_operacional) {
        return res.status(400).json({ msg: 'Nome, data de aquisição, valor de aquisição e status operacional são obrigatórios.' });
    }

    try {
        await db.transaction(async trx => {
            if (numero_serie) {
                const serialExists = await trx('equipamentos')
                    .where({ numero_serie, cod_usuario_empresa })
                    .first();
                if (serialExists) {
                    throw new Error('Já existe um equipamento com este número de série na sua empresa.');
                }
            }

            const [newEquipment] = await trx('equipamentos').insert({
                nome_equipamento, descricao, numero_serie, data_aquisicao, valor_aquisicao,
                vida_util_anos, status_operacional, proxima_manutencao, localizacao_atual, responsavel_cod,
                cod_usuario_empresa
            }).returning('*');
            
            res.status(201).json(newEquipment);
        });
    } catch (err) {
        console.error('Erro ao adicionar equipamento:', err.message);
        if (err.message.includes('número de série')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server Error');
    }
});

// PUT (update) um equipamento
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const { numero_serie, ...updateData } = req.body;

    if (Object.keys(updateData).length === 0 && !numero_serie) {
        return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
    }

    try {
        await db.transaction(async trx => {
            if (numero_serie) {
                const serialExists = await trx('equipamentos')
                    .where({ numero_serie, cod_usuario_empresa })
                    .andWhereNot('cod_equipamento', id)
                    .first();
                if (serialExists) {
                    throw new Error('Já existe outro equipamento com este número de série na sua empresa.');
                }
                updateData.numero_serie = numero_serie;
            }

            updateData.updated_at = db.fn.now();

            const [updatedEquipment] = await trx('equipamentos')
                .where({ cod_equipamento: id, cod_usuario_empresa })
                .update(updateData)
                .returning('*');

            if (!updatedEquipment) {
                return res.status(404).json({ msg: 'Equipamento não encontrado' });
            }
            res.json(updatedEquipment);
        });
    } catch (err) {
        console.error('Erro ao atualizar equipamento:', err.message);
        if (err.message.includes('número de série')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server Error');
    }
});

// DELETE (desativar) um equipamento
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const [deletedEquipment] = await db('equipamentos')
            .where({ cod_equipamento: id, cod_usuario_empresa })
            .update({
                ativo: false,
                updated_at: db.fn.now()
            })
            .returning('*');

        if (!deletedEquipment) {
            return res.status(404).json({ msg: 'Equipamento não encontrado' });
        }
        res.json({ msg: 'Equipamento desativado com sucesso (removido da visualização ativa)' });
    } catch (err) {
        console.error('Erro ao desativar equipamento:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;