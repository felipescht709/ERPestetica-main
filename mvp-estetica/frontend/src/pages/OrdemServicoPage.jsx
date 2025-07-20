// src/pages/OrdemServicoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Plus, Search, Edit, Trash2, Eye, Truck } from 'lucide-react';
import OrdemServicoForm from '../components/OrdemServicoForm';

const OrdemServicoPage = () => {
    const [ordensServico, setOrdensServico] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCliente, setFilterCliente] = useState('');
    const [filterVeiculo, setFilterVeiculo] = useState('');

    const [showOsModal, setShowOsModal] = useState(false);
    const [isEditingOs, setIsEditingOs] = useState(false);
    const [currentOs, setCurrentOs] = useState(null);

    const fetchOrdensServico = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const queryParams = new URLSearchParams();
            if (filterStatus) queryParams.append('status_os', filterStatus);
            if (filterCliente) queryParams.append('cod_cliente', filterCliente);
            if (filterVeiculo) queryParams.append('cod_veiculo', filterVeiculo); // Se for filtrar por ID do veículo
            // Você pode adicionar um filtro de texto genérico se o backend suportar ou filtrar no frontend

            const response = await api(`/ordens_servico?${queryParams.toString()}`, { method: 'GET' });
            setOrdensServico(response);
        } catch (err) {
            console.error('Erro ao buscar Ordens de Serviço:', err);
            setError(err.message || 'Erro ao carregar Ordens de Serviço.');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterCliente, filterVeiculo]); // Adicione dependências de filtro aqui

    useEffect(() => {
        fetchOrdensServico();
    }, [fetchOrdensServico]);

    const handleAddOs = () => {
        setIsEditingOs(false);
        setCurrentOs(null);
        setMessage('');
        setError('');
        setShowOsModal(true);
    };

    const handleEditOs = async (osId) => {
        setLoading(true);
        setError('');
        try {
            const osDetails = await api(`/ordens_servico/${osId}`, { method: 'GET' });
            setIsEditingOs(true);
            setCurrentOs(osDetails);
            setMessage('');
            setError('');
            setShowOsModal(true);
        } catch (err) {
            console.error('Erro ao buscar detalhes da OS para edição:', err);
            setError(err.message || 'Erro ao carregar detalhes da OS.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveOs = async (osData) => {
        try {
            if (isEditingOs) {
                // A rota PUT da OS principal não manipula itens, eles são gerenciados por itens_ordem_servico.js
                // Se a edição de itens precisa acontecer aqui, a lógica no backend e frontend precisa ser mais complexa
                // para PUT/DELETE/POST em itens_ordem_servico.js
                await api(`/ordens_servico/${currentOs.cod_ordem_servico}`, {
                    method: 'PUT',
                    body: JSON.stringify(osData)
                });
                setMessage('Ordem de Serviço atualizada com sucesso!');
            } else {
                await api('/ordens_servico', {
                    method: 'POST',
                    body: JSON.stringify(osData)
                });
                setMessage('Ordem de Serviço criada com sucesso!');
            }
            setShowOsModal(false);
            fetchOrdensServico();
        } catch (err) {
            console.error('Erro ao salvar Ordem de Serviço:', err);
            setError(err.message || 'Erro ao salvar Ordem de Serviço.');
        }
    };

    const handleDeleteOs = async (osId) => {
        if (window.confirm('Tem certeza que deseja cancelar esta Ordem de Serviço?')) {
            try {
                await api(`/ordens_servico/${osId}`, { method: 'DELETE' });
                setMessage('Ordem de Serviço cancelada com sucesso!');
                fetchOrdensServico();
            } catch (err) {
                console.error('Erro ao cancelar Ordem de Serviço:', err);
                setError(err.message || 'Erro ao cancelar Ordem de Serviço.');
            }
        }
    };

    const getStatusColorClass = (status) => {
        switch (status) {
            case 'Aberta': return 'status-pendente';
            case 'Em Andamento': return 'status-em-andamento';
            case 'Aguardando Pecas': return 'status-cancelado';
            case 'Pronta para Retirada': return 'status-confirmado';
            case 'Concluida': return 'status-concluido';
            case 'Cancelada': return 'status-inativo';
            default: return 'status-default';
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            'Aberta': 'Aberta',
            'Em Andamento': 'Em Andamento',
            'Aguardando Pecas': 'Aguardando Peças',
            'Pronta para Retirada': 'Pronta',
            'Concluida': 'Concluída',
            'Cancelada': 'Cancelada',
        };
        return statusMap[status] || status;
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
                <button className="btn-primary-dark" onClick={handleAddOs}>
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
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="input-field"
                >
                    <option value="">Todos os Status</option>
                    <option value="Aberta">Aberta</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Aguardando Pecas">Aguardando Peças</option>
                    <option value="Pronta para Retirada">Pronta para Retirada</option>
                    <option value="Concluida">Concluída</option>
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
                            <th>Conclusão Prevista</th>
                            <th>Valor Total</th>
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
                                    <td>{new Date(os.data_abertura).toLocaleDateString()}</td>
                                    <td>{os.data_conclusao_prevista ? new Date(os.data_conclusao_prevista).toLocaleDateString() : 'N/A'}</td>
                                    <td>R$ {Number(os.valor_total_os).toFixed(2).replace('.', ',')}</td>
                                    <td>{os.funcionario_responsavel_nome || 'N/A'}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusColorClass(os.status_os)}`}>
                                            {getStatusText(os.status_os)}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button onClick={() => handleEditOs(os.cod_ordem_servico)} className="btn-action" title="Editar">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteOs(os.cod_ordem_servico)} className="btn-action btn-delete" title="Cancelar OS">
                                            <Trash2 size={18} />
                                        </button>
                                        <button onClick={() => alert(`Visualizar detalhes da OS ${os.cod_ordem_servico}`)} className="btn-action" title="Ver Detalhes">
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="9" className="empty-state-table">Nenhuma Ordem de Serviço encontrada.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal para Adicionar/Editar Ordem de Serviço */}
            {showOsModal && (
                <div className="modal-backdrop">
                    <div className="modal-content large-modal-content">
                        <h3>{isEditingOs ? 'Editar Ordem de Serviço' : 'Criar Nova Ordem de Serviço'}</h3>
                        <OrdemServicoForm
                            os={currentOs}
                            onSave={handleSaveOs}
                            onClose={() => setShowOsModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdemServicoPage;