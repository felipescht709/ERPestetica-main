// knexfile.js
module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'erp_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'erpestetica',
      port: process.env.DB_PORT || 5432,
    },
    migrations: {
      directory: './migrations',
    },
  },
};
