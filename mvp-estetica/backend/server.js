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

// Rota de teste
app.get('/', (req, res) => {
    res.send('Backend da GerenciaCAR rodando!'); // Atualizado nome da plataforma
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ msg: 'Erro interno do servidor', error: err.message });
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
    console.log(`Acesse a API em http://localhost:${PORT}`);
});