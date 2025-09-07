// src/components/estoque/ProductForm.jsx
import React, { useState, useEffect } from 'react';

const ProductForm = ({ product, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        nome_produto: '',
        descricao: '',
        tipo_produto: 'Consumivel', // Default
        quantidade_estoque: 0,
        unidade_medida: 'unidade',
        preco_custo: 0.00,
        preco_venda: 0.00,
        categoria: '',
        fornecedor: '',
        localizacao_estoque: '',
        estoque_minimo: 0,
        ativo: true,
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (product) {
            setFormData({
                nome_produto: product.nome_produto || '',
                descricao: product.descricao || '',
                tipo_produto: product.tipo_produto || 'Consumivel',
                quantidade_estoque: product.quantidade_estoque || 0,
                unidade_medida: product.unidade_medida || 'unidade',
                preco_custo: product.preco_custo || 0.00,
                preco_venda: product.preco_venda || 0.00,
                categoria: product.categoria || '',
                fornecedor: product.fornecedor || '',
                localizacao_estoque: product.localizacao_estoque || '',
                estoque_minimo: product.estoque_minimo || 0,
                ativo: product.ativo !== undefined ? product.ativo : true,
            });
        }
    }, [product]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // Validações básicas
        if (!formData.nome_produto || !formData.tipo_produto || formData.quantidade_estoque === null || formData.quantidade_estoque < 0 || !formData.unidade_medida || formData.preco_custo === null || formData.preco_custo < 0) {
            setError('Por favor, preencha todos os campos obrigatórios: Nome, Tipo, Quantidade, Unidade e Preço de Custo.');
            return;
        }
        if (formData.preco_venda < 0) {
            setError('Preço de Venda não pode ser negativo.');
            return;
        }

        onSave(formData);
    };

    return (
        <div className="form-modal">
            <h3>{product ? 'Editar Produto' : 'Adicionar Novo Produto'}</h3>
            {error && <div className="alert error">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="nome_produto">Nome do Produto:</label>
                    <input
                        type="text"
                        id="nome_produto"
                        name="nome_produto"
                        value={formData.nome_produto}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="tipo_produto">Tipo de Produto:</label>
                    <select
                        id="tipo_produto"
                        name="tipo_produto"
                        value={formData.tipo_produto}
                        onChange={handleChange}
                        required
                    >
                        <option value="Consumivel">Consumível (Serviço)</option>
                        <option value="Para Venda">Para Venda (Revenda)</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="quantidade_estoque">Quantidade em Estoque:</label>
                    <input
                        type="number"
                        id="quantidade_estoque"
                        name="quantidade_estoque"
                        value={formData.quantidade_estoque}
                        onChange={handleChange}
                        min="0"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="unidade_medida">Unidade de Medida:</label>
                    <input
                        type="text"
                        id="unidade_medida"
                        name="unidade_medida"
                        value={formData.unidade_medida}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="preco_custo">Preço de Custo (R$):</label>
                    <input
                        type="number"
                        id="preco_custo"
                        name="preco_custo"
                        value={formData.preco_custo}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="preco_venda">Preço de Venda Sugerido (R$):</label>
                    <input
                        type="number"
                        id="preco_venda"
                        name="preco_venda"
                        value={formData.preco_venda}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="categoria">Categoria:</label>
                    <input
                        type="text"
                        id="categoria"
                        name="categoria"
                        value={formData.categoria}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="fornecedor">Fornecedor:</label>
                    <input
                        type="text"
                        id="fornecedor"
                        name="fornecedor"
                        value={formData.fornecedor}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="localizacao_estoque">Localização no Estoque:</label>
                    <input
                        type="text"
                        id="localizacao_estoque"
                        name="localizacao_estoque"
                        value={formData.localizacao_estoque}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="estoque_minimo">Estoque Mínimo:</label>
                    <input
                        type="number"
                        id="estoque_minimo"
                        name="estoque_minimo"
                        value={formData.estoque_minimo}
                        onChange={handleChange}
                        min="0"
                    />
                </div>
                {product && ( // Apenas mostra o checkbox de ativo se estiver editando
                    <div className="form-group checkbox-group">
                        <input
                            type="checkbox"
                            id="ativo"
                            name="ativo"
                            checked={formData.ativo}
                            onChange={handleChange}
                        />
                        <label htmlFor="ativo">Ativo</label>
                    </div>
                )}
                <div className="form-actions">
                    <button type="submit" className="btn-primary-dark">Salvar</button>
                    <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;