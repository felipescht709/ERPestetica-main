// frontend/src/components/AppointmentModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import moment from 'moment';
import { Spinner } from 'react-bootstrap';

const AppointmentModal = ({ appointment, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        cod_agendamento: appointment?.resource?.cod_agendamento || appointment?.id || null,
        cliente_cod: appointment?.resource?.cliente_cod || '',
        servico_cod: appointment?.resource?.servico_cod || '',
        veiculo_cod: appointment?.resource?.veiculo_cod || '',
        usuario_responsavel_cod: appointment?.resource?.usuario_responsavel_cod || '',
        data: appointment?.start ? moment(appointment.start).format('YYYY-MM-DD') : '',
        hora: appointment?.start ? moment(appointment.start).format('HH:mm') : '',
        duracao_minutos: appointment?.resource?.duracao_minutos || (appointment?.end ? moment(appointment.end).diff(moment(appointment.start), 'minutes') : 60),
        preco_total: appointment?.resource?.preco_total || '',
        status: appointment?.resource?.status || 'agendado',
        tipo_agendamento: appointment?.resource?.tipo_agendamento || 'presencial',
        forma_pagamento: appointment?.resource?.forma_pagamento || '',
        observacoes_agendamento: appointment?.resource?.observacoes_agendamento || '',
    });

    const [clientes, setClientes] = useState([]);
    const [veiculos, setVeiculos] = useState([]); // Todos os veículos
    const [servicos, setServicos] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [filteredVehicles, setFilteredVehicles] = useState([]); // Veículos filtrados por cliente

    const [asyncState, setAsyncState] = useState({
        isSubmitting: false,
        submissionError: null,
        isLoadingData: true,
        dataError: null,
    });

    const isEditing = !!appointment?.id;

    // Fetch de dados para dropdowns
    useEffect(() => {
        const fetchDependencies = async () => {
            setAsyncState(prev => ({ ...prev, isLoadingData: true, dataError: null }));
            try {
                const [
                    clientsRes,
                    vehiclesRes, // Buscar todos os veículos
                    servicesRes,
                    usersRes
                ] = await Promise.all([
                    api('/clientes', { method: 'GET' }),
                    api('/veiculos', { method: 'GET' }),
                    api('/servicos', { method: 'GET' }),
                    api('/usuarios', { method: 'GET' })
                ]);

                setClientes(clientsRes);
                setVeiculos(vehiclesRes); // Armazena todos os veículos
                setServicos(servicesRes);
                setFuncionarios(usersRes.filter(u => ['tecnico', 'atendente', 'gerente', 'admin'].includes(u.role)));

            } catch (err) {
                console.error('Erro ao carregar dados para o formulário de agendamento:', err);
                setAsyncState(prev => ({ ...prev, dataError: err.message || 'Erro ao carregar dados essenciais.' }));
            } finally {
                setAsyncState(prev => ({ ...prev, isLoadingData: false }));
            }
        };
        fetchDependencies();
    }, []);

    // Popula o formulário se estiver em modo de edição
    useEffect(() => {
        if (isEditing && appointment) {
            setFormData({
                cod_agendamento: appointment.resource.cod_agendamento || appointment.id,
                cliente_cod: appointment.resource.cliente_cod || '',
                servico_cod: appointment.resource.servico_cod || '',
                veiculo_cod: appointment.resource.veiculo_cod || '',
                usuario_responsavel_cod: appointment.resource.usuario_responsavel_cod || '',
                data: moment(appointment.start).format('YYYY-MM-DD'),
                hora: moment(appointment.start).format('HH:mm'),
                duracao_minutos: appointment.resource.duracao_minutos || moment(appointment.end).diff(moment(appointment.start), 'minutes'),
                preco_total: appointment.resource.preco_total || '',
                status: appointment.resource.status || 'agendado',
                tipo_agendamento: appointment.resource.tipo_agendamento || 'presencial',
                forma_pagamento: appointment.resource.forma_pagamento || '',
                observacoes_agendamento: appointment.resource.observacoes_agendamento || '',
            });
        } else if (appointment?.start) {
             // Para novos agendamentos criados clicando em um slot do calendário
            setFormData(prev => ({
                ...prev,
                data: moment(appointment.start).format('YYYY-MM-DD'),
                hora: moment(appointment.start).format('HH:mm'),
                duracao_minutos: (appointment?.end ? moment(appointment.end).diff(moment(appointment.start), 'minutes') : 60),
            }));
        }
    }, [isEditing, appointment]);

    // Efeito para filtrar veículos quando o cliente muda ou os veículos são carregados
    useEffect(() => {
        if (formData.cliente_cod && veiculos.length > 0) {
            setFilteredVehicles(veiculos.filter(v => v.cod_cliente === Number(formData.cliente_cod)));
        } else {
            setFilteredVehicles([]);
        }
    }, [formData.cliente_cod, veiculos]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        // Se o campo for servico_cod e o serviço for selecionado, atualiza preço e duração
        if (name === 'servico_cod') {
            const selectedService = servicos.find(s => s.cod_servico === Number(value));
            if (selectedService) {
                setFormData(prev => ({
                    ...prev,
                    servico_cod: newValue,
                    preco_total: selectedService.preco, // Preço do serviço
                    duracao_minutos: selectedService.duracao_minutos // Duração do serviço
                }));
                return; // Já atualizou o estado, sai da função
            }
        }
        setFormData(prev => ({ ...prev, [name]: newValue }));
    };

    const validateForm = useCallback(() => {
        const { cliente_cod, servico_cod, data, hora, duracao_minutos, preco_total } = formData;
        if (!cliente_cod || !servico_cod || !data || !hora || !duracao_minutos || !preco_total) {
            setAsyncState(prev => ({ ...prev, submissionError: 'Por favor, preencha todos os campos obrigatórios (Cliente, Serviço, Data, Hora, Duração, Preço).' }));
            return false;
        }
        if (Number(duracao_minutos) <= 0) {
            setAsyncState(prev => ({ ...prev, submissionError: 'A duração deve ser maior que zero.' }));
            return false;
        }
        if (Number(preco_total) < 0) {
            setAsyncState(prev => ({ ...prev, submissionError: 'O preço total não pode ser negativo.' }));
            return false;
        }
        setAsyncState(prev => ({ ...prev, submissionError: null }));
        return true;
    }, [formData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setAsyncState(prev => ({ ...prev, isSubmitting: true, submissionError: null }));

        // Preparar os dados para o backend
        const dataToSubmit = { ...formData };
        dataToSubmit.cliente_cod = Number(dataToSubmit.cliente_cod);
        dataToSubmit.servico_cod = Number(dataToSubmit.servico_cod);
        dataToSubmit.veiculo_cod = dataToSubmit.veiculo_cod ? Number(dataToSubmit.veiculo_cod) : null;
        dataToSubmit.usuario_responsavel_cod = dataToSubmit.usuario_responsavel_cod ? Number(dataToSubmit.usuario_responsavel_cod) : null;
        dataToSubmit.preco_total = Number(dataToSubmit.preco_total);
        dataToSubmit.duracao_minutos = Number(dataToSubmit.duracao_minutos);

        // Combinar data e hora para data_hora_inicio
        dataToSubmit.data_hora_inicio = moment(`${dataToSubmit.data}T${dataToSubmit.hora}`).toISOString();
        
        // Calcular data_hora_fim
        dataToSubmit.data_hora_fim = moment(dataToSubmit.data_hora_inicio).add(dataToSubmit.duracao_minutos, 'minutes').toISOString();

        // Remover campos que não vão para o backend ou são calculados
        delete dataToSubmit.data;
        delete dataToSubmit.hora;
        delete dataToSubmit.cod_agendamento; // Se for novo, não precisa enviar; se for edição, o ID já está na URL

        try {
            let response;
            if (isEditing) {
                response = await api(`/agendamentos/${formData.cod_agendamento}`, {
                    method: 'PUT',
                    body: JSON.stringify(dataToSubmit),
                });
            } else {
                response = await api('/agendamentos', {
                    method: 'POST',
                    body: JSON.stringify(dataToSubmit),
                });
            }
            onSave(response); // Notifica a página pai que o agendamento foi salvo
        } catch (err) {
            console.error('Erro ao salvar agendamento:', err);
            setAsyncState(prev => ({ ...prev, submissionError: err.message || 'Erro ao salvar agendamento.' }));
        } finally {
            setAsyncState(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    if (asyncState.isLoadingData) {
        return (
            <div className="modal-backdrop">
                <div className="modal-content">
                    <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
                    <span className="ms-2">Carregando dados...</span>
                </div>
            </div>
        );
    }

    if (asyncState.dataError) {
        return (
            <div className="modal-backdrop">
                <div className="modal-content">
                    <div className="alert error">{asyncState.dataError}</div>
                    <button type="button" className="button-secondary" onClick={onClose}>Fechar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>{isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="cliente_cod">Cliente:</label>
                            <select
                                name="cliente_cod"
                                id="cliente_cod"
                                value={formData.cliente_cod}
                                onChange={handleChange}
                                required
                                className="input-field"
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
                            <label htmlFor="veiculo_cod">Veículo:</label>
                            <select
                                name="veiculo_cod"
                                id="veiculo_cod"
                                value={formData.veiculo_cod}
                                onChange={handleChange}
                                className="input-field"
                            >
                                <option value="">Selecione um veículo (opcional)</option>
                                {filteredVehicles.map(vei => (
                                    <option key={vei.cod_veiculo} value={vei.cod_veiculo}>
                                        {vei.marca} {vei.modelo} ({vei.placa})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="servico_cod">Serviço:</label>
                            <select
                                name="servico_cod"
                                id="servico_cod"
                                value={formData.servico_cod}
                                onChange={handleChange}
                                required
                                className="input-field"
                            >
                                <option value="">Selecione um serviço</option>
                                {servicos.map(serv => (
                                    <option key={serv.cod_servico} value={serv.cod_servico}>
                                        {serv.nome_servico} (R$ {Number(serv.preco).toFixed(2).replace('.', ',')})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="usuario_responsavel_cod">Responsável:</label>
                            <select
                                name="usuario_responsavel_cod"
                                id="usuario_responsavel_cod"
                                value={formData.usuario_responsavel_cod}
                                onChange={handleChange}
                                className="input-field"
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

                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="data">Data:</label>
                            <input
                                type="date"
                                name="data"
                                id="data"
                                value={formData.data}
                                onChange={handleChange}
                                required
                                className="input-field"
                            />
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="hora">Hora:</label>
                            <input
                                type="time"
                                name="hora"
                                id="hora"
                                value={formData.hora}
                                onChange={handleChange}
                                required
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                         <div className="form-group half-width">
                            <label htmlFor="duracao_minutos">Duração (min):</label>
                            <input
                                type="number"
                                name="duracao_minutos"
                                id="duracao_minutos"
                                value={formData.duracao_minutos}
                                onChange={handleChange}
                                required
                                min="1"
                                className="input-field"
                            />
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="preco_total">Preço Total (R$):</label>
                            <input
                                type="number"
                                name="preco_total"
                                id="preco_total"
                                value={formData.preco_total}
                                onChange={handleChange}
                                required
                                step="0.01"
                                min="0"
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="status">Status:</label>
                            <select
                                name="status"
                                id="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="input-field"
                            >
                                <option value="agendado">Agendado</option>
                                <option value="em_andamento">Em Andamento</option>
                                <option value="concluido">Concluído</option>
                                <option value="cancelado">Cancelado</option>
                                <option value="pendente">Pendente</option>
                            </select>
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="tipo_agendamento">Tipo:</label>
                            <select
                                name="tipo_agendamento"
                                id="tipo_agendamento"
                                value={formData.tipo_agendamento}
                                onChange={handleChange}
                                className="input-field"
                            >
                                <option value="presencial">Presencial</option>
                                <option value="online">Online</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="forma_pagamento">Forma de Pagamento:</label>
                        <input
                            type="text"
                            name="forma_pagamento"
                            id="forma_pagamento"
                            value={formData.forma_pagamento}
                            onChange={handleChange}
                            className="input-field"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="observacoes_agendamento">Observações:</label>
                        <textarea
                            name="observacoes_agendamento"
                            id="observacoes_agendamento"
                            value={formData.observacoes_agendamento}
                            onChange={handleChange}
                            className="input-field"
                        ></textarea>
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