// src/components/ordem_servico/OrdemServicoForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Plus, XCircle } from 'lucide-react'; // Ícones para adicionar/remover itens

const OrdemServicoForm = ({ os, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        cod_cliente: '',
        cod_veiculo: '',
        data_abertura: new Date().toISOString().split('T')[0], // Data atual por padrão
        data_conclusao_prevista: '',
        status_os: 'Aberta', // Status inicial padrão
        observacoes: '',
        cod_funcionario_responsavel: '',
        itens: [], // Array para os itens de serviço/produto
    });

    const [clientes, setClientes] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [produtosEstoque, setProdutosEstoque] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]); // Para o responsável
    const [error, setError] = useState('');

    const isEditing = !!os;

    // Fetch de dados para dropdowns
    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const [
                    clientsRes,
                    vehiclesRes,
                    servicesRes,
                    productsRes,
                    usersRes
                ] = await Promise.all([
                    api('/clientes', { method: 'GET' }),
                    api('/veiculos', { method: 'GET' }),
                    api('/servicos', { method: 'GET' }),
                    api('/produtos_estoque', { method: 'GET' }),
                    api('/usuarios', { method: 'GET' }) // Buscar todos os usuários para o responsável
                ]);

                setClientes(clientsRes);
                setVeiculos(vehiclesRes);
                setServicos(servicesRes);
                setProdutosEstoque(productsRes);
                // Filtra usuários para papéis que podem ser responsáveis (ex: tecnico, atendente, gerente, admin)
                setFuncionarios(usersRes.filter(u => ['tecnico', 'atendente', 'gerente', 'admin'].includes(u.role)));

            } catch (err) {
                console.error('Erro ao carregar dados para o formulário de OS:', err);
                setError(err.message || 'Erro ao carregar dados essenciais.');
            }
        };
        fetchDependencies();
    }, []);

    // Popula o formulário se estiver em modo de edição
    useEffect(() => {
        if (isEditing && os) {
            setFormData({
                cod_cliente: os.cod_cliente || '',
                cod_veiculo: os.cod_veiculo || '',
                data_abertura: os.data_abertura ? new Date(os.data_abertura).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                data_conclusao_prevista: os.data_conclusao_prevista ? new Date(os.data_conclusao_prevista).toISOString().split('T')[0] : '',
                status_os: os.status_os || 'Aberta',
                observacoes: os.observacoes || '',
                cod_funcionario_responsavel: os.cod_funcionario_responsavel || '',
                itens: os.itens ? os.itens.map(item => ({
                    ...item,
                    quantidade: item.quantidade, // Garante que seja número
                    valor_unitario: item.valor_unitario, // Garante que seja número
                })) : [],
            });
        }
    }, [isEditing, os]);

    const handleMainFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, e) => {
        const { name, value, type } = e.target;
        const newItens = [...formData.itens];
        
        let updatedValue = value;
        if (type === 'number') {
            updatedValue = parseFloat(value);
            if (isNaN(updatedValue)) updatedValue = 0; // Previne NaN
        }

        newItens[index] = { ...newItens[index], [name]: updatedValue };

        // Recalcular valor_total do item
        const quantidade = newItens[index].quantidade || 0;
        const valorUnitario = newItens[index].valor_unitario || 0;
        newItens[index].valor_total = (quantidade * valorUnitario).toFixed(2);

        setFormData(prev => ({ ...prev, itens: newItens }));
    };

    const handleItemTypeChange = (index, e) => {
        const newItens = [...formData.itens];
        newItens[index] = {
            ...newItens[index],
            tipo_item: e.target.value,
            cod_servico: null, // Reseta o outro tipo
            cod_produto: null, // Reseta o outro tipo
            // Pode resetar valor_unitario e quantidade se fizer sentido para o fluxo
            quantidade: 1, // Resetando para um valor padrão
            valor_unitario: 0 // Resetando para um valor padrão
        };
        setFormData(prev => ({ ...prev, itens: newItens }));
    };

    const handleServiceOrProductSelect = (index, e) => {
        const { name, value } = e.target; // name será 'cod_servico' ou 'cod_produto'
        const selectedId = parseInt(value);
        const newItens = [...formData.itens];

        newItens[index][name] = selectedId;

        // Tenta pré-popular valor_unitario com base no serviço/produto selecionado
        if (name === 'cod_servico' && selectedId) {
            const selectedService = servicos.find(s => s.cod_servico === selectedId);
            if (selectedService) {
                newItens[index].valor_unitario = parseFloat(selectedService.preco);
            }
        } else if (name === 'cod_produto' && selectedId) {
            const selectedProduct = produtosEstoque.find(p => p.cod_produto === selectedId);
            if (selectedProduct) {
                newItens[index].valor_unitario = parseFloat(selectedProduct.preco_venda || selectedProduct.preco_custo); // Prioriza venda, senão custo
            }
        }
        
        // Recalcular valor_total do item
        const quantidade = newItens[index].quantidade || 0;
        const valorUnitario = newItens[index].valor_unitario || 0;
        newItens[index].valor_total = (quantidade * valorUnitario).toFixed(2);

        setFormData(prev => ({ ...prev, itens: newItens }));
    };


    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            itens: [
                ...prev.itens,
                { tipo_item: 'Servico', cod_servico: null, cod_produto: null, quantidade: 1, valor_unitario: 0, observacoes_item: '', valor_total: 0 }
            ]
        }));
    };

    const handleRemoveItem = (index) => {
        const newItens = formData.itens.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, itens: newItens }));
    };

    const validateForm = () => {
        if (!formData.cod_cliente || !formData.status_os) {
            setError('Cliente e Status são obrigatórios.');
            return false;
        }
        if (!formData.itens.length) {
            setError('Uma Ordem de Serviço deve ter pelo menos um item (serviço ou produto).');
            return false;
        }
        for (const item of formData.itens) {
            if (item.tipo_item === 'Servico' && !item.cod_servico) {
                setError('Item de serviço requer um serviço selecionado.');
                return false;
            }
            if (item.tipo_item === 'Produto' && !item.cod_produto) {
                setError('Item de produto requer um produto selecionado.');
                return false;
            }
            if (item.quantidade <= 0) {
                setError('Quantidade do item deve ser maior que zero.');
                return false;
            }
            if (item.valor_unitario < 0) {
                setError('Valor unitário do item não pode ser negativo.');
                return false;
            }
        }
        setError('');
        return true;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const dataToSave = { ...formData };
        // Limpar dados que podem ser nulos no DB, mas são strings vazias no form
        Object.keys(dataToSave).forEach(key => {
            if (dataToSave[key] === '') {
                dataToSave[key] = null;
            }
        });
        // Converter IDs para números, se necessário
        if (dataToSave.cod_cliente) dataToSave.cod_cliente = Number(dataToSave.cod_cliente);
        if (dataToSave.cod_veiculo) dataToSave.cod_veiculo = Number(dataToSave.cod_veiculo);
        if (dataToSave.cod_funcionario_responsavel) dataToSave.cod_funcionario_responsavel = Number(dataToSave.cod_funcionario_responsavel);

        onSave(dataToSave);
    };

    const totalCalculated = formData.itens.reduce((acc, item) => acc + (parseFloat(item.valor_total) || 0), 0).toFixed(2);


    return (
        <div className="os-form-container">
            {error && <div className="alert error">{error}</div>}
            <form onSubmit={handleSubmit}>
                {/* Dados Principais da OS */}
                <div className="form-section">
                    <h4>Dados da Ordem de Serviço</h4>
                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="cod_cliente">Cliente:</label>
                            <select
                                id="cod_cliente"
                                name="cod_cliente"
                                value={formData.cod_cliente}
                                onChange={handleMainFormChange}
                                required
                            >
                                <option value="">Selecione um cliente</option>
                                {clientes.map(cli => (
                                    <option key={cli.cod_cliente} value={cli.cod_cliente}>
                                        {cli.nome_cliente} ({cli.cpf})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="cod_veiculo">Veículo:</label>
                            <select
                                id="cod_veiculo"
                                name="cod_veiculo"
                                value={formData.cod_veiculo}
                                onChange={handleMainFormChange}
                            >
                                <option value="">Selecione um veículo (Opcional)</option>
                                {veiculos.map(vei => (
                                    <option key={vei.cod_veiculo} value={vei.cod_veiculo}>
                                        {vei.marca} {vei.modelo} ({vei.placa})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="data_abertura">Data de Abertura:</label>
                            <input
                                type="date"
                                id="data_abertura"
                                name="data_abertura"
                                value={formData.data_abertura}
                                onChange={handleMainFormChange}
                                required
                            />
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="data_conclusao_prevista">Conclusão Prevista:</label>
                            <input
                                type="date"
                                id="data_conclusao_prevista"
                                name="data_conclusao_prevista"
                                value={formData.data_conclusao_prevista}
                                onChange={handleMainFormChange}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="status_os">Status da OS:</label>
                            <select
                                id="status_os"
                                name="status_os"
                                value={formData.status_os}
                                onChange={handleMainFormChange}
                                required
                            >
                                <option value="Aberta">Aberta</option>
                                <option value="Em Andamento">Em Andamento</option>
                                <option value="Aguardando Pecas">Aguardando Peças</option>
                                <option value="Pronta para Retirada">Pronta para Retirada</option>
                                <option value="Concluida">Concluída</option>
                                <option value="Cancelada">Cancelada</option>
                            </select>
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="cod_funcionario_responsavel">Funcionário Responsável:</label>
                            <select
                                id="cod_funcionario_responsavel"
                                name="cod_funcionario_responsavel"
                                value={formData.cod_funcionario_responsavel}
                                onChange={handleMainFormChange}
                            >
                                <option value="">Nenhum</option>
                                {funcionarios.map(func => (
                                    <option key={func.cod_usuario} value={func.cod_usuario}>
                                        {func.nome_usuario} ({func.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="observacoes">Observações da OS:</label>
                        <textarea
                            id="observacoes"
                            name="observacoes"
                            value={formData.observacoes}
                            onChange={handleMainFormChange}
                            rows="3"
                        ></textarea>
                    </div>
                </div>

                {/* Itens da Ordem de Serviço */}
                <div className="form-section">
                    <h4>Itens da Ordem de Serviço</h4>
                    {formData.itens.map((item, index) => (
                        <div key={index} className="os-item-row">
                            <div className="form-group os-item-type">
                                <label>Tipo:</label>
                                <select
                                    name="tipo_item"
                                    value={item.tipo_item}
                                    onChange={(e) => handleItemTypeChange(index, e)}
                                    required
                                >
                                    <option value="Servico">Serviço</option>
                                    <option value="Produto">Produto</option>
                                </select>
                            </div>
                            <div className="form-group os-item-select">
                                <label>{item.tipo_item === 'Servico' ? 'Serviço:' : 'Produto:'}</label>
                                {item.tipo_item === 'Servico' ? (
                                    <select
                                        name="cod_servico"
                                        value={item.cod_servico || ''}
                                        onChange={(e) => handleServiceOrProductSelect(index, e)}
                                        required
                                    >
                                        <option value="">Selecione um serviço</option>
                                        {servicos.map(s => (
                                            <option key={s.cod_servico} value={s.cod_servico}>
                                                {s.nome_servico} (R$ {Number(s.preco).toFixed(2).replace('.', ',')})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <select
                                        name="cod_produto"
                                        value={item.cod_produto || ''}
                                        onChange={(e) => handleServiceOrProductSelect(index, e)}
                                        required
                                    >
                                        <option value="">Selecione um produto</option>
                                        {produtosEstoque.filter(p => p.tipo_produto === 'Para Venda' || p.tipo_produto === 'Consumivel').map(p => (
                                            <option key={p.cod_produto} value={p.cod_produto}>
                                                {p.nome_produto} ({p.unidade_medida}) (R$ {Number(p.preco_venda || p.preco_custo).toFixed(2).replace('.', ',')})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="form-group os-item-qty">
                                <label>Qtd:</label>
                                <input
                                    type="number"
                                    name="quantidade"
                                    value={item.quantidade}
                                    onChange={(e) => handleItemChange(index, e)}
                                    min="0.01"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <div className="form-group os-item-price">
                                <label>Valor Unit. (R$):</label>
                                <input
                                    type="number"
                                    name="valor_unitario"
                                    value={item.valor_unitario}
                                    onChange={(e) => handleItemChange(index, e)}
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="form-group os-item-total">
                                <label>Total:</label>
                                <span className="os-item-total-value">R$ {Number(item.valor_total).toFixed(2).replace('.', ',')}</span>
                            </div>
                            <button type="button" className="btn-remove-item" onClick={() => handleRemoveItem(index)}>
                                <XCircle size={20} />
                            </button>
                        </div>
                    ))}
                    <button type="button" className="btn-add-item" onClick={handleAddItem}>
                        <Plus size={18} /> Adicionar Item
                    </button>
                    <div className="os-total-display">
                        <span>Total da OS:</span>
                        <strong>R$ {totalCalculated.replace('.', ',')}</strong>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-primary-dark">
                        {isEditing ? 'Salvar Alterações' : 'Criar Ordem de Serviço'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OrdemServicoForm;