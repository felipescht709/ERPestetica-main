const path = require('path');
require('dotenv').config();

// Objeto de conexão para produção, que será preenchido dinamicamente.
const prodConnection = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Lógica de Conexão Dinâmica para o ambiente de produção
if (process.env.DB_SOCKET_PATH) {
  // Cenário 1: Estamos no Cloud Run (conexão via Unix Socket)
  // O host é o caminho para a pasta do socket. A porta NÃO deve ser definida.
  prodConnection.host = `${process.env.DB_SOCKET_PATH}/${process.env.DB_CONNECTION_NAME}`;
} else {
  // Cenário 2: Estamos no Cloud Build ou localmente (conexão via TCP/IP)
  // O host é um endereço de IP ou hostname, e a porta é necessária.
  prodConnection.host = process.env.DB_HOST; // Ex: '127.0.0.1'
  prodConnection.port = process.env.DB_PORT || 5432;
}


module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DEV_DB_HOST || '127.0.0.1',
      user: process.env.DEV_DB_USER || 'postgres',
      password: process.env.DEV_DB_PASSWORD || 'postgres',
      database: process.env.DEV_DB_DATABASE || 'erpestetica',
      port: process.env.DEV_DB_PORT || 5432,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'banco', 'migrations')
    }
  },

  production: {
    client: 'pg',
    // Usa o objeto de conexão que foi montado dinamicamente acima
    connection: prodConnection,
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

