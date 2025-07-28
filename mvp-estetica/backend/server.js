// backend/server.js
require('dotenv').config(); // Carrega variáveis de ambiente do .env
const express = require('express');
const cors = require('cors');
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

// Middlewares
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Permita a origem do seu frontend React
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json()); // Permite que o Express.js entenda JSON no corpo das requisições

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
app.use('/api/ordens_servico', ordensServicoRoutes); 
app.use('/api/itens_ordem_servico', itensOrdensServicoRoutes); 
app.use('/api/despesas', despesasRoutes);

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ msg: 'Erro interno do servidor', error: err.message });
});

// Iniciar o servidor
app.listen(PORT, () => {
});
