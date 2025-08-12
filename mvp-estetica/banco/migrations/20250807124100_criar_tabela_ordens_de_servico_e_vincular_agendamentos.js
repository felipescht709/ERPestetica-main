// banco/migrations/YYYYMMDDHHMMSS_add_capacidade_simultanea_to_configuracoes_agenda.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  /*
  // O método 'up' é o que faz a alteração.
  return knex.schema.alterTable('configuracoes_agenda', (table) => {
    // Adiciona a nova coluna.
     //O defaultTo(1) garante que regras antigas tenham pelo menos 1 de capacidade.
    table.integer('capacidade_simultanea').unsigned().defaultTo(1).comment('Define quantos agendamentos podem ocorrer ao mesmo tempo.');
  });
  */
  return Promise.resolve();
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // O método 'down' desfaz a alteração, caso precise reverter (rollback).
  //return knex.schema.alterTable('configuracoes_agenda', (table) => {
   // table.dropColumn('capacidade_simultanea');
 // });
 return Promise.resolve()
};