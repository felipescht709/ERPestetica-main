
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Adicionar proprietário atual a um veículo
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { cod_veiculo, cod_cliente } = req.body;
    const { cod_usuario_empresa } = req.user;

    try {
        // Iniciar transação para garantir a integridade dos dados
        await pool.query('BEGIN');

        // 1. Verificar se o veículo pertence à empresa do usuário
        const vehicleCheck = await pool.query(
            'SELECT 1 FROM veiculos WHERE cod_veiculo = $1 AND cod_usuario_empresa = $2',
            [cod_veiculo, cod_usuario_empresa]
        );
        if (vehicleCheck.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ msg: 'Veículo não encontrado ou não pertence à sua empresa.' });
        }

        // 2. Verificar se o cliente pertence à empresa do usuário
        const clientCheck = await pool.query(
            'SELECT 1 FROM clientes WHERE cod_cliente = $1 AND cod_usuario_empresa = $2',
            [cod_cliente, cod_usuario_empresa]
        );
        if (clientCheck.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ msg: 'Cliente não encontrado ou não pertence à sua empresa.' });
        }

        // 3. Ao adicionar, marque todos os outros como não atuais (dentro da transação)
        await pool.query(
            `UPDATE veiculos_clientes SET is_proprietario_atual = FALSE, data_fim_posse = NOW()
             WHERE cod_veiculo = $1 AND cod_usuario_empresa = $2 AND is_proprietario_atual = TRUE`,
            [cod_veiculo, cod_usuario_empresa]
        );
        // 4. Crie o novo vínculo (dentro da transação)
        const result = await pool.query(
            `INSERT INTO veiculos_clientes (cod_veiculo, cod_cliente, is_proprietario_atual, data_inicio_posse, cod_usuario_empresa)
             VALUES ($1, $2, TRUE, NOW(), $3) RETURNING *`,
            [cod_veiculo, cod_cliente, cod_usuario_empresa]
        );

        await pool.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Listar proprietários de um veículo (rota existente, mantém-se)
router.get('/:cod_veiculo', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    try {
        const { cod_veiculo } = req.params;
        const result = await pool.query(
            `SELECT vc.*, c.nome_cliente FROM veiculos_clientes vc
             JOIN clientes c ON vc.cod_cliente = c.cod_cliente
             WHERE vc.cod_veiculo = $1 AND vc.cod_usuario_empresa = $2
             ORDER BY vc.data_inicio_posse DESC`,
            [cod_veiculo, req.user.cod_usuario_empresa]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/by-client/:cod_cliente', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_cliente } = req.params;
        const result = await pool.query(
            `SELECT
                vc.cod_veiculo_cliente,
                vc.cod_cliente,
                vc.cod_veiculo,
                vc.data_inicio_posse,
                vc.data_fim_posse,
                vc.is_proprietario_atual,
                v.marca,
                v.modelo,
                v.placa,
                v.ano,
                v.cor
             FROM veiculos_clientes vc
             JOIN veiculos v ON vc.cod_veiculo = v.cod_veiculo
             WHERE vc.cod_cliente = $1 AND vc.cod_usuario_empresa = $2
             ORDER BY vc.is_proprietario_atual DESC, vc.data_inicio_posse DESC`,
            [cod_cliente, req.user.cod_usuario_empresa]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Remover proprietário atual (encerra posse)
router.put('/remover', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { cod_veiculo, cod_cliente } = req.body;
    try {
        const result = await pool.query(
            `UPDATE veiculos_clientes SET is_proprietario_atual = FALSE, data_fim_posse = NOW()
             WHERE cod_veiculo = $1 AND cod_cliente = $2 AND cod_usuario_empresa = $3 AND is_proprietario_atual = TRUE RETURNING *`,
            [cod_veiculo, cod_cliente, req.user.cod_usuario_empresa]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Proprietário atual não encontrado para este veículo.' });
        }
        res.json({ msg: 'Propriedade encerrada com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;