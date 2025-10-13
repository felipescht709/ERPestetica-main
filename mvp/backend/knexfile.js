const path = require('path');

// Carrega as variáveis de ambiente do arquivo .env para o ambiente de desenvolvimento
// Em produção (Cloud Build/Run), as variáveis serão injetadas diretamente.
require('dotenv').config();

// ==============================================================================
// Objeto de Conexão Dinâmico para Produção
// ==============================================================================

// Inicia a configuração base da conexão.
const prodConnection = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE, // Corresponde ao nome do secret
};

// Verifica qual método de conexão usar baseado nas variáveis de ambiente
// que definimos no cloudbuild.yaml
if (process.env.DB_SOCKET_PATH) {
  // Cenário 1: Aplicação rodando no Cloud Run (Conexão via Unix Socket)
  // O gcloud monta o socket no caminho especificado em DB_SOCKET_PATH.
  prodConnection.host = `${process.env.DB_SOCKET_PATH}/${process.env.DB_CONNECTION_NAME}`;
} else {
  // Cenário 2: Migração rodando no Cloud Build (Conexão via TCP com o Proxy)
  // O cloudbuild.yaml define DB_HOST como '127.0.0.1'.
  prodConnection.host = process.env.DB_HOST;
  prodConnection.port = process.env.DB_PORT || 5432;
}


// ==============================================================================
// Exportação das Configurações do Knex
// ==============================================================================

module.exports = {
  // Configuração para uso local
  development: {
    client: 'pg',
    connection: {
      host: process.env.DEV_DB_HOST || 'localhost',
      user: process.env.DEV_DB_USER || 'postgres',
      password: process.env.DEV_DB_PASSWORD || 'postgres',
      database: process.env.DEV_DB_DATABASE || 'erpestetica',
      port: parseInt(process.env.DEV_DB_PORT, 10) || 5432,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'banco', 'migrations')
    }
  },

  // Configuração para o ambiente de produção (Cloud Build e Cloud Run)
  production: {
    client: 'pg',
    connection: prodConnection, // <-- A MÁGICA ACONTECE AQUI
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'banco', 'migrations')
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};
