const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth'); 
const auth = require('../middleware/auth');

console.log('DEBUG: Tipo de auth após require em agendamentos.js:', typeof auth); 
// Helper para combinar data e hora (pode ser movido para um utils.js)
const combineDateTime = (dateStr, timeStr) => {
    return new Date(`${dateStr}T${timeStr}:00`);
};

// GET all appointments (multi-tenant)
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const query = `
            SELECT
                a.cod_agendamento,
                a.data_hora_inicio,
                a.data_hora_fim,
                a.preco_total,
                a.status,
                a.tipo_agendamento,
                a.forma_pagamento,
                a.observacoes_agendamento,
                c.nome_cliente AS cliente_nome,
                c.telefone AS cliente_telefone,
                s.nome_servico AS servico_nome,
                s.descricao_servico AS servico_descricao,
                v.marca AS veiculo_marca,
                v.modelo AS veiculo_modelo,
                v.cor AS veiculo_cor,
                v.placa AS veiculo_placa,
                u.nome_usuario AS usuario_responsavel_nome
            FROM agendamentos a
            JOIN clientes c ON a.cliente_cod = c.cod_cliente
            JOIN servicos s ON a.servico_cod = s.cod_servico
            LEFT JOIN veiculos v ON a.veiculo_cod = v.cod_veiculo
            LEFT JOIN usuarios u ON a.usuario_responsavel_cod = u.cod_usuario
            WHERE a.cod_usuario_empresa = $1
            ORDER BY a.data_hora_inicio, a.data_hora_fim;
        `;
        const result = await pool.query(query, [req.user.cod_usuario_empresa]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET appointments by date range (multi-tenant)
router.get('/range', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    const { start, end, status } = req.query;
    try {
        if (!start || !end) {
            return res.status(400).json({ msg: 'Datas de início e fim são obrigatórias para a busca por período.' });
        }

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
                c.nome_cliente AS cliente_nome,
                c.telefone AS cliente_telefone,
                s.nome_servico AS servico_nome,
                s.descricao_servico AS servico_descricao,
                v.marca AS veiculo_marca,
                v.modelo AS veiculo_modelo,
                v.cor AS veiculo_cor,
                v.placa AS veiculo_placa,
                u.nome_usuario AS usuario_responsavel_nome
            FROM agendamentos a
            JOIN clientes c ON a.cliente_cod = c.cod_cliente
            JOIN servicos s ON a.servico_cod = s.cod_servico
            LEFT JOIN veiculos v ON a.veiculo_cod = v.cod_veiculo
            LEFT JOIN usuarios u ON a.usuario_responsavel_cod = u.cod_usuario
            WHERE a.data_hora_inicio >= $1 AND a.data_hora_inicio <= $2
              AND a.cod_usuario_empresa = $3
        `;
        const params = [start, end, req.user.cod_usuario_empresa];

        if (status) {
            query += ` AND a.status = $4`;
            params.push(status);
        }

        query += ` ORDER BY a.data_hora_inicio`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new appointment (multi-tenant)
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        cliente_cod,
        servico_cod,
        veiculo_cod,
        usuario_responsavel_cod,
        data,
        hora,
        duracao_minutos,
        preco_total,
        status = 'Pendente',
        tipo_agendamento,
        forma_pagamento,
        observacoes_agendamento
    } = req.body;

    try {
        // 1. Validação multi-tenant: cliente, serviço e veículo pertencem ao tenant?
        const clienteCheck = await pool.query(
            'SELECT 1 FROM clientes WHERE cod_cliente = $1 AND cod_usuario_empresa = $2',
            [cliente_cod, req.user.cod_usuario_empresa]
        );
        if (clienteCheck.rows.length === 0) {
            return res.status(400).json({ msg: 'Cliente não pertence à empresa logada.' });
        }

        const servicoCheck = await pool.query(
            'SELECT 1 FROM servicos WHERE cod_servico = $1 AND cod_usuario_empresa = $2',
            [servico_cod, req.user.cod_usuario_empresa]
        );
        if (servicoCheck.rows.length === 0) {
            return res.status(400).json({ msg: 'Serviço não pertence à empresa logada.' });
        }

        if (veiculo_cod) {
            const proprietarioAtual = await pool.query(
                `SELECT 1 FROM veiculos_clientes
                WHERE cod_veiculo = $1 AND cod_cliente = $2 AND is_proprietario_atual = TRUE AND cod_usuario_empresa = $3`,
                [veiculo_cod, cliente_cod, req.user.cod_usuario_empresa]
            );
            if (proprietarioAtual.rows.length === 0) {
                return res.status(400).json({ msg: 'O cliente não é proprietário atual deste veículo.' });
            }
        }

        // FIX: Adicionada validação para o usuário responsável
        if (usuario_responsavel_cod) {
            const responsavelCheck = await pool.query(
                'SELECT 1 FROM usuarios WHERE cod_usuario = $1 AND cod_usuario_empresa = $2',
                [usuario_responsavel_cod, req.user.cod_usuario_empresa]
            );
            if (responsavelCheck.rows.length === 0) {
                return res.status(400).json({ msg: 'Usuário responsável não pertence à empresa logada.' });
            }
        }
        // 2. Obter dados do serviço para preencher duracao_minutos e preco_total se não fornecidos
        let finalDuracaoMinutos = duracao_minutos;
        let finalPrecoTotal = preco_total;

        if (finalDuracaoMinutos === undefined || finalPrecoTotal === undefined) {
            const serviceData = await pool.query('SELECT duracao_minutos, preco FROM servicos WHERE cod_servico = $1', [servico_cod]);
            if (serviceData.rows.length === 0) {
                return res.status(400).json({ msg: 'Serviço não encontrado.' });
            }
            if (finalDuracaoMinutos === undefined) finalDuracaoMinutos = serviceData.rows[0].duracao_minutos;
            if (finalPrecoTotal === undefined) finalPrecoTotal = serviceData.rows[0].preco;
        }

        if (isNaN(finalDuracaoMinutos) || finalDuracaoMinutos <= 0) {
            return res.status(400).json({ msg: 'Duração do agendamento deve ser um número positivo.' });
        }
        if (isNaN(finalPrecoTotal) || finalPrecoTotal < 0) {
            return res.status(400).json({ msg: 'Preço total do agendamento deve ser um número não negativo.' });
        }

        // 3. Calcular data_hora_inicio e data_hora_fim
        const dataHoraInicio = combineDateTime(data, hora);
        const dataHoraFim = new Date(dataHoraInicio.getTime() + finalDuracaoMinutos * 60 * 1000);

        // 4. Verificar conflitos de horário (multi-tenant)
        const conflictCheck = await pool.query(
            `SELECT cod_agendamento FROM agendamentos
             WHERE cod_usuario_empresa = $1
               AND (
                    (data_hora_inicio < $2 AND data_hora_fim > $3)
                 OR (data_hora_inicio >= $2 AND data_hora_inicio < $3)
                 OR (data_hora_fim > $2 AND data_hora_fim <= $3)
               )`,
            [req.user.cod_usuario_empresa, dataHoraFim, dataHoraInicio]
        );

        if (conflictCheck.rows.length > 0) {
            return res.status(409).json({ msg: 'Conflito de horário. Já existe um agendamento neste período.' });
        }

        // 5. Inserir novo agendamento
        const newAppointment = await pool.query(
            `INSERT INTO agendamentos (
                cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
                data_hora_inicio, data_hora_fim, preco_total, status, tipo_agendamento, forma_pagamento, observacoes_agendamento, cod_usuario_empresa
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [
                cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
                dataHoraInicio, dataHoraFim, finalPrecoTotal, status, tipo_agendamento, forma_pagamento, observacoes_agendamento,
                req.user.cod_usuario_empresa
            ]
        );

        res.status(201).json(newAppointment.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) an appointment (multi-tenant)
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { cod_usuario_empresa } = req.user;
    const { id } = req.params;
    const {
        cliente_cod,
        servico_cod,
        veiculo_cod,
        usuario_responsavel_cod,
        data,
        hora,
        duracao_minutos,
        preco_total,
        status,
        tipo_agendamento,
        forma_pagamento,
        observacoes_agendamento
    } = req.body;

    try {
        // 1. Iniciar transação para garantir a integridade dos dados
        await pool.query('BEGIN');

        // 2. Buscar o agendamento existente para garantir que pertence à empresa
        const existingAppointmentResult = await pool.query(
            'SELECT * FROM agendamentos WHERE cod_agendamento = $1 AND cod_usuario_empresa = $2',
            [id, cod_usuario_empresa]
        );
        if (existingAppointmentResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ msg: 'Agendamento não encontrado ou não pertence à sua empresa.' });
        }
        const existingAppointment = existingAppointmentResult.rows[0];

        // 3. Validar todas as entidades (cliente, serviço, etc.) se forem alteradas
        if (cliente_cod && cliente_cod !== existingAppointment.cliente_cod) {
            const result = await pool.query('SELECT 1 FROM clientes WHERE cod_cliente = $1 AND cod_usuario_empresa = $2', [cliente_cod, cod_usuario_empresa]);
            if (result.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(400).json({ msg: 'Cliente inválido ou não pertence à sua empresa.' });
            }
        }
        if (servico_cod && servico_cod !== existingAppointment.servico_cod) {
            const result = await pool.query('SELECT 1 FROM servicos WHERE cod_servico = $1 AND cod_usuario_empresa = $2', [servico_cod, cod_usuario_empresa]);
            if (result.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(400).json({ msg: 'Serviço inválido ou não pertence à sua empresa.' });
            }
        }
        if (usuario_responsavel_cod && usuario_responsavel_cod !== existingAppointment.usuario_responsavel_cod) {
            const result = await pool.query('SELECT 1 FROM usuarios WHERE cod_usuario = $1 AND cod_usuario_empresa = $2', [usuario_responsavel_cod, cod_usuario_empresa]);
            if (result.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(400).json({ msg: 'Usuário responsável inválido ou não pertence à sua empresa.' });
            }
        }
        // Adicionar validação para veiculo_cod se necessário

        // 4. Preparar os dados para atualização
        const finalServicoCod = servico_cod || existingAppointment.servico_cod;
        const serviceData = await pool.query('SELECT duracao_minutos, preco FROM servicos WHERE cod_servico = $1', [finalServicoCod]);
        
        const finalDuracao = duracao_minutos !== undefined ? duracao_minutos : serviceData.rows[0].duracao_minutos;
        const finalPreco = preco_total !== undefined ? preco_total : serviceData.rows[0].preco;

        const finalData = data || new Date(existingAppointment.data_hora_inicio).toISOString().split('T')[0];
        const finalHora = hora || new Date(existingAppointment.data_hora_inicio).toTimeString().slice(0, 5);

        const dataHoraInicio = combineDateTime(finalData, finalHora);
        const dataHoraFim = new Date(dataHoraInicio.getTime() + finalDuracao * 60 * 1000);

        // 5. Verificar conflito de horário (excluindo o próprio agendamento)
        const conflictCheck = await pool.query(
            `SELECT cod_agendamento FROM agendamentos
             WHERE cod_agendamento != $1
               AND cod_usuario_empresa = $2
               AND (data_hora_inicio, data_hora_fim) OVERLAPS ($3, $4)`,
            [id, cod_usuario_empresa, dataHoraInicio, dataHoraFim]
        );

        if (conflictCheck.rows.length > 0) {
            await pool.query('ROLLBACK');
            return res.status(409).json({ msg: 'Conflito de horário. Já existe um agendamento neste período.' });
        }

        // 6. Construir a query de atualização dinamicamente de forma segura
        const fields = {
            cliente_cod: cliente_cod !== undefined ? cliente_cod : existingAppointment.cliente_cod,
            servico_cod: servico_cod !== undefined ? servico_cod : existingAppointment.servico_cod,
            veiculo_cod: veiculo_cod !== undefined ? veiculo_cod : existingAppointment.veiculo_cod,
            usuario_responsavel_cod: usuario_responsavel_cod !== undefined ? usuario_responsavel_cod : existingAppointment.usuario_responsavel_cod,
            data_hora_inicio: dataHoraInicio,
            data_hora_fim: dataHoraFim,
            preco_total: finalPreco,
            status: status !== undefined ? status : existingAppointment.status,
            tipo_agendamento: tipo_agendamento !== undefined ? tipo_agendamento : existingAppointment.tipo_agendamento,
            forma_pagamento: forma_pagamento !== undefined ? forma_pagamento : existingAppointment.forma_pagamento,
            observacoes_agendamento: observacoes_agendamento !== undefined ? observacoes_agendamento : existingAppointment.observacoes_agendamento,
        };

        const query = `
            UPDATE agendamentos SET
                cliente_cod = $1, servico_cod = $2, veiculo_cod = $3, usuario_responsavel_cod = $4,
                data_hora_inicio = $5, data_hora_fim = $6, preco_total = $7, status = $8,
                tipo_agendamento = $9, forma_pagamento = $10, observacoes_agendamento = $11,
                updated_at = CURRENT_TIMESTAMP
            WHERE cod_agendamento = $12 AND cod_usuario_empresa = $13
            RETURNING *
        `;
        const params = [...Object.values(fields), id, cod_usuario_empresa];

        const updatedAppointment = await pool.query(query, params);

        // 7. Commit da transação
        await pool.query('COMMIT');

        res.json(updatedAppointment.rows[0]);

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE an appointment (multi-tenant)
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const deletedAppointment = await pool.query(
            `UPDATE agendamentos SET status = 'Cancelado', updated_at = CURRENT_TIMESTAMP 
             WHERE cod_agendamento = $1 AND cod_usuario_empresa = $2 RETURNING *`,
            [id, req.user.cod_usuario_empresa]
        );
        if (deletedAppointment.rows.length === 0) {
            return res.status(404).json({ msg: 'Agendamento não encontrado' });
        }
        res.json({ msg: 'Agendamento cancelado com sucesso (não deletado fisicamente)' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;