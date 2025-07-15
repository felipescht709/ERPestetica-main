// Exemplo de como você pode ajustar seu endpoint /api/ordens_servico
// para suportar filtros de data, serviço e funcionário.
// Assumindo que você já tem um endpoint para ordens de serviço.

const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth');



// Rota para buscar ordens de serviço com filtros (usado para o relatório financeiro)
router.get('/', authenticateToken, authorizeRole(['Admin', 'Gerente', 'Funcionario']), async (req, res) => {
    const { startDate, endDate, cod_servico, cod_funcionario } = req.query;
    const cod_usuario_empresa = req.user.cod_usuario_empresa; // ID da empresa logada

    let query = `
        SELECT
            os.*,
            io.cod_item_os, io.cod_servico, io.quantidade, io.valor_unitario, io.valor_total,
            s.nome_servico,
            c.nome_cliente,
            f.nome_usuario AS nome_funcionario
        FROM
            ordens_servico os
        JOIN
            itens_ordem_servico io ON os.cod_ordem_servico = io.cod_ordem_servico
        JOIN
            servicos s ON io.cod_servico = s.cod_servico
        JOIN
            clientes c ON os.cod_cliente = c.cod_cliente
        LEFT JOIN
            usuarios f ON os.cod_funcionario_responsavel = f.cod_usuario -- Adicione este JOIN se cod_funcionario_responsavel for o ID do usuário
        WHERE
            os.cod_usuario_empresa = $1
    `;
    const params = [cod_usuario_empresa];
    let paramIndex = 2;

    if (startDate && endDate) {
        query += ` AND os.data_criacao BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        params.push(startDate, endDate);
    }
    if (cod_servico) {
        query += ` AND io.cod_servico = $${paramIndex++}`;
        params.push(cod_servico);
    }
    if (cod_funcionario) {
        query += ` AND os.cod_funcionario_responsavel = $${paramIndex++}`;
        params.push(cod_funcionario);
    }

    query += ` ORDER BY os.data_criacao DESC;`;

    try {
        const result = await pool.query(query, params);

        // Agrupar itens de serviço por ordem de serviço para facilitar o consumo no frontend
        const ordersMap = new Map();
        result.rows.forEach(row => {
            if (!ordersMap.has(row.cod_ordem_servico)) {
                ordersMap.set(row.cod_ordem_servico, {
                    cod_ordem_servico: row.cod_ordem_servico,
                    cod_cliente: row.cod_cliente,
                    nome_cliente: row.nome_cliente,
                    cod_usuario_empresa: row.cod_usuario_empresa,
                    data_criacao: row.data_criacao,
                    status_os: row.status_os,
                    cod_funcionario_responsavel: row.cod_funcionario_responsavel,
                    nome_funcionario: row.nome_funcionario,
                    observacoes: row.observacoes,
                    valor_total_os: row.valor_total_os,
                    itens_ordem_servico: []
                });
            }
            ordersMap.get(row.cod_ordem_servico).itens_ordem_servico.push({
                cod_item_os: row.cod_item_os,
                cod_servico: row.cod_servico,
                nome_servico: row.nome_servico,
                quantidade: row.quantidade,
                valor_unitario: row.valor_unitario,
                valor_total: row.valor_total
            });
        });

        res.json(Array.from(ordersMap.values()));
    } catch (err) {
        console.error('Erro ao buscar ordens de serviço:', err);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar ordens de serviço.' });
    }
});

module.exports = router;