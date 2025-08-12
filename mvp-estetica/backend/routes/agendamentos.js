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

// GET all appointments (multi-tenant) - ROTA CORRIGIDA
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const { start, end, status, responsaveis, servicos } = req.query;

        // A query foi atualizada para incluir todos os campos necessários para a edição no modal.
        let query = `
            SELECT
                a.cod_agendamento,
                a.cliente_cod,
                a.servico_cod,
                a.veiculo_cod,
                a.usuario_responsavel_cod,
                a.duracao_minutos,
                a.preco_total,
                a.tipo_agendamento,
                a.forma_pagamento,
                a.data_hora_inicio AS "start",
                a.data_hora_fim AS "end",
                a.status,
                c.nome_cliente || ' - ' || s.nome_servico AS "title",
                s.nome_servico,
                CASE a.status
                    WHEN 'concluido' THEN '#28a745'
                    WHEN 'em_andamento' THEN '#ffc107'
                    WHEN 'cancelado' THEN '#6c757d'
                    WHEN 'pendente' THEN '#6f42c1'
                    ELSE '#007bff'
                END AS "backgroundColor",
                CASE a.status WHEN 'concluido' THEN '#28a745' WHEN 'em_andamento' THEN '#ffc107' WHEN 'cancelado' THEN '#6c757d' WHEN 'pendente' THEN '#6f42c1' ELSE '#007bff' END AS "borderColor",
                v.placa AS veiculo_placa,
                v.modelo AS veiculo_modelo,
                u.nome_usuario AS usuario_responsavel_nome,
                a.observacoes_agendamento
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
            const statusArray = status.split(',').map(s => s.trim());
            if (statusArray.length > 0) {
                query += ` AND a.status = ANY($${paramIndex++}::text[])`;
                params.push(statusArray);
            }
        }
        if (responsaveis) {
            const responsaveisArray = responsaveis.split(',').map(id => parseInt(id, 10));
            if (responsaveisArray.length > 0) {
                query += ` AND a.usuario_responsavel_cod = ANY($${paramIndex++}::int[])`;
                params.push(responsaveisArray);
            }
        }
        if (servicos) {
            const servicosArray = servicos.split(',').map(id => parseInt(id, 10));
            if (servicosArray.length > 0) {
                query += ` AND a.servico_cod = ANY($${paramIndex++}::int[])`;
                params.push(servicosArray);
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

// =============================================================================
// ROTA POST / (Criar Agendamento) - CÓDIGO COMPLETO E ATUALIZADO
// =============================================================================
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
        data_hora_inicio, duracao_minutos, preco_total, status, tipo_agendamento,
        forma_pagamento, observacoes_agendamento
    } = req.body;
    const { cod_usuario_empresa } = req.user;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Buscar todas as regras ativas da empresa de uma só vez
        const regrasResult = await client.query("SELECT * FROM configuracoes_agenda WHERE cod_usuario_empresa = $1 AND ativo = true", [cod_usuario_empresa]);
        const regras = regrasResult.rows;

        const dataAgendamento = moment.tz(data_hora_inicio, "America/Sao_Paulo");
        const data_hora_fim_obj = dataAgendamento.clone().add(duracao_minutos, 'minutes');
        const diaDaSemana = dataAgendamento.day(); // 0 = Domingo, 1 = Segunda...
        const diaFormatado = dataAgendamento.format('YYYY-MM-DD');

        // Buscar detalhes do serviço para obter a capacidade específica
        const servicoResult = await client.query("SELECT nome_servico, capacidade_simultanea FROM servicos WHERE cod_servico = $1", [servico_cod]);
        const servicoInfo = servicoResult.rows[0];

        // 2. Executar validações de regras da agenda (se existirem)
        const regraDoDia = regras.find(r => r.tipo_regra === 'horario_trabalho' && r.dia_semana === diaDaSemana);
        if (regraDoDia) {
            // VALIDAÇÃO: HORÁRIO DE FUNCIONAMENTO
            const horaInicioTrabalho = moment.tz(`${diaFormatado} ${regraDoDia.hora_inicio}`, "America/Sao_Paulo");
            const horaFimTrabalho = moment.tz(`${diaFormatado} ${regraDoDia.hora_fim}`, "America/Sao_Paulo");
            if (dataAgendamento.isBefore(horaInicioTrabalho) || data_hora_fim_obj.isAfter(horaFimTrabalho)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: `Horário fora do expediente. Na ${dataAgendamento.format('dddd')}, o atendimento é das ${regraDoDia.hora_inicio} às ${regraDoDia.hora_fim}.` });
            }
        } else {
             await client.query('ROLLBACK');
             return res.status(400).json({ msg: `Não há expediente configurado para ${dataAgendamento.format('dddd')}.` });
        }

        // VALIDAÇÃO: INTERVALO DE ALMOÇO/PAUSA
        const regraPausa = regras.find(r => r.tipo_regra === 'intervalo_almoco' && r.dia_semana === diaDaSemana && r.ativo);
        if (regraPausa) {
            const horaInicioPausa = moment.tz(`${diaFormatado} ${regraPausa.hora_inicio}`, "America/Sao_Paulo");
            const horaFimPausa = moment.tz(`${diaFormatado} ${regraPausa.hora_fim}`, "America/Sao_Paulo");

            if (dataAgendamento.isBefore(horaFimPausa) && data_hora_fim_obj.isAfter(horaInicioPausa)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: `O horário solicitado está em conflito com o intervalo de pausa (${regraPausa.hora_inicio} - ${regraPausa.hora_fim}).` });
            }
        }
        // <-- LÓGICA DE CAPACIDADE APRIMORADA -->
        if (servicoInfo && servicoInfo.capacidade_simultanea > 0) {
            // VALIDAÇÃO DE CAPACIDADE POR SERVIÇO
            const capacidadeServico = servicoInfo.capacidade_simultanea;
            const agendamentosServicoResult = await client.query(
                `SELECT COUNT(cod_agendamento) FROM agendamentos
                 WHERE cod_usuario_empresa = $1 AND servico_cod = $2 AND status IN ('agendado', 'em_andamento')
                 AND (data_hora_inicio, data_hora_fim) OVERLAPS ($3::timestamp, $4::timestamp)`,
                [cod_usuario_empresa, servico_cod, dataAgendamento.toISOString(), data_hora_fim_obj.toISOString()]
            );
            const sobrepostosServicoCount = parseInt(agendamentosServicoResult.rows[0].count, 10);
            if (sobrepostosServicoCount >= capacidadeServico) {
                await client.query('ROLLBACK');
                return res.status(409).json({ msg: `Limite de capacidade para o serviço "${servicoInfo.nome_servico}" atingido (${capacidadeServico} simultâneos).` });
            }
        } else {
            // VALIDAÇÃO DE CAPACIDADE GERAL (fallback)
            const capacidadeGeral = regraDoDia.capacidade_simultanea || 1;
            const agendamentosGeralResult = await client.query(
                `SELECT COUNT(cod_agendamento) FROM agendamentos
                 WHERE cod_usuario_empresa = $1 AND status IN ('agendado', 'em_andamento')
                 AND (data_hora_inicio, data_hora_fim) OVERLAPS ($2::timestamp, $3::timestamp)`,
                [cod_usuario_empresa, dataAgendamento.toISOString(), data_hora_fim_obj.toISOString()]
            );
            const sobrepostosGeralCount = parseInt(agendamentosGeralResult.rows[0].count, 10);
            if (sobrepostosGeralCount >= capacidadeGeral) {
                await client.query('ROLLBACK');
                return res.status(409).json({ msg: `Limite de capacidade geral da agenda atingido (${capacidadeGeral} simultâneos).` });
            }
        }
        // FIM DA NOVA VALIDAÇÃO

        // 3. Verificação de conflito original (para o mesmo profissional ou veículo)
        const data_hora_fim_iso = data_hora_fim_obj.toISOString();
        const { hasConflict, conflictingIds } = await checkAppointmentConflicts(client, cod_usuario_empresa, data_hora_inicio, data_hora_fim_iso, usuario_responsavel_cod, veiculo_cod);
        if (hasConflict) {
            await client.query('ROLLBACK');
            // MENSAGEM MAIS CLARA
            return res.status(409).json({ 
                msg: `Este profissional ou veículo já está agendado em um horário conflitante.`
            });
        }

        // 4. Se tudo estiver OK, criar o agendamento
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

// =============================================================================
// ROTA POST /recorrentes (Criar Agendamentos Recorrentes) - CÓDIGO ATUALIZADO
// =============================================================================
router.post('/recorrentes', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { agendamento, recorrencia } = req.body; // agendamento: dados do 1º evento; recorrencia: {frequencia, intervalo, data_fim}
    const { cod_usuario_empresa } = req.user;
    
    const {
        cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
        data_hora_inicio, duracao_minutos, preco_total, status, tipo_agendamento,
        forma_pagamento, observacoes_agendamento
    } = agendamento;
    
    const { frequencia, intervalo, data_fim } = recorrencia;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Buscar todas as regras da agenda da empresa de uma só vez para otimizar
        const regrasResult = await client.query("SELECT * FROM configuracoes_agenda WHERE cod_usuario_empresa = $1 AND ativo = true", [cod_usuario_empresa]);
        const regras = regrasResult.rows;

        let agendamentosCriados = [];
        let agendamentosIgnorados = []; // Informa ao usuário quais datas falharam e por quê
        let dataAtual = moment.tz(data_hora_inicio, "America/Sao_Paulo");
        const dataFimRecorrencia = moment.tz(data_fim, "America/Sao_Paulo").endOf('day');

        while (dataAtual.isBefore(dataFimRecorrencia)) {
            const data_hora_fim_obj = dataAtual.clone().add(duracao_minutos, 'minutes');
            const diaDaSemana = dataAtual.day();
            const diaFormatado = dataAtual.format('YYYY-MM-DD');
            let motivoIgnorado = null;

            // Busca detalhes do serviço (poderia ser feito fora do loop se o serviço for sempre o mesmo)
            const servicoResult = await client.query("SELECT nome_servico, capacidade_simultanea FROM servicos WHERE cod_servico = $1", [servico_cod]);
            const servicoInfo = servicoResult.rows[0];

            // 1. Validação de Feriado/Bloqueio
            const regraBloqueio = regras.find(r => r.tipo_regra === 'feriado' && r.ativo && moment(r.data_especifica).format('YYYY-MM-DD') === diaFormatado);
            if (regraBloqueio) {
                motivoIgnorado = `Dia bloqueado: ${regraBloqueio.descricao || 'Feriado'}`;
            }

            // 2. Validação de Horário de Funcionamento e Capacidade
            if (!motivoIgnorado) {
                const regraDoDia = regras.find(r => r.tipo_regra === 'horario_trabalho' && r.dia_semana === diaDaSemana && r.ativo);
                if (regraDoDia) {
                    const horaInicioTrabalho = moment.tz(`${diaFormatado} ${regraDoDia.hora_inicio}`, "America/Sao_Paulo");
                    const horaFimTrabalho = moment.tz(`${diaFormatado} ${regraDoDia.hora_fim}`, "America/Sao_Paulo");
                    if (dataAtual.isBefore(horaInicioTrabalho) || data_hora_fim_obj.isAfter(horaFimTrabalho)) {
                        motivoIgnorado = `Fora do horário de expediente (${regraDoDia.hora_inicio} - ${regraDoDia.hora_fim})`;
                    }
                } else {
                    motivoIgnorado = `Sem expediente configurado para ${dataAtual.format('dddd')}`;
                }
            }

            // 2.1 Validação de Intervalo de Almoço/Pausa
            if (!motivoIgnorado) {
                const regraPausa = regras.find(r => r.tipo_regra === 'intervalo_almoco' && r.dia_semana === diaDaSemana && r.ativo);
                if (regraPausa) {
                    const horaInicioPausa = moment.tz(`${diaFormatado} ${regraPausa.hora_inicio}`, "America/Sao_Paulo");
                    const horaFimPausa = moment.tz(`${diaFormatado} ${regraPausa.hora_fim}`, "America/Sao_Paulo");
                    if (dataAtual.isBefore(horaFimPausa) && data_hora_fim_obj.isAfter(horaInicioPausa)) {
                        motivoIgnorado = `Conflito com intervalo de pausa (${regraPausa.hora_inicio} - ${regraPausa.hora_fim})`;
                    } else {
                        // 3. Validação de Capacidade (Específica ou Geral)
                        if (servicoInfo && servicoInfo.capacidade_simultanea > 0) {
                            const capacidadeServico = servicoInfo.capacidade_simultanea;
                            const agendamentosServicoResult = await client.query(
                                `SELECT COUNT(cod_agendamento) FROM agendamentos WHERE cod_usuario_empresa = $1 AND servico_cod = $2 AND status IN ('agendado', 'em_andamento') AND (data_hora_inicio, data_hora_fim) OVERLAPS ($3::timestamp, $4::timestamp)`,
                                [cod_usuario_empresa, servico_cod, dataAtual.toISOString(), data_hora_fim_obj.toISOString()]
                            );
                            if (parseInt(agendamentosServicoResult.rows[0].count, 10) >= capacidadeServico) {
                                motivoIgnorado = `Limite do serviço "${servicoInfo.nome_servico}" (${capacidadeServico}) atingido`;
                            }
                        } else {
                            const capacidadeGeral = regraDoDia.capacidade_simultanea || 1;
                            const agendamentosGeralResult = await client.query(
                                `SELECT COUNT(cod_agendamento) FROM agendamentos WHERE cod_usuario_empresa = $1 AND status IN ('agendado', 'em_andamento') AND (data_hora_inicio, data_hora_fim) OVERLAPS ($2::timestamp, $3::timestamp)`,
                                [cod_usuario_empresa, dataAtual.toISOString(), data_hora_fim_obj.toISOString()]
                            );
                            if (parseInt(agendamentosGeralResult.rows[0].count, 10) >= capacidadeGeral) {
                                motivoIgnorado = `Limite geral da agenda (${capacidadeGeral}) atingido`;
                            }
                        }
                    }
                }
            }

            // 4. Validação de Conflito de Profissional/Veículo
            if (!motivoIgnorado) {
                const { hasConflict } = await checkAppointmentConflicts(client, cod_usuario_empresa, dataAtual.toISOString(), data_hora_fim_obj.toISOString(), usuario_responsavel_cod, veiculo_cod);
                if (hasConflict) {
                    motivoIgnorado = 'Conflito com outro agendamento do profissional/veículo';
                }
            }

            // 5. Inserir ou Ignorar
            if (motivoIgnorado) {
                agendamentosIgnorados.push({ data: dataAtual.format('DD/MM/YYYY HH:mm'), motivo: motivoIgnorado });
            } else {
                const result = await client.query(
                    `INSERT INTO agendamentos (cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod, data_hora_inicio, data_hora_fim, duracao_minutos, preco_total, status, tipo_agendamento, forma_pagamento, observacoes_agendamento, cod_usuario_empresa) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
                    [cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod, dataAtual.toISOString(), data_hora_fim_obj.toISOString(), duracao_minutos, preco_total, status, tipo_agendamento, forma_pagamento, observacoes_agendamento, cod_usuario_empresa]
                );
                agendamentosCriados.push(result.rows[0]);
            }

            // Avança para a próxima data baseada na frequência
            dataAtual.add(intervalo, frequencia.replace('diaria', 'days').replace('semanal', 'weeks').replace('mensal', 'months'));
        }

        await client.query('COMMIT');
        res.status(201).json({ msg: `${agendamentosCriados.length} agendamentos recorrentes criados com sucesso.`, agendamentos: agendamentosCriados, agendamentosIgnorados });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar agendamento recorrente:', err.message, err.stack);
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