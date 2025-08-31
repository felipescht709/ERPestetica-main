/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('transacoes_financeiras', (table) => {
    table.increments('cod_transacao').primary();
    table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
    table.string('tipo_transacao', 50).notNullable(); // 'receita', 'despesa'
    table.decimal('valor', 10, 2).notNullable();
    table.timestamp('data_transacao').notNullable().defaultTo(knex.fn.now());
    table.text('descricao');
    table.string('categoria', 100);
    table.string('forma_pagamento', 50);
    table.string('status_pagamento', 50); // 'pago', 'pendente', 'atrasado', 'cancelado'
    table.integer('cod_cliente').unsigned().references('cod_cliente').inTable('clientes').onDelete('SET NULL');
    table.integer('cod_ordem_servico').unsigned().references('cod_ordem_servico').inTable('ordens_servico').onDelete('SET NULL');
    table.integer('cod_agendamento').unsigned().references('cod_agendamento').inTable('agendamentos').onDelete('SET NULL');
    table.timestamps(true, true);

    // Garante que um agendamento só possa ter uma transação financeira
    table.unique(['cod_agendamento']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('transacoes_financeiras');
};

