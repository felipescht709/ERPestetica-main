const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET all vehicles (multi-tenant)
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM veiculos WHERE cod_usuario_empresa = $1 ORDER BY marca, modelo, placa`,
            [req.user.cod_usuario_empresa]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET vehicle by ID (multi-tenant)
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM veiculos WHERE cod_veiculo = $1 AND cod_usuario_empresa = $2`,
            [id, req.user.cod_usuario_empresa]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Veículo não encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new vehicle (multi-tenant)
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { marca, modelo, cor, placa, ano_fabricacao, observacoes } = req.body;
    const { cod_usuario_empresa } = req.user;
    try {
        if (!marca || !modelo || !placa) {
            return res.status(400).json({ msg: 'Marca, modelo e placa são obrigatórios.' });
        }

        // FIX: Verificar se a placa já existe para esta empresa
        const plateExists = await pool.query(
            'SELECT cod_veiculo FROM veiculos WHERE placa = $1 AND cod_usuario_empresa = $2',
            [placa, cod_usuario_empresa]
        );

        if (plateExists.rows.length > 0) {
            return res.status(400).json({ msg: 'Já existe um veículo com esta placa na sua empresa.' });
        }

        const result = await pool.query(
            `INSERT INTO veiculos (marca, modelo, cor, placa, ano_fabricacao, observacoes, cod_usuario_empresa)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [marca, modelo, cor, placa, ano_fabricacao, observacoes, cod_usuario_empresa]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) a vehicle (multi-tenant)
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const { marca, modelo, cor, placa, ano_fabricacao, observacoes } = req.body;

    try {
        // FIX: Verificar se a placa já existe em outro veículo desta empresa
        if (placa) {
            const plateExists = await pool.query(
                'SELECT cod_veiculo FROM veiculos WHERE placa = $1 AND cod_usuario_empresa = $2 AND cod_veiculo != $3',
                [placa, cod_usuario_empresa, id]
            );
            if (plateExists.rows.length > 0) {
                return res.status(400).json({ msg: 'Já existe outro veículo com esta placa na sua empresa.' });
            }
        }

    let query = 'UPDATE veiculos SET ';
    const params = [];
    let i = 1;
    if (marca !== undefined) { query += `marca = $${i++}, `; params.push(marca); }
    if (modelo !== undefined) { query += `modelo = $${i++}, `; params.push(modelo); }
    if (cor !== undefined) { query += `cor = $${i++}, `; params.push(cor); }
    if (placa !== undefined) { query += `placa = $${i++}, `; params.push(placa); }
    if (ano_fabricacao !== undefined) { query += `ano_fabricacao = $${i++}, `; params.push(ano_fabricacao); }
    if (observacoes !== undefined) { query += `observacoes = $${i++}, `; params.push(observacoes); }
    query += `updated_at = CURRENT_TIMESTAMP `;
    query = query.replace(/,\s*$/, "");
    if (params.length === 0) {
        return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
    }
    query += ` WHERE cod_veiculo = $${i++} AND cod_usuario_empresa = $${i++} RETURNING *`;
    params.push(id, cod_usuario_empresa);
        const updatedVehicle = await pool.query(query, params);
        if (updatedVehicle.rows.length === 0) {
            return res.status(404).json({ msg: 'Veículo não encontrado' });
        }
        res.json(updatedVehicle.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE a vehicle (multi-tenant)
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const deletedVehicle = await pool.query(
            'DELETE FROM veiculos WHERE cod_veiculo = $1 AND cod_usuario_empresa = $2 RETURNING *',
            [id, req.user.cod_usuario_empresa]
        );
        if (deletedVehicle.rows.length === 0) {
            return res.status(404).json({ msg: 'Veículo não encontrado' });
        }
        res.json({ msg: 'Veículo removido com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
