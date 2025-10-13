const path = require('path');

// As variáveis de ambiente serão injetadas pelo Cloud Build (para migrações)
// e pelo serviço do Cloud Run (para a aplicação em execução).
const DB_HOST = process.env.DB_HOST; // Não defina um fallback aqui. É melhor falhar se não for definido.
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_DATABASE; // Ajustado para corresponder ao secret
const DB_PORT = process.env.DB_PORT || 5432;

module.exports = {
  // Configuração para uso local
  development: {
    client: 'pg',
    connection: {
      host: 'localhost',
      user: 'postgres',
      password: 'postgres',
      database: 'erpestetica',
      port: 5432,
    },
    migrations: {
      tableName: 'knex_migrations',
      // Usar path.join torna o caminho relativo ao arquivo, mais robusto.
      directory: path.join(__dirname, 'banco', 'migrations')
    }
  },

  // Configuração para o ambiente de produção (Cloud Build e Cloud Run)
  production: {
    client: 'pg',
    connection: {
      host: DB_HOST,       // No Cloud Build será '127.0.0.1'. No Cloud Run será '/cloudsql/...'
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
      // REMOVIDO: A conexão via Cloud SQL Proxy ou socket já é segura e criptografada.
      // Adicionar uma camada de SSL aqui pode causar erros de conexão.
      // ssl: { rejectUnauthorized: false }
    },
    migrations: {
      tableName: 'knex_migrations',
      // Garante que o Knex sempre encontrará a pasta, não importa de onde o comando seja executado.
      directory: path.join(__dirname, 'banco', 'migrations')
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};
