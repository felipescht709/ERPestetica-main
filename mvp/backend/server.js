// mvp-estetica/backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./banco'); // Importa a pool de conexão para o health check

const app = express();
const PORT = process.env.PORT || 3001;

// Importar rotas
const clientesRoutes = require('./routes/clientes');
const servicosRoutes = require('./routes/servicos');
const agendamentosRoutes = require('./routes/agendamentos');
const homeRoutes = require('./routes/home');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/usuarios');
const configuracoesAgendaRoutes = require('./routes/configuracoesAgenda');
const financeiroRoutes = require('./routes/financeiro');
const ordensServicoRoutes = require('./routes/ordens_servico');
const veiculosRoutes = require('./routes/veiculos');
const veiculosClientesRoutes = require('./routes/veiculos_clientes');
const produtosEstoqueRoutes = require('./routes/produtos_estoque');
const equipamentosRoutes = require('./routes/equipamentos');
const itensOrdensServicoRoutes = require('./routes/itens_ordem_servico');
const despesasRoutes = require('./routes/despesas');
const dashboardRoutes = require('./routes/dashboard');

// Middlewares
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());

// Rota para Health Check - Essencial para Cloud Run
app.get('/health', async (req, res) => {
    try {
        // Verifica a conexão com o banco de dados
        await pool.query('SELECT 1');
        res.status(200).send('OK');
    } catch (e) {
        res.status(503).send('Database connection failed');
    }
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/agenda/config', configuracoesAgendaRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/ordens_servico', ordensServicoRoutes);
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/veiculos_clientes', veiculosClientesRoutes);
app.use('/api/produtos_estoque', produtosEstoqueRoutes);
app.use('/api/equipamentos', equipamentosRoutes);
app.use('/api/itens_ordem_servico', itensOrdensServicoRoutes);
app.use('/api/despesas', despesasRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ msg: 'Erro interno do servidor', error: err.message });
});

// Iniciar o servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});