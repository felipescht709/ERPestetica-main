// backend/routes/agendamentos.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const moment = require('moment'); 

// Helper para combinar data e hora (pode ser movido para um utils.js)
// const combineDateTime = (dateStr, timeStr) => {
//     return new Date(`${dateStr}T${timeStr}:00`);
// };

// FUNÇÃO HELPER PARA VERIFICAR CONFLITOS DE AGENDAMENTO
const checkAppointmentConflicts = async (
    client,           // Cliente do pool de DB (para transação)
    cod_usuario_empresa,
    data_hora_inicio,
    data_hora_fim,
    usuario_responsavel_cod,
    veiculo_cod = null, // Pode ser nulo
    current_cod_agendamento = null // ID do agendamento atual se for uma atualização (PUT)
) => {
    let query = `
        SELECT cod_agendamento
        FROM agendamentos
        WHERE cod_usuario_empresa = $1
          AND status IN ('agendado', 'em_andamento') -- Apenas status que indicam ocupação
          AND (
                (data_hora_inicio < $2 AND data_hora_fim > $2) OR -- Novo início está no meio de outro
                (data_hora_inicio < $3 AND data_hora_fim > $3) OR -- Novo fim está no meio de outro
                (data_hora_inicio >= $2 AND data_hora_fim <= $3) -- Novo agendamento engloba outro
              )
    `;
    const params = [cod_usuario_empresa, data_hora_inicio, data_hora_fim];
    let paramIndex = 4;

    let conflictConditions = [];

    // Prioriza o conflito de funcionário
    if (usuario_responsavel_cod) {
        conflictConditions.push(`usuario_responsavel_cod = $${paramIndex++}`);
        params.push(usuario_responsavel_cod);
    }

    // Se o veículo for fornecido, verifica conflito de veículo
    if (veiculo_cod) {
        conflictConditions.push(`veiculo_cod = $${paramIndex++}`);
        params.push(veiculo_cod);
    }
    
    // Se ambos são fornecidos, verifica conflito OU por funcionário OU por veículo
    if (conflictConditions.length > 0) {
        query += ` AND (${conflictConditions.join(' OR ')})`;
    } else {
        // Se não há funcionário nem veículo, não há o que verificar para conflito de recursos
        return { hasConflict: false, conflictingIds: [] };
    }


    // Excluir o próprio agendamento em caso de atualização (PUT)
    if (current_cod_agendamento) {
        query += ` AND cod_agendamento != $${paramIndex++}`;
        params.push(current_cod_agendamento);
    }

    const result = await client.query(query, params);
    return { hasConflict: result.rows.length > 0, conflictingIds: result.rows.map(row => row.cod_agendamento) };
};

// GET all appointments (multi-tenant)
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const { start, end, status } = req.query;

        let query = `
            SELECT
                a.cod_agendamento,
                a.data_hora_inicio,
                a.data_hora_fim,
                a.preco_total,
                a.status,
                a.tipo_agendamento,
                a.forma_pagamento,
                a.observacoes_agendamento,
                a.duracao_minutos, -- Agora esta coluna deve existir!
                c.cod_cliente,
                c.nome_cliente AS cliente_nome,
                c.telefone AS cliente_telefone,
                s.cod_servico,
                s.nome_servico AS servico_nome,
                s.descricao_servico AS servico_descricao,
                v.cod_veiculo,
                v.marca AS veiculo_marca,
                v.modelo AS veiculo_modelo,
                v.cor AS veiculo_cor,
                v.placa AS veiculo_placa,
                u.cod_usuario AS usuario_responsavel_cod,
                u.nome_usuario AS usuario_responsavel_nome
            FROM agendamentos a
            JOIN clientes c ON a.cliente_cod = c.cod_cliente
            JOIN servicos s ON a.servico_cod = s.cod_servico
            LEFT JOIN veiculos v ON a.veiculo_cod = v.cod_veiculo
            LEFT JOIN usuarios u ON a.usuario_responsavel_cod = u.cod_usuario
            WHERE a.cod_usuario_empresa = $1
        `;
        const params = [cod_usuario_empresa];
        let paramIndex = 2;

        if (start && end) {
            // As datas já vêm formatadas como ISOString do frontend, então o ::timestamp é adequado.
            query += ` AND a.data_hora_inicio >= $${paramIndex++}::timestamp AND a.data_hora_inicio <= $${paramIndex++}::timestamp`;
            params.push(start, end);
        }
        if (status) {
            query += ` AND a.status = $${paramIndex++}`;
            params.push(status); // O status 'concluido' virá do frontend em minúsculas
        }

        query += ` ORDER BY a.data_hora_inicio ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar agendamentos:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new appointment (multi-tenant with conflict detection)
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
        data_hora_inicio, duracao_minutos, preco_total, status, tipo_agendamento,
        forma_pagamento, observacoes_agendamento
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    const client = await pool.connect(); // Obter um cliente do pool para a transação

    try {
        await client.query('BEGIN');

        // Calcular data_hora_fim
        const data_hora_fim = moment(data_hora_inicio).add(duracao_minutos, 'minutes').toISOString();

        // 1. VERIFICAR CONFLITOS ANTES DE INSERIR
        const { hasConflict, conflictingIds } = await checkAppointmentConflicts(
            client,
            cod_usuario_empresa,
            data_hora_inicio,
            data_hora_fim,
            usuario_responsavel_cod,
            veiculo_cod
        );

        if (hasConflict) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                msg: `Conflito de agendamento detectado! Já existe(m) agendamento(s) sobreposto(s) (ID(s): ${conflictingIds.join(', ')}).`,
                conflictIds: conflictingIds
            });
        }

        // 2. Inserir o agendamento
        const result = await client.query(
            `INSERT INTO agendamentos (
                cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
                data_hora_inicio, data_hora_fim, duracao_minutos, preco_total, status, tipo_agendamento,
                forma_pagamento, observacoes_agendamento, cod_usuario_empresa
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [
                cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
                data_hora_inicio, data_hora_fim, duracao_minutos, preco_total, status, tipo_agendamento,
                forma_pagamento, observacoes_agendamento, cod_usuario_empresa
            ]
        );
        const newAppointment = result.rows[0];

        await client.query('COMMIT');
        res.status(201).json(newAppointment);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar agendamento:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release(); // Liberar o cliente de volta para o pool
    }
});

// PUT (update) an appointment (multi-tenant with conflict detection)
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const {
        cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
        data_hora_inicio, duracao_minutos, preco_total, status, tipo_agendamento,
        forma_pagamento, observacoes_agendamento
    } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Calcular data_hora_fim
        const data_hora_fim = moment(data_hora_inicio).add(duracao_minutos, 'minutes').toISOString();

        // 1. VERIFICAR CONFLITOS ANTES DE ATUALIZAR, EXCLUINDO O PRÓPRIO AGENDAMENTO
        const { hasConflict, conflictingIds } = await checkAppointmentConflicts(
            client,
            cod_usuario_empresa,
            data_hora_inicio,
            data_hora_fim,
            usuario_responsavel_cod,
            veiculo_cod,
            id // Passar o ID do agendamento atual para ser excluído da verificação
        );

        if (hasConflict) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                msg: `Conflito de agendamento detectado! Já existe(m) agendamento(s) sobreposto(s) (ID(s): ${conflictingIds.join(', ')}).`,
                conflictIds: conflictingIds
            });
        }

        // 2. Atualizar o agendamento
        const fields = {
            cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
            data_hora_inicio, data_hora_fim, duracao_minutos, preco_total, status, tipo_agendamento,
            forma_pagamento, observacoes_agendamento
        };

        let query = 'UPDATE agendamentos SET ';
        const params = [];
        let i = 1;
        for (const key in fields) {
            if (fields[key] !== undefined) {
                query += `${key} = $${i++}, `;
                params.push(fields[key]);
            }
        }
        query += `updated_at = CURRENT_TIMESTAMP `;
        query = query.replace(/,\s*$/, ""); // Remove a vírgula extra no final

        if (params.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
        }

        query += ` WHERE cod_agendamento = $${i++} AND cod_usuario_empresa = $${i++} RETURNING *`;
        params.push(id, cod_usuario_empresa);

        const updatedAppointment = await client.query(query, params);

        if (updatedAppointment.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Agendamento não encontrado' });
        }

        await client.query('COMMIT');
        res.json(updatedAppointment.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar agendamento:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// DELETE an appointment (multi-tenant)
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const deletedAppointment = await pool.query(
            `UPDATE agendamentos SET status = 'cancelado', updated_at = CURRENT_TIMESTAMP 
             WHERE cod_agendamento = $1 AND cod_usuario_empresa = $2 RETURNING *`,
            [id, req.user.cod_usuario_empresa]
        );
        if (deletedAppointment.rows.length === 0) {
            return res.status(404).json({ msg: 'Agendamento não encontrado' });
        }
        res.json({ msg: 'Agendamento cancelado com sucesso (não deletado fisicamente)' });
    } catch (err) {
        console.error('Erro ao cancelar agendamento:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;