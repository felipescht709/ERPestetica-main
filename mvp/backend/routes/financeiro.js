// financeiro.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); 
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const moment = require('moment'); // Certifique-se de ter 'moment' instalado (npm install moment)

// GET Resumo Financeiro (Receita, Custo, Lucro) por período
router.get(
  '/resumo',
  authenticateToken,
  authorizeRole(['admin', 'gerente']),
  async (req, res) => {
    const { startDate, endDate } = req.query;
    const { cod_usuario_empresa } = req.user;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Parâmetros startDate e endDate são obrigatórios.' });
    }

    try {
        const query = `
            SELECT
                COALESCE(SUM(a.preco_total), 0) AS total_revenue,
                COALESCE(SUM(s.custo_material * (a.preco_total / NULLIF(s.preco, 0))), 0) AS total_material_cost,
                COALESCE(SUM(s.custo_mao_de_obra * (a.preco_total / NULLIF(s.preco, 0))), 0) AS total_labor_cost
            FROM
                agendamentos a
            JOIN
                servicos s ON a.servico_cod = s.cod_servico
            WHERE
                a.status = 'concluido' -- CORREÇÃO AQUI: Garante que o status seja 'concluido' (minúsculas, sem acento)
                AND a.data_hora_fim BETWEEN $1::timestamp AND $2::timestamp
                AND a.cod_usuario_empresa = $3;
        `;
        const params = [`${startDate} 00:00:00`, `${endDate} 23:59:59`, cod_usuario_empresa];
        const result = await pool.query(query, params);

        const { total_revenue, total_material_cost, total_labor_cost } = result.rows[0];
        const total_cost = parseFloat(total_material_cost) + parseFloat(total_labor_cost);
        const profit = parseFloat(total_revenue) - total_cost;

        res.json({
            total_revenue: parseFloat(total_revenue).toFixed(2),
            total_material_cost: parseFloat(total_material_cost).toFixed(2),
            total_labor_cost: parseFloat(total_labor_cost).toFixed(2),
            total_cost: total_cost.toFixed(2),
            profit: profit.toFixed(2)
        });
    } catch (err) {
        console.error('Erro ao buscar resumo financeiro:', err.message);
        res.status(500).send('Server Error');
    }
});

// NOVA ROTA: GET Fluxo de Caixa (Receitas - Despesas) por período
// Exemplo de uso: /api/financeiro/fluxo_caixa?startDate=2024-01-01&endDate=2024-01-31
router.get(
  '/fluxo_caixa',
  authenticateToken,
  authorizeRole(['admin', 'gerente']),
  async (req, res) => {
    const { startDate, endDate } = req.query;
    const { cod_usuario_empresa } = req.user;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Parâmetros startDate e endDate são obrigatórios.' });
    }

    try {
        // Obter receitas de agendamentos concluídos
        const receitasQuery = `
            SELECT
                COALESCE(SUM(a.preco_total), 0) AS total_receitas
            FROM
                agendamentos a
            WHERE
                a.status = 'concluido' -- Apenas agendamentos com status 'concluido' (verificar case no seu DB)
                AND a.data_hora_fim BETWEEN $1::timestamp AND $2::timestamp
                AND a.cod_usuario_empresa = $3;
        `;
        const receitasResult = await pool.query(receitasQuery, [`${startDate} 00:00:00`, `${endDate} 23:59:59`, cod_usuario_empresa]);
        const totalReceitas = parseFloat(receitasResult.rows[0].total_receitas);

        // Obter despesas pagas
        const despesasQuery = `
            SELECT
                COALESCE(SUM(d.valor), 0) AS total_despesas
            FROM
                despesas d
            WHERE
                d.status_pagamento = 'Pago' -- Apenas despesas com status 'Pago' (verificar case no seu DB)
                AND d.data_pagamento BETWEEN $1::date AND $2::date
                AND d.cod_usuario_empresa = $3;
        `;
        const despesasResult = await pool.query(despesasQuery, [startDate, endDate, cod_usuario_empresa]);
        const totalDespesas = parseFloat(despesasResult.rows[0].total_despesas);

        // Calcular saldo (fluxo de caixa líquido)
        const saldo = totalReceitas - totalDespesas;

        res.json({
            startDate: startDate,
            endDate: endDate,
            totalReceitas: totalReceitas.toFixed(2),
            totalDespesas: totalDespesas.toFixed(2),
            saldo: saldo.toFixed(2)
        });

    } catch (err) {
        console.error('Erro ao buscar fluxo de caixa:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;