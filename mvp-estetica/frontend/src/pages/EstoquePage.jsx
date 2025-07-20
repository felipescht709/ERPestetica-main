// src/pages/EstoquePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api'; // Para futuras chamadas à API
import { Plus, Search, Edit, Trash2, Wrench, Package } from 'lucide-react'; // Ícones para produtos e equipamentos
import ProductForm from '../components/ProductForm';
import EquipmentForm from '../components/EquipmentForm';

const EstoquePage = () => {
    const [activeTab, setActiveTab] = useState('produtos'); // 'produtos' ou 'equipamentos'
    const [produtos, setProdutos] = useState([]);
    const [equipamentos, setEquipamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [showProductModal, setShowProductModal] = useState(false);
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);

    const [showEquipmentModal, setShowEquipmentModal] = useState(false);
    const [isEditingEquipment, setIsEditingEquipment] = useState(false);
    const [currentEquipment, setCurrentEquipment] = useState(null);

    // Função para buscar dados de produtos
    const fetchProdutos = useCallback(async () => {
        try {
            // CORREÇÃO AQUI: api.get() mudado para api(url, { method: 'GET' })
            const response = await api('/produtos_estoque', { method: 'GET' });
            setProdutos(response); // Sua função `api` já retorna o JSON, sem a propriedade .data
        } catch (err) {
            console.error('Erro ao buscar produtos em estoque:', err);
            // Ajustar o acesso à mensagem de erro, pois `api` retorna o erro.message
            setError(err.message || 'Erro ao carregar produtos.');
        }
    }, []);

    // Função para buscar dados de equipamentos
    const fetchEquipamentos = useCallback(async () => {
        try {
            // CORREÇÃO AQUI: api.get() mudado para api(url, { method: 'GET' })
            const response = await api('/equipamentos', { method: 'GET' });
            setEquipamentos(response); // Sua função `api` já retorna o JSON, sem a propriedade .data
        } catch (err) {
            console.error('Erro ao buscar equipamentos:', err);
            // Ajustar o acesso à mensagem de erro, pois `api` retorna o erro.message
            setError(err.message || 'Erro ao carregar equipamentos.');
        }
    }, []);

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            setError('');
            setMessage('');
            await fetchProdutos();
            await fetchEquipamentos();
            setLoading(false);
        };
        loadAllData();
    }, [fetchProdutos, fetchEquipamentos]);

    // Funções de CRUD para Produtos
    const handleAddProduct = () => {
        setIsEditingProduct(false);
        setCurrentProduct(null);
        setMessage('');
        setError('');
        setShowProductModal(true);
    };

    const handleEditProduct = (product) => {
        setIsEditingProduct(true);
        setCurrentProduct(product);
        setMessage('');
        setError('');
        setShowProductModal(true);
    };

    const handleSaveProduct = async (productData) => {
        try {
            if (isEditingProduct) {
                // CORREÇÃO AQUI: api.put() mudado para api(url, { method: 'PUT', body: JSON.stringify(productData) })
                await api(`/produtos_estoque/${currentProduct.cod_produto}`, {
                    method: 'PUT',
                    body: JSON.stringify(productData)
                });
                setMessage('Produto atualizado com sucesso!');
            } else {
                // CORREÇÃO AQUI: api.post() mudado para api(url, { method: 'POST', body: JSON.stringify(productData) })
                await api('/produtos_estoque', {
                    method: 'POST',
                    body: JSON.stringify(productData)
                });
                setMessage('Produto adicionado com sucesso!');
            }
            setShowProductModal(false);
            fetchProdutos(); // Recarrega a lista
        } catch (err) {
            console.error('Erro ao salvar produto:', err);
            // Ajustar o acesso à mensagem de erro
            setError(err.message || 'Erro ao salvar produto.');
        }
    };

    const handleDeleteProduct = async (cod_produto) => {
        if (window.confirm('Tem certeza que deseja desativar este produto? Ele não aparecerá mais nas listas ativas.')) {
            try {
                // CORREÇÃO AQUI: api.delete() mudado para api(url, { method: 'DELETE' })
                await api(`/produtos_estoque/${cod_produto}`, { method: 'DELETE' });
                setMessage('Produto desativado com sucesso!');
                fetchProdutos(); // Recarrega a lista
            } catch (err) {
                console.error('Erro ao desativar produto:', err);
                // Ajustar o acesso à mensagem de erro
                setError(err.message || 'Erro ao desativar produto.');
            }
        }
    };

    // Funções de CRUD para Equipamentos
    const handleAddEquipment = () => {
        setIsEditingEquipment(false);
        setCurrentEquipment(null);
        setMessage('');
        setError('');
        setShowEquipmentModal(true);
    };

    const handleEditEquipment = (equipment) => {
        setIsEditingEquipment(true);
        setCurrentEquipment(equipment);
        setMessage('');
        setError('');
        setShowEquipmentModal(true);
    };

    const handleSaveEquipment = async (equipmentData) => {
        try {
            if (isEditingEquipment) {
                // CORREÇÃO AQUI: api.put() mudado para api(url, { method: 'PUT', body: JSON.stringify(equipmentData) })
                await api(`/equipamentos/${currentEquipment.cod_equipamento}`, {
                    method: 'PUT',
                    body: JSON.stringify(equipmentData)
                });
                setMessage('Equipamento atualizado com sucesso!');
            } else {
                // CORREÇÃO AQUI: api.post() mudado para api(url, { method: 'POST', body: JSON.stringify(equipmentData) })
                await api('/equipamentos', {
                    method: 'POST',
                    body: JSON.stringify(equipmentData)
                });
                setMessage('Equipamento adicionado com sucesso!');
            }
            setShowEquipmentModal(false);
            fetchEquipamentos(); // Recarrega a lista
        } catch (err) {
            console.error('Erro ao salvar equipamento:', err);
            // Ajustar o acesso à mensagem de erro
            setError(err.message || 'Erro ao salvar equipamento.');
        }
    };

    const handleDeleteEquipment = async (cod_equipamento) => {
        if (window.confirm('Tem certeza que deseja desativar este equipamento? Ele não aparecerá mais nas listas ativas.')) {
            try {
                // CORREÇÃO AQUI: api.delete() mudado para api(url, { method: 'DELETE' })
                await api(`/equipamentos/${cod_equipamento}`, { method: 'DELETE' });
                setMessage('Equipamento desativado com sucesso!');
                fetchEquipamentos(); // Recarrega a lista
            } catch (err) {
                console.error('Erro ao desativar equipamento:', err);
                // Ajustar o acesso à mensagem de erro
                setError(err.message || 'Erro ao desativar equipamento.');
            }
        }
    };

    const filteredProdutos = produtos.filter(p =>
        p.nome_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tipo_produto.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredEquipamentos = equipamentos.filter(e =>
        e.nome_equipamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.numero_serie && e.numero_serie.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.localizacao_atual && e.localizacao_atual.toLowerCase().includes(searchTerm.toLowerCase())) ||
        e.status_operacional.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <p>Carregando dados de estoque...</p>;

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2>Gestão de Estoque e Equipamentos</h2>
                <div className="flex-group">
                    {activeTab === 'produtos' && (
                        <button className="btn-primary-dark" onClick={handleAddProduct}>
                            <Plus size={20} />
                            Novo Produto
                        </button>
                    )}
                    {activeTab === 'equipamentos' && (
                        <button className="btn-primary-dark" onClick={handleAddEquipment}>
                            <Plus size={20} />
                            Novo Equipamento
                        </button>
                    )}
                </div>
            </div>

            {message && <div className="alert success">{message}</div>}
            {error && <div className="alert error">{error}</div>}

            <div className="tab-navigation">
                <button
                    className={`tab-button ${activeTab === 'produtos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('produtos')}
                >
                    <Package size={18} /> Produtos em Estoque
                </button>
                <button
                    className={`tab-button ${activeTab === 'equipamentos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('equipamentos')}
                >
                    <Wrench size={18} /> Equipamentos
                </button>
            </div>

            <div className="search-input-container">
                <Search size={20} className="search-icon" />
                <input
                    type="text"
                    placeholder={`Buscar ${activeTab === 'produtos' ? 'produtos...' : 'equipamentos...'}`}
                    className="input-field"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="table-responsive section-content">
                {activeTab === 'produtos' && (
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Tipo</th>
                                <th>Qtd.</th>
                                <th>Unidade</th>
                                <th>Custo</th>
                                <th>Venda Sug.</th>
                                <th>Categoria</th>
                                <th>Estoque Mínimo</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProdutos.length > 0 ? (
                                filteredProdutos.map(p => (
                                    <tr key={p.cod_produto}>
                                        <td>{p.nome_produto}</td>
                                        <td>{p.tipo_produto}</td>
                                        <td>{p.quantidade_estoque}</td>
                                        <td>{p.unidade_medida}</td>
                                        <td>R$ {Number(p.preco_custo).toFixed(2).replace('.', ',')}</td>
                                        <td>R$ {Number(p.preco_venda).toFixed(2).replace('.', ',')}</td>
                                        <td>{p.categoria}</td>
                                        <td>{p.estoque_minimo}</td>
                                        <td className="actions">
                                            <button onClick={() => handleEditProduct(p)} className="btn-action" title="Editar"><Edit size={18} /></button>
                                            <button onClick={() => handleDeleteProduct(p.cod_produto)} className="btn-action btn-delete" title="Desativar"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="empty-state-table">Nenhum produto encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {activeTab === 'equipamentos' && (
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Nº Série</th>
                                <th>Aquisição</th>
                                <th>Valor</th>
                                <th>Status</th>
                                <th>Localização</th>
                                <th>Próx. Manutenção</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEquipamentos.length > 0 ? (
                                filteredEquipamentos.map(e => (
                                    <tr key={e.cod_equipamento}>
                                        <td>{e.nome_equipamento}</td>
                                        <td>{e.numero_serie || 'N/A'}</td>
                                        <td>{new Date(e.data_aquisicao).toLocaleDateString()}</td>
                                        <td>R$ {Number(e.valor_aquisicao).toFixed(2).replace('.', ',')}</td>
                                        <td>{e.status_operacional}</td>
                                        <td>{e.localizacao_atual || 'N/A'}</td>
                                        <td>{e.proxima_manutencao ? new Date(e.proxima_manutencao).toLocaleDateString() : 'N/A'}</td>
                                        <td className="actions">
                                            <button onClick={() => handleEditEquipment(e)} className="btn-action" title="Editar"><Edit size={18} /></button>
                                            <button onClick={() => handleDeleteEquipment(e.cod_equipamento)} className="btn-action btn-delete" title="Desativar"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="empty-state-table">Nenhum equipamento encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modais para Produtos e Equipamentos */}
            {showProductModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <ProductForm
                            product={currentProduct}
                            onSave={handleSaveProduct}
                            onClose={() => setShowProductModal(false)}
                        />
                    </div>
                </div>
            )}
            {showEquipmentModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <EquipmentForm
                            equipment={currentEquipment}
                            onSave={handleSaveEquipment}
                            onClose={() => setShowEquipmentModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default EstoquePage;