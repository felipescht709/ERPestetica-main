// src/components/ClientVehicles.jsx
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Trash2 } from 'lucide-react';

const ClientVehicles = ({ cod_cliente, onVehicleRemoved }) => {
    const [clientVehicles, setClientVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (cod_cliente) {
            fetchClientVehicles();
        }
    }, [cod_cliente]);

    const fetchClientVehicles = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            // CORREÇÃO: Chamar a nova rota de backend para buscar veículos por cliente
            const result = await api(`/veiculos_clientes/by-client/${cod_cliente}`, { method: 'GET' });
            setClientVehicles(result); // A nova rota já retorna os detalhes do veículo
        } catch (err) {
            console.error('Erro ao buscar veículos do cliente:', err);
            setError(err.message || 'Erro ao carregar veículos deste cliente.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePossession = async (cod_veiculo, cod_cliente_param) => {
        if (window.confirm('Tem certeza que deseja encerrar a posse deste veículo para este cliente?')) {
            try {
                await api('/veiculos_clientes/remover', {
                    method: 'PUT',
                    body: JSON.stringify({ cod_veiculo, cod_cliente: cod_cliente_param }),
                });
                setMessage('Posse do veículo encerrada com sucesso!');
                if (onVehicleRemoved) {
                    onVehicleRemoved();
                }
                fetchClientVehicles(); // Recarrega a lista de veículos após a remoção/atualização
            } catch (err) {
                console.error('Erro ao encerrar posse do veículo:', err);
                setError(err.message || 'Erro ao encerrar posse do veículo. Tente novamente.');
            }
        }
    };

    if (loading) return <p>Carregando veículos...</p>;
    if (error) return <div className="alert error">{error}</div>;

    return (
        <div className="client-vehicles-container">
            {message && <div className="alert success">{message}</div>}
            {clientVehicles.length === 0 ? (
                <p>Nenhum veículo vinculado a este cliente ainda.</p>
            ) : (
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th>Placa</th>
                            <th>Marca</th>
                            <th>Modelo</th>
                            <th>Início da Posse</th>
                            <th>Fim da Posse</th>
                            <th>Proprietário Atual</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientVehicles.map((vehicle) => (
                            <tr key={vehicle.cod_veiculo_cliente}> {/* Usar a chave primária da tabela de ligação */}
                                <td>{vehicle.placa}</td>
                                <td>{vehicle.marca}</td>
                                <td>{vehicle.modelo}</td>
                                <td>{new Date(vehicle.data_inicio_posse).toLocaleDateString()}</td>
                                <td>{vehicle.data_fim_posse ? new Date(vehicle.data_fim_posse).toLocaleDateString() : 'Atual'}</td>
                                <td>{vehicle.is_proprietario_atual ? 'Sim' : 'Não'}</td>
                                <td className="actions">
                                    {vehicle.is_proprietario_atual && (
                                        <button
                                            onClick={() => handleRemovePossession(vehicle.cod_veiculo, vehicle.cod_cliente)}
                                            className="btn-action btn-delete"
                                            title="Encerrar Posse"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ClientVehicles;