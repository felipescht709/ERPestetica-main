const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// @route    GET /api/dashboard/kpis
// @desc     Busca os principais KPIs para o dashboard da empresa
// @access   Private (Admin, Gerente)
router.get('/kpis', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    // Pegamos o código da empresa do usuário que está logado
    const { cod_usuario_empresa } = req.user;
    const client = await pool.connect();

    try {
        // Para otimizar, vamos executar várias consultas ao mesmo tempo (em paralelo)
        const faturamentoMesQuery = client.query(
            `SELECT SUM(preco_total) as total FROM agendamentos
             WHERE cod_usuario_empresa = $1 AND status = 'concluido'
             AND date_trunc('month', data_hora_inicio) = date_trunc('month', current_date)`,
            [cod_usuario_empresa]
        );

        const agendamentosHojeQuery = client.query(
            `SELECT COUNT(cod_agendamento) as total FROM agendamentos
             WHERE cod_usuario_empresa = $1
             AND data_hora_inicio::date = current_date`,
            [cod_usuario_empresa]
        );
        
        const servicoMaisAgendadoQuery = client.query(
            `SELECT s.nome_servico, COUNT(a.cod_agendamento) as total
             FROM agendamentos a
             JOIN servicos s ON a.servico_cod = s.cod_servico
             WHERE a.cod_usuario_empresa = $1
             AND date_trunc('month', a.data_hora_inicio) = date_trunc('month', current_date)
             GROUP BY s.nome_servico
             ORDER BY total DESC
             LIMIT 1`,
            [cod_usuario_empresa]
        );

        // Aguarda todas as consultas terminarem
        const [
            faturamentoMesResult,
            agendamentosHojeResult,
            servicoMaisAgendadoResult
        ] = await Promise.all([
            faturamentoMesQuery,
            agendamentosHojeQuery,
            servicoMaisAgendadoQuery
        ]);

        // Monta o objeto de resposta
        const kpis = {
            faturamento_total_mes: parseFloat(faturamentoMesResult.rows[0]?.total || 0),
            agendamentos_hoje: parseInt(agendamentosHojeResult.rows[0]?.total || 0),
            servico_principal_mes: servicoMaisAgendadoResult.rows[0]?.nome_servico || 'N/A'
        };

        res.json(kpis);

    } catch (err) {
        console.error('Erro ao buscar KPIs do dashboard:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

module.exports = router;