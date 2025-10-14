// backend/routes/ordens_servico.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Importa o pool de conexão com o banco
const { authenticateToken, authorizeRole } = require('../middleware/auth'); // Importa os middlewares

// GET all Ordens de Serviço (com filtros e detalhes básicos)
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { cod_usuario_empresa } = req.user;
        const { status_os, cod_cliente, cod_veiculo, data_inicio, data_fim } = req.query;

        let query = `
            SELECT
                os.cod_ordem_servico,
                os.data_abertura,
                os.data_conclusao_prevista,
                os.data_conclusao_real,
                os.status_os,
                os.valor_total_os,
                c.nome_cliente,
                v.placa AS veiculo_placa,
                v.modelo AS veiculo_modelo,
                u.nome_usuario AS funcionario_responsavel_nome
            FROM ordens_servico os
            JOIN clientes c ON os.cod_cliente = c.cod_cliente
            LEFT JOIN veiculos v ON os.cod_veiculo = v.cod_veiculo
            LEFT JOIN usuarios u ON os.cod_funcionario_responsavel = u.cod_usuario
            WHERE os.cod_usuario_empresa = $1
        `;
        const params = [cod_usuario_empresa];
        let paramIndex = 2;

        if (status_os) {
            query += ` AND os.status_os = $${paramIndex++}`;
            params.push(status_os);
        }
        if (cod_cliente) {
            query += ` AND os.cod_cliente = $${paramIndex++}`;
            params.push(cod_cliente);
        }
        if (cod_veiculo) {
            query += ` AND os.cod_veiculo = $${paramIndex++}`;
            params.push(cod_veiculo);
        }
        if (data_inicio) {
            query += ` AND os.data_abertura >= $${paramIndex++}::timestamp`;
            params.push(data_inicio);
        }
        if (data_fim) {
            query += ` AND os.data_abertura <= $${paramIndex++}::timestamp`;
            params.push(data_fim);
        }

        query += ` ORDER BY os.data_abertura DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar Ordens de Serviço:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET Ordem de Serviço by ID (com detalhes dos itens)
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user; // Iniciar transação para buscar dados da OS e seus itens
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

        const osQuery = `
            SELECT
                os.*,
                c.nome_cliente,
                v.placa AS veiculo_placa,
                v.modelo AS veiculo_modelo,
                u.nome_usuario AS funcionario_responsavel_nome
            FROM ordens_servico os
            JOIN clientes c ON os.cod_cliente = c.cod_cliente
            LEFT JOIN veiculos v ON os.cod_veiculo = v.cod_veiculo
            LEFT JOIN usuarios u ON os.cod_funcionario_responsavel = u.cod_usuario
            WHERE os.cod_ordem_servico = $1 AND os.cod_usuario_empresa = $2;
        `; // const osResult = await pool.query(osQuery, [id, cod_usuario_empresa]);
            const osResult = await client.query(osQuery, [id, cod_usuario_empresa]);

        if (osResult.rows.length === 0) {
                await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Ordem de Serviço não encontrada.' });
        }

        const os = osResult.rows[0];

        const itensQuery = `
            SELECT
                ios.cod_item_os,
                ios.tipo_item,
                ios.quantidade,
                ios.valor_unitario,
                ios.valor_total,
                ios.observacoes_item,
                s.nome_servico,
                s.descricao_servico,
                pe.nome_produto,
                pe.unidade_medida AS produto_unidade_medida
            FROM itens_ordem_servico ios
            LEFT JOIN servicos s ON ios.cod_servico = s.cod_servico
            LEFT JOIN produtos_estoque pe ON ios.cod_produto = pe.cod_produto
            WHERE ios.cod_ordem_servico = $1 AND ios.cod_usuario_empresa = $2;
        `; // const itensResult = await pool.query(itensQuery, [id, cod_usuario_empresa]);
            const itensResult = await client.query(itensQuery, [id, cod_usuario_empresa]);

            // NOVO: Buscar os itens do checklist
            const checklistQuery = `
            SELECT * FROM os_checklist_itens
            WHERE cod_ordem_servico = $1 AND cod_usuario_empresa = $2
            ORDER BY cod_item_checklist ASC;
        `;
            const checklistResult = await client.query(checklistQuery, [id, cod_usuario_empresa]);

            await client.query('COMMIT');

            res.json({ ...os, itens: itensResult.rows, checklist: checklistResult.rows });

        } catch (err) {
            await client.query('ROLLBACK');
        console.error('Erro ao buscar Ordem de Serviço por ID:', err.message);
        res.status(500).send('Server Error');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Erro ao buscar Ordem de Serviço por ID:', err.message);
        res.status(500).send('Server Error');
    }

});
    

// GET Ordem de Serviço by cod_agendamento
router.get('/por-agendamento/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;

        const osQuery = `
            SELECT cod_ordem_servico
            FROM ordens_servico
            WHERE cod_agendamento = $1 AND cod_usuario_empresa = $2;
        `;
        const osResult = await pool.query(osQuery, [id, cod_usuario_empresa]);

        if (osResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Nenhuma Ordem de Serviço encontrada para este agendamento.' });
        }

        res.json(osResult.rows[0]);

    } catch (err) {
        console.error('Erro ao buscar Ordem de Serviço por agendamento:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new Ordem de Serviço
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        cod_cliente, cod_veiculo, data_conclusao_prevista, status_os,
        observacoes, cod_funcionario_responsavel, itens // Array de itens { tipo_item, cod_servico/cod_produto, quantidade, valor_unitario, observacoes_item }
    } = req.body;
    const { cod_usuario_empresa } = req.user;

    try {
        await pool.query('BEGIN');

        if (!cod_cliente || !status_os || !Array.isArray(itens)) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ msg: 'Cliente, status e itens da OS são obrigatórios.' });
        }

        let valor_total_servicos = 0;
        let valor_total_produtos = 0;

        // Validar e calcular totais dos itens
        for (const item of itens) {
            if (item.tipo_item === 'Servico') {
                if (!item.cod_servico || item.quantidade <= 0 || item.valor_unitario < 0) {
                    await pool.query('ROLLBACK');
                    return res.status(400).json({ msg: 'Dados inválidos para item de serviço.' });
                }
                valor_total_servicos += item.quantidade * item.valor_unitario;
            } else if (item.tipo_item === 'Produto') {
                if (!item.cod_produto || item.quantidade <= 0 || item.valor_unitario < 0) {
                    await pool.query('ROLLBACK');
                    return res.status(400).json({ msg: 'Dados inválidos para item de produto.' });
                }
                valor_total_produtos += item.quantidade * item.valor_unitario;

                // Opcional: Atualizar quantidade em estoque (aqui ou via trigger/outro processo)
                // É mais robusto fazer isso em um sistema de inventário separado que reage à OS
            } else {
                await pool.query('ROLLBACK');
                return res.status(400).json({ msg: 'Tipo de item inválido.' });
            }
        }

        // 1. Inserir a Ordem de Serviço principal
        const osResult = await pool.query(
            `INSERT INTO ordens_servico (
                cod_cliente, cod_veiculo, data_conclusao_prevista, status_os,
                valor_total_servicos, valor_total_produtos, observacoes, cod_funcionario_responsavel, cod_usuario_empresa
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                cod_cliente, cod_veiculo, data_conclusao_prevista, status_os,
                valor_total_servicos, valor_total_produtos, observacoes, cod_funcionario_responsavel, cod_usuario_empresa
            ]
        );
        const novaOS = osResult.rows[0];

        // 2. Inserir os itens da Ordem de Serviço
        for (const item of itens) {
            await pool.query(
                `INSERT INTO itens_ordem_servico (
                    cod_ordem_servico, tipo_item, cod_servico, cod_produto, quantidade, valor_unitario, observacoes_item, cod_usuario_empresa
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    novaOS.cod_ordem_servico, item.tipo_item, item.cod_servico, item.cod_produto,
                    item.quantidade, item.valor_unitario, item.observacoes_item, cod_usuario_empresa
                ]
            );
        }

        await pool.query('COMMIT');
        res.status(201).json(novaOS);

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Erro ao criar Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) uma Ordem de Serviço
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const {
        cod_cliente, cod_veiculo, data_conclusao_prevista, data_conclusao_real, status_os,
        observacoes, cod_funcionario_responsavel, checklist // NOVO: Recebe o checklist
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // NOVO: Validação do Checklist antes de iniciar o serviço
        if (status_os === 'Em Andamento') {
            const checklistPendenteResult = await client.query(
                `SELECT COUNT(*) FROM os_checklist_itens WHERE cod_ordem_servico = $1 AND concluido = FALSE`,
                [id]
            );
            if (parseInt(checklistPendenteResult.rows[0].count, 10) > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: 'Todos os itens do checklist de verificação inicial devem ser concluídos antes de iniciar o serviço.' });
            }
        }

        // NOVO: Atualizar os itens do checklist se eles forem enviados
        if (Array.isArray(checklist)) {
            for (const item of checklist) {
                if (item.cod_item_checklist) {
                    await client.query(
                        `UPDATE os_checklist_itens SET concluido = $1, observacoes = $2
                         WHERE cod_item_checklist = $3 AND cod_ordem_servico = $4 AND cod_usuario_empresa = $5`,
                        [item.concluido, item.observacoes, item.cod_item_checklist, id, cod_usuario_empresa]
                    );
                }
            }
        }

        // Lógica original de atualização da OS
        // Primeiramente, obtenha os totais atuais dos itens para recalcular valor_total_os
        // OU, recalcule com base nos novos itens se eles forem enviados para substituição total.
        // Por simplicidade aqui, vamos apenas atualizar os campos principais da OS.
        // A manipulação dos itens da OS deve ser feita em rotas dedicadas para itens_ordem_servico.
        
        let query = 'UPDATE ordens_servico SET ';
        const params = [];
        let i = 1;

        if (cod_cliente !== undefined) { query += `cod_cliente = $${i++}, `; params.push(cod_cliente); }
        if (cod_veiculo !== undefined) { query += `cod_veiculo = $${i++}, `; params.push(cod_veiculo); }
        if (data_conclusao_prevista !== undefined) { query += `data_conclusao_prevista = $${i++}, `; params.push(data_conclusao_prevista); }
        if (data_conclusao_real !== undefined) { query += `data_conclusao_real = $${i++}, `; params.push(data_conclusao_real); }
        if (status_os !== undefined) { query += `status_os = $${i++}, `; params.push(status_os); }
        if (observacoes !== undefined) { query += `observacoes = $${i++}, `; params.push(observacoes); }
        if (cod_funcionario_responsavel !== undefined) { query += `cod_funcionario_responsavel = $${i++}, `; params.push(cod_funcionario_responsavel); }
        
        // Se houver itens na requisição PUT, o cliente pode querer atualizar os itens também.
        // A lógica de atualização de itens é complexa (identificar o que foi removido, adicionado, modificado).
        // Por simplicidade neste PUT da OS, assumimos que os itens são gerenciados por rotas separadas de itens_ordem_servico.
        // Se a lógica de itens for enviada, teríamos que processá-la aqui.
        // Por enquanto, atualizamos apenas os campos diretos da tabela `ordens_servico`.

        query += `updated_at = CURRENT_TIMESTAMP `;
        query = query.replace(/,\s*$/, ""); // Remove a vírgula extra no final
        
        if (params.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido para a OS principal.' });
        }

        query += ` WHERE cod_ordem_servico = $${i++} AND cod_usuario_empresa = $${i++} RETURNING *`;
        params.push(id, cod_usuario_empresa);

        const updatedOS = await client.query(query, params);
        
        if (updatedOS.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Ordem de Serviço não encontrada.' });
        }

        await client.query('COMMIT');
        res.json(updatedOS.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// DELETE (desativar) uma Ordem de Serviço
// Considerar soft delete (alterar status para 'Cancelada' ou 'Arquivada')
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const { cod_usuario_empresa } = req.user;

        const deletedOS = await pool.query(
            `UPDATE ordens_servico SET status_os = 'Cancelada', updated_at = CURRENT_TIMESTAMP
             WHERE cod_ordem_servico = $1 AND cod_usuario_empresa = $2 RETURNING *`,
            [id, cod_usuario_empresa]
        );
        if (deletedOS.rows.length === 0) {
            return res.status(404).json({ msg: 'Ordem de Serviço não encontrada.' });
        }
        res.json({ msg: 'Ordem de Serviço cancelada/desativada com sucesso.' });
    } catch (err) {
        console.error('Erro ao desativar Ordem de Serviço:', err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;