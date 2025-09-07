// db.js
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',        
    host: 'localhost',       
    database: 'erpestetica', 
    password: 'postgres', 
    port: 5432,              
});

// Testar a conexão
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conexão com o PostgreSQL estabelecida em:', res.rows[0].now);
    }
});

module.exports = pool;