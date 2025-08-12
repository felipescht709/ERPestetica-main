// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { Spinner } from 'react-bootstrap';
import { Calendar, DollarSign, Users, TrendingUp, BarChart, CheckCircle } from 'lucide-react';
import ProximosAgendamentos from '../components/ProximosAgendamentos'; // <-- 1. Importar o novo componente

const HomePage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, userRole } = useContext(AuthContext);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);
                setError(null);

                const statsData = await api('/home', { method: 'GET' });
                setStats(statsData);

            } catch (err) {
                console.error('Erro ao carregar dados do dashboard:', err);
                setError(err.message || 'Erro ao carregar dados do dashboard.');
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);


    if (loading) {
        return (
            <div className="loading-screen">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert error my-4">
                <h3>Erro ao Carregar Dashboard</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="info-cards-grid">
                <div className="info-card">
                    <div className="flex-between-center mb-3">
                        <div className="info-card-icon bg-blue-100">
                            <Calendar size={24} className="text-blue-600" />
                        </div>
                        <span className="info-card-title">Agendamentos Hoje</span>
                    </div>
                    <div className="info-card-value">{stats?.agendamentosHoje || 0}</div>
                </div>

                <div className="info-card">
                    <div className="flex-between-center mb-3">
                        <div className="info-card-icon bg-green-100">
                            <DollarSign size={24} className="text-green-600" />
                        </div>
                        <span className="info-card-title">Faturamento Mês</span>
                    </div>
                    <div className="info-card-value">R$ {parseFloat(stats?.faturamentoMensal || 0).toFixed(2).replace('.', ',')}</div>
                </div>

                <div className="info-card">
                    <div className="flex-between-center mb-3">
                        <div className="info-card-icon bg-purple-100">
                            <Users size={24} className="text-purple-600" />
                        </div>
                        <span className="info-card-title">Clientes Cadastrados</span>
                    </div>
                    <div className="info-card-value">{stats?.totalClientes || 0}</div>
                </div>

                <div className="info-card">
                    <div className="flex-between-center mb-3">
                        <div className="info-card-icon bg-yellow-100">
                            <CheckCircle size={24} className="text-yellow-600" />
                        </div>
                        <span className="info-card-title">Serviços Concluídos (Mês)</span>
                    </div>
                    <div className="info-card-value">{stats?.servicosConcluidosMes || 0}</div>
                </div>

                <div className="info-card">
                    <div className="flex-between-center mb-3">
                        <div className="info-card-icon bg-red-status">
                            <BarChart size={24} className="text-red-text" />
                        </div>
                        <span className="info-card-title">Média de Avaliações</span>
                    </div>
                    <div className="info-card-value">
                        {typeof stats?.mediaAvaliacoes === 'number'
                            ? stats.mediaAvaliacoes.toFixed(1)
                            : 'N/A'}{' '}
                        <span style={{ fontSize: '0.8em', color: '#ffc107' }}>⭐</span>
                    </div>
                </div>

                <div className="info-card">
                    <div className="flex-between-center mb-3">
                        <div className="info-card-icon bg-green-status">
                            <TrendingUp size={24} className="text-green-text" />
                        </div>
                        <span className="info-card-title">Total de Avaliações</span>
                    </div>
                    <div className="info-card-value">{stats?.totalAvaliacoes || 0}</div>
                </div>
            </div>

            {/* <-- 2. Substituir toda a lógica antiga pelo novo componente --> */}
            <div className="row mt-4">
                <div className="col-lg-6 col-md-12">
                    <ProximosAgendamentos />
                </div>
                {/* Você pode adicionar outros componentes do dashboard aqui */}
            </div>
        </div>
    );
};

export default HomePage;