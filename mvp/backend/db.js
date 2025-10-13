// Importa a função do Knex
const knex = require('knex');

// Importa as configurações do seu knexfile
const knexConfig = require('./knexfile');

// Determina qual ambiente usar. Para o Cloud Run, é 'production'.
// Para desenvolvimento local, será 'development' (ou o que for padrão).
const environment = process.env.NODE_ENV || 'development';

// Pega a configuração correta para o ambiente atual
const config = knexConfig[environment];

// Cria e exporta a instância do Knex com a configuração correta.
// Esta é a única instância que sua aplicação inteira irá usar.
const db = knex(config);

module.exports = db;
