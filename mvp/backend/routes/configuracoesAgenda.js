// backend/routes/configuracoesAgenda.js (conteúdo completo, já te passei antes)
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Middleware para verificar se o usuário é 'admin' ou 'gestor'
const checkAdminOrGestor = authorizeRole(['admin', 'gestor']);

// @route    GET /api/agenda/config
// @desc     Listar todas as configurações de agenda para a empresa do usuário logado
// @access   Private (Admin, Gestor)
router.get('/', authenticateToken, checkAdminOrGestor, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT * FROM configuracoes_agenda WHERE cod_usuario_empresa = $1 ORDER BY tipo_regra, dia_semana, data_especifica`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar configurações de agenda:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor ao buscar configurações da agenda.' });
    }
});

// @route    POST /api/agenda/config
// @desc     Criar uma nova regra de configuração da agenda
// @access   Private (Admin, Gestor)
router.post('/', authenticateToken, checkAdminOrGestor, async (req, res) => {
    const userId = req.user.id;
    const {
        tipo_regra,
        dia_semana,
        data_especifica,
        hora_inicio,
        hora_fim,
        intervalo_minutos,
        capacidade_simultanea, // NOVO: para máximo de agendamentos simultâneos
        descricao,
        ativo = true
    } = req.body;

    try {
        // Validação básica:
        if (!tipo_regra) { return res.status(400).json({ msg: 'O tipo da regra é obrigatório.' }); }
        // ... (resto das validações que você já tem para cada tipo de regra) ...

        const newRule = await pool.query(
            `INSERT INTO configuracoes_agenda (
                cod_usuario_empresa, tipo_regra, dia_semana, data_especifica,
                hora_inicio, hora_fim, intervalo_minutos, capacidade_simultanea, descricao, ativo
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                userId, tipo_regra, dia_semana || null, data_especifica || null,
                hora_inicio || null, hora_fim || null, intervalo_minutos || null,
                capacidade_simultanea || null, descricao || null, ativo
            ]
        );
        res.status(201).json(newRule.rows[0]);
    } catch (err) {
        console.error('Erro ao criar configuração de agenda:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor ao criar regra da agenda.' });
    }
});

// @route    PUT /api/agenda/config/:id
// @desc     Atualizar uma regra de configuração da agenda
// @access   Private (Admin, Gestor)
router.put('/:id', authenticateToken, checkAdminOrGestor, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const {
        tipo_regra,
        dia_semana,
        data_especifica,
        hora_inicio,
        hora_fim,
        intervalo_minutos,
        capacidade_simultanea, // NOVO: para máximo de agendamentos simultâneos
        descricao,
        ativo
    } = req.body;

    let query = 'UPDATE configuracoes_agenda SET ';
    const params = [];
    let i = 1;

    if (tipo_regra !== undefined) { query += `tipo_regra = $${i++}, `; params.push(tipo_regra); }
    if (dia_semana !== undefined) { query += `dia_semana = $${i++}, `; params.push(dia_semana); }
    if (data_especifica !== undefined) { query += `data_especifica = $${i++}, `; params.push(data_especifica); }
    if (hora_inicio !== undefined) { query += `hora_inicio = $${i++}, `; params.push(hora_inicio); }
    if (hora_fim !== undefined) { query += `hora_fim = $${i++}, `; params.push(hora_fim); }
    if (intervalo_minutos !== undefined) { query += `intervalo_minutos = $${i++}, `; params.push(intervalo_minutos); }
    if (capacidade_simultanea !== undefined) { query += `capacidade_simultanea = $${i++}, `; params.push(capacidade_simultanea); } // NOVO
    if (descricao !== undefined) { query += `descricao = $${i++}, `; params.push(descricao); }
    if (ativo !== undefined) { query += `ativo = $${i++}, `; params.push(ativo); }

    query += `updated_at = CURRENT_TIMESTAMP `;

    query = query.replace(/,\s*$/, "");
    if (params.length === 0) {
        return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
    }
    query += ` WHERE cod_configuracao = $${i++} AND cod_usuario_empresa = $${i++} RETURNING *`;
    params.push(id, userId);

    try {
        const updatedRule = await pool.query(query, params);
        if (updatedRule.rows.length === 0) {
            return res.status(404).json({ msg: 'Regra de configuração não encontrada ou você não tem permissão.' });
        }
        res.json(updatedRule.rows[0]);
    } catch (err) {
        console.error('Erro ao atualizar configuração de agenda:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor ao atualizar regra da agenda.' });
    }
});

// @route    DELETE /api/agenda/config/:id
// @desc     Deletar uma regra de configuração da agenda
// @access   Private (Admin, Gestor)
router.delete('/:id', authenticateToken, checkAdminOrGestor, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const deletedRule = await pool.query(
            'DELETE FROM configuracoes_agenda WHERE cod_configuracao = $1 AND cod_usuario_empresa = $2 RETURNING *',
            [id, userId]
        );
        if (deletedRule.rows.length === 0) {
            return res.status(404).json({ msg: 'Regra de configuração não encontrada ou você não tem permissão.' });
        }
        res.json({ msg: 'Regra de configuração deletada com sucesso.' });
    } catch (err) {
        console.error('Erro ao deletar configuração de agenda:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor ao deletar regra da agenda.' });
    }
});

module.exports = router;