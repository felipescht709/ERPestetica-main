// src/components/VehicleForm.jsx
import React, { useState, useEffect } from 'react';
import api from '../utils/api'; // Certifique-se de que o caminho está correto

const VehicleForm = ({ vehicleData, onClose, onVehicleCreated }) => {
    const [formData, setFormData] = useState({
        marca: '',
        modelo: '',
        ano: '',
        cor: '',
        placa: '',
        chassi: '',
        renavam: '',
        quilometragem_atual: '',
        observacoes: '',
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const isEditing = !!vehicleData;

    useEffect(() => {
        if (isEditing) {
            setFormData({
                marca: vehicleData.marca || '',
                modelo: vehicleData.modelo || '',
                ano: vehicleData.ano || '',
                cor: vehicleData.cor || '',
                placa: vehicleData.placa || '',
                chassi: vehicleData.chassi || '',
                renavam: vehicleData.renavam || '',
                quilometragem_atual: vehicleData.quilometragem_atual || '',
                observacoes: vehicleData.observacoes || '',
            });
        }
    }, [isEditing, vehicleData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handlePlacaChange = (e) => {
        let value = e.target.value.toUpperCase();
        // Permite formatar placas antigas (AAA-0000) e novas (AAA0A00)
        value = value.replace(/[^A-Z0-9]/g, ''); // Remove caracteres não alfanuméricos
        if (value.length > 7) value = value.slice(0, 7); // Limita a 7 caracteres

        if (value.length > 3 && value.length <= 7) {
            if (value.match(/^[A-Z]{3}\d{4}$/)) { // Padrão antigo AAA0000
                value = value.replace(/^([A-Z]{3})(\d{4})$/, '$1-$2');
            } else if (value.match(/^[A-Z]{3}\d[A-Z]\d{2}$/)) { // Padrão Mercosul AAA0A00
                 value = value.replace(/^([A-Z]{3})(\d)([A-Z])(\d{2})$/, '$1$2$3$4');
            }
        }
        setFormData({ ...formData, placa: value });
    };

    const validateForm = () => {
        const { marca, modelo, placa } = formData;
        if (!marca || !modelo || !placa) {
            setError('Marca, Modelo e Placa são campos obrigatórios.');
            return false;
        }
        // Validação mais robusta de placa (opcional, pode ser feito no backend também)
        const placaLimpa = placa.replace(/[^A-Z0-9]/g, '');
        const rePlacaAntiga = /^[A-Z]{3}\d{4}$/; // AAA0000
        const rePlacaMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/; // AAA0A00

        if (!rePlacaAntiga.test(placaLimpa) && !rePlacaMercosul.test(placaLimpa)) {
            setError('Formato de placa inválido. Use AAA0000 ou AAA0A00.');
            return false;
        }
        setError('');
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            let response;
            if (isEditing) {
                response = await api(`/veiculos/${vehicleData.cod_veiculo}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData),
                });
                setMessage('Veículo atualizado com sucesso!');
            } else {
                response = await api('/veiculos', {
                    method: 'POST',
                    body: JSON.stringify(formData),
                });
                setMessage('Veículo adicionado com sucesso!');
            }
            onVehicleCreated(response); // Callback para atualizar a lista ou vincular
            onClose(); // Fechar o modal
        } catch (err) {
            console.error('Erro ao salvar veículo:', err);
            setError(err.message || 'Erro ao salvar veículo. Verifique os dados e tente novamente.');
        }
    };

    return (
        <div className="form-container">
            <h3>{isEditing ? 'Editar Veículo' : 'Adicionar Novo Veículo'}</h3>
            {message && <div className="alert success">{message}</div>}
            {error && <div className="alert error">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="marca">Marca:</label>
                    <input
                        type="text"
                        id="marca"
                        name="marca"
                        value={formData.marca}
                        onChange={handleInputChange}
                        required
                        className="input-field"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="modelo">Modelo:</label>
                    <input
                        type="text"
                        id="modelo"
                        name="modelo"
                        value={formData.modelo}
                        onChange={handleInputChange}
                        required
                        className="input-field"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="ano">Ano:</label>
                    <input
                        type="number"
                        id="ano"
                        name="ano"
                        value={formData.ano}
                        onChange={handleInputChange}
                        className="input-field"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="cor">Cor:</label>
                    <input
                        type="text"
                        id="cor"
                        name="cor"
                        value={formData.cor}
                        onChange={handleInputChange}
                        className="input-field"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="placa">Placa:</label>
                    <input
                        type="text"
                        id="placa"
                        name="placa"
                        value={formData.placa}
                        onChange={handlePlacaChange}
                        maxLength="8" // AAA-0000 = 8 caracteres, AAA0A00 = 7 caracteres. Deixe 8 para incluir o '-'
                        placeholder="AAA-0000 ou AAA0A00"
                        required
                        className="input-field"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="chassi">Chassi:</label>
                    <input
                        type="text"
                        id="chassi"
                        name="chassi"
                        value={formData.chassi}
                        onChange={handleInputChange}
                        maxLength="17"
                        className="input-field"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="renavam">Renavam:</label>
                    <input
                        type="text"
                        id="renavam"
                        name="renavam"
                        value={formData.renavam}
                        onChange={handleInputChange}
                        maxLength="11"
                        className="input-field"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="quilometragem_atual">Quilometragem Atual:</label>
                    <input
                        type="number"
                        id="quilometragem_atual"
                        name="quilometragem_atual"
                        value={formData.quilometragem_atual}
                        onChange={handleInputChange}
                        className="input-field"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="observacoes">Observações:</label>
                    <textarea
                        id="observacoes"
                        name="observacoes"
                        value={formData.observacoes}
                        onChange={handleInputChange}
                        className="input-field"
                    ></textarea>
                </div>
                <div className="form-actions">
                    <button type="submit" className="button-primary">
                        {isEditing ? 'Salvar Alterações' : 'Adicionar Veículo'}
                    </button>
                    <button type="button" onClick={onClose} className="button-secondary">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
};

export default VehicleForm;