const express = require('express');
const router = express.Router();
const db = require('../db'); // Alterado para db (instância do Knex)
const { authenticateToken } = require('../middleware/auth');

// @route    GET /api/home
// @desc     Busca todos os dados consolidados para a tela inicial do app
// @access   Private
router.get('/', authenticateToken, async (req, res) => {
    const { cod_usuario, cod_usuario_empresa, nome_usuario } = req.user;

    try {
        const hoje = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

        // --- Consulta 1: Próximos 5 Agendamentos ---
        const agendamentosQuery = db('agendamentos as a')
            .join('clientes as c', 'a.cliente_cod', 'c.cod_cliente')
            .leftJoin('veiculos as v', 'a.veiculo_cod', 'v.cod_veiculo')
            .where('a.cod_usuario_empresa', cod_usuario_empresa)
            .andWhereRaw('a.data_hora_inicio::date = ?', [hoje])
            .andWhere('a.status', 'agendado')
            .andWhere('a.data_hora_inicio', '>=', db.fn.now())
            .select(
                'a.cod_agendamento as id',
                db.raw("TO_CHAR(a.data_hora_inicio, 'HH24:MI') as horario"),
                'c.nome_cliente',
                'v.modelo as veiculo',
                db.raw(`(
                    SELECT string_agg(s.nome_servico, ' | ')
                    FROM agendamento_servicos asv
                    JOIN servicos s ON s.cod_servico = asv.cod_servico
                    WHERE asv.cod_agendamento = a.cod_agendamento
                ) as servico`)
            )
            .orderBy('a.data_hora_inicio', 'asc')
            .limit(5);

        // --- Consulta 2: Faturamento do Dia ---
        const faturamentoDiaQuery = db('transacoes_financeiras')
            .where({ 
                cod_usuario_empresa, 
                tipo_transacao: 'receita', 
                status_pagamento: 'pago' 
            })
            .andWhereRaw('data_pagamento::date = current_date')
            .sum('valor as total')
            .first();

        // --- Consulta 3: OS Abertas ---
        const osAbertasQuery = db('ordens_servico')
            .where({ cod_usuario_empresa })
            .whereNotIn('status_os', ['Concluída', 'Cancelada'])
            .count('cod_ordem_servico as total')
            .first();
        
        // --- Consulta 4: Serviços de Hoje ---
        const servicosHojeQuery = db('agendamentos')
            .where({ cod_usuario_empresa })
            .andWhereRaw('data_hora_inicio::date = current_date')
            .count('cod_agendamento as total')
            .first();

        // Executa todas as consultas em paralelo
        const [
            agendamentosResult,
            faturamentoDiaResult,
            osAbertasResult,
            servicosHojeResult
        ] = await Promise.all([
            agendamentosQuery,
            faturamentoDiaQuery,
            osAbertasQuery,
            servicosHojeQuery
        ]);

        const dashboardData = {
            faturamentoDia: parseFloat(faturamentoDiaResult?.total || 0).toFixed(2).replace('.',','),
            servicosHoje: parseInt(servicosHojeResult?.total || 0),
            osAbertas: parseInt(osAbertasResult?.total || 0),
            proximosAgendamentos: agendamentosResult
        };

        res.json({
            nomeUsuario: nome_usuario,
            dashboard: dashboardData,
        });

    } catch (err) {
        console.error('Erro ao buscar dados para a home:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor' });
    }
});

module.exports = router;