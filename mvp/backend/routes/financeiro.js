// financeiro.js
const express = require('express');
const router = express.Router();
const db = require('../db'); 
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const moment = require('moment');

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
        const summary = await db('agendamentos as a')
            .join('servicos as s', 'a.servico_cod', 's.cod_servico')
            .where('a.status', 'concluido')
            .whereBetween('a.data_hora_fim', [`${startDate} 00:00:00`, `${endDate} 23:59:59`])
            .where('a.cod_usuario_empresa', cod_usuario_empresa)
            .select(
                db.raw('COALESCE(SUM(a.preco_total), 0) AS total_revenue'),
                db.raw('COALESCE(SUM(s.custo_material * (a.preco_total / NULLIF(s.preco, 0))), 0) AS total_material_cost'),
                db.raw('COALESCE(SUM(s.custo_mao_de_obra * (a.preco_total / NULLIF(s.preco, 0))), 0) AS total_labor_cost')
            )
            .first();

        const { total_revenue, total_material_cost, total_labor_cost } = summary;
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
        const [receitasResult, despesasResult] = await Promise.all([
            db('agendamentos as a')
                .where({ 'a.status': 'concluido', 'a.cod_usuario_empresa': cod_usuario_empresa })
                .whereBetween('a.data_hora_fim', [`${startDate} 00:00:00`, `${endDate} 23:59:59`])
                .sum({ total_receitas: 'a.preco_total' })
                .first(),
            db('despesas as d')
                .where({ 'd.status_pagamento': 'Pago', 'd.cod_usuario_empresa': cod_usuario_empresa })
                .whereBetween('d.data_pagamento', [startDate, endDate])
                .sum({ total_despesas: 'd.valor' })
                .first()
        ]);

        const totalReceitas = parseFloat(receitasResult.total_receitas || 0);
        const totalDespesas = parseFloat(despesasResult.total_despesas || 0);
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