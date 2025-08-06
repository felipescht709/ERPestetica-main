// backend/routes/agendamentos.js (VERSÃO ATUALIZADA)
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const moment = require('moment-timezone');

// FUNÇÃO HELPER PARA VERIFICAR CONFLITOS DE AGENDAMENTO (Mantida como está, é excelente)
const checkAppointmentConflicts = async (
    client,
    cod_usuario_empresa,
    data_hora_inicio,
    data_hora_fim,
    usuario_responsavel_cod,
    veiculo_cod = null,
    current_cod_agendamento = null
) => {
    let query = `
        SELECT cod_agendamento
        FROM agendamentos
        WHERE cod_usuario_empresa = $1
          AND status IN ('agendado', 'em_andamento')
          AND (
                (data_hora_inicio < $2 AND data_hora_fim > $2) OR
                (data_hora_inicio < $3 AND data_hora_fim > $3) OR
                (data_hora_inicio >= $2 AND data_hora_fim <= $3)
              )
    `;
    const params = [cod_usuario_empresa, data_hora_inicio, data_hora_fim];
    let paramIndex = 4;

    let conflictConditions = [];
    if (usuario_responsavel_cod) {
        conflictConditions.push(`usuario_responsavel_cod = $${paramIndex++}`);
        params.push(usuario_responsavel_cod);
    }
    if (veiculo_cod) {
        conflictConditions.push(`veiculo_cod = $${paramIndex++}`);
        params.push(veiculo_cod);
    }
    if (conflictConditions.length > 0) {
        query += ` AND (${conflictConditions.join(' OR ')})`;
    } else {
        return { hasConflict: false, conflictingIds: [] };
    }
    if (current_cod_agendamento) {
        query += ` AND cod_agendamento != $${paramIndex++}`;
        params.push(current_cod_agendamento);
    }

    const result = await client.query(query, params);
    return { hasConflict: result.rows.length > 0, conflictingIds: result.rows.map(row => row.cod_agendamento) };
};

