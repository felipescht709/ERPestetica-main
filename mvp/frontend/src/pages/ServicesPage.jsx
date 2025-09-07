// frontend/src/pages/ServicesPage.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../utils/api'; // Sua função para chamadas de API autenticadas
import { AuthContext } from '../context/AuthContext';
// Importar ícones do Lucide React
import { Plus, Search, Edit, Trash2, Settings } from 'lucide-react';
// Importar componentes específicos do react-bootstrap que ainda são utilizados
import { Spinner, Alert, Table, Modal, Form, Row, Col } from 'react-bootstrap';


const ServicesPage = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Para erros de carregamento/permissão
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentService, setCurrentService] = useState({
        cod_servico: null, // Será preenchido para edição
        nome_servico: '',
        descricao_servico: '',
        duracao_minutos: '', // Será convertido para number
        preco: '',           // Será convertido para number
        categoria: '',
        ativo: true,         // Boolean
        custo_material: '',  // Será convertido para number
        custo_mao_de_obra: '', // Será convertido para number
        garantia_dias: '',   // Será convertido para number
        observacoes_internas: '',
        imagem_url: '',
        ordem_exibicao: '', // Será convertido para number
        requer_aprovacao: false, // Boolean
    });
    const [message, setMessage] = useState(null); // Para mensagens de sucesso/erro do formulário no modal ou página
    const [searchTerm, setSearchTerm] = useState(''); // Novo estado para busca

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
        setShowModal(true);
        setMessage(null); // Limpa mensagens anteriores ao abrir modal
        setError(null); // Limpa erros anteriores ao abrir modal
    };

    const openEditModal = (service) => {
        setIsEditing(true);
        setCurrentService({
            ...service,
            // Certifique-se que campos numéricos ou booleanos vêm formatados para o input ou com fallback para string vazia
            duracao_minutos: service.duracao_minutos || '',
            preco: service.preco || '',
            custo_material: service.custo_material || '',
            custo_mao_de_obra: service.custo_mao_de_obra || '',
            garantia_dias: service.garantia_dias || '',
            ordem_exibicao: service.ordem_exibicao || '',
            ativo: service.ativo ?? true, // Usa nullish coalescing para booleans
            requer_aprovacao: service.requer_aprovacao ?? false,
        });
        setShowModal(true);
        setMessage(null); // Limpa mensagens anteriores ao abrir modal
        setError(null); // Limpa erros anteriores ao abrir modal
    };

    const closeModal = () => {
        setShowModal(false);
        setMessage(null); // Limpa mensagens ao fechar o modal
        setError(null); // Limpa erros ao fechar o modal
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const serviceToSave = { ...currentService };

            const safeParseFloat = (value) => {
                if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
                const parsed = parseFloat(value);
                return isNaN(parsed) ? null : parsed;
            };

            const safeParseInt = (value) => {
                if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
                const parsed = parseInt(value, 10);
                return isNaN(parsed) ? null : parsed;
            };

            serviceToSave.duracao_minutos = safeParseInt(serviceToSave.duracao_minutos);
            serviceToSave.preco = safeParseFloat(serviceToSave.preco);
            serviceToSave.custo_material = safeParseFloat(serviceToSave.custo_material);
            serviceToSave.custo_mao_de_obra = safeParseFloat(serviceToSave.custo_mao_de_obra);
            serviceToSave.garantia_dias = safeParseInt(serviceToSave.garantia_dias);
            serviceToSave.ordem_exibicao = safeParseInt(serviceToSave.ordem_exibicao);

            serviceToSave.ativo = serviceToSave.ativo ?? true;
            serviceToSave.requer_aprovacao = serviceToSave.requer_aprovacao ?? false;
            
            if (serviceToSave.descricao_servico.trim() === '') serviceToSave.descricao_servico = null;
            if (serviceToSave.observacoes_internas.trim() === '') serviceToSave.observacoes_internas = null;
            if (serviceToSave.imagem_url.trim() === '') serviceToSave.imagem_url = null;


            if (isEditing) {
                await api(`/servicos/${serviceToSave.cod_servico}`, { method: 'PUT', body: JSON.stringify( serviceToSave) });
                setMessage({ type: 'success', text: 'Serviço atualizado com sucesso!' });
            } else {
                await api('/servicos', { method: 'POST', body: JSON.stringify( serviceToSave) });
                setMessage({ type: 'success', text: 'Serviço adicionado com sucesso!' });
            }
            fetchServices();
            closeModal();
        } catch (err) {
            console.error('Erro ao salvar serviço:', err);
            setMessage({ type: 'danger', text: err.message || 'Erro ao salvar serviço. Verifique os dados e tente novamente.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (cod_servico) => {
        if (window.confirm('Tem certeza que deseja deletar este serviço?')) { // Usar modal customizado
            setLoading(true);
            setMessage(null);
            setError(null);
            try {
                await api(`/servicos/${cod_servico}`, { method: 'DELETE' });
                setMessage({ type: 'success', text: 'Serviço deletado com sucesso!' });
                fetchServices(); // Atualiza a lista
            } catch (err) {
                console.error('Erro ao deletar serviço:', err);
                setMessage({ type: 'danger', text: err.message || 'Erro ao deletar serviço. Tente novamente.' });
            } finally {
                setLoading(false);
            }
        }
    };

    // Filtra serviços com base no termo de busca
    const filteredServices = services.filter(service =>
        service.nome_servico.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Renderização de carregamento, erro ou acesso negado
    if (loading) {
        return (
            <div className="loading-screen">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando serviços...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert error my-4">
                <h3>Erro de Acesso</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (!canManageServices) {
        return (
            <div className="alert error my-4">
                <h3>Acesso Negado</h3>
                <p>Você não tem permissão para visualizar e gerenciar serviços.</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2><Settings size={28} style={{verticalAlign: 'middle', marginRight: '10px'}} /> Gerenciar Serviços</h2>
                <button className="btn-primary-dark" onClick={openCreateModal}>
                    <Plus size={20} />
                    Adicionar Novo Serviço
                </button>
            </div>

            {message && (
                <div className={`alert ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="search-input-container">
                <Search size={20} className="search-icon" />
                <input
                    type="text"
                    placeholder="Buscar serviços..."
                    className="input-field"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="section-content"> {/* Adicionado section-content para o estilo de card */}
                <h3 className="card-title mb-3">Lista de Serviços</h3>
                <div className="table-responsive"> {/* Para rolagem horizontal em telas pequenas */}
                    <Table striped bordered hover className="clients-table"> {/* Reutilizado clients-table para estilização */}
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nome</th>
                                <th>Preço</th>
                                <th>Duração (min)</th>
                                <th>Categoria</th>
                                <th>Ativo</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredServices.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="empty-state-table">Nenhum serviço encontrado.</td>
                                </tr>
                            ) : (
                                filteredServices.map((service) => (
                                    <tr key={service.cod_servico}>
                                        <td>{service.cod_servico}</td>
                                        <td>{service.nome_servico}</td> {/* Adicionado nome_servico aqui */}
                                        <td>R$ {service.preco ? parseFloat(service.preco).toFixed(2).replace('.', ',') : '0,00'}</td>
                                        <td>{service.duracao_minutos || 'N/A'}</td>
                                        <td>{service.categoria}</td>
                                        <td>
                                            <span className={`status-badge ${service.ativo ? 'status-confirmado' : 'status-inativo'}`}>
                                                {service.ativo ? 'Sim' : 'Não'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn-action" onClick={() => openEditModal(service)} title="Editar">
                                                <Edit size={18} />
                                            </button>
                                            <button className="btn-action btn-delete" onClick={() => handleDelete(service.cod_servico)} title="Excluir">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </div>

            {/* Modal de Adicionar/Editar Serviço */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>{isEditing ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h3>
                        {message && ( // Exibe mensagens dentro do modal também
                            <div className={`alert ${message.type}`}>
                                {message.text}
                            </div>
                        )}
                        <form onSubmit={handleSubmit}>
                            {/* Removi a tag <Form.Group> extra pois o Form.Control já o cria implictamente. Isso evita warnings. */}
                            <Row>
                                <Col md={6}>
                                    <div className="form-group">
                                        <label htmlFor="nome_servico">Nome do Serviço:</label>
                                        <input type="text" name="nome_servico" id="nome_servico" value={currentService.nome_servico} onChange={handleInputChange} required className="input-field" />
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="form-group">
                                        <label htmlFor="categoria">Categoria:</label>
                                        <input type="text" name="categoria" id="categoria" value={currentService.categoria} onChange={handleInputChange} required className="input-field" />
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={4}>
                                    <div className="form-group">
                                        <label htmlFor="duracao_minutos">Duração (minutos):</label>
                                        <input type="number" name="duracao_minutos" id="duracao_minutos" value={currentService.duracao_minutos} onChange={handleInputChange} required min="1" className="input-field" />
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="form-group">
                                        <label htmlFor="preco">Preço (R$):</label>
                                        <input type="number" step="0.01" name="preco" id="preco" value={currentService.preco} onChange={handleInputChange} required min="0" className="input-field" />
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="form-group">
                                        <label htmlFor="garantia_dias">Garantia (dias):</label>
                                        <input type="number" name="garantia_dias" id="garantia_dias" value={currentService.garantia_dias} onChange={handleInputChange} min="0" className="input-field" />
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <div className="form-group">
                                        <label htmlFor="custo_material">Custo Material (R$):</label>
                                        <input type="number" step="0.01" name="custo_material" id="custo_material" value={currentService.custo_material} onChange={handleInputChange} min="0" className="input-field" />
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="form-group">
                                        <label htmlFor="custo_mao_de_obra">Custo Mão de Obra (R$):</label>
                                        <input type="number" step="0.01" name="custo_mao_de_obra" id="custo_mao_de_obra" value={currentService.custo_mao_de_obra} onChange={handleInputChange} min="0" className="input-field" />
                                    </div>
                                </Col>
                            </Row>
                            <div className="form-group">
                                <label htmlFor="descricao_servico">Descrição do Serviço:</label>
                                <textarea rows={2} name="descricao_servico" id="descricao_servico" value={currentService.descricao_servico} onChange={handleInputChange} className="input-field"></textarea>
                            </div>
                            <div className="form-group">
                                <label htmlFor="observacoes_internas">Observações Internas:</label>
                                <textarea rows={2} name="observacoes_internas" id="observacoes_internas" value={currentService.observacoes_internas} onChange={handleInputChange} className="input-field"></textarea>
                            </div>
                            <Row>
                                <Col md={6}>
                                    <div className="form-group">
                                        <label htmlFor="imagem_url">URL da Imagem:</label>
                                        <input type="text" name="imagem_url" id="imagem_url" value={currentService.imagem_url} onChange={handleInputChange} className="input-field" />
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="form-group">
                                        <label htmlFor="ordem_exibicao">Ordem de Exibição:</label>
                                        <input type="number" name="ordem_exibicao" id="ordem_exibicao" value={currentService.ordem_exibicao} onChange={handleInputChange} min="0" className="input-field" />
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <div className="form-group">
                                        <input
                                            type="checkbox"
                                            name="ativo"
                                            id="ativo"
                                            checked={currentService.ativo}
                                            onChange={handleInputChange}
                                        />
                                        <label htmlFor="ativo" style={{ display: 'inline-block', marginLeft: '10px' }}>Serviço Ativo</label>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="form-group">
                                        <input
                                            type="checkbox"
                                            name="requer_aprovacao"
                                            id="requer_aprovacao"
                                            checked={currentService.requer_aprovacao}
                                            onChange={handleInputChange}
                                        />
                                        <label htmlFor="requer_aprovacao" style={{ display: 'inline-block', marginLeft: '10px' }}>Requer Aprovação do Gestor</label>
                                    </div>
                                </Col>
                            </Row>
                            <div className="modal-actions">
                                <button type="button" className="button-secondary" onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="button-primary">
                                    {isEditing ? 'Salvar Alterações' : 'Adicionar Serviço'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServicesPage;
