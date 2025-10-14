// backend/routes/agendamentos.js (VERSÃO CORRIGIDA E INTEGRADA)
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const moment = require('moment-timezone');
const crypto = require('crypto');
const { sendConfirmationEmail, sendConfirmationWhatsApp } = require('../services/messagingService');

// FUNÇÃO HELPER PARA VERIFICAR CONFLITOS DE AGENDAMENTO (Mantida como está)
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
          AND status IN ('agendado', 'em_andamento', 'confirmado_cliente')
          AND (data_hora_inicio, data_hora_fim) OVERLAPS ($2::timestamptz, $3::timestamptz)
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
        // Se não houver responsável ou veículo, não há conflito a verificar por esses critérios
        return { hasConflict: false, conflictingIds: [] };
    }
    if (current_cod_agendamento) {
        query += ` AND cod_agendamento != $${paramIndex++}`;
        params.push(current_cod_agendamento);
    }

    const result = await client.query(query, params);
    return { hasConflict: result.rows.length > 0, conflictingIds: result.rows.map(row => row.cod_agendamento) };
};

// ROTA GET / (Listar Agendamentos) - CORRIGIDA PARA MÚLTIPLOS SERVIÇOS
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const { start, end, status, responsaveis, servicos } = req.query;

        // ALTERADO: A query agora busca os serviços de forma agregada
        let query = `
            SELECT
                a.*, -- Pega todas as colunas de 'agendamentos'
                a.data_hora_inicio AS "start", 
                a.data_hora_fim AS "end",
                c.nome_cliente AS "title",
                
                -- NOVO: Agrega todos os serviços vinculados em um array de objetos JSON
                (SELECT json_agg(json_build_object('cod_servico', s.cod_servico, 'nome_servico', s.nome_servico))
                 FROM agendamento_servicos asv
                 JOIN servicos s ON s.cod_servico = asv.cod_servico
                 WHERE asv.cod_agendamento = a.cod_agendamento) as servicos_agendados,

                CASE 
                    WHEN a.status = 'confirmado_cliente' THEN '#8a2be2' WHEN a.status = 'concluido' THEN '#28a745'
                    WHEN a.status = 'em_andamento' THEN '#ffc107' WHEN a.status = 'cancelado' THEN '#6c757d'
                    WHEN a.status = 'pendente' THEN '#6f42c1' ELSE '#007bff'
                END AS "backgroundColor",
                CASE 
                    WHEN a.status = 'confirmado_cliente' THEN '#8a2be2' WHEN a.status = 'concluido' THEN '#28a745'
                    WHEN a.status = 'em_andamento' THEN '#ffc107' WHEN a.status = 'cancelado' THEN '#6c757d'
                    WHEN a.status = 'pendente' THEN '#6f42c1' ELSE '#007bff'
                END AS "borderColor",
                v.placa AS veiculo_placa, v.modelo AS veiculo_modelo,
                u.nome_usuario AS usuario_responsavel_nome
            FROM agendamentos a
            JOIN clientes c ON a.cliente_cod = c.cod_cliente
            LEFT JOIN veiculos v ON a.veiculo_cod = v.cod_veiculo
            LEFT JOIN usuarios u ON a.usuario_responsavel_cod = u.cod_usuario
            WHERE a.cod_usuario_empresa = $1
        `;
        const params = [cod_usuario_empresa];
        let paramIndex = 2;

        if (start && end) {
            query += ` AND a.data_hora_fim >= $${paramIndex++}::timestamptz AND a.data_hora_inicio <= $${paramIndex++}::timestamptz`;
            params.push(start, end);
        }
        if (status) {
            query += ` AND a.status = ANY($${paramIndex++}::text[])`;
            params.push(status.split(','));
        }
        if (responsaveis) {
            query += ` AND a.usuario_responsavel_cod = ANY($${paramIndex++}::int[])`;
            params.push(responsaveis.split(',').map(Number));
        }
        
        // ALTERADO: O filtro de serviços agora usa uma subquery com EXISTS
        if (servicos) {
            query += ` AND EXISTS (
                SELECT 1 FROM agendamento_servicos asv
                WHERE asv.cod_agendamento = a.cod_agendamento
                AND asv.cod_servico = ANY($${paramIndex++}::int[])
            )`;
            params.push(servicos.split(',').map(Number));
        }

        query += ` ORDER BY a.data_hora_inicio ASC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar agendamentos:', err.message, err.stack);
        // CORRIGIDO: Padronização do erro para JSON
        res.status(500).json({ msg: 'Erro ao buscar agendamentos.', error: err.message });
    }
});

// =============================================================================
// ROTA POST / (Criar Agendamento com MÚLTIPLOS SERVIÇOS)
// VERSÃO FINAL COM VALIDAÇÕES INCLUÍDAS
// =============================================================================
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    // --- ETAPA 0: Extrair os dados da requisição ---
    const {
        cliente_cod, veiculo_cod, usuario_responsavel_cod, data_hora_inicio,
        status, tipo_agendamento, forma_pagamento, observacoes_agendamento,
        servicos
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    if (!servicos || !Array.isArray(servicos) || servicos.length === 0) {
        return res.status(400).json({ msg: 'É necessário selecionar pelo menos um serviço.' });
    }

    // --- ETAPA 1: Calcular os totais a partir dos serviços selecionados ---
    const duracaoTotalMinutos = servicos.reduce((total, s) => total + s.duracao_minutos, 0);
    const precoTotalGeral = servicos.reduce((total, s) => total + parseFloat(s.preco), 0);
    const dataAgendamento = moment.tz(data_hora_inicio, "America/Sao_Paulo");
    const data_hora_fim_iso = dataAgendamento.clone().add(duracaoTotalMinutos, 'minutes').toISOString();
    

    // --- ETAPA 2: Conectar ao banco e iniciar a transação ---
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // --- ETAPA 3: Validações de regras de negócio (conflitos, horários, etc.) ---
        
        // 3.1. Busca todas as regras da agenda da empresa de uma só vez
        const regrasResult = await client.query("SELECT * FROM configuracoes_agenda WHERE cod_usuario_empresa = $1 AND ativo = true", [cod_usuario_empresa]);
        const regras = regrasResult.rows;
        const diaDaSemana = dataAgendamento.day();
        const diaFormatado = dataAgendamento.format('YYYY-MM-DD');

        // 3.2. Validação de Feriado/Dia Bloqueado
        const regraBloqueio = regras.find(r => r.tipo_regra === 'feriado' && moment(r.data_especifica).format('YYYY-MM-DD') === diaFormatado);
        if (regraBloqueio) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: `O dia ${dataAgendamento.format('DD/MM/YYYY')} está bloqueado: ${regraBloqueio.descricao || 'Feriado'}` });
        }

        // 3.3. Validação de Horário de Funcionamento
        const regraDoDia = regras.find(r => r.tipo_regra === 'horario_trabalho' && r.dia_semana === diaDaSemana);
        if (!regraDoDia) {
             await client.query('ROLLBACK');
             return res.status(400).json({ msg: `Não há expediente configurado para ${dataAgendamento.format('dddd')}.` });
        }
        const horaInicioTrabalho = moment.tz(`${diaFormatado} ${regraDoDia.hora_inicio}`, "America/Sao_Paulo");
        const horaFimTrabalho = moment.tz(`${diaFormatado} ${regraDoDia.hora_fim}`, "America/Sao_Paulo");
        if (dataAgendamento.isBefore(horaInicioTrabalho) || moment(data_hora_fim_iso).isAfter(horaFimTrabalho)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: `Agendamento fora do horário de expediente (${regraDoDia.hora_inicio} - ${regraDoDia.hora_fim}).` });
        }

        // 3.4. Validação de Intervalo de Almoço/Pausa
        const regraPausa = regras.find(r => r.tipo_regra === 'intervalo_almoco' && r.dia_semana === diaDaSemana);
        if (regraPausa) {
            const horaInicioPausa = moment.tz(`${diaFormatado} ${regraPausa.hora_inicio}`, "America/Sao_Paulo");
            const horaFimPausa = moment.tz(`${diaFormatado} ${regraPausa.hora_fim}`, "America/Sao_Paulo");
            if (dataAgendamento.isBefore(horaFimPausa) && moment(data_hora_fim_iso).isAfter(horaInicioPausa)) {
                 await client.query('ROLLBACK');
                 return res.status(400).json({ msg: `Conflito com intervalo de pausa (${regraPausa.hora_inicio} - ${regraPausa.hora_fim}).` });
            }
        }

        // 3.5. Validação de Conflito de Profissional/Veículo
        const { hasConflict } = await checkAppointmentConflicts(client, cod_usuario_empresa, data_hora_inicio, data_hora_fim_iso, usuario_responsavel_cod, veiculo_cod, null);
        if (hasConflict) {
            await client.query('ROLLBACK');
            return res.status(409).json({ msg: `Este profissional ou veículo já está agendado em um horário conflitante.` });
        }

        // --- ETAPA 4: Inserir os dados nas tabelas do banco ---

        // 4.1. Insere o registro principal na tabela 'agendamentos'
        const agendamentoResult = await client.query(
            `INSERT INTO agendamentos (cliente_cod, veiculo_cod, usuario_responsavel_cod, data_hora_inicio, data_hora_fim, duracao_minutos, preco_total, status, tipo_agendamento, forma_pagamento, observacoes_agendamento, cod_usuario_empresa) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [cliente_cod, veiculo_cod, usuario_responsavel_cod, data_hora_inicio, data_hora_fim_iso, duracaoTotalMinutos, precoTotalGeral, status, tipo_agendamento, forma_pagamento, observacoes_agendamento, cod_usuario_empresa]
        );
        const novoAgendamento = agendamentoResult.rows[0];

        // 4.2. Insere cada serviço na nova tabela de ligação 'agendamento_servicos'
        for (const servico of servicos) {
            await client.query(
                `INSERT INTO agendamento_servicos (cod_agendamento, cod_servico, preco_servico, duracao_servico) 
                 VALUES ($1, $2, $3, $4)`,
                [novoAgendamento.cod_agendamento, servico.cod_servico, servico.preco, servico.duracao_minutos]
            );
        }

        // 4.3. Cria a Ordem de Serviço (OS) com o valor total
        const osResult = await client.query(
            `INSERT INTO ordens_servico (cod_cliente, cod_veiculo, data_abertura, data_conclusao_prevista, status_os, valor_total_servicos, observacoes, cod_funcionario_responsavel, cod_usuario_empresa, cod_agendamento) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING cod_ordem_servico`,
            [novoAgendamento.cliente_cod, novoAgendamento.veiculo_cod, novoAgendamento.data_hora_inicio, novoAgendamento.data_hora_fim, 'Aguardando Início', precoTotalGeral, `OS do agendamento #${novoAgendamento.cod_agendamento}. ${observacoes_agendamento || ''}`, novoAgendamento.usuario_responsavel_cod, cod_usuario_empresa, novoAgendamento.cod_agendamento]
        );
        const novaOsId = osResult.rows[0].cod_ordem_servico;

        // 4.3.1. NOVO: Popula a OS com um checklist inicial padrão
        const checklistPadrao = [
            'Verificar e registrar avarias pré-existentes (fotos/vídeo)',
            'Confirmar serviços solicitados com o cliente',
            'Verificar se todos os pertences foram removidos do veículo',
            'Proteger áreas sensíveis (painel, volante, bancos)',
        ];

        for (const item of checklistPadrao) {
            await client.query(
                `INSERT INTO os_checklist_itens (cod_ordem_servico, cod_usuario_empresa, descricao_item) VALUES ($1, $2, $3)`,
                [novaOsId, cod_usuario_empresa, item]
            );
        }

        // 4.4. Adiciona CADA serviço como um item separado na OS
        for (const servico of servicos) {
            await client.query(
                `INSERT INTO itens_ordem_servico (cod_ordem_servico, tipo_item, cod_servico, quantidade, valor_unitario, cod_usuario_empresa) 
                 VALUES ($1, 'Servico', $2, 1, $3, $4)`,
                [novaOsId, servico.cod_servico, servico.preco, cod_usuario_empresa]
            );
        }
        
        // 4.5. Cria o lançamento financeiro único com o valor total
        await client.query(
            `INSERT INTO transacoes_financeiras (cod_usuario_empresa, tipo_transacao, valor, data_transacao, descricao, categoria, forma_pagamento, status_pagamento, cod_cliente, cod_ordem_servico, cod_agendamento) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [cod_usuario_empresa, 'receita', precoTotalGeral, novoAgendamento.data_hora_inicio, `Previsão de receita do agendamento #${novoAgendamento.cod_agendamento}`, 'Venda de Serviço', novoAgendamento.forma_pagamento, 'pendente', novoAgendamento.cliente_cod, novaOsId, novoAgendamento.cod_agendamento]
        );

        // --- ETAPA 5: Se tudo deu certo, confirma a transação e envia a resposta ---
        await client.query('COMMIT');
        res.status(201).json({ ...novoAgendamento, cod_ordem_servico: novaOsId });

    } catch (err) {
        // --- ETAPA 6: Se algo deu errado, desfaz tudo (ROLLBACK) ---
        await client.query('ROLLBACK');
        console.error('Erro ao criar agendamento integrado:', err.message, err.stack);
        res.status(500).json({ msg: 'Erro interno no servidor ao criar o agendamento.', error: err.message });

    } finally {
        // --- ETAPA 7: Libera a conexão com o banco ---
        client.release();
    }
});
// =============================================================================
// ROTA DELETE /:id (Cancelar Agendamento e OS)
// =============================================================================
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. "Cancela" o agendamento (soft delete) mudando o status
        const deletedAppointment = await client.query(
            `UPDATE agendamentos SET status = 'cancelado', updated_at = CURRENT_TIMESTAMP 
             WHERE cod_agendamento = $1 AND cod_usuario_empresa = $2 RETURNING *`,
            [id, cod_usuario_empresa]
        );

        if (deletedAppointment.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Agendamento não encontrado.' });
        }

        // 2. "Cancela" a Ordem de Serviço vinculada
        await client.query(
            `UPDATE ordens_servico SET status_os = 'Cancelada', updated_at = CURRENT_TIMESTAMP
             WHERE cod_agendamento = $1 AND cod_usuario_empresa = $2`,
            [id, cod_usuario_empresa]
        );

        await client.query(
            `UPDATE transacoes_financeiras SET status_pagamento = 'cancelado' WHERE cod_agendamento = $1`,
            [id]
         );

        await client.query('COMMIT');
        res.json({ msg: 'Agendamento e OS vinculada foram cancelados com sucesso.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao cancelar agendamento:', err.message);
        // CORRIGIDO: Padroniza a resposta de erro para JSON
        res.status(500).json({ msg: 'Erro ao cancelar agendamento.', error: err.message });
    } finally {
        client.release();
    }
});

