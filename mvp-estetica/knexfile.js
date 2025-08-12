// knexfile.js
module.exports = {
  development: {
    client: 'pg', // Indica que estamos usando PostgreSQL
    connection: {
      host: 'localhost',     // Ou o host do seu banco
      user: 'postgres',   // Seu usuário do Postgres
      password: 'postgres', // Sua senha
      database: 'erpestetica' // O nome do seu banco de dados
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './banco/migrations' // Pasta onde as migrations ficarão
    }
  },
  // Você pode configurar outros ambientes aqui (staging, production)
};