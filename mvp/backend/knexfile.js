// knexfile.js

module.exports = {
  development: {
    client: "pg",
    connection: {
      host: "db", 
      user: "admin", 
      password: "admin", 
      database: "erpestetica", 
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
    seeds: {
      directory: "./seeds",
    },
  },
};
