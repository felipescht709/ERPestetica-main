// frontend/src/components/cadastros/ServicesManagement.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../../utils/api'; // O caminho para a api agora é ../../
import { AuthContext } from '../../context/AuthContext'; // Ajuste o caminho se necessário
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Row, Col } from 'react-bootstrap'; // Mantendo Row e Col se ainda forem úteis no formulário

const ServicesManagement = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentService, setCurrentService] = useState({
        cod_servico: null,
        nome_servico: '',
        descricao_servico: '',
        duracao_minutos: '',
        preco: '',
        categoria: '',
        ativo: true,
        custo_material: '',
        custo_mao_de_obra: '',
        garantia_dias: '',
        observacoes_internas: '',
        imagem_url: '',
        ordem_exibicao: '',
        requer_aprovacao: false,
    });
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const { userRole } = useContext(AuthContext);
    const canManageServices = ['admin', 'gerente'].includes(userRole);

    const fetchServices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api('/servicos', { method: 'GET' });
            setServices(data);
        } catch (err) {
            console.error('Erro ao buscar serviços:', err);
            setError(err.message || 'Erro ao carregar serviços.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (canManageServices) {
            fetchServices();
        } else {
            setLoading(false);
            setError('Você não tem permissão para gerenciar serviços.');
        }
    }, [fetchServices, canManageServices]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentService(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setCurrentService({
            cod_servico: null, nome_servico: '', descricao_servico: '', duracao_minutos: '',
            preco: '', categoria: '', ativo: true, custo_material: '', custo_mao_de_obra: '',
            garantia_dias: '', observacoes_internas: '', imagem_url: '', ordem_exibicao: '',
            requer_aprovacao: false,
        });
        setShowModal(true);
        setMessage('');
        setError('');
    };

    const openEditModal = (service) => {
        setIsEditing(true);
        setCurrentService({
            ...service,
            duracao_minutos: service.duracao_minutos || '',
            preco: service.preco || '',
            custo_material: service.custo_material || '',
            custo_mao_de_obra: service.custo_mao_de_obra || '',
            garantia_dias: service.garantia_dias || '',
            ordem_exibicao: service.ordem_exibicao || '',
            ativo: service.ativo ?? true,
            requer_aprovacao: service.requer_aprovacao ?? false,
        });
        setShowModal(true);
        setMessage('');
        setError('');
    };

    const closeModal = () => {
        setShowModal(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const serviceToSave = { ...currentService };

        // Lógica de parse para garantir que os tipos de dados estejam corretos
        const safeParseFloat = (value) => value && !isNaN(parseFloat(value)) ? parseFloat(value) : null;
        const safeParseInt = (value) => value && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : null;

        serviceToSave.duracao_minutos = safeParseInt(serviceToSave.duracao_minutos);
        serviceToSave.preco = safeParseFloat(serviceToSave.preco);
        // ... (aplicar para outros campos numéricos)

        try {
            if (isEditing) {
                await api(`/servicos/${serviceToSave.cod_servico}`, { method: 'PUT', body: JSON.stringify(serviceToSave) });
                setMessage('Serviço atualizado com sucesso!');
            } else {
                await api('/servicos', { method: 'POST', body: JSON.stringify(serviceToSave) });
                setMessage('Serviço adicionado com sucesso!');
            }
            fetchServices();
            closeModal();
        } catch (err) {
            setError(err.message || 'Erro ao salvar o serviço.');
        }
    };

    const handleDelete = async (cod_servico) => {
        if (window.confirm('Tem certeza que deseja deletar este serviço?')) {
            try {
                await api(`/servicos/${cod_servico}`, { method: 'DELETE' });
                setMessage('Serviço deletado com sucesso!');
                fetchServices();
            } catch (err) {
                setError(err.message || 'Erro ao deletar serviço.');
            }
        }
    };

    const filteredServices = services.filter(service =>
        service.nome_servico.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.categoria && service.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <p>Carregando serviços...</p>;
    if (error) return <div className="alert error">{error}</div>;
    if (!canManageServices) return <div className="alert error">Acesso Negado.</div>;

    return (
        <>
            <div className="page-section-header" style={{ marginTop: 0, justifyContent: 'space-between' }}>
                <h3>Gerenciamento de Serviços</h3>
                <button className="btn-primary-dark" onClick={openCreateModal}>
                    <Plus size={20} />
                    Novo Serviço
                </button>
            </div>

            {message && <div className="alert success">{message}</div>}
            
            <div className="search-input-container">
                <Search size={20} className="search-icon" />
                <input
                    type="text"
                    placeholder="Buscar serviços por nome ou categoria..."
                    className="input-field"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="table-responsive section-content">
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Preço</th>
                            <th>Duração (min)</th>
                            <th>Categoria</th>
                            <th>Ativo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredServices.length > 0 ? (
                            filteredServices.map((service) => (
                                <tr key={service.cod_servico}>
                                    <td>{service.nome_servico}</td>
                                    <td>R$ {Number(service.preco || 0).toFixed(2).replace('.', ',')}</td>
                                    <td>{service.duracao_minutos || 'N/A'}</td>
                                    <td>{service.categoria || 'N/A'}</td>
                                    <td>{service.ativo ? 'Sim' : 'Não'}</td>
                                    <td className="actions">
                                        <button onClick={() => openEditModal(service)} className="btn-action" title="Editar"><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(service.cod_servico)} className="btn-action btn-delete" title="Excluir"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="empty-state-table">Nenhum serviço encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>{isEditing ? 'Editar Serviço' : 'Adicionar Serviço'}</h3>
                        {error && <div className="alert error">{error}</div>}
                        <form onSubmit={handleSubmit}>
                            <Row>
                                <Col md={8}>
                                    <div className="form-group">
                                        <label>Nome do Serviço</label>
                                        <input type="text" name="nome_servico" value={currentService.nome_servico} onChange={handleInputChange} className="input-field" required />
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="form-group">
                                        <label>Categoria</label>
                                        <input type="text" name="categoria" value={currentService.categoria} onChange={handleInputChange} className="input-field" />
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={4}>
                                    <div className="form-group">
                                        <label>Preço (R$)</label>
                                        <input type="number" step="0.01" name="preco" value={currentService.preco} onChange={handleInputChange} className="input-field" required />
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="form-group">
                                        <label>Duração (minutos)</label>
                                        <input type="number" name="duracao_minutos" value={currentService.duracao_minutos} onChange={handleInputChange} className="input-field" required />
                                    </div>
                                </Col>
                                 <Col md={4}>
                                    <div className="form-group">
                                        <label>Garantia (dias)</label>
                                        <input type="number" name="garantia_dias" value={currentService.garantia_dias} onChange={handleInputChange} className="input-field" />
                                    </div>
                                </Col>
                            </Row>
                             <div className="form-group">
                                <label>Descrição</label>
                                <textarea name="descricao_servico" value={currentService.descricao_servico} onChange={handleInputChange} className="input-field" rows={3}></textarea>
                            </div>
                            <div className="form-group">
                                <input type="checkbox" id="ativo" name="ativo" checked={currentService.ativo} onChange={handleInputChange} />
                                <label htmlFor="ativo" style={{ marginLeft: '8px', userSelect: 'none' }}>Serviço Ativo</label>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="button-primary">{isEditing ? 'Salvar Alterações' : 'Adicionar Serviço'}</button>
                                <button type="button" onClick={closeModal} className="button-secondary">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default ServicesManagement;