const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// @route    GET /api/home
// @desc     Busca todos os dados consolidados para a tela inicial do app
// @access   Private
router.get('/', authenticateToken, async (req, res) => {
    const { cod_usuario, cod_usuario_empresa, nome_usuario } = req.user;
    const client = await pool.connect();

    try {
        const hoje = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

        // --- Consulta 1: Próximos 5 Agendamentos ---
        const agendamentosQuery = client.query(
            `SELECT 
                a.cod_agendamento as id,
                TO_CHAR(a.data_hora_inicio, 'HH24:MI') as horario,
                c.nome_cliente,
                v.modelo as veiculo,
                -- Agrega os nomes dos serviços para este agendamento
                (SELECT string_agg(s.nome_servico, ' | ')
                 FROM agendamento_servicos asv
                 JOIN servicos s ON s.cod_servico = asv.cod_servico
                 WHERE asv.cod_agendamento = a.cod_agendamento) as servico
             FROM agendamentos a
             JOIN clientes c ON a.cliente_cod = c.cod_cliente
             LEFT JOIN veiculos v ON a.veiculo_cod = v.cod_veiculo
             WHERE a.cod_usuario_empresa = $1 
               AND a.data_hora_inicio::date = $2
               AND a.status = 'agendado'
               AND a.data_hora_inicio >= NOW()
             ORDER BY a.data_hora_inicio ASC
             LIMIT 5`,
            [cod_usuario_empresa, hoje]
        );

        // --- Consulta 2: Faturamento do Dia ---
        const faturamentoDiaQuery = client.query(
            `SELECT SUM(valor) as total FROM transacoes_financeiras
             WHERE cod_usuario_empresa = $1 AND tipo_transacao = 'receita' AND status_pagamento = 'pago'
             AND data_pagamento::date = current_date`,
            [cod_usuario_empresa]
        );

        // --- Consulta 3: OS Abertas ---
        const osAbertasQuery = client.query(
            `SELECT COUNT(cod_ordem_servico) as total FROM ordens_servico
             WHERE cod_usuario_empresa = $1 AND status_os NOT IN ('Concluída', 'Cancelada')`,
            [cod_usuario_empresa]
        );
        
        // --- Consulta 4: Serviços de Hoje ---
        const servicosHojeQuery = client.query(
             `SELECT COUNT(cod_agendamento) as total FROM agendamentos
              WHERE cod_usuario_empresa = $1 AND data_hora_inicio::date = current_date`,
             [cod_usuario_empresa]
        );


        // Executa todas as consultas em paralelo para máxima eficiência
        const [
            agendamentosResult,
            faturamentoDiaResult,
            osAbertasResult,
            servicosHojeResult
        ] = await Promise.all([
            agendamentosQuery,
            faturamentoDiaQuery,
            osAbertasResult,
            servicosHojeQuery
        ]);

        // Monta o objeto de resposta final
        const dashboardData = {
            faturamentoDia: parseFloat(faturamentoDiaResult.rows[0]?.total || 0).toFixed(2).replace('.',','),
            servicosHoje: parseInt(servicosHojeResult.rows[0]?.total || 0),
            osAbertas: parseInt(osAbertasResult.rows[0]?.total || 0),
            proximosAgendamentos: agendamentosResult.rows
        };

        res.json({
            nomeUsuario: nome_usuario,
            dashboard: dashboardData,
        });

    } catch (err) {
        console.error('Erro ao buscar dados para a home:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

module.exports = router;