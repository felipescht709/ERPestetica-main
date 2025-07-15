// frontend/src/pages/FinanceiroPage.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../utils/api'; // Sua função para chamadas de API autenticadas
import { AuthContext } from '../context/AuthContext';
// Importar o moment
import moment from 'moment';
// Importar ícones do Lucide React
import { DollarSign, BarChart, TrendingUp, TrendingDown, Clock, Calendar, CheckSquare, XCircle, FileText } from 'lucide-react';
import { Spinner, Alert, Table } from 'react-bootstrap'; // Manter Spinner e Alert do react-bootstrap


const FinanceiroPage = () => {
    const { userRole } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        margin: 0, // Nova métrica para margem de lucro
    });
    const [transactions, setTransactions] = useState([]);
    // Define o período inicial como o mês atual
    const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().endOf('month').format('YYYY-MM-DD'));

    const canViewFinance = ['admin', 'gerente'].includes(userRole);

    const fetchFinancialData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Requisição para o resumo financeiro
            // ATENÇÃO: Você precisará criar a rota /api/financeiro/resumo no seu backend!
            const summaryData = await api(`/financeiro/resumo?startDate=${startDate}&endDate=${endDate}`, { method: 'GET' });
            
            const totalRevenue = parseFloat(summaryData.total_revenue) || 0;
            const totalMaterialCost = parseFloat(summaryData.total_material_cost) || 0;
            const totalLaborCost = parseFloat(summaryData.total_labor_cost) || 0;
            const totalCost = totalMaterialCost + totalLaborCost;
            const grossProfit = totalRevenue - totalCost;
            const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;


            setSummary({
                totalRevenue,
                totalCost,
                grossProfit,
                margin,
            });

            // Requisição para as transações detalhadas (agendamentos concluídos)
            // A rota de agendamentos deve ser capaz de filtrar por status
            const transactionsData = await api(`/agendamentos/range?start=${startDate}T00:00:00.000Z&end=${endDate}T23:59:59.999Z&status=concluido`, { method: 'GET' });
            setTransactions(transactionsData);

        } catch (err) {
            console.error('Erro ao buscar dados financeiros:', err);
            setError(err.message || 'Erro ao carregar dados financeiros.');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]); // Re-executa quando as datas de início/fim mudam

    useEffect(() => {
        if (canViewFinance) {
            fetchFinancialData();
        } else {
            setLoading(false);
            setError('Você não tem permissão para acessar esta página.');
        }
    }, [fetchFinancialData, canViewFinance]); // Re-executa quando a função de fetch ou permissões mudam

    // Renderização condicional para estados de carregamento, erro ou acesso negado
    if (loading) {
        return (
            <div className="loading-screen">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando dados financeiros...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert error my-4">
                <h3>Erro ao Carregar Financeiro</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (!canViewFinance) {
        return (
            <div className="alert error my-4">
                <h3>Acesso Negado</h3>
                <p>Você não tem permissão para visualizar esta página.</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2><DollarSign size={28} style={{verticalAlign: 'middle', marginRight: '10px'}} /> Controle Financeiro</h2>
                {/* O botão de "Aplicar Filtro" agora fica dentro do bloco de filtros */}
            </div>

            {/* Filtros de Data */}
            <div className="section-content mb-4"> {/* Usando section-content para o card de filtros */}
                <h4 className="card-title mb-3">Filtrar por Período</h4>
                <div className="filter-controls">
                    <label>
                        De:
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="input-field"
                        />
                    </label>
                    <label>
                        Até:
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="input-field"
                        />
                    </label>
                    <button className="button-primary" onClick={fetchFinancialData}>
                        Aplicar Filtro
                    </button>
                </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="info-cards-grid mb-4">
                <div className="info-card">
                    <div className="flex-between-center mb-3">
                        <div className="info-card-icon bg-green-100">
                            <TrendingUp size={24} className="text-green-600" />
                        </div>
                        <span className="info-card-title">Receita Total</span>
                    </div>
                    <div className="info-card-value">R$ {summary.totalRevenue.toFixed(2).replace('.', ',')}</div>
                </div>
                <div className="info-card">
                    <div className="flex-between-center mb-3">
                        <div className="info-card-icon bg-red-status"> {/* Reutilizando cor de status para custo */}
                            <TrendingDown size={24} className="text-red-text" />
                        </div>
                        <span className="info-card-title">Custos Totais</span>
                    </div>
                    <div className="info-card-value">R$ {summary.totalCost.toFixed(2).replace('.', ',')}</div>
                </div>
                <div className="info-card">
                    <div className="flex-between-center mb-3">
                        <div className="info-card-icon bg-blue-100">
                            <BarChart size={24} className="text-blue-600" />
                        </div>
                        <span className="info-card-title">Lucro Líquido</span>
                    </div>
                    <div className="info-card-value">R$ {summary.grossProfit.toFixed(2).replace('.', ',')}</div>
                </div>
                <div className="info-card">
                    <div className="flex-between-center mb-3">
                        <div className="info-card-icon bg-purple-100">
                            <DollarSign size={24} className="text-purple-600" />
                        </div>
                        <span className="info-card-title">Margem de Lucro</span>
                    </div>
                    <div className="info-card-value">{summary.margin.toFixed(2).replace('.', ',')}%</div>
                </div>
            </div>

            {/* Detalhes das Transações */}
            <div className="section-content"> {/* Adicionado section-content para o estilo de card */}
                <h4 className="card-title mb-3">Transações Concluídas ({moment(startDate).format('DD/MM/YYYY')} - {moment(endDate).format('DD/MM/YYYY')})</h4>
                <div className="table-responsive">
                    <Table striped bordered hover className="clients-table"> {/* Reutilizando clients-table para estilização */}
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th>Cliente</th>
                                <th>Serviço</th>
                                <th>Preço Total</th>
                                <th>Forma Pagamento</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="empty-state-table">Nenhuma transação encontrada no período selecionado.</td>
                                </tr>
                            ) : (
                                transactions.map((transaction) => (
                                    <tr key={transaction.cod_agendamento}>
                                        <td>{moment(transaction.data_hora_fim).format('DD/MM/YYYY HH:mm')}</td><td>{transaction.cliente_nome}</td><td>{transaction.servico_nome}</td><td>R$ {parseFloat(transaction.preco_total).toFixed(2).replace('.', ',')}</td><td>{transaction.forma_pagamento || 'N/A'}</td>
                                        <td>
                                            <span className={`status-badge ${transaction.status === 'concluido' ? 'status-concluido' : 'status-inativo'}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default FinanceiroPage;