// =============================================================================
// ROTA POST /recorrentes (Criar Agendamentos Recorrentes com MÚLTIPLOS SERVIÇOS)
// VERSÃO FINAL COM VALIDAÇÕES INCLUÍDAS
// =============================================================================
router.post('/recorrentes', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { agendamento, recorrencia } = req.body;
    const { cod_usuario_empresa } = req.user;
    
    const {
        cliente_cod, veiculo_cod, usuario_responsavel_cod, data_hora_inicio,
        status, tipo_agendamento, forma_pagamento, observacoes_agendamento,
        servicos
    } = agendamento;
    
    const { frequencia, intervalo, data_fim } = recorrencia;

    if (!servicos || !Array.isArray(servicos) || servicos.length === 0) {
        return res.status(400).json({ msg: 'É necessário selecionar pelo menos um serviço para agendamentos recorrentes.' });
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Totais calculados UMA VEZ antes do loop
        const duracaoTotalMinutos = servicos.reduce((total, s) => total + s.duracao_minutos, 0);
        const precoTotalGeral = servicos.reduce((total, s) => total + parseFloat(s.preco), 0);
        
        const regrasResult = await client.query("SELECT * FROM configuracoes_agenda WHERE cod_usuario_empresa = $1 AND ativo = true", [cod_usuario_empresa]);
        const regras = regrasResult.rows;

        let agendamentosCriados = [];
        let agendamentosIgnorados = [];
        let dataAtual = moment.tz(data_hora_inicio, "America/Sao_Paulo");
        const dataFimRecorrencia = moment.tz(data_fim, "America/Sao_Paulo").endOf('day');

        while (dataAtual.isBefore(dataFimRecorrencia)) {
            const data_hora_fim_obj = dataAtual.clone().add(duracaoTotalMinutos, 'minutes');
            const diaDaSemana = dataAtual.day();
            const diaFormatado = dataAtual.format('YYYY-MM-DD');
            let motivoIgnorado = null;

            // ================================================================
            // ===== INÍCIO DO BLOCO DE VALIDAÇÕES QUE ESTAVA FALTANDO =====
            // ================================================================

            // 1. Validação de Feriado/Bloqueio
            const regraBloqueio = regras.find(r => r.tipo_regra === 'feriado' && r.ativo && moment(r.data_especifica).format('YYYY-MM-DD') === diaFormatado);
            if (regraBloqueio) {
                motivoIgnorado = `Dia bloqueado: ${regraBloqueio.descricao || 'Feriado'}`;
            }

            // 2. Validação de Horário de Funcionamento
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
                    }
                }
            }

            // 3. Validação de Capacidade Geral (simplificado para múltiplos serviços)
            if (!motivoIgnorado) {
                const regraDoDia = regras.find(r => r.tipo_regra === 'horario_trabalho' && r.dia_semana === diaDaSemana && r.ativo);
                if (regraDoDia) {
                    const capacidadeGeral = regraDoDia.capacidade_simultanea || 1;
                    const agendamentosGeralResult = await client.query(
                        `SELECT COUNT(cod_agendamento) FROM agendamentos WHERE cod_usuario_empresa = $1 AND status IN ('agendado', 'em_andamento', 'confirmado_cliente') AND (data_hora_inicio, data_hora_fim) OVERLAPS ($2::timestamptz, $3::timestamptz)`,
                        [cod_usuario_empresa, dataAtual.toISOString(), data_hora_fim_obj.toISOString()]
                    );
                    if (parseInt(agendamentosGeralResult.rows[0].count, 10) >= capacidadeGeral) {
                        motivoIgnorado = `Limite geral da agenda (${capacidadeGeral}) atingido`;
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
            
            // ==============================================================
            // ===== FIM DO BLOCO DE VALIDAÇÕES QUE ESTAVA FALTANDO =====
            // ==============================================================


            if (motivoIgnorado) {
                agendamentosIgnorados.push({ data: dataAtual.format('DD/MM/YYYY HH:mm'), motivo: motivoIgnorado });
            } else {
                // Se passou por todas as validações, cria o agendamento e seus registros
                const result = await client.query(
                    `INSERT INTO agendamentos (cliente_cod, veiculo_cod, usuario_responsavel_cod, data_hora_inicio, data_hora_fim, duracao_minutos, preco_total, status, tipo_agendamento, forma_pagamento, observacoes_agendamento, cod_usuario_empresa) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
                    [cliente_cod, veiculo_cod, usuario_responsavel_cod, dataAtual.toISOString(), data_hora_fim_obj.toISOString(), duracaoTotalMinutos, precoTotalGeral, status, tipo_agendamento, forma_pagamento, observacoes_agendamento, cod_usuario_empresa]
                );
                const novoAgendamento = result.rows[0];

                for (const servico of servicos) {
                    await client.query(
                        `INSERT INTO agendamento_servicos (cod_agendamento, cod_servico, preco_servico, duracao_servico) VALUES ($1, $2, $3, $4)`,
                        [novoAgendamento.cod_agendamento, servico.cod_servico, servico.preco, servico.duracao_minutos]
                    );
                }

                const osResult = await client.query(
                    `INSERT INTO ordens_servico (cod_cliente, cod_veiculo, data_abertura, data_conclusao_prevista, status_os, valor_total_servicos, observacoes, cod_funcionario_responsavel, cod_usuario_empresa, cod_agendamento) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING cod_ordem_servico`,
                    [novoAgendamento.cliente_cod, novoAgendamento.veiculo_cod, novoAgendamento.data_hora_inicio, novoAgendamento.data_hora_fim, 'Aguardando Início', precoTotalGeral, `OS do agendamento recorrente #${novoAgendamento.cod_agendamento}. ${observacoes_agendamento || ''}`, novoAgendamento.usuario_responsavel_cod, cod_usuario_empresa, novoAgendamento.cod_agendamento]
                );
                const novaOsId = osResult.rows[0].cod_ordem_servico;
                
                for (const servico of servicos) {
                    await client.query(
                        `INSERT INTO itens_ordem_servico (cod_ordem_servico, tipo_item, cod_servico, quantidade, valor_unitario, cod_usuario_empresa) VALUES ($1, 'Servico', $2, 1, $3, $4)`,
                        [novaOsId, servico.cod_servico, servico.preco, cod_usuario_empresa]
                    );
                }

                agendamentosCriados.push(novoAgendamento);
            }

            // Avança para a próxima data baseada na frequência
            dataAtual.add(intervalo, frequencia.replace('diaria', 'days').replace('semanal', 'weeks').replace('mensal', 'months'));
        }

        await client.query('COMMIT');
        res.status(201).json({ msg: `${agendamentosCriados.length} agendamentos recorrentes criados com sucesso.`, agendamentos: agendamentosCriados, agendamentosIgnorados });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar agendamento recorrente:', err.message, err.stack);
        res.status(500).json({ msg: 'Erro ao criar agendamentos recorrentes.', error: err.message });
    } finally {
        client.release();
    }
});

// =============================================================================
// ROTA PUT /:id (Atualizar Agendamento com MÚLTIPLOS SERVIÇOS)
// VERSÃO DEFINITIVAMENTE COMPLETA
// =============================================================================
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const {
        cliente_cod, veiculo_cod, usuario_responsavel_cod, data_hora_inicio,
        status, tipo_agendamento, forma_pagamento, observacoes_agendamento,
        servicos
    } = req.body;

    if (!servicos || !Array.isArray(servicos) || servicos.length === 0) {
        return res.status(400).json({ msg: 'É necessário selecionar pelo menos um serviço.' });
    }
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // ETAPA 1: Recalcular totais com base no novo array de serviços
        const duracaoTotalMinutos = servicos.reduce((total, s) => total + s.duracao_minutos, 0);
        const precoTotalGeral = servicos.reduce((total, s) => total + parseFloat(s.preco), 0);
        const data_hora_fim = moment.tz(data_hora_inicio, "America/Sao_Paulo").add(duracaoTotalMinutos, 'minutes').toISOString();

        // ETAPA EXTRA: Buscar o estado atual do agendamento ANTES de atualizar
        const currentAppointmentResult = await client.query('SELECT status FROM agendamentos WHERE cod_agendamento = $1 AND cod_usuario_empresa = $2', [id, cod_usuario_empresa]);
        if (currentAppointmentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Agendamento não encontrado para atualização.' });
        }
        const currentStatus = currentAppointmentResult.rows[0].status;

        // =========================================================================
        // ===== INÍCIO DO BLOCO DE VALIDAÇÃO DE CONFLITOS QUE ESTAVA FALTANDO =====
        // =========================================================================
        const { hasConflict, conflictingIds } = await checkAppointmentConflicts(
            client,
            cod_usuario_empresa,
            data_hora_inicio,
            data_hora_fim,
            usuario_responsavel_cod,
            veiculo_cod,
            id // IMPORTANTE: Passa o ID do agendamento atual para que ele seja ignorado na checagem
        );

        if (hasConflict) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                msg: `Conflito de agendamento detectado! O horário colide com o(s) agendamento(s) de ID(s): ${conflictingIds.join(', ')}.`,
                conflictIds: conflictingIds
            });
        }
        // =======================================================================
        // ===== FIM DO BLOCO DE VALIDAÇÃO DE CONFLITOS =====
        // =======================================================================

        // ETAPA 2: Atualizar o registro principal na tabela 'agendamentos'
        const updatedAppointmentResult = await client.query(
            `UPDATE agendamentos SET 
                cliente_cod = $1, veiculo_cod = $2, usuario_responsavel_cod = $3, data_hora_inicio = $4,
                data_hora_fim = $5, duracao_minutos = $6, preco_total = $7, status = $8, 
                tipo_agendamento = $9, forma_pagamento = $10, observacoes_agendamento = $11, 
                updated_at = CURRENT_TIMESTAMP
             WHERE cod_agendamento = $12 AND cod_usuario_empresa = $13 RETURNING *`,
            [
                cliente_cod, veiculo_cod, usuario_responsavel_cod, data_hora_inicio,
                data_hora_fim, duracaoTotalMinutos, precoTotalGeral, status,
                tipo_agendamento, forma_pagamento, observacoes_agendamento,
                id, cod_usuario_empresa
            ]
        );
        const updatedAppointment = updatedAppointmentResult.rows[0];

        // ETAPA 3: Sincronizar os serviços (Limpar os antigos e inserir os novos)
        await client.query('DELETE FROM agendamento_servicos WHERE cod_agendamento = $1', [id]);
        for (const servico of servicos) {
            await client.query(
                `INSERT INTO agendamento_servicos (cod_agendamento, cod_servico, preco_servico, duracao_servico) VALUES ($1, $2, $3, $4)`,
                [id, servico.cod_servico, servico.preco, servico.duracao_minutos]
            );
        }

        // ETAPA 4: Sincronizar a Ordem de Serviço e seus itens
        const osResult = await client.query('SELECT cod_ordem_servico FROM ordens_servico WHERE cod_agendamento = $1', [id]);
        if (osResult.rows.length > 0) {
            const osId = osResult.rows[0].cod_ordem_servico;
            await client.query('UPDATE ordens_servico SET valor_total_servicos = $1 WHERE cod_ordem_servico = $2', [precoTotalGeral, osId]);
            await client.query('DELETE FROM itens_ordem_servico WHERE cod_ordem_servico = $1 AND tipo_item = $2', [osId, 'Servico']);
            for (const servico of servicos) {
                await client.query(
                    `INSERT INTO itens_ordem_servico (cod_ordem_servico, tipo_item, cod_servico, quantidade, valor_unitario, cod_usuario_empresa) VALUES ($1, 'Servico', $2, 1, $3, $4)`,
                    [osId, servico.cod_servico, servico.preco, cod_usuario_empresa]
                );
            }
        }
        
        // ETAPA 5: Lógica de conclusão
        if (status === 'concluido' && currentStatus !== 'concluido') {
            const osResult = await client.query('SELECT cod_ordem_servico FROM ordens_servico WHERE cod_agendamento = $1', [id]);
            if (osResult.rows.length > 0) {
                const osId = osResult.rows[0].cod_ordem_servico;
                await client.query(`UPDATE ordens_servico SET status_os = 'Concluída', data_conclusao_efetiva = CURRENT_TIMESTAMP WHERE cod_ordem_servico = $1`, [osId]);
                await client.query(`UPDATE transacoes_financeiras SET status_pagamento = 'pago', data_pagamento = CURRENT_TIMESTAMP WHERE cod_agendamento = $1 AND status_pagamento = 'pendente'`, [id]);
            }
        }

        await client.query('COMMIT');
        res.json(updatedAppointment);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar agendamento:', err.message, err.stack);
        res.status(500).json({ msg: 'Erro ao atualizar agendamento.', error: err.message });
    } finally {
        client.release();
    }
});
// =============================================================================
// NOVA ROTA: Enviar solicitação de confirmação
// =============================================================================
router.post('/:id/enviar-confirmacao', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const { canal } = req.body; // 'email' ou 'whatsapp'

    if (!canal || !['email', 'whatsapp'].includes(canal)) {
        return res.status(400).json({ msg: 'Canal de comunicação inválido.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const agendamentoResult = await client.query(
            `SELECT a.*, c.nome_cliente, c.email, c.telefone FROM agendamentos a
             JOIN clientes c ON a.cliente_cod = c.cod_cliente
             WHERE a.cod_agendamento = $1 AND a.cod_usuario_empresa = $2`,
            [id, cod_usuario_empresa]
        );

        if (agendamentoResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Agendamento não encontrado.' });
        }

        const agendamento = agendamentoResult.rows[0];
        const token = crypto.randomBytes(32).toString('hex');
        const dataExpiracao = moment().add(3, 'days').toISOString(); // Token válido por 3 dias

        await client.query(
            `INSERT INTO confirmacoes_agendamento (cod_agendamento, cod_usuario_empresa, token, canal, data_expiracao)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, cod_usuario_empresa, token, canal, dataExpiracao]
        );

        const confirmationUrl = `${process.env.FRONTEND_URL}/confirmar-agendamento/${token}`;

        if (canal === 'email') {
            await sendConfirmationEmail(agendamento.email, agendamento.nome_cliente, agendamento, confirmationUrl);
        } else { // whatsapp
            await sendConfirmationWhatsApp(agendamento.telefone, agendamento.nome_cliente, agendamento, confirmationUrl);
        }

        await client.query('COMMIT');
        res.status(200).json({ msg: `Solicitação de confirmação enviada por ${canal} com sucesso!` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Erro ao enviar confirmação para agendamento ${id}:`, err);
        res.status(500).json({ msg: 'Erro no servidor ao enviar a confirmação.' });
    } finally {
        client.release();
    }
});

