// banco/migrations/20250807124000_criar_estrutura_inicial_do_banco.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // A ordem de criação é importante por causa das chaves estrangeiras (foreign keys)
  return knex.schema
    // 1. Tabelas sem dependências externas
    .createTable('planos_assinatura', (table) => {
      table.increments('id_plano').primary();
      table.string('nome_plano', 100).notNullable().unique();
      table.text('descricao');
      table.decimal('valor_mensal', 10, 2).notNullable().checkPositive();
      table.string('periodo_cobranca', 50);
      table.text('recursos_incluidos');
      table.integer('limite_usuarios');
      table.boolean('ativo').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('usuarios', (table) => {
      table.increments('cod_usuario').primary();
      table.string('nome_usuario', 150).notNullable();
      table.string('nome_empresa', 150).notNullable();
      table.string('cnpj', 18).notNullable().unique();
      table.string('email', 100).notNullable().unique();
      table.string('senha_hash', 255).notNullable();
      table.string('telefone_contato', 20);
      table.string('logo_url', 255);
      table.string('codigo_ibge', 10);
      table.string('cep', 9);
      table.string('logradouro', 150);
      table.string('numero', 10);
      table.string('complemento', 100);
      table.string('bairro', 100);
      table.string('cidade', 100);
      table.string('uf', 2);
      table.boolean('ativo').defaultTo(true);
      table.string('role', 50).notNullable();
      table.integer('plano_assinatura_id').unsigned().references('id_plano').inTable('planos_assinatura').onDelete('SET NULL');
      table.integer('cod_usuario_empresa');
      table.timestamps(true, true);
    })
    // 2. Tabelas que dependem de 'usuarios'
    .then(() => knex.schema.createTable('clientes', (table) => {
      table.increments('cod_cliente').primary();
      table.string('cpf', 14).notNullable();
      table.string('nome_cliente', 150).notNullable();
      table.date('data_nascimento');
      table.string('email', 100);
      table.string('telefone', 20).notNullable();
      table.string('senha_hash', 255);
      table.string('genero', 15);
      table.text('observacoes_gerais');
      table.integer('indicado_por').unsigned().references('cod_cliente').inTable('clientes');
      table.string('codigo_ibge', 10);
      table.string('cep', 9);
      table.string('logradouro', 150);
      table.string('numero', 10);
      table.string('complemento', 100);
      table.string('bairro', 100);
      table.string('cidade', 100);
      table.string('uf', 2);
      table.boolean('ativo').defaultTo(true);
      table.date('ultimo_servico');
      table.decimal('total_gasto', 10, 2).defaultTo(0.00);
      table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
      table.timestamps(true, true);
      table.unique(['cpf', 'cod_usuario_empresa']);
      table.unique(['email', 'cod_usuario_empresa']);
    }))
    .then(() => knex.schema.createTable('veiculos', (table) => {
        table.increments('cod_veiculo').primary();
        table.string('marca', 50).notNullable();
        table.string('modelo', 50).notNullable();
        table.integer('ano');
        table.string('cor', 30);
        table.string('placa', 8).notNullable();
        table.string('chassi', 17);
        table.string('renavam', 11);
        table.integer('quilometragem_atual');
        table.text('observacoes');
        table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
        table.timestamps(true, true);
        table.unique(['placa', 'cod_usuario_empresa']);
        table.unique(['chassi', 'cod_usuario_empresa']);
        table.unique(['renavam', 'cod_usuario_empresa']);
    }))
    .then(() => knex.schema.createTable('servicos', (table) => {
        table.increments('cod_servico').primary();
        table.string('nome_servico', 100).notNullable();
        table.text('descricao_servico');
        table.integer('duracao_minutos').notNullable().checkPositive();
        table.decimal('preco', 10, 2).notNullable().checkPositive();
        table.string('categoria', 50).notNullable();
        table.boolean('ativo').defaultTo(true);
        table.decimal('custo_material', 10, 2).defaultTo(0.00).checkPositive();
        table.decimal('custo_mao_de_obra', 10, 2).defaultTo(0.00).checkPositive();
        table.integer('garantia_dias');
        table.text('observacoes_internas');
        table.string('imagem_url', 255);
        table.integer('ordem_exibicao');
        table.boolean('requer_aprovacao').defaultTo(false);
        table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
        table.timestamps(true, true);
    }))
    .then(() => knex.schema.createTable('produtos_estoque', (table) => {
        table.increments('cod_produto').primary();
        table.string('nome_produto', 150).notNullable();
        table.text('descricao');
        table.string('tipo_produto', 50).notNullable();
        table.integer('quantidade_estoque').notNullable().defaultTo(0).checkPositive();
        table.string('unidade_medida', 50);
        table.decimal('preco_custo', 10, 2).notNullable().checkPositive();
        table.decimal('preco_venda', 10, 2).checkPositive();
        table.string('categoria', 100);
        table.string('fornecedor', 150);
        table.string('localizacao_estoque', 100);
        table.integer('estoque_minimo').defaultTo(0).checkPositive();
        table.timestamp('data_ultima_entrada');
        table.timestamp('data_ultima_saida');
        table.boolean('ativo').defaultTo(true);
        table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
        table.timestamps(true, true);
    }))
    .then(() => knex.schema.createTable('configuracoes_agenda', (table) => {
        table.increments('cod_configuracao').primary();
        table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
        table.string('tipo_regra', 50).notNullable();
        table.integer('dia_semana');
        table.date('data_especifica');
        table.time('hora_inicio');
        table.time('hora_fim');
        table.integer('intervalo_minutos');
        table.text('descricao');
        table.boolean('ativo').defaultTo(true);
        table.integer('valor_numerico');
        table.integer('capacidade_simultanea');
        table.timestamps(true, true);
    }))
    // 3. Tabelas com múltiplas dependências
    .then(() => knex.schema.createTable('agendamentos', (table) => {
        table.increments('cod_agendamento').primary();
        table.integer('cliente_cod').unsigned().notNullable().references('cod_cliente').inTable('clientes');
        table.integer('servico_cod').unsigned().notNullable().references('cod_servico').inTable('servicos');
        table.integer('veiculo_cod').unsigned().references('cod_veiculo').inTable('veiculos');
        table.integer('usuario_responsavel_cod').unsigned().references('cod_usuario').inTable('usuarios');
        table.timestamp('data_hora_inicio').notNullable();
        table.timestamp('data_hora_fim');
        table.integer('duracao_minutos');
        table.decimal('preco_total', 10, 2).notNullable().checkPositive();
        table.string('status', 50).notNullable();
        table.string('tipo_agendamento', 50);
        table.string('forma_pagamento', 50);
        table.text('observacoes_agendamento');
        table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
        table.timestamps(true, true);
    }))
    .then(() => knex.schema.createTable('ordens_servico', (table) => {
        table.increments('cod_ordem_servico').primary();
        table.integer('cod_cliente').unsigned().notNullable().references('cod_cliente').inTable('clientes');
        table.integer('cod_veiculo').unsigned().references('cod_veiculo').inTable('veiculos');
        table.timestamp('data_abertura').notNullable().defaultTo(knex.fn.now());
        table.date('data_conclusao_prevista');
        table.timestamp('data_conclusao_real');
        table.string('status_os', 50).notNullable();
        table.decimal('valor_total_servicos', 10, 2).defaultTo(0.00).checkPositive();
        table.decimal('valor_total_produtos', 10, 2).defaultTo(0.00).checkPositive();
        table.text('observacoes');
        table.integer('cod_funcionario_responsavel').unsigned().references('cod_usuario').inTable('usuarios');
        table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
        table.timestamps(true, true);
    }))
    .then(() => knex.schema.raw(`
        ALTER TABLE ordens_servico
        ADD COLUMN valor_total_os numeric(10,2)
        GENERATED ALWAYS AS (valor_total_servicos + valor_total_produtos) STORED;
    `))
    // 4. Tabelas de ligação e com dependências mais complexas
    .then(() => knex.schema.createTable('avaliacoes', (table) => {
        table.increments('cod_avaliacao').primary();
        table.integer('agendamento_cod').unsigned().notNullable().references('cod_agendamento').inTable('agendamentos');
        table.integer('cliente_cod').unsigned().notNullable().references('cod_cliente').inTable('clientes');
        table.integer('nota').notNullable().checkBetween([1, 5]);
        table.text('comentario');
        table.timestamp('data_avaliacao').defaultTo(knex.fn.now());
        table.boolean('publicado').defaultTo(false);
        table.text('resposta_empresa');
        table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
        table.timestamps(true, true);
    }))
    .then(() => knex.schema.createTable('itens_ordem_servico', (table) => {
        table.increments('cod_item_os').primary();
        table.integer('cod_ordem_servico').unsigned().notNullable().references('cod_ordem_servico').inTable('ordens_servico').onDelete('CASCADE');
        table.string('tipo_item', 20).notNullable(); // 'Servico' ou 'Produto'
        table.integer('cod_servico').unsigned().references('cod_servico').inTable('servicos');
        table.integer('cod_produto').unsigned().references('cod_produto').inTable('produtos_estoque');
        table.decimal('quantidade', 10, 2).notNullable().checkPositive();
        table.decimal('valor_unitario', 10, 2).notNullable().checkPositive();
        table.text('observacoes_item');
        table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
        table.timestamps(true, true);
        table.check(`
            ((tipo_item = 'Servico' AND cod_servico IS NOT NULL AND cod_produto IS NULL) OR
             (tipo_item = 'Produto' AND cod_produto IS NOT NULL AND cod_servico IS NULL))
        `);
    }))
    .then(() => knex.schema.raw(`
        ALTER TABLE itens_ordem_servico
        ADD COLUMN valor_total numeric(10,2)
        GENERATED ALWAYS AS (quantidade * valor_unitario) STORED;
    `))
    .then(() => knex.schema.createTable('veiculos_clientes', (table) => {
        table.increments('cod_veiculo_cliente').primary();
        table.integer('cod_veiculo').unsigned().notNullable().references('cod_veiculo').inTable('veiculos').onDelete('CASCADE');
        table.integer('cod_cliente').unsigned().notNullable().references('cod_cliente').inTable('clientes').onDelete('CASCADE');
        table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
        table.date('data_inicio_posse').notNullable().defaultTo(knex.fn.now());
        table.date('data_fim_posse');
        table.text('observacoes');
        table.boolean('is_proprietario_atual').defaultTo(true);
        table.timestamps(true, true);
        table.unique(['cod_usuario_empresa', 'cod_veiculo', 'cod_cliente', 'data_inicio_posse']);
    }));
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // A ordem de remoção é a INVERSA da criação
  return knex.schema
    .dropTableIfExists('veiculos_clientes')
    .dropTableIfExists('itens_ordem_servico')
    .dropTableIfExists('avaliacoes')
    .dropTableIfExists('ordens_servico')
    .dropTableIfExists('agendamentos')
    .dropTableIfExists('configuracoes_agenda')
    .dropTableIfExists('produtos_estoque')
    .dropTableIfExists('servicos')
    .dropTableIfExists('veiculos')
    .dropTableIfExists('clientes')
    .dropTableIfExists('usuarios')
    .dropTableIfExists('planos_assinatura');
};