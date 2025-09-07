// src/components/financeiro/DespesaForm.jsx
import React, { useState, useEffect } from 'react';

const DespesaForm = ({ despesa, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        descricao: '',
        valor: 0.00,
        data_vencimento: '',
        data_pagamento: '',
        status_pagamento: 'Pendente', // Default
        tipo_despesa: '',
        observacoes: '',
        ativo: true, // Para soft delete
    });
    const [error, setError] = useState('');

    const isEditing = !!despesa;

    useEffect(() => {
        if (isEditing && despesa) {
            setFormData({
                descricao: despesa.descricao || '',
                valor: despesa.valor || 0.00,
                data_vencimento: despesa.data_vencimento ? new Date(despesa.data_vencimento).toISOString().split('T')[0] : '',
                data_pagamento: despesa.data_pagamento ? new Date(despesa.data_pagamento).toISOString().split('T')[0] : '',
                status_pagamento: despesa.status_pagamento || 'Pendente',
                tipo_despesa: despesa.tipo_despesa || '',
                observacoes: despesa.observacoes || '',
                ativo: despesa.ativo !== undefined ? despesa.ativo : true,
            });
        }
    }, [isEditing, despesa]);

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
        if (!formData.descricao || formData.valor === null || formData.valor < 0 || !formData.status_pagamento) {
            setError('Descrição, valor e status de pagamento são obrigatórios.');
            return;
        }

        const dataToSave = { ...formData };
        // Garante que campos de data vazios sejam null, não string vazia
        if (dataToSave.data_vencimento === '') dataToSave.data_vencimento = null;
        if (dataToSave.data_pagamento === '') dataToSave.data_pagamento = null;
        if (dataToSave.observacoes === '') dataToSave.observacoes = null;
        if (dataToSave.tipo_despesa === '') dataToSave.tipo_despesa = null;


        onSave(dataToSave);
    };

    return (
        <div className="form-modal">
            <h3>{isEditing ? 'Editar Despesa' : 'Adicionar Nova Despesa'}</h3>
            {error && <div className="alert error">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="descricao">Descrição:</label>
                    <input
                        type="text"
                        id="descricao"
                        name="descricao"
                        value={formData.descricao}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="valor">Valor (R$):</label>
                    <input
                        type="number"
                        id="valor"
                        name="valor"
                        value={formData.valor}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="data_vencimento">Data de Vencimento:</label>
                    <input
                        type="date"
                        id="data_vencimento"
                        name="data_vencimento"
                        value={formData.data_vencimento}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="data_pagamento">Data de Pagamento:</label>
                    <input
                        type="date"
                        id="data_pagamento"
                        name="data_pagamento"
                        value={formData.data_pagamento}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="status_pagamento">Status de Pagamento:</label>
                    <select
                        id="status_pagamento"
                        name="status_pagamento"
                        value={formData.status_pagamento}
                        onChange={handleChange}
                        required
                    >
                        <option value="Pendente">Pendente</option>
                        <option value="Pago">Pago</option>
                        <option value="Atrasado">Atrasado</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="tipo_despesa">Tipo de Despesa:</label>
                    <input
                        type="text"
                        id="tipo_despesa"
                        name="tipo_despesa"
                        value={formData.tipo_despesa}
                        onChange={handleChange}
                        placeholder="Ex: Aluguel, Salário, Material"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="observacoes">Observações:</label>
                    <textarea
                        id="observacoes"
                        name="observacoes"
                        value={formData.observacoes}
                        onChange={handleChange}
                        rows="3"
                    ></textarea>
                </div>
                {isEditing && ( // Apenas mostra o checkbox de ativo se estiver editando
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

export default DespesaForm;