/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  /*
  return knex.schema.table('agendamentos', (table) => {
    // Adiciona a coluna para vincular um agendamento a uma OS.
    // onDelete('SET NULL') significa que se uma OS for deletada,
    // o agendamento não é deletado, apenas o vínculo é removido.
    table.integer('os_cod')
         .unsigned()
         .references('cod_ordem_servico')
         .inTable('ordens_servico')
         .onDelete('SET NULL');
  });
  */
  return Promise.resolve(); 
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Para reverter, removemos a coluna
  return knex.schema.table('agendamentos', (table) => {
    table.dropColumn('os_cod');
  });
};