// banco/migrations/YYYYMMDDHHMMSS_add_cor_hex_to_servicos.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('servicos', (table) => {
    // Adiciona a coluna para a cor, com um valor padrão amigável.
    table.string('cor_hex', 7).defaultTo('#3788D8').comment('Cor em hexadecimal para exibição do evento no calendário');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('servicos', (table) => {
    table.dropColumn('cor_hex');
  });
};