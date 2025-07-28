// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { Spinner, Alert, ListGroup } from 'react-bootstrap';
import { Calendar, DollarSign, Users, TrendingUp, BarChart, Clock, CheckCircle } from 'lucide-react';
import moment from 'moment';

const HomePage = () => {
    const [stats, setStats] = useState(null);
    const [recentAppointments, setRecentAppointments] = useState([]);
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

                const today = moment();
                const startOfDay = today.startOf('day').toISOString();
                const endOfDay = today.endOf('day').toISOString();

                // CORREÇÃO AQUI: Removido o '/range' da URL
                const appointmentsData = await api(`/agendamentos?start=${startOfDay}&end=${endOfDay}`, { method: 'GET' });
                setRecentAppointments(appointmentsData);

            } catch (err) {
                console.error('Erro ao carregar dados do dashboard:', err);
                setError(err.message || 'Erro ao carregar dados do dashboard.');
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    const getStatusColorClass = (status) => {
        switch (status) {
            case 'agendado': return 'status-confirmado';
            case 'em_andamento': return 'status-em-andamento';
            case 'concluido': return 'status-concluido';
            case 'cancelado': return 'status-cancelado';
            case 'pendente': return 'status-pendente';
            default: return 'status-inativo';
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            'agendado': 'Agendado',
            'em_andamento': 'Em Andamento',
            'concluido': 'Concluído',
            'cancelado': 'Cancelado',
            'pendente': 'Pendente',
        };
        return statusMap[status] || status;
    };


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

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Próximos Agendamentos (Hoje)</h3>
                </div>
                <div className="card-content">
                    <ListGroup variant="flush">
                        {recentAppointments.length === 0 ? (
                            <ListGroup.Item className="text-center text-muted py-4">Nenhum agendamento para hoje.</ListGroup.Item>
                        ) : (
                            recentAppointments.map(app => (
                                <ListGroup.Item key={app.cod_agendamento} className="list-item">
                                    <div className="list-item-main-info">
                                        <p className="list-item-title">{app.cliente_nome}</p>
                                        <p className="list-item-subtitle">{app.servico_nome} - {app.veiculo_modelo} ({app.veiculo_placa})</p>
                                    </div>
                                    <div className="list-item-actions">
                                        <span className="list-item-subtitle me-2">
                                            <Clock size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                                            {new Date(app.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className={`status-badge ${getStatusColorClass(app.status)}`}>
                                            {getStatusText(app.status)}
                                        </span>
                                    </div>
                                </ListGroup.Item>
                            ))
                        )}
                    </ListGroup>
                </div>
            </div>
        </div>
    );
};

export default HomePage;