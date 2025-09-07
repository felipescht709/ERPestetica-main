// frontend/src/components/cadastros/VehiclesManagement.jsx
import React, { useState, useEffect } from 'react';
import api from '../../utils/api'; // O caminho para a api agora é ../../
import VehicleForm from '../VehicleForm'; // O caminho para o form é ../
import { Plus, Search, Edit, Trash2 } from 'lucide-react';

const VehiclesManagement = () => {
    const [vehicles, setVehicles] = useState([]);
    const [clients, setClients] = useState([]);
    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentVehicle, setCurrentVehicle] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [showLinkModal, setShowLinkModal] = useState(false);
    const [selectedVehicleToLink, setSelectedVehicleToLink] = useState(null);
    const [selectedClientToLink, setSelectedClientToLink] = useState('');

    useEffect(() => {
        fetchVehicles();
        fetchClients();
    }, []);

    const fetchVehicles = async () => {
        try {
            const res = await api('/veiculos', { method: 'GET' });
            setVehicles(res);
        } catch (err) {
            console.error('Erro ao buscar veículos:', err);
            setError('Erro ao carregar veículos. Tente novamente.');
        }
    };

    const fetchClients = async () => {
        try {
            const res = await api('/clientes', { method: 'GET' });
            setClients(res);
        } catch (err) {
            console.error('Erro ao buscar clientes:', err);
        }
    };

    const handleAddClick = () => {
        setIsEditing(false);
        setCurrentVehicle(null);
        setMessage('');
        setError('');
        setShowVehicleModal(true);
    };

    const handleEditClick = (vehicle) => {
        setIsEditing(true);
        setCurrentVehicle(vehicle);
        setMessage('');
        setError('');
        setShowVehicleModal(true);
    };

    const handleDeleteClick = async (cod_veiculo) => {
        if (window.confirm('Tem certeza que deseja excluir este veículo?')) {
            try {
                await api(`/veiculos/${cod_veiculo}`, { method: 'DELETE' });
                setMessage('Veículo excluído com sucesso!');
                fetchVehicles();
            } catch (err) {
                console.error('Erro ao excluir veículo:', err);
                setError('Erro ao excluir veículo. Verifique se há agendamentos vinculados.');
            }
        }
    };

    const handleVehicleCreated = (newOrUpdatedVehicle) => {
        fetchVehicles();
        setMessage(`Veículo ${newOrUpdatedVehicle.placa} salvo com sucesso!`);
    };

    const closeVehicleModal = () => {
        setShowVehicleModal(false);
        setMessage('');
        setError('');
    };

    const handleOpenLinkModal = (vehicle) => {
        setSelectedVehicleToLink(vehicle);
        setSelectedClientToLink('');
        setMessage('');
        setError('');
        setShowLinkModal(true);
    };

    const handleLinkVehicleToClient = async (e) => {
        e.preventDefault();
        if (!selectedClientToLink || !selectedVehicleToLink) {
            setError('Selecione um cliente e um veículo para vincular.');
            return;
        }
        try {
            await api('/veiculos_clientes', {
                method: 'POST',
                body: JSON.stringify({
                    cod_veiculo: selectedVehicleToLink.cod_veiculo,
                    cod_cliente: selectedClientToLink,
                }),
            });
            setMessage(`Veículo ${selectedVehicleToLink.placa} vinculado ao cliente com sucesso!`);
            fetchVehicles();
            setShowLinkModal(false);
        } catch (err) {
            console.error('Erro ao vincular veículo ao cliente:', err);
            setError(err.message || 'Erro ao vincular veículo ao cliente.');
        }
    };

    const filteredVehicles = vehicles.filter(vehicle =>
        vehicle.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.modelo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="page-section-header" style={{ marginTop: 0, justifyContent: 'space-between' }}>
                <h3>Gerenciamento de Veículos</h3>
                <button className="btn-primary-dark" onClick={handleAddClick}>
                    <Plus size={20} />
                    Novo Veículo
                </button>
            </div>

            {message && <div className="alert success">{message}</div>}
            {error && <div className="alert error">{error}</div>}

            <div className="search-input-container">
                <Search size={20} className="search-icon" />
                <input
                    type="text"
                    placeholder="Buscar veículos (placa, marca, modelo)..."
                    className="input-field"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="table-responsive section-content">
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th>Placa</th>
                            <th>Marca</th>
                            <th>Modelo</th>
                            <th>Ano</th>
                            <th>Cor</th>
                            <th>Ações</th>
                            <th>Vincular</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVehicles.length > 0 ? (
                            filteredVehicles.map((vehicle) => (
                                <tr key={vehicle.cod_veiculo}>
                                    <td>{vehicle.placa}</td>
                                    <td>{vehicle.marca}</td>
                                    <td>{vehicle.modelo}</td>
                                    <td>{vehicle.ano || 'N/A'}</td>
                                    <td>{vehicle.cor || 'N/A'}</td>
                                    <td className="actions">
                                        <button onClick={() => handleEditClick(vehicle)} className="btn-action" title="Editar">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteClick(vehicle.cod_veiculo)} className="btn-action btn-delete" title="Excluir">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                    <td>
                                        <button onClick={() => handleOpenLinkModal(vehicle)} className="btn-action">
                                            Vincular a Cliente
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="empty-state-table">Nenhum veículo encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showVehicleModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <VehicleForm
                            vehicleData={currentVehicle}
                            onClose={closeVehicleModal}
                            onVehicleCreated={handleVehicleCreated}
                        />
                    </div>
                </div>
            )}

            {showLinkModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>Vincular Veículo a Cliente: {selectedVehicleToLink?.placa}</h3>
                        {error && <div className="alert error">{error}</div>}
                        <form onSubmit={handleLinkVehicleToClient}>
                            <div className="form-group">
                                <label htmlFor="client-select">Selecionar Cliente:</label>
                                <select
                                    id="client-select"
                                    value={selectedClientToLink}
                                    onChange={(e) => setSelectedClientToLink(Number(e.target.value))}
                                    className="input-field"
                                    required
                                >
                                    <option value="">-- Selecione um Cliente --</option>
                                    {clients.map(client => (
                                        <option key={client.cod_cliente} value={client.cod_cliente}>
                                            {client.nome_cliente} ({client.cpf})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="button-primary">Vincular</button>
                                <button type="button" onClick={() => setShowLinkModal(false)} className="button-secondary">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default VehiclesManagement;