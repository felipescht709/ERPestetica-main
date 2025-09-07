// src/pages/OrdemServicoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Plus, Search, Eye } from 'lucide-react'; // Removido Edit e Trash2, pois não estavam em uso no seu código
import moment from 'moment';
import OrdemServicoPreview from '../components/OrdemServicoPreview'; // IMPORTAR O NOVO COMPONENTE

const OrdemServicoPage = () => {
    const [ordensServico, setOrdensServico] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const navigate = useNavigate();

    // Estados para controlar o modal de preview
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedOsId, setSelectedOsId] = useState(null);

    const fetchOrdensServico = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const queryParams = new URLSearchParams();
            if (filterStatus) queryParams.append('status_os', filterStatus);
            // Adicione outros filtros aqui se necessário

            const response = await api(`/ordens_servico?${queryParams.toString()}`);
            setOrdensServico(response);
        } catch (err) {
            console.error('Erro ao buscar Ordens de Serviço:', err);
            setError(err.message || 'Erro ao carregar Ordens de Serviço.');
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        fetchOrdensServico();
    }, [fetchOrdensServico]);
    
    // Função para abrir o modal de preview
    const handlePreviewClick = (osId) => {
        setSelectedOsId(osId);
        setShowPreviewModal(true);
    };

    // Função para fechar o modal
    const handleCloseModal = () => {
        setShowPreviewModal(false);
        setSelectedOsId(null);
    };

    // Callback para quando o serviço é iniciado com sucesso no modal
    const handleServiceStarted = () => {
        handleCloseModal(); // Fecha o modal
        fetchOrdensServico(); // Recarrega a lista para mostrar o novo status
    };


    const getStatusColorClass = (status) => {
        switch (status) {
            case 'Aguardando Início': return 'status-agendado';
            case 'Em Andamento': return 'status-em-andamento';
            case 'Concluída': return 'status-concluido';
            case 'Cancelada': return 'status-cancelado';
            default: return 'status-default';
        }
    };

    const filteredOrdensServico = ordensServico.filter(os =>
        (os.nome_cliente && os.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (os.veiculo_placa && os.veiculo_placa.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (os.funcionario_responsavel_nome && os.funcionario_responsavel_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        os.cod_ordem_servico.toString().includes(searchTerm)
    );

    if (loading) return <p>Carregando Ordens de Serviço...</p>;

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2>Gestão de Ordens de Serviço</h2>
                <button className="btn-primary-dark" onClick={() => navigate('/ordens-servico/nova')}>
                    <Plus size={20} />
                    Nova Ordem de Serviço
                </button>
            </div>

            {message && <div className="alert success">{message}</div>}
            {error && <div className="alert error">{error}</div>}

            <div className="filters-container">
                <div className="search-input-container">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar OS (cliente, veículo, funcionário)..."
                        className="input-field"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => {
                        setFilterStatus(e.target.value);
                        // A busca será refeita pelo useEffect
                    }}
                    className="input-field"
                >
                    <option value="">Todos os Status</option>
                    <option value="Aguardando Início">Aguardando Início</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Cancelada">Cancelada</option>
                </select>
            </div>

            <div className="table-responsive section-content">
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th>Nº OS</th>
                            <th>Cliente</th>
                            <th>Veículo</th>
                            <th>Data Abertura</th>
                            <th>Funcionário Resp.</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrdensServico.length > 0 ? (
                            filteredOrdensServico.map(os => (
                                <tr key={os.cod_ordem_servico}>
                                    <td>{os.cod_ordem_servico}</td>
                                    <td>{os.nome_cliente}</td>
                                    <td>{os.veiculo_placa ? `${os.veiculo_modelo} (${os.veiculo_placa})` : 'N/A'}</td>
                                    <td>{moment(os.data_abertura).format('DD/MM/YYYY HH:mm')}</td>
                                    <td>{os.funcionario_responsavel_nome || 'N/A'}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusColorClass(os.status_os)}`}>
                                            {os.status_os}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button
                                            onClick={() => handlePreviewClick(os.cod_ordem_servico)} // MUDANÇA AQUI
                                            className="btn-action" title="Ver Detalhes"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="empty-state-table">Nenhuma Ordem de Serviço encontrada.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Renderiza o modal de preview condicionalmente */}
            {showPreviewModal && (
                <OrdemServicoPreview
                    osId={selectedOsId}
                    onClose={handleCloseModal}
                    onServiceStarted={handleServiceStarted}
                />
            )}
        </div>
    );
};

export default OrdemServicoPage;