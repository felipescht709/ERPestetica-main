// banco/migrations/YYYYMMDDHHMMSS_create_table_agendamentos_recorrencia.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('agendamentos_recorrencia', (table) => {
    table.increments('cod_recorrencia').primary();
    // O agendamento que originou a recorrência (o "pai" de todos).
    table.integer('cod_agendamento_pai').unsigned().references('cod_agendamento').inTable('agendamentos').onDelete('SET NULL');
    table.integer('cod_usuario_empresa').unsigned().notNullable().references('cod_usuario').inTable('usuarios').onDelete('CASCADE');
    table.string('frequencia', 20).notNullable(); // 'diaria', 'semanal', 'mensal'
    table.integer('intervalo').notNullable().defaultTo(1); // A cada X...
    table.date('data_inicio').notNullable();
    table.date('data_fim').notNullable(); // A recorrência acaba aqui.
    table.jsonb('dias_semana'); // Ex: [1, 3, 5] para Seg, Qua, Sex.
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('agendamentos_recorrencia');
};