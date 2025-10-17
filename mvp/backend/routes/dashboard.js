const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// @route    GET /api/dashboard/kpis
// @desc     Busca os principais KPIs para o dashboard da empresa
// @access   Private (Admin, Gerente)
router.get('/kpis', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { cod_usuario_empresa } = req.user;

    try {
        const faturamentoMesQuery = db('agendamentos')
            .where({ cod_usuario_empresa, status: 'concluido' })
            .andWhereRaw("date_trunc('month', data_hora_inicio) = date_trunc('month', current_date)")
            .sum('preco_total as total')
            .first();

        const agendamentosHojeQuery = db('agendamentos')
            .where({ cod_usuario_empresa })
            .andWhereRaw("data_hora_inicio::date = current_date")
            .count('cod_agendamento as total')
            .first();
        
        const servicoMaisAgendadoQuery = db('agendamentos as a')
            .join('agendamento_servicos as asv', 'a.cod_agendamento', 'asv.cod_agendamento')
            .join('servicos as s', 'asv.cod_servico', 's.cod_servico')
            .where('a.cod_usuario_empresa', cod_usuario_empresa)
            .andWhereRaw("date_trunc('month', a.data_hora_inicio) = date_trunc('month', current_date)")
            .select('s.nome_servico')
            .groupBy('s.nome_servico')
            .orderByRaw('COUNT(a.cod_agendamento) DESC')
            .limit(1)
            .first();

        const [
            faturamentoMesResult,
            agendamentosHojeResult,
            servicoMaisAgendadoResult
        ] = await Promise.all([
            faturamentoMesQuery,
            agendamentosHojeQuery,
            servicoMaisAgendadoQuery
        ]);

        const kpis = {
            faturamento_total_mes: parseFloat(faturamentoMesResult?.total || 0),
            agendamentos_hoje: parseInt(agendamentosHojeResult?.total || 0),
            servico_principal_mes: servicoMaisAgendadoResult?.nome_servico || 'N/A'
        };

        res.json(kpis);

    } catch (err) {
        console.error('Erro ao buscar KPIs do dashboard:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;