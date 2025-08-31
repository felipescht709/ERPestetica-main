/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // Esta migração adiciona a coluna 'cod_agendamento' na tabela 'ordens_servico'
  // para criar o vínculo entre um agendamento e a OS gerada a partir dele.
  return knex.schema.table('ordens_servico', (table) => {
    // Adiciona a coluna para vincular uma OS a um agendamento.
    // onDelete('SET NULL') significa que se um agendamento for deletado,
    // a OS não é deletada, apenas o vínculo é removido.
    table.integer('cod_agendamento')
         .unsigned()
         .references('cod_agendamento')
         .inTable('agendamentos')
         .onDelete('SET NULL');
    
    // Garante que um agendamento só possa ter uma OS (relação 1-para-1)
    table.unique('cod_agendamento');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Para reverter, removemos a coluna e a constraint unique associada.
  return knex.schema.table('ordens_servico', (table) => {
    table.dropColumn('cod_agendamento');
  });
};