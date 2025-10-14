// backend/routes/equipamentos.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Importa o pool de conexão com o banco
const { authenticateToken, authorizeRole } = require('../middleware/auth'); // Importa os middlewares

// GET all equipamentos (multi-tenant)
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'tecnico']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const result = await pool.query(
            `SELECT * FROM equipamentos WHERE cod_usuario_empresa = $1 AND ativo = TRUE ORDER BY nome_equipamento`,
            [cod_usuario_empresa]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar equipamentos:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET equipamento by ID (multi-tenant)
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const result = await pool.query(
            `SELECT * FROM equipamentos WHERE cod_equipamento = $1 AND cod_usuario_empresa = $2 AND ativo = TRUE`,
            [id, cod_usuario_empresa]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Equipamento não encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar equipamento por ID:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new equipamento (multi-tenant)
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const {
        nome_equipamento, descricao, numero_serie, data_aquisicao, valor_aquisicao,
        vida_util_anos, status_operacional, proxima_manutencao, localizacao_atual, responsavel_cod
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    try {
        if (!nome_equipamento || !data_aquisicao || valor_aquisicao === undefined || !status_operacional) {
            return res.status(400).json({ msg: 'Nome, data de aquisição, valor de aquisição e status operacional são obrigatórios.' });
        }

        // Optional: check if numero_serie already exists for this company
        if (numero_serie) {
            const serialExists = await pool.query(
                'SELECT cod_equipamento FROM equipamentos WHERE numero_serie = $1 AND cod_usuario_empresa = $2',
                [numero_serie, cod_usuario_empresa]
            );
            if (serialExists.rows.length > 0) {
                return res.status(400).json({ msg: 'Já existe um equipamento com este número de série na sua empresa.' });
            }
        }

        const result = await pool.query(
            `INSERT INTO equipamentos (
                nome_equipamento, descricao, numero_serie, data_aquisicao, valor_aquisicao,
                vida_util_anos, status_operacional, proxima_manutencao, localizacao_atual, responsavel_cod,
                cod_usuario_empresa
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                nome_equipamento, descricao, numero_serie, data_aquisicao, valor_aquisicao,
                vida_util_anos, status_operacional, proxima_manutencao, localizacao_atual, responsavel_cod,
                cod_usuario_empresa
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao adicionar equipamento:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) um equipamento (multi-tenant)
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const {
        nome_equipamento, descricao, numero_serie, data_aquisicao, valor_aquisicao,
        vida_util_anos, status_operacional, proxima_manutencao, localizacao_atual, responsavel_cod, ativo
    } = req.body;

    try {
        // Optional: check if numero_serie already exists for another equipment in this company
        if (numero_serie) {
            const serialExists = await pool.query(
                'SELECT cod_equipamento FROM equipamentos WHERE numero_serie = $1 AND cod_usuario_empresa = $2 AND cod_equipamento != $3',
                [numero_serie, cod_usuario_empresa, id]
            );
            if (serialExists.rows.length > 0) {
                return res.status(400).json({ msg: 'Já existe outro equipamento com este número de série na sua empresa.' });
            }
        }

        let query = 'UPDATE equipamentos SET ';
        const params = [];
        let i = 1;

        if (nome_equipamento !== undefined) { query += `nome_equipamento = $${i++}, `; params.push(nome_equipamento); }
        if (descricao !== undefined) { query += `descricao = $${i++}, `; params.push(descricao); }
        if (numero_serie !== undefined) { query += `numero_serie = $${i++}, `; params.push(numero_serie); }
        if (data_aquisicao !== undefined) { query += `data_aquisicao = $${i++}, `; params.push(data_aquisicao); }
        if (valor_aquisicao !== undefined) { query += `valor_aquisicao = $${i++}, `; params.push(valor_aquisicao); }
        if (vida_util_anos !== undefined) { query += `vida_util_anos = $${i++}, `; params.push(vida_util_anos); }
        if (status_operacional !== undefined) { query += `status_operacional = $${i++}, `; params.push(status_operacional); }
        if (proxima_manutencao !== undefined) { query += `proxima_manutencao = $${i++}, `; params.push(proxima_manutencao); }
        if (localizacao_atual !== undefined) { query += `localizacao_atual = $${i++}, `; params.push(localizacao_atual); }
        if (responsavel_cod !== undefined) { query += `responsavel_cod = $${i++}, `; params.push(responsavel_cod); }
        if (ativo !== undefined) { query += `ativo = $${i++}, `; params.push(ativo); }

        query += `updated_at = CURRENT_TIMESTAMP `;
        query = query.replace(/,\s*$/, ""); // Remove a vírgula extra no final
        
        if (params.length === 0) {
            return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
        }

        query += ` WHERE cod_equipamento = $${i++} AND cod_usuario_empresa = $${i++} RETURNING *`;
        params.push(id, cod_usuario_empresa);

        const updatedEquipment = await pool.query(query, params);
        if (updatedEquipment.rows.length === 0) {
            return res.status(404).json({ msg: 'Equipamento não encontrado' });
        }
        res.json(updatedEquipment.rows[0]);
    } catch (err) {
        console.error('Erro ao atualizar equipamento:', err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE (desativar) um equipamento (multi-tenant)
// Usamos "soft delete" (ativo = FALSE) em vez de exclusão física
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;
        const deletedEquipment = await pool.query(
            `UPDATE equipamentos SET ativo = FALSE, updated_at = CURRENT_TIMESTAMP 
             WHERE cod_equipamento = $1 AND cod_usuario_empresa = $2 RETURNING *`,
            [id, cod_usuario_empresa]
        );
        if (deletedEquipment.rows.length === 0) {
            return res.status(404).json({ msg: 'Equipamento não encontrado' });
        }
        res.json({ msg: 'Equipamento desativado com sucesso (removido da visualização ativa)' });
    } catch (err) {
        console.error('Erro ao desativar equipamento:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;