// =============================================================================
// NOVA ROTA: Receber a confirmação do cliente
// =============================================================================
router.get('/confirmar/:token', async (req, res) => {
    const { token } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const tokenResult = await client.query('SELECT * FROM confirmacoes_agendamento WHERE token = $1', [token]);

        if (tokenResult.rows.length === 0) {
            return res.status(404).send('<h1>Link de confirmação inválido ou não encontrado.</h1>');
        }

        const confirmacao = tokenResult.rows[0];

        if (confirmacao.confirmado_em) {
            return res.status(200).send('<h1>Este agendamento já foi confirmado. Obrigado!</h1>');
        }

        if (moment().isAfter(confirmacao.data_expiracao)) {
            return res.status(410).send('<h1>Este link de confirmação expirou.</h1><p>Por favor, entre em contato para reagendar.</p>');
        }

        await client.query("UPDATE agendamentos SET status = 'confirmado_cliente' WHERE cod_agendamento = $1", [confirmacao.cod_agendamento]);
        await client.query("UPDATE confirmacoes_agendamento SET confirmado_em = NOW(), ip_confirmacao = $1 WHERE cod_confirmacao = $2", [req.ip, confirmacao.cod_confirmacao]);

        await client.query('COMMIT');
        res.send('<h1>Agendamento confirmado com sucesso!</h1><p>Obrigado por confirmar sua presença.</p>');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao processar confirmação de agendamento:', err);
        res.status(500).send('<h1>Ocorreu um erro ao processar sua confirmação.</h1><p>Por favor, tente novamente mais tarde ou entre em contato conosco.</p>');
    } finally {
        client.release();
    }
});

module.exports = router;