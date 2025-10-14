// ======================= Bloco de Depuração =======================
console.log("--- [LOG 1] Iniciando execução do server.js ---");
// =================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// ======================= Bloco de Depuração =======================
console.log("--- [LOG 2] Tentando carregar a conexão do banco de dados de ./db.js ---");
// =================================================================

const db = require('./db'); 

// ======================= Bloco de Depuração =======================
console.log("--- [LOG 3] Módulo de conexão do banco de dados carregado com sucesso. ---");
// =================================================================

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares (sem alteração)
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());

// Rota para Health Check - ATUALIZADA para usar Knex
app.get('/health', async (req, res) => {
    try {
        // Usa o método raw do Knex para executar uma consulta simples.
        await db.raw('SELECT 1');
        res.status(200).send('OK');
    } catch (e) {
        console.error('Falha no Health Check:', e);
        res.status(503).send('Database connection failed');
    }
});

// Importar rotas (sem alteração)
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

// Rotas da API (sem alteração)
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

// Middleware de tratamento de erros global (sem alteração)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ msg: 'Erro interno do servidor', error: err.message });
});

// Inicialização do servidor (sem alteração)
app.listen(PORT, () => {
    // ======================= Bloco de Depuração =======================
    console.log(`--- [LOG 4] Servidor rodando e escutando na porta ${PORT} ---`);
    // =================================================================
});