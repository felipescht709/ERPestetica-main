// mvp-estetica/backend/banco.js
const { Pool } = require('pg');

// Configuração do Pool de Conexões do PostgreSQL usando variáveis de ambiente
// Isso garante que a aplicação possa se conectar a qualquer banco de dados
// seja localmente (via docker-compose) ou na nuvem (via Cloud SQL).
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Testar a conexão e logar o status
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('ERRO: Falha ao conectar ao banco de dados PostgreSQL.', err.stack);
  } else {
    console.log('Conexão com o PostgreSQL estabelecida com sucesso.');
  }
});

module.exports = pool;