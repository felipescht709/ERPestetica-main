// frontend/src/pages/FinanceiroPage.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import moment from 'moment';
import { DollarSign, BarChart, TrendingUp, TrendingDown, Clock, Calendar, CheckSquare, XCircle, FileText, Plus, Edit, Trash2 } from 'lucide-react';
import { Spinner, Alert, Table } from 'react-bootstrap';
import DespesaForm from '../components/DespesasForm'; 

const FinanceiroPage = () => {
    const { userRole } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');

    // Estados para o Resumo Financeiro (Faturamento, Custo, Lucro)
    const [summary, setSummary] = useState({
        total_revenue: 0,
        total_cost: 0,
        profit: 0,
        total_material_cost: 0, // Adicionado para exibir se necessário
        total_labor_cost: 0,    // Adicionado para exibir se necessário
    });

    // Estados para o Fluxo de Caixa
    const [cashFlow, setCashFlow] = useState({
        totalReceitas: 0,
        totalDespesas: 0,
        saldo: 0,
    });
    const [despesas, setDespesas] = useState([]); // Lista de despesas

    // Estados para o controle de datas
    const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().endOf('month').format('YYYY-MM-DD'));

    // Estados para o modal de despesas
    const [showDespesaModal, setShowDespesaModal] = useState(false);
    const [isEditingDespesa, setIsEditingDespesa] = useState(false);
    const [currentDespesa, setCurrentDespesa] = useState(null);

    // Transações (agendamentos concluídos) - para a tabela de transações
    const [transactions, setTransactions] = useState([]);

    const canViewFinance = ['admin', 'gerente'].includes(userRole);

    // Função para buscar o Resumo Financeiro
    const fetchFinancialSummary = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const summaryData = await api(`/financeiro/resumo?startDate=${startDate}&endDate=${endDate}`, { method: 'GET' });
            setSummary(summaryData);

            // Fetch das transações detalhadas (agendamentos concluídos)
            const transactionsData = await api(`/agendamentos?status=concluido&start=${startDate}&end=${endDate}`, { method: 'GET' });
            setTransactions(transactionsData);

        } catch (err) {
            console.error('Erro ao buscar resumo financeiro:', err);
            setError(err.message || 'Erro ao carregar resumo financeiro.');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    // Função para buscar o Fluxo de Caixa
    const fetchCashFlow = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const cashFlowData = await api(`/financeiro/fluxo_caixa?startDate=${startDate}&endDate=${endDate}`, { method: 'GET' });
            setCashFlow(cashFlowData);
        } catch (err) {
            console.error('Erro ao buscar fluxo de caixa:', err);
            setError(err.message || 'Erro ao carregar fluxo de caixa.');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    // Função para buscar as despesas
    const fetchDespesas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const despesasData = await api(`/despesas?startDate=${startDate}&endDate=${endDate}&status_pagamento=Pago`, { method: 'GET' }); // Ou todas as despesas independente do status
            setDespesas(despesasData);
        } catch (err) {
            console.error('Erro ao buscar despesas:', err);
            setError(err.message || 'Erro ao carregar despesas.');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        if (canViewFinance) {
            fetchFinancialSummary();
            fetchCashFlow();
            fetchDespesas();
        }
    }, [canViewFinance, fetchFinancialSummary, fetchCashFlow, fetchDespesas]);

    // Funções CRUD para Despesas
    const handleAddDespesa = () => {
        setIsEditingDespesa(false);
        setCurrentDespesa(null);
        setMessage('');
        setError('');
        setShowDespesaModal(true);
    };

    const handleEditDespesa = (despesa) => {
        setIsEditingDespesa(true);
        setCurrentDespesa(despesa);
        setMessage('');
        setError('');
        setShowDespesaModal(true);
    };

    const handleSaveDespesa = async (despesaData) => {
        try {
            if (isEditingDespesa) {
                await api(`/despesas/${currentDespesa.cod_despesa}`, {
                    method: 'PUT',
                    body: JSON.stringify(despesaData),
                });
                setMessage('Despesa atualizada com sucesso!');
            } else {
                await api('/despesas', {
                    method: 'POST',
                    body: JSON.stringify(despesaData),
                });
                setMessage('Despesa adicionada com sucesso!');
            }
            setShowDespesaModal(false);
            fetchDespesas(); // Recarrega a lista de despesas
            fetchCashFlow(); // Atualiza o fluxo de caixa
        } catch (err) {
            console.error('Erro ao salvar despesa:', err);
            setError(err.message || 'Erro ao salvar despesa.');
        }
    };

    const handleDeleteDespesa = async (cod_despesa) => {
        if (window.confirm('Tem certeza que deseja desativar esta despesa? Ela não aparecerá mais nas listas ativas.')) {
            try {
                await api(`/despesas/${cod_despesa}`, { method: 'DELETE' });
                setMessage('Despesa desativada com sucesso!');
                fetchDespesas(); // Recarrega a lista
                fetchCashFlow(); // Atualiza o fluxo de caixa
            } catch (err) {
                console.error('Erro ao desativar despesa:', err);
                setError(err.message || 'Erro ao desativar despesa.');
            }
        }
    };


    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (!canViewFinance) {
        return <div className="alert error">Você não tem permissão para acessar esta página.</div>;
    }

    if (loading) {
        return (
            <div className="loading-screen">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </Spinner>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2>Gestão Financeira e Fluxo de Caixa</h2>
                <div className="date-filter-container">
                    <label htmlFor="startDate">De:</label>
                    <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="input-field"
                    />
                    <label htmlFor="endDate">Até:</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="input-field"
                    />
                </div>
            </div>

            {error && <div className="alert error">{error}</div>}
            {message && <div className="alert success">{message}</div>}

            {/* Seção de Resumo Financeiro */}
            <div className="info-cards-grid">
                <div className="info-card bg-blue-100 text-blue-600">
                    <div className="flex-between-center mb-3">
                        <DollarSign size={24} />
                        <span className="info-card-title">Receita Total</span>
                    </div>
                    <div className="info-card-value">{formatCurrency(summary.total_revenue)}</div>
                </div>
                <div className="info-card bg-red-100 text-red-600">
                    <div className="flex-between-center mb-3">
                        <TrendingDown size={24} />
                        <span className="info-card-title">Custo Total</span>
                    </div>
                    <div className="info-card-value">{formatCurrency(summary.total_cost)}</div>
                </div>
                <div className="info-card bg-green-100 text-green-600">
                    <div className="flex-between-center mb-3">
                        <TrendingUp size={24} />
                        <span className="info-card-title">Lucro Bruto</span>
                    </div>
                    <div className="info-card-value">{formatCurrency(summary.profit)}</div>
                </div>
            </div>

            {/* Seção de Fluxo de Caixa */}
            <div className="section-content">
                <h3>Fluxo de Caixa no Período</h3>
                <div className="info-cards-grid-small">
                    <div className="info-card bg-light-green text-dark-green">
                        <div className="flex-between-center mb-2">
                            <Plus size={20} />
                            <span className="info-card-title">Total Receitas</span>
                        </div>
                        <div className="info-card-value">{formatCurrency(cashFlow.totalReceitas)}</div>
                    </div>
                    <div className="info-card bg-light-red text-dark-red">
                        <div className="flex-between-center mb-2">
                            <XCircle size={20} />
                            <span className="info-card-title">Total Despesas</span>
                        </div>
                        <div className="info-card-value">{formatCurrency(cashFlow.totalDespesas)}</div>
                    </div>
                    <div className="info-card bg-light-blue text-dark-blue">
                        <div className="flex-between-center mb-2">
                            <BarChart size={20} />
                            <span className="info-card-title">Saldo Líquido</span>
                        </div>
                        <div className="info-card-value">{formatCurrency(cashFlow.saldo)}</div>
                    </div>
                </div>
            </div>

            {/* Seção de Despesas */}
            <div className="section-content mt-4">
                <div className="page-section-header">
                    <h3>Despesas Registradas</h3>
                    <button className="btn-primary-dark" onClick={handleAddDespesa}>
                        <Plus size={20} /> Nova Despesa
                    </button>
                </div>
                <div className="table-responsive">
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th>Valor</th>
                                <th>Vencimento</th>
                                <th>Pagamento</th>
                                <th>Status</th>
                                <th>Tipo</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {despesas.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="empty-state-table">Nenhuma despesa encontrada.</td>
                                </tr>
                            ) : (
                                despesas.map(d => (
                                    <tr key={d.cod_despesa}>
                                        <td>{d.descricao}</td>
                                        <td>{formatCurrency(d.valor)}</td>
                                        <td>{d.data_vencimento ? moment(d.data_vencimento).format('DD/MM/YYYY') : 'N/A'}</td>
                                        <td>{d.data_pagamento ? moment(d.data_pagamento).format('DD/MM/YYYY') : 'N/A'}</td>
                                        <td>{d.status_pagamento}</td>
                                        <td>{d.tipo_despesa || 'N/A'}</td>
                                        <td className="actions">
                                            <button onClick={() => handleEditDespesa(d)} className="btn-action" title="Editar"><Edit size={18} /></button>
                                            <button onClick={() => handleDeleteDespesa(d.cod_despesa)} className="btn-action btn-delete" title="Desativar"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Seção de Transações Detalhadas (Agendamentos Concluídos) */}
            <div className="section-content mt-4">
                <h3>Detalhes das Receitas (Agendamentos Concluídos)</h3>
                <div className="table-responsive">
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th>Cliente</th>
                                <th>Serviço</th>
                                <th>Valor</th>
                                <th>Forma Pgto.</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="empty-state-table">Nenhuma transação de agendamento concluída no período.</td>
                                </tr>
                            ) : (
                                transactions.map((transaction) => (
                                    <tr key={transaction.cod_agendamento}>
                                        <td>{moment(transaction.data_hora_fim).format('DD/MM/YYYY HH:mm')}</td>
                                        <td>{transaction.cliente_nome}</td>
                                        <td>{transaction.servico_nome}</td>
                                        <td>{formatCurrency(transaction.preco_total)}</td>
                                        <td>{transaction.forma_pagamento || 'N/A'}</td>
                                        <td>
                                            <span className={`status-badge ${transaction.status === 'concluido' ? 'status-concluido' : 'status-inativo'}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal para Adicionar/Editar Despesas */}
            {showDespesaModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <DespesaForm
                            despesa={currentDespesa}
                            onSave={handleSaveDespesa}
                            onClose={() => setShowDespesaModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceiroPage;