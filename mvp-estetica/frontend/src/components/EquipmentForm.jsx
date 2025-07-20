// src/components/estoque/EquipmentForm.jsx
import React, { useState, useEffect } from 'react';

const EquipmentForm = ({ equipment, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        nome_equipamento: '',
        descricao: '',
        numero_serie: '',
        data_aquisicao: '',
        valor_aquisicao: 0.00,
        vida_util_anos: 0,
        status_operacional: 'Operacional', // Default
        proxima_manutencao: '',
        localizacao_atual: '',
        responsavel_cod: null, // Pode ser um select de usuários no futuro
        ativo: true,
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (equipment) {
            setFormData({
                nome_equipamento: equipment.nome_equipamento || '',
                descricao: equipment.descricao || '',
                numero_serie: equipment.numero_serie || '',
                data_aquisicao: equipment.data_aquisicao ? new Date(equipment.data_aquisicao).toISOString().split('T')[0] : '',
                valor_aquisicao: equipment.valor_aquisicao || 0.00,
                vida_util_anos: equipment.vida_util_anos || 0,
                status_operacional: equipment.status_operacional || 'Operacional',
                proxima_manutencao: equipment.proxima_manutencao ? new Date(equipment.proxima_manutencao).toISOString().split('T')[0] : '',
                localizacao_atual: equipment.localizacao_atual || '',
                responsavel_cod: equipment.responsavel_cod || null,
                ativo: equipment.ativo !== undefined ? equipment.ativo : true,
            });
        }
    }, [equipment]);

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
        if (!formData.nome_equipamento || !formData.data_aquisicao || formData.valor_aquisicao === null || formData.valor_aquisicao < 0 || !formData.status_operacional) {
            setError('Por favor, preencha todos os campos obrigatórios: Nome, Data de Aquisição, Valor de Aquisição e Status Operacional.');
            return;
        }

        onSave(formData);
    };

    return (
        <div className="form-modal">
            <h3>{equipment ? 'Editar Equipamento' : 'Adicionar Novo Equipamento'}</h3>
            {error && <div className="alert error">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="nome_equipamento">Nome do Equipamento:</label>
                    <input
                        type="text"
                        id="nome_equipamento"
                        name="nome_equipamento"
                        value={formData.nome_equipamento}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="numero_serie">Número de Série:</label>
                    <input
                        type="text"
                        id="numero_serie"
                        name="numero_serie"
                        value={formData.numero_serie}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="data_aquisicao">Data de Aquisição:</label>
                    <input
                        type="date"
                        id="data_aquisicao"
                        name="data_aquisicao"
                        value={formData.data_aquisicao}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="valor_aquisicao">Valor de Aquisição (R$):</label>
                    <input
                        type="number"
                        id="valor_aquisicao"
                        name="valor_aquisicao"
                        value={formData.valor_aquisicao}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="status_operacional">Status Operacional:</label>
                    <select
                        id="status_operacional"
                        name="status_operacional"
                        value={formData.status_operacional}
                        onChange={handleChange}
                        required
                    >
                        <option value="Operacional">Operacional</option>
                        <option value="Em Manutencao">Em Manutenção</option>
                        <option value="Quebrado">Quebrado</option>
                        <option value="Desativado">Desativado</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="proxima_manutencao">Próxima Manutenção:</label>
                    <input
                        type="date"
                        id="proxima_manutencao"
                        name="proxima_manutencao"
                        value={formData.proxima_manutencao}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="localizacao_atual">Localização Atual:</label>
                    <input
                        type="text"
                        id="localizacao_atual"
                        name="localizacao_atual"
                        value={formData.localizacao_atual}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="descricao">Descrição:</label>
                    <textarea
                        id="descricao"
                        name="descricao"
                        value={formData.descricao}
                        onChange={handleChange}
                    ></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="vida_util_anos">Vida Útil Estimada (Anos):</label>
                    <input
                        type="number"
                        id="vida_util_anos"
                        name="vida_util_anos"
                        value={formData.vida_util_anos}
                        onChange={handleChange}
                        min="0"
                    />
                </div>
                {/* Futuramente, aqui pode ser um select para o responsável_cod */}
                {equipment && ( // Apenas mostra o checkbox de ativo se estiver editando
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

export default EquipmentForm;