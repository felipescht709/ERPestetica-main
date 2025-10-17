// backend/routes/configuracoesAgenda.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const checkAdminOrGestor = authorizeRole(['admin', 'gestor']);

// Listar todas as configurações de agenda
router.get('/', authenticateToken, checkAdminOrGestor, async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const configs = await db('configuracoes_agenda')
            .where({ cod_usuario_empresa })
            .orderBy(['tipo_regra', 'dia_semana', 'data_especifica']);
        res.json(configs);
    } catch (err) {
        console.error('Erro ao buscar configurações de agenda:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor ao buscar configurações da agenda.' });
    }
});

// Criar uma nova regra de configuração
router.post('/', authenticateToken, checkAdminOrGestor, async (req, res) => {
    const { cod_usuario_empresa } = req.user;
    const {
        tipo_regra, dia_semana, data_especifica, hora_inicio, hora_fim,
        intervalo_minutos, capacidade_simultanea, descricao, ativo = true
    } = req.body;

    if (!tipo_regra) {
        return res.status(400).json({ msg: 'O tipo da regra é obrigatório.' });
    }

    try {
        const [newRule] = await db('configuracoes_agenda')
            .insert({
                cod_usuario_empresa,
                tipo_regra,
                dia_semana: tipo_regra === 'horario_trabalho' ? dia_semana : null,
                data_especifica: tipo_regra === 'feriado' ? data_especifica : null,
                hora_inicio,
                hora_fim,
                intervalo_minutos,
                capacidade_simultanea,
                descricao,
                ativo
            })
            .returning('*');
        res.status(201).json(newRule);
    } catch (err) {
        console.error('Erro ao criar configuração de agenda:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor ao criar regra da agenda.' });
    }
});

// Atualizar uma regra de configuração
router.put('/:id', authenticateToken, checkAdminOrGestor, async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const updateData = { ...req.body };
    updateData.updated_at = db.fn.now();

    if (Object.keys(updateData).length === 1 && updateData.updated_at) {
        return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
    }

    try {
        const [updatedRule] = await db('configuracoes_agenda')
            .where({ cod_configuracao: id, cod_usuario_empresa })
            .update(updateData)
            .returning('*');

        if (!updatedRule) {
            return res.status(404).json({ msg: 'Regra de configuração não encontrada ou você não tem permissão.' });
        }
        res.json(updatedRule);
    } catch (err) {
        console.error('Erro ao atualizar configuração de agenda:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor ao atualizar regra da agenda.' });
    }
});

// Deletar uma regra de configuração
router.delete('/:id', authenticateToken, checkAdminOrGestor, async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;

    try {
        const numDeleted = await db('configuracoes_agenda')
            .where({ cod_configuracao: id, cod_usuario_empresa })
            .del();

        if (numDeleted === 0) {
            return res.status(404).json({ msg: 'Regra de configuração não encontrada ou você não tem permissão.' });
        }
        res.json({ msg: 'Regra de configuração deletada com sucesso.' });
    } catch (err) {
        console.error('Erro ao deletar configuração de agenda:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor ao deletar regra da agenda.' });
    }
});

module.exports = router;