// GET all appointments (multi-tenant) - ROTA ATUALIZADA
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        // NOVO: Adicionado 'responsaveis' para filtro de multi-agenda
        const { start, end, status, responsaveis } = req.query;

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
                a.duracao_minutos,
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
            query += ` AND a.data_hora_inicio >= $${paramIndex++}::timestamp AND a.data_hora_inicio <= $${paramIndex++}::timestamp`;
            params.push(start, end);
        }
        if (status) {
            query += ` AND a.status = $${paramIndex++}`;
            params.push(status);
        }

        // NOVO: Bloco para filtrar por um ou mais responsáveis
        if (responsaveis) {
            const responsaveisArray = responsaveis.split(',').map(id => parseInt(id, 10));
            if (responsaveisArray.length > 0) {
                query += ` AND a.usuario_responsavel_cod = ANY($${paramIndex++}::int[])`;
                params.push(responsaveisArray);
            }
        }

        query += ` ORDER BY a.data_hora_inicio ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar agendamentos:', err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
        data_hora_inicio, duracao_minutos, /* ...resto dos campos... */
    } = req.body;
    const { cod_usuario_empresa } = req.user;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Busca TODAS as regras, incluindo o nosso novo "interruptor"
        const regrasResult = await client.query(
            "SELECT * FROM configuracoes_agenda WHERE cod_usuario_empresa = $1",
            [cod_usuario_empresa]
        );
        const regras = regrasResult.rows;

        // --- INTERRUPTOR DE SEGURANÇA ---
        // Verificamos se as validações avançadas estão ativadas.
        const validacoesAvancadasAtivas = regras.find(r => r.tipo_regra === 'ativar_validacoes_avancadas' && r.ativo === true);

        if (validacoesAvancadasAtivas) {
            // Se estiverem ativas, o "policial" entra em ação.
            const dataAgendamento = moment.tz(data_hora_inicio, "America/Sao_Paulo");
            const data_hora_fim = dataAgendamento.clone().add(duracao_minutos, 'minutes');

            // VALIDAÇÃO 1: DIAS DE BLOQUEIO
            const diaFormatado = dataAgendamento.format('YYYY-MM-DD');
            const diaBloqueado = regras.find(r => r.tipo_regra === 'feriado' && r.ativo && moment(r.data_especifica).format('YYYY-MM-DD') === diaFormatado);
            if (diaBloqueado) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: `Agendamento bloqueado no dia ${dataAgendamento.format('DD/MM/YYYY')}. Motivo: ${diaBloqueado.descricao}` });
            }

            // VALIDAÇÃO 2: HORÁRIO DE FUNCIONAMENTO
            const diaDaSemana = dataAgendamento.day();
            const regraDoDia = regras.find(r => r.tipo_regra === 'horario_trabalho' && r.ativo && r.dia_semana === diaDaSemana);
            if (!regraDoDia) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: `Não há expediente configurado para ${dataAgendamento.format('dddd')}.` });
            }
            const horaInicioTrabalho = moment.tz(`${diaFormatado} ${regraDoDia.hora_inicio}`, "America/Sao_Paulo");
            const horaFimTrabalho = moment.tz(`${diaFormatado} ${regraDoDia.hora_fim}`, "America/Sao_Paulo");
            if (dataAgendamento.isBefore(horaInicioTrabalho) || data_hora_fim.isAfter(horaFimTrabalho)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: `Horário fora do expediente. Na ${dataAgendamento.format('dddd')}, o atendimento é das ${regraDoDia.hora_inicio} às ${regraDoDia.hora_fim}.` });
            }
            
            // VALIDAÇÃO 3: LIMITE DIÁRIO
            const regraLimiteDiario = regras.find(r => r.tipo_regra === 'limite_agendamentos_dia' && r.ativo);
            if (regraLimiteDiario && regraLimiteDiario.valor_numerico !== null) {
                const limite = regraLimiteDiario.valor_numerico;
                const agendamentosNoDiaResult = await client.query("SELECT COUNT(*) FROM agendamentos WHERE data_hora_inicio::date = $1 AND cod_usuario_empresa = $2 AND status <> 'cancelado'", [data_hora_inicio, cod_usuario_empresa]);
                if (parseInt(agendamentosNoDiaResult.rows[0].count) >= limite) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ msg: `Limite de ${limite} agendamentos para este dia foi atingido.` });
                }
            }
        }
        // --- FIM DAS VALIDAÇÕES AVANÇADAS ---
        // SEU CÓDIGO ORIGINAL E INTACTO RODA AQUI:
        const data_hora_fim_iso = moment(data_hora_inicio).add(duracao_minutos, 'minutes').toISOString();
        const { hasConflict, conflictingIds } = await checkAppointmentConflicts(client, cod_usuario_empresa, data_hora_inicio, data_hora_fim_iso, usuario_responsavel_cod, veiculo_cod);
        if (hasConflict) {
            await client.query('ROLLBACK');
            return res.status(409).json({ msg: `Conflito de agendamento detectado! (IDs: ${conflictingIds.join(', ')})`});
        }

        // Se tudo estiver OK, o agendamento é criado.
        const result = await client.query(
            `INSERT INTO agendamentos (cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod, data_hora_inicio, data_hora_fim, duracao_minutos, preco_total, status, tipo_agendamento, forma_pagamento, observacoes_agendamento, cod_usuario_empresa) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod, data_hora_inicio, data_hora_fim_iso, duracao_minutos, preco_total, status, tipo_agendamento, forma_pagamento, observacoes_agendamento, cod_usuario_empresa]
        );
        
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar agendamento:', err.message, err.stack);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// PUT (update) an appointment (Mantido como está)
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

        const data_hora_fim = moment(data_hora_inicio).add(duracao_minutos, 'minutes').toISOString();

        const { hasConflict, conflictingIds } = await checkAppointmentConflicts(
            client,
            cod_usuario_empresa,
            data_hora_inicio,
            data_hora_fim,
            usuario_responsavel_cod,
            veiculo_cod,
            id
        );

        if (hasConflict) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                msg: `Conflito de agendamento detectado! Já existe(m) agendamento(s) sobreposto(s) (ID(s): ${conflictingIds.join(', ')}).`,
                conflictIds: conflictingIds
            });
        }

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
        query = query.replace(/,\s*$/, "");

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


// DELETE an appointment (Mantido como está)
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