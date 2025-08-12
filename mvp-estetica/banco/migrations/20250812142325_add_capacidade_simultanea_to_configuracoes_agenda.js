// .../migrations/..._add_capacidade_simultanea_to_configuracoes_agenda.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // Adicione "return" aqui
  return knex.schema.alterTable('configuracoes_agenda', (table) => {
    table.integer('capacidade_simultanea').unsigned().defaultTo(1).comment('Define quantos agendamentos podem ocorrer ao mesmo tempo.');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Adicione "return" aqui também
  return knex.schema.alterTable('configuracoes_agenda', (table) => {
    table.dropColumn('capacidade_simultanea');
  });
};