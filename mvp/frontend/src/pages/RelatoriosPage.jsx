// src/pages/RelatoriosPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api'; // Importa a função 'api' como exportação padrão
import RelatoriosComponent from '../components/Relatorios';
import DashboardMetrics from '../components/DashboardMetrics'; // Importar DashboardMetrics
// Importar o moment
import moment from 'moment';
// Importar ícones do Lucide React
import { BarChart2, Calendar, Users, Settings, DollarSign, User } from 'lucide-react';


const RelatoriosPage = () => {
    const { user, logout } = useContext(AuthContext);
    const [selectedReport, setSelectedReport] = useState('dashboard'); // 'dashboard', 'agendamentos', 'clientes', 'servicos', 'financeiro', 'usuarios'
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Estados para filtros (exemplo para agendamentos e financeiro)
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [appointmentStatus, setAppointmentStatus] = useState('');
    const [serviceCategory, setServiceCategory] = useState('');
    const [responsibleUser, setResponsibleUser] = useState(''); // Para filtrar agendamentos por responsável

    useEffect(() => {
        // Inicializa as datas com o mês atual no primeiro carregamento
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        setStartDate(firstDayOfMonth);
        setEndDate(lastDayOfMonth);
    }, []);

    const fetchReportData = async () => {
        setLoading(true);
        setError(null);
        try {
            let data = [];
            // Usando a função 'api' importada
            switch (selectedReport) {
                case 'dashboard':
                    data = await api('/home');
                    break;
                case 'agendamentos':
                    data = await api(`/agendamentos?startDate=${startDate}&endDate=${endDate}&status=${appointmentStatus}&responsibleUser=${responsibleUser}`);
                    break;
                case 'clientes':
                    data = await api('/clientes'); // Adicionar filtros posteriormente, se necessário
                    break;
                case 'servicos':
                    data = await api(`/servicos?category=${serviceCategory}`); // Adicionar filtros posteriormente, se necessário
                    break;
                case 'financeiro':
                    data = await api(`/financeiro/resumo?startDate=${startDate}&endDate=${endDate}`);
                    break;
                case 'usuarios':
                    data = await api('/usuarios');
                    break;
                default:
                    break;
            }
            setReportData(data);
        } catch (err) {
            console.error(`Erro ao buscar dados do relatório de ${selectedReport}:`, err);
            // Captura a mensagem de erro da API ou uma mensagem genérica
            setError(err.message || `Não foi possível carregar os dados do relatório de ${selectedReport}.`);
            setReportData([]); // Limpa os dados em caso de erro
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) { // Apenas tenta buscar dados se o usuário estiver logado
            fetchReportData();
        }
    }, [user, selectedReport, startDate, endDate, appointmentStatus, serviceCategory, responsibleUser]); // Refetch quando filtros ou tipo de relatório mudam

    if (!user) {
        return <p className="empty-state">Por favor, faça login para acessar os relatórios.</p>;
    }

    // Componente auxiliar para renderizar os filtros específicos de cada relatório
    const renderFilters = () => {
        switch (selectedReport) {
            case 'agendamentos':
                return (
                    <div className="filters-container section-content mb-4"> {/* Adicione section-content e margem */}
                        <label>
                            De:
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
                        </label>
                        <label>
                            Até:
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
                        </label>
                        <label>
                            Status:
                            <select value={appointmentStatus} onChange={(e) => setAppointmentStatus(e.target.value)} className="input-field">
                                <option value="">Todos</option>
                                <option value="pendente">Pendente</option>
                                <option value="confirmado">Confirmado</option>
                                <option value="concluido">Concluído</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </label>
                        {/* Adicionar filtro de responsável ou tipo de agendamento aqui, se tiver dados de usuários para popular um select */}
                        <button className="button-primary" onClick={fetchReportData}>Gerar Relatório</button>
                    </div>
                );
            case 'financeiro':
                return (
                    <div className="filters-container section-content mb-4"> {/* Adicione section-content e margem */}
                        <label>
                            De:
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
                        </label>
                        <label>
                            Até:
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
                        </label>
                        <button className="button-primary" onClick={fetchReportData}>Gerar Relatório</button>
                    </div>
                );
            case 'servicos':
                return (
                    <div className="filters-container section-content mb-4"> {/* Adicione section-content e margem */}
                        <label>
                            Categoria:
                            <input type="text" placeholder="Filtrar por Categoria" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="input-field" />
                        </label>
                        <button className="button-primary" onClick={fetchReportData}>Gerar Relatório</button>
                    </div>
                );
            case 'clientes':
            case 'usuarios':
            case 'dashboard': // O dashboard também pode ter um botão para "atualizar"
            default:
                return (
                    <div className="filters-container section-content mb-4"> {/* Adicione section-content e margem */}
                        <button className="button-primary" onClick={fetchReportData}>Atualizar Relatório</button>
                    </div>
                );
        }
    };

    const getReportIcon = (reportType) => {
        switch (reportType) {
            case 'dashboard': return <BarChart2 size={28} style={{verticalAlign: 'middle', marginRight: '10px'}} />;
            case 'agendamentos': return <Calendar size={28} style={{verticalAlign: 'middle', marginRight: '10px'}} />;
            case 'clientes': return <Users size={28} style={{verticalAlign: 'middle', marginRight: '10px'}} />;
            case 'servicos': return <Settings size={28} style={{verticalAlign: 'middle', marginRight: '10px'}} />;
            case 'financeiro': return <DollarSign size={28} style={{verticalAlign: 'middle', marginRight: '10px'}} />;
            case 'usuarios': return <User size={28} style={{verticalAlign: 'middle', marginRight: '10px'}} />;
            default: return null;
        }
    };

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2>{getReportIcon(selectedReport)} Relatórios</h2>
            </div>

            <nav className="report-navigation section-content mb-4"> {/* Adicionado section-content e mb-4 */}
                <button onClick={() => setSelectedReport('dashboard')} className={selectedReport === 'dashboard' ? 'active' : ''}>Dashboard</button>
                <button onClick={() => setSelectedReport('agendamentos')} className={selectedReport === 'agendamentos' ? 'active' : ''}>Agendamentos</button>
                <button onClick={() => setSelectedReport('clientes')} className={selectedReport === 'clientes' ? 'active' : ''}>Clientes</button>
                <button onClick={() => setSelectedReport('servicos')} className={selectedReport === 'servicos' ? 'active' : ''}>Serviços</button>
                <button onClick={() => setSelectedReport('financeiro')} className={selectedReport === 'financeiro' ? 'active' : ''}>Financeiro</button>
                <button onClick={() => setSelectedReport('usuarios')} className={selectedReport === 'usuarios' ? 'active' : ''}>Usuários</button>
            </nav>

            <div className="report-content">
                {renderFilters()}

                {loading && <p className="loading-message empty-state">Carregando dados do relatório...</p>}
                {error && <p className="error-message alert error">{error}</p>}

                {!loading && !error && (
                    <div className="section-content"> {/* Envolve o conteúdo do relatório em um section-content */}
                        {selectedReport === 'dashboard' ?
                            <DashboardMetrics metrics={reportData} />
                            :
                            <RelatoriosComponent
                                reportType={selectedReport}
                                data={reportData}
                                startDate={startDate}
                                endDate={endDate}
                                appointmentStatus={appointmentStatus}
                                serviceCategory={serviceCategory}
                                responsibleUser={responsibleUser}
                            />
                        }
                    </div>
                )}
            </div>
        </div>
    );
};

export default RelatoriosPage;
