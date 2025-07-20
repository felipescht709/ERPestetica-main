// Código atualizado para felipescht709/erpestetica/ERPestetica-06b7c746df12133269d64d3c5d88435c14e938cd/mvp-estetica/backend/routes/veiculos.js
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
    // Ajuste aqui para incluir todos os campos enviados pelo frontend e que estão no DB
    const { marca, modelo, ano, cor, placa, chassi, renavam, quilometragem_atual, observacoes } = req.body;
    const { cod_usuario_empresa } = req.user;
    try {
        if (!marca || !modelo || !placa) {
            return res.status(400).json({ msg: 'Marca, modelo e placa são obrigatórios.' });
        }

        // Verificar se a placa já existe para esta empresa
        const plateExists = await pool.query(
            'SELECT cod_veiculo FROM veiculos WHERE placa = $1 AND cod_usuario_empresa = $2',
            [placa, cod_usuario_empresa]
        );

        if (plateExists.rows.length > 0) {
            return res.status(400).json({ msg: 'Já existe um veículo com esta placa na sua empresa.' });
        }

        // Ajuste a query INSERT para incluir todos os campos, correspondendo ao schema do DB
        const result = await pool.query(
            `INSERT INTO veiculos (marca, modelo, ano, cor, placa, chassi, renavam, quilometragem_atual, observacoes, cod_usuario_empresa)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [marca, modelo, ano, cor, placa, chassi, renavam, quilometragem_atual, observacoes, cod_usuario_empresa]
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
    // Ajuste aqui para incluir todos os campos que podem ser atualizados
    const { marca, modelo, ano, cor, placa, chassi, renavam, quilometragem_atual, observacoes } = req.body;

    try {
        // Verificar se a placa já existe em outro veículo desta empresa
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
    // Adicione todos os campos aqui para atualização
    if (marca !== undefined) { query += `marca = $${i++}, `; params.push(marca); }
    if (modelo !== undefined) { query += `modelo = $${i++}, `; params.push(modelo); }
    if (ano !== undefined) { query += `ano = $${i++}, `; params.push(ano); } // Corrigido de ano_fabricacao para ano
    if (cor !== undefined) { query += `cor = $${i++}, `; params.push(cor); }
    if (placa !== undefined) { query += `placa = $${i++}, `; params.push(placa); }
    if (chassi !== undefined) { query += `chassi = $${i++}, `; params.push(chassi); }
    if (renavam !== undefined) { query += `renavam = $${i++}, `; params.push(renavam); }
    if (quilometragem_atual !== undefined) { query += `quilometragem_atual = $${i++}, `; params.push(quilometragem_atual); }
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