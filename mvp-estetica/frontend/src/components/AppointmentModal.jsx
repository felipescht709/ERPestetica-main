// frontend/src/components/AppointmentModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api'; // Sua função para chamadas de API autenticadas
import moment from 'moment'; // Necessário para formatação de datas
import { Spinner } from 'react-bootstrap'; // Usado para feedback visual de carregamento

const AppointmentModal = ({ appointment, onClose, onSave }) => {
    // Estado para os campos do formulário do agendamento
    const [formData, setFormData] = useState({
        // `appointment.id` é usado por react-big-calendar para eventos existentes
        cod_agendamento: appointment?.resource?.cod_agendamento || appointment?.id || null,
        cliente_cod: appointment?.resource?.cliente_cod || '',
        servico_cod: appointment?.resource?.servico_cod || '',
        veiculo_cod: appointment?.resource?.veiculo_cod || '',
        usuario_responsavel_cod: appointment?.resource?.usuario_responsavel_cod || '',
        data: appointment?.start ? moment(appointment.start).format('YYYY-MM-DD') : '',
        hora: appointment?.start ? moment(appointment.start).format('HH:mm') : '',
        // Ajusta a duração para um valor default se for um slot vazio, ou usa a do evento
        duracao_minutos: appointment?.resource?.duracao_minutos || (appointment?.end ? moment(appointment.end).diff(moment(appointment.start), 'minutes') : 60), // Default 60 min para novo slot
        preco_total: appointment?.resource?.preco_total || '',
        status: appointment?.resource?.status || 'Pendente',
        tipo_agendamento: appointment?.resource?.tipo_agendamento || 'Online',
        forma_pagamento: appointment?.resource?.forma_pagamento || 'Cartão',
        observacoes_agendamento: appointment?.resource?.observacoes_agendamento || ''
    });

    // Estado para os dados dos dropdowns
    const [dropdownData, setDropdownData] = useState({
        clients: [],
        services: [],
        vehicles: [],
        users: [],
    });

    // Estado centralizado para operações assíncronas (carregamento e erros)
    const [asyncState, setAsyncState] = useState({
        isLoadingData: true,      // Para o carregamento inicial dos dropdowns
        dataError: null,          // Erro no carregamento inicial
        isSubmitting: false,      // Para o envio do formulário
        submissionError: null,    // Erro no envio do formulário
    });

    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

    // Efeito para carregar os dados dos dropdowns na montagem do modal
    useEffect(() => {
        const fetchDropdownData = async () => {
            setAsyncState(prev => ({ ...prev, isLoadingData: true, dataError: null }));
            try {
                // Carrega dados em paralelo para melhor performance
                const [clientsData, servicesData, usersData] = await Promise.all([
                    api('/clientes', { method: 'GET' }),
                    api('/servicos', { method: 'GET' }),
                    api('/usuarios', { method: 'GET' }),
                ]);

                setDropdownData({ clients: clientsData, services: servicesData, users: usersData, vehicles: [] });
            } catch (err) {
                console.error('Erro ao carregar dados para dropdowns:', err);
                setAsyncState(prev => ({ ...prev, dataError: `Erro ao carregar opções: ${err.message || 'Verifique sua conexão.'}` }));
            } finally {
                setAsyncState(prev => ({ ...prev, isLoadingData: false }));
            }
        };

        fetchDropdownData();
    }, []);

    // Efeito para carregar veículos quando um cliente é selecionado
    useEffect(() => {
        if (formData.cliente_cod) {
            const fetchVehiclesByClient = async () => {
                setIsLoadingVehicles(true);
                try {
                    // NOTA: Esta rota `/veiculos/cliente/:id` precisa ser implementada no backend.
                    // Uma alternativa seria `GET /api/clientes/:id/veiculos`.
                    const vehicleData = await api(`/veiculos/cliente/${formData.cliente_cod}`, { method: 'GET' });
                    setDropdownData(prev => ({ ...prev, vehicles: vehicleData }));
                } catch (err) {
                    console.error('Erro ao carregar veículos do cliente:', err);
                    setDropdownData(prev => ({ ...prev, vehicles: [] })); // Limpa veículos em caso de erro
                } finally {
                    setIsLoadingVehicles(false);
                }
            };
            fetchVehiclesByClient();
        } else {
            setDropdownData(prev => ({ ...prev, vehicles: [] })); // Limpa veículos se nenhum cliente for selecionado
        }
    }, [formData.cliente_cod]);

    // Efeito para preencher duração e preço do serviço ao selecionar um serviço
    useEffect(() => {
        const selectedService = dropdownData.services.find(s => s.cod_servico === parseInt(formData.servico_cod));
        if (selectedService) {
            setFormData(prev => ({
                ...prev,
                // Só preenche se o campo for "falsy", permitindo que o usuário sobrescreva o valor
                duracao_minutos: prev.duracao_minutos || selectedService.duracao_minutos,
                preco_total: prev.preco_total || selectedService.preco,
            }));
        }
    }, [formData.servico_cod, dropdownData.services]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!formData.cliente_cod || !formData.servico_cod || !formData.data || !formData.hora || !formData.duracao_minutos || !formData.preco_total) {
            setAsyncState(prev => ({ ...prev, submissionError: 'Por favor, preencha todos os campos obrigatórios.' }));
            return;
        }

        setAsyncState(prev => ({ ...prev, isSubmitting: true, submissionError: null }));

        try {
            if (formData.cod_agendamento) { // Modo de edição
                await api(`/agendamentos/${formData.cod_agendamento}`, {
                    method: 'PUT',
                    body: formData,
                });
            } else { // Modo de criação
                await api('/agendamentos', {
                    method: 'POST',
                    body: formData,
                });
            }
            onSave(); // Sucesso: fecha o modal e atualiza a agenda
        } catch (err) {
            console.error('Erro ao salvar agendamento:', err);
            setAsyncState(prev => ({ ...prev, submissionError: `Erro ao salvar: ${err.message || 'Tente novamente.'}` }));
        } finally {
            setAsyncState(prev => ({ ...prev, isSubmitting: false }));
        }
    }, [formData, onSave]);

    // Renderiza uma mensagem de carregamento ou erro se os dropdowns não carregarem
    if (asyncState.isLoadingData) {
        return (
            <div className="modal-backdrop">
                <div className="modal-content" style={{ textAlign: 'center' }}>
                    <Spinner animation="border" />
                    <p className="mt-3">Carregando opções...</p>
                </div>
            </div>
        );
    }

    if (asyncState.dataError) {
        return (
            <div className="modal-backdrop">
                <div className="modal-content">
                    <p className="alert error">{asyncState.dataError}</p>
                    <button onClick={onClose} className="button-secondary mt-4">Fechar</button>
                </div>
            </div>
        );
    }

    // Renderiza o formulário completo do modal
    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>{formData.cod_agendamento ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="cliente_cod">Cliente:</label>
                        <select name="cliente_cod" id="cliente_cod" value={formData.cliente_cod} onChange={handleChange} required className="input-field">
                            <option value="">Selecione um Cliente</option>
                            {dropdownData.clients.map(client => (
                                <option key={client.cod_cliente} value={client.cod_cliente}>{client.nome_cliente}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="servico_cod">Serviço:</label>
                        <select name="servico_cod" id="servico_cod" value={formData.servico_cod} onChange={handleChange} required className="input-field">
                            <option value="">Selecione um Serviço</option>
                            {dropdownData.services.map(service => (
                                <option key={service.cod_servico} value={service.cod_servico}>{service.nome_servico} (R$ {parseFloat(service.preco).toFixed(2)})</option>
                            ))}
                        </select>
                    </div>

                    {/* Exibir veículos se um cliente estiver selecionado e houver veículos */}
                    {formData.cliente_cod && (
                        <div className="form-group">
                            <label htmlFor="veiculo_cod">Veículo:
                                {isLoadingVehicles && <Spinner animation="border" size="sm" className="ms-2" />}
                            </label>
                            <select name="veiculo_cod" id="veiculo_cod" value={formData.veiculo_cod} onChange={handleChange} className="input-field" disabled={isLoadingVehicles}>
                                <option value="">Selecione um Veículo (Opcional)</option>
                                {dropdownData.vehicles.map(vehicle => (
                                    <option key={vehicle.cod_veiculo} value={vehicle.cod_veiculo}>{vehicle.marca} {vehicle.modelo} ({vehicle.placa})</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="usuario_responsavel_cod">Responsável:</label>
                        <select name="usuario_responsavel_cod" id="usuario_responsavel_cod" value={formData.usuario_responsavel_cod} onChange={handleChange} className="input-field">
                            <option value="">Selecione um Responsável (Opcional)</option>
                            {dropdownData.users.filter(u => ['admin', 'gerente', 'atendente', 'tecnico', 'gestor'].includes(u.role)).map(user => (
                                <option key={user.cod_usuario} value={user.cod_usuario}>{user.nome_usuario} ({user.role})</option>
                            ))}
                        </select>
                    </div>

                    {/* Use uma div .form-row para agrupar campos half-width */}
                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="data">Data:</label>
                            <input type="date" name="data" id="data" value={formData.data} onChange={handleChange} required className="input-field" />
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="hora">Hora:</label>
                            <input type="time" name="hora" id="hora" value={formData.hora} onChange={handleChange} required className="input-field" />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="duracao_minutos">Duração (minutos):</label>
                            <input type="number" name="duracao_minutos" id="duracao_minutos" value={formData.duracao_minutos} onChange={handleChange} required className="input-field" />
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="preco_total">Preço Total:</label>
                            <input type="number" step="0.01" name="preco_total" id="preco_total" value={formData.preco_total} onChange={handleChange} required className="input-field" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="status">Status:</label>
                        <select name="status" id="status" value={formData.status} onChange={handleChange} required className="input-field">
                            <option value="Pendente">Pendente</option>
                            <option value="Confirmado">Confirmado</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Concluído">Concluído</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="tipo_agendamento">Tipo de Agendamento:</label>
                        <select name="tipo_agendamento" id="tipo_agendamento" value={formData.tipo_agendamento} onChange={handleChange} className="input-field">
                            <option value="Online">Online</option>
                            <option value="Telefone">Telefone</option>
                            <option value="Presencial">Presencial</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="forma_pagamento">Forma de Pagamento:</label>
                        <select name="forma_pagamento" id="forma_pagamento" value={formData.forma_pagamento} onChange={handleChange} className="input-field">
                            <option value="Cartão">Cartão</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Pix">Pix</option>
                            <option value="Boleto">Boleto</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="observacoes_agendamento">Observações:</label>
                        <textarea name="observacoes_agendamento" id="observacoes_agendamento" value={formData.observacoes_agendamento} onChange={handleChange} className="input-field"></textarea>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="button-secondary" onClick={onClose} disabled={asyncState.isSubmitting}>
                            Cancelar
                        </button>
                        <button type="submit" className="button-primary" disabled={asyncState.isSubmitting}>
                            {asyncState.isSubmitting ? (
                                <>
                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                    <span className="ms-2">Salvando...</span>
                                </>
                            ) : 'Salvar Agendamento'}
                        </button>
                    </div>

                    {asyncState.submissionError && (
                        <div className="alert error mt-3">{asyncState.submissionError}</div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default AppointmentModal;