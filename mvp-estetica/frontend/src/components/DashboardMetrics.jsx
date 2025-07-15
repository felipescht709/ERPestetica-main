// src/components/DashboardMetrics.jsx
import React from 'react';
import '../styles/relatorios.css'; // Usaremos o mesmo CSS para consistência

const DashboardMetrics = ({ metrics }) => {
    if (!metrics) {
        return <p>Carregando métricas do dashboard...</p>;
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    return (
        <div className="dashboard-metrics-container">
            <h2>Visão Geral do Negócio</h2>
            <div className="metrics-grid">
                <div className="metric-card">
                    <h3>Total de Clientes Ativos</h3>
                    <p className="metric-value">{metrics.totalClientes !== undefined ? metrics.totalClientes : 'N/A'}</p>
                </div>
                <div className="metric-card">
                    <h3>Agendamentos Para Hoje</h3>
                    <p className="metric-value">{metrics.agendamentosHoje !== undefined ? metrics.agendamentosHoje : 'N/A'}</p>
                </div>
                <div className="metric-card">
                    <h3>Serviços Concluídos no Mês</h3>
                    <p className="metric-value">{metrics.servicosConcluidosMes !== undefined ? metrics.servicosConcluidosMes : 'N/A'}</p>
                </div>
                <div className="metric-card">
                    <h3>Faturamento Mensal</h3>
                    <p className="metric-value">{metrics.faturamentoMensal !== undefined ? formatCurrency(metrics.faturamentoMensal) : 'N/A'}</p>
                </div>
                <div className="metric-card">
                    <h3>Média de Avaliações</h3>
                    <p className="metric-value">{metrics.mediaAvaliacoes !== undefined ? metrics.mediaAvaliacoes : 'N/A'} <span className="star-icon">⭐</span></p>
                </div>
                <div className="metric-card">
                    <h3>Total de Avaliações</h3>
                    <p className="metric-value">{metrics.totalAvaliacoes !== undefined ? metrics.totalAvaliacoes : 'N/A'}</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardMetrics;