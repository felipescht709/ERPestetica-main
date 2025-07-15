const express = require('express');
const router = express.Router();
const pool = require('../banco'); 
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET Resumo Financeiro (Receita, Custo, Lucro) por período
// Exemplo de uso: /api/financeiro/resumo?startDate=2024-01-01&endDate=2024-01-31
router.get(
  '/resumo',
  authenticateToken,
  authorizeRole(['admin', 'gerente']),
  async (req, res) => {
    const { startDate, endDate } = req.query;
    const { cod_usuario_empresa } = req.user; // Pega o ID da empresa do usuário logado

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Parâmetros startDate e endDate são obrigatórios.' });
    }

    try {
        // FIX: Adicionado filtro por cod_usuario_empresa, proteção contra divisão por zero e status correto.
        const query = `
            SELECT
                COALESCE(SUM(a.preco_total), 0) AS total_revenue,
                -- Proteção contra divisão por zero caso s.preco seja 0
                COALESCE(SUM(s.custo_material * (a.preco_total / NULLIF(s.preco, 0))), 0) AS total_material_cost,
                COALESCE(SUM(s.custo_mao_de_obra * (a.preco_total / NULLIF(s.preco, 0))), 0) AS total_labor_cost
            FROM
                agendamentos a
            JOIN
                servicos s ON a.servico_cod = s.cod_servico
            WHERE
                a.status = 'Concluído'
                AND a.data_hora_fim BETWEEN $1::timestamp AND $2::timestamp
                AND a.cod_usuario_empresa = $3; -- Filtro de Multi-Tenancy
        `;
        const params = [`${startDate} 00:00:00`, `${endDate} 23:59:59`, cod_usuario_empresa];
        const result = await pool.query(query, params);

        // Calcula o lucro no backend para simplificar o frontend
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
        console.error('Erro ao buscar resumo financeiro:', err);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar resumo financeiro.' });
    }
});

module.exports = router;