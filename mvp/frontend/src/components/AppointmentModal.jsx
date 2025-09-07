// frontend/src/components/AppointmentModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Importar o useNavigate
import api from '../utils/api';
import moment from 'moment';
import { Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ConfirmationModal from './ConfirmationModal'; // Importar o novo modal
import Select from 'react-select';

const AppointmentModal = ({ appointment, onClose, onSave }) => {
    // 1. Define uma função que retorna um estado inicial limpo e previsível.
    const getInitialState = () => ({
        cod_agendamento: null,
        cliente_cod: '',
        veiculo_cod: '',
        usuario_responsavel_cod: '',
        // Usa a data/hora do slot clicado, ou a data/hora atual como fallback.
        data: appointment?.start ? moment(appointment.start).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        hora: appointment?.start ? moment(appointment.start).format('HH:mm') : moment().format('HH:mm'),
        duracao_minutos: 60,
        preco_total: '',
        status: 'agendado',
        tipo_agendamento: 'presencial',
        forma_pagamento: '',
        observacoes_agendamento: '',
    });
    const [formData, setFormData] = useState(getInitialState()); // Inicializa com o estado limpo.

    // NOVO: Estados para controlar a recorrência
    const [isRecurrent, setIsRecurrent] = useState(false);
    const [recorrencia, setRecorrencia] = useState({
        frequencia: 'semanal', // 'diaria', 'semanal', 'mensal'
        intervalo: 1,
        data_fim: moment(appointment?.start).add(1, 'month').format('YYYY-MM-DD'),
    });
    const handleRecorrenciaChange = (e) => {
        setRecorrencia(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const [clientes, setClientes] = useState([]);
    const [allServices, setAllServices] = useState([]); // Guarda todos os serviços disponíveis
    const [selectedServices, setSelectedServices] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    // ESTADOS APRIMORADOS:
    const [clientVehicles, setClientVehicles] = useState([]); // Armazena apenas os veículos do cliente selecionado
    const [isFetchingVehicles, setIsFetchingVehicles] = useState(false); // Controla o loading do select de veículos

    const [asyncState, setAsyncState] = useState({
        isSubmitting: false,
        isDeleting: false,
        isSendingConfirmation: false, // Novo estado de loading
        submissionError: null,
        isLoadingData: true,
        dataError: null,
    });
    const [showConfirmSendModal, setShowConfirmSendModal] = useState(false); // Para confirmar o envio
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const isEditing = !!appointment?.id;
    const navigate = useNavigate(); // 3. Inicializar o hook

    useEffect(() => {
    if (selectedServices && selectedServices.length > 0) {
        const newTotalDuration = selectedServices.reduce((total, s) => total + s.duracao_minutos, 0);
        const newTotalPrice = selectedServices.reduce((total, s) => total + parseFloat(s.preco), 0);
        setFormData(prev => ({ ...prev, duracao_minutos: newTotalDuration, preco_total: newTotalPrice }));
    } else {
        setFormData(prev => ({ ...prev, duracao_minutos: 0, preco_total: 0 }));
    }
}, [selectedServices]);

    // Fetch de dados para dropdowns
    useEffect(() => {
        const fetchDependencies = async () => {
            setAsyncState(prev => ({ ...prev, isLoadingData: true, dataError: null }));
            try {
                const [
                    clientsRes,
                    servicesRes,
                    usersRes
                ] = await Promise.all([
                    api('/clientes', { method: 'GET' }),
                    api('/servicos', { method: 'GET' }),
                    api('/usuarios', { method: 'GET' })
                ]);

                setClientes(clientsRes);
                setAllServices(servicesRes);
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

    // 2. Centraliza TODA a lógica de popular/resetar o formulário neste useEffect.
    //    Ele agora reage corretamente a qualquer mudança no 'appointment'.
   useEffect(() => {
    if (isEditing && appointment?.resource && allServices.length > 0) {
        setFormData({
            cod_agendamento: appointment.id,
            cliente_cod: appointment.resource.cliente_cod || '',
            veiculo_cod: appointment.resource.veiculo_cod || '',
            usuario_responsavel_cod: appointment.resource.usuario_responsavel_cod || '',
            data: moment(appointment.start).format('YYYY-MM-DD'),
            hora: moment(appointment.start).format('HH:mm'),
            duracao_minutos: appointment.resource.duracao_minutos || 0,
            preco_total: appointment.resource.preco_total || 0,
            status: appointment.resource.status || 'agendado',
            tipo_agendamento: appointment.resource.tipo_agendamento || 'presencial',
            forma_pagamento: appointment.resource.forma_pagamento || '',
            observacoes_agendamento: appointment.resource.observacoes_agendamento || '',
        });

        if (appointment.resource.servicos_agendados) {
            const servicesFromEvent = appointment.resource.servicos_agendados.map(s => {
                const fullService = allServices.find(as => as.cod_servico === s.cod_servico);
                return {
                    value: s.cod_servico,
                    label: `${s.nome_servico} (R$ ${Number(fullService.preco).toFixed(2)})`,
                    ...fullService
                };
            });
            setSelectedServices(servicesFromEvent);
        }
    } else {
        setFormData(getInitialState());
        setSelectedServices([]);
    }
}, [appointment, isEditing, allServices]);

    // EFEITO INTELIGENTE: Busca veículos apenas quando o cliente muda.
    useEffect(() => {
        const fetchVehiclesForClient = async () => {
            if (!formData.cliente_cod) {
                setClientVehicles([]);
                return;
            }
            setIsFetchingVehicles(true);
            try {
                // Usamos a rota que já existe para buscar veículos por cliente
                const vehicles = await api(`/veiculos_clientes/by-client/${formData.cliente_cod}`, { method: 'GET' });
                setClientVehicles(vehicles);
            } catch (err) {
                console.error(`Erro ao buscar veículos para o cliente ${formData.cliente_cod}:`, err);
                setClientVehicles([]); // Limpa em caso de erro para não mostrar dados antigos
            } finally {
                setIsFetchingVehicles(false);
            }
        };

        fetchVehiclesForClient();
    }, [formData.cliente_cod]); // Dispara toda vez que o cliente_cod muda

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = useCallback(() => {
        const { cliente_cod, data, hora, duracao_minutos, preco_total } = formData;
        if (!cliente_cod || !data || !hora) {
            setAsyncState(prev => ({ ...prev, submissionError: 'Cliente, Data e Hora são obrigatórios.' }));
            return false;
        }
        if (selectedServices.length === 0) {
            setAsyncState(prev => ({ ...prev, submissionError: 'Selecione pelo menos um serviço.' }));
            return false;
        }
        if (!duracao_minutos || !preco_total) {
            setAsyncState(prev => ({ ...prev, submissionError: 'Preço e duração devem ser calculados.' }));
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
    }, [formData, selectedServices]);

    const handleDelete = () => {
        if (!isEditing || !formData.cod_agendamento) return;
        setShowConfirmModal(true); // Apenas abre o modal de confirmação
    };

    const executeDelete = async () => {
        setShowConfirmModal(false); // Fecha o modal de confirmação
        setAsyncState(prev => ({ ...prev, isDeleting: true, submissionError: null }));
        try {
            await api(`/agendamentos/${formData.cod_agendamento}`, {
                method: 'DELETE',
            });
            toast.success('Agendamento cancelado com sucesso!');
            onSave();
        } catch (err) {
            console.error('Erro ao cancelar agendamento:', err);
            const errorMessage = err.msg || 'Não foi possível cancelar o agendamento.';
            setAsyncState(prev => ({ ...prev, submissionError: errorMessage }));
        } finally {
            setAsyncState(prev => ({ ...prev, isDeleting: false }));
        }
    };

    const handleSendConfirmation = async (canal) => {
        if (!isEditing) return;
        setShowConfirmSendModal(false); // Fecha o modal de confirmação de envio
        setAsyncState(prev => ({ ...prev, isSendingConfirmation: true, submissionError: null }));

        try {
            const response = await api(`/agendamentos/${formData.cod_agendamento}/enviar-confirmacao`, {
                method: 'POST',
                body: JSON.stringify({ canal }),
            });
            toast.success(response.msg || `Solicitação de confirmação enviada por ${canal}.`);
            // Opcional: fechar o modal principal após o envio bem-sucedido
            // onClose(); 
        } catch (err) {
            console.error('Erro ao enviar confirmação:', err);
            const errorMessage = err.msg || `Não foi possível enviar a confirmação por ${canal}.`;
            setAsyncState(prev => ({ ...prev, submissionError: errorMessage }));
            toast.error(errorMessage);
        } finally {
            setAsyncState(prev => ({ ...prev, isSendingConfirmation: false }));
        }
    };


    const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedServices.length === 0) {
        toast.error('É necessário selecionar pelo menos um serviço.');
        return;
    }

    setAsyncState(prev => ({ ...prev, isSubmitting: true, submissionError: null }));

    // Monta o payload para o backend
    const dataToSubmit = {
        ...formData,
        cliente_cod: Number(formData.cliente_cod),
        veiculo_cod: formData.veiculo_cod ? Number(formData.veiculo_cod) : null,
        usuario_responsavel_cod: formData.usuario_responsavel_cod ? Number(formData.usuario_responsavel_cod) : null,
        data_hora_inicio: moment(`${formData.data}T${formData.hora}`).toISOString(),
        // NOVO: O payload agora contém o array 'servicos'
        servicos: selectedServices.map(s => ({
            cod_servico: s.cod_servico,
            preco: parseFloat(s.preco),
            duracao_minutos: s.duracao_minutos
        }))
    };
    // Remove campos desnecessários
    delete dataToSubmit.data;
    delete dataToSubmit.hora;
        try {
            let response;
            // Se for recorrente, chama a nova rota. A recorrência só está disponível para novos agendamentos.
            if (isRecurrent && !isEditing) {
                const payload = {
                    agendamento: dataToSubmit,
                    recorrencia: {
                        ...recorrencia,
                        intervalo: Number(recorrencia.intervalo)
                    }
                };
                response = await api('/agendamentos/recorrentes', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                // Exibe um alerta com o resumo da operação
                let successMessage = response.msg;
                if (response.agendamentosIgnorados && response.agendamentosIgnorados.length > 0) {
                    successMessage += `\n\n${response.agendamentosIgnorados.length} datas foram ignoradas por conflitos ou regras da agenda.`;
                }
                toast.info(successMessage, { autoClose: 10000, closeOnClick: true });

            } else if (isEditing) {
                response = await api(`/agendamentos/${formData.cod_agendamento}`, {
                    method: 'PUT',
                    body: JSON.stringify(dataToSubmit),
                });
                toast.success('Agendamento atualizado com sucesso!');
            } else {
                // Criação de agendamento único
                response = await api('/agendamentos', {
                    method: 'POST',
                    body: JSON.stringify(dataToSubmit),
                });
                toast.success('Agendamento criado com sucesso!');
            }
            onSave(); // Notifica a página pai para recarregar os dados
        } catch (err) {
            console.error('Erro detalhado ao salvar agendamento:', err);
            const errorMessage = err.msg || 'Não foi possível salvar o agendamento. Verifique os dados e tente novamente.';
            
            setAsyncState(prev => ({ ...prev, submissionError: errorMessage }));
           
        } finally {
            setAsyncState(prev => ({ ...prev, isSubmitting: false, isDeleting: false }));
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
            <ConfirmationModal
                show={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={executeDelete}
                title="Confirmar Cancelamento"
                message="Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita."
                confirmText="Sim, Cancelar"
                isDestructive={true}
            />
            {/* Modal para confirmar o envio da mensagem */}
            <ConfirmationModal
                show={showConfirmSendModal}
                onClose={() => setShowConfirmSendModal(false)}
                title="Enviar Confirmação"
                message="Qual canal você deseja usar para enviar a solicitação de confirmação ao cliente?"
                isDestructive={false}
                customActions={() => (
                    <div className="d-flex justify-content-end gap-2">
                        <button className="button-secondary" onClick={() => handleSendConfirmation('email')}>E-mail</button>
                        <button className="button-primary" onClick={() => handleSendConfirmation('whatsapp')}>WhatsApp</button>
                    </div>
                )}
            />

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
                                {clientes.map((cli, index) => (
                                    <option key={`${cli.cod_cliente}-${index}`} value={cli.cod_cliente}>
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
                                disabled={isFetchingVehicles || !formData.cliente_cod}
                                className="input-field"
                            >
                                {isFetchingVehicles ? (
                                    <option>Carregando veículos...</option>
                                ) : (
                                    <>
                                        <option value="">Selecione um veículo (opcional)</option>
                                        {clientVehicles.map((vei, index) => (
                                            <option key={`${vei.cod_veiculo}-${index}`} value={vei.cod_veiculo}>
                                                {vei.marca} {vei.modelo} ({vei.placa})
                                            </option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="servicos">Serviços:</label>
                                <Select
                                    id="servicos"
                                    isMulti
                                    isClearable
                                    options={allServices.map(s => ({ value: s.cod_servico, label: `${s.nome_servico} (R$ ${Number(s.preco).toFixed(2)})`, ...s }))}
                                    value={selectedServices}
                                    onChange={(options) => setSelectedServices(options || [])}
                                    placeholder="Selecione um ou mais serviços"
                                    noOptionsMessage={() => "Nenhum serviço encontrado"}
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                />
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
                                {funcionarios.map((func, index) => (
                                    <option key={`${func.cod_usuario}-${index}`} value={func.cod_usuario}>
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
                            <label htmlFor="duracao_minutos">Duração Total (min):</label>
                            <input
                                type="number"
                                name="duracao_minutos"
                                id="duracao_minutos"
                                value={formData.duracao_minutos}
                                readOnly
                                className="input-field-disabled"
                            />
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="preco_total">Preço Total (R$):</label>
                            <input
                                type="number"
                                name="preco_total"
                                id="preco_total"
                                value={Number(formData.preco_total).toFixed(2)}
                                readOnly
                                className="input-field-disabled"
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
                                <option value="confirmado_cliente">Confirmado pelo Cliente</option>
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

                    {/* SEÇÃO DE RECORRÊNCIA - SÓ APARECE PARA NOVOS AGENDAMENTOS */}
                    {!isEditing && (
                        <div className="recorrencia-section">
                            <div className="form-group form-check">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="isRecurrent"
                                    checked={isRecurrent}
                                    onChange={(e) => setIsRecurrent(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="isRecurrent">
                                    Repetir este agendamento
                                </label>
                            </div>

                            {isRecurrent && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="frequencia">Frequência:</label>
                                        <select name="frequencia" value={recorrencia.frequencia} onChange={handleRecorrenciaChange} className="input-field">
                                            <option value="diaria">Diária</option>
                                            <option value="semanal">Semanal</option>
                                            <option value="mensal">Mensal</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="intervalo">A cada:</label>
                                        <input type="number" name="intervalo" value={recorrencia.intervalo} onChange={handleRecorrenciaChange} min="1" className="input-field" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="data_fim">Até:</label>
                                        <input
                                            type="date"
                                            name="data_fim"
                                            value={recorrencia.data_fim}
                                            onChange={handleRecorrenciaChange}
                                            min={formData.data} // Não pode terminar antes de começar
                                            className="input-field"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="modal-actions">
                        {isEditing && (
                            <button
                                type="button"
                                className="button-danger me-auto" // 'me-auto' alinha este botão à esquerda
                                onClick={handleDelete}
                                disabled={asyncState.isDeleting || asyncState.isSubmitting || isRecurrent}
                                title={isRecurrent ? "Não é possível cancelar um agendamento recorrente por aqui" : "Cancelar Agendamento"}
                            >
                                {asyncState.isDeleting ? (
                                    <><Spinner as="span" animation="border" size="sm" /> Cancelando...</>
                                ) : 'Cancelar Agendamento'}
                            </button>
                        )}
                        {isEditing && (
                            <button
                                type="button"
                                className="button-info" // Use uma classe de cor informativa
                                onClick={() => setShowConfirmSendModal(true)}
                                disabled={asyncState.isSendingConfirmation || asyncState.isSubmitting}
                            >
                                {asyncState.isSendingConfirmation ? 'Enviando...' : 'Enviar Confirmação'}
                            </button>
                        )}
                        <button type="button" className="button-secondary" onClick={onClose} disabled={asyncState.isSubmitting || asyncState.isDeleting}>
                            Cancelar
                        </button>
                        <button type="submit" className="button-primary" disabled={asyncState.isSubmitting || asyncState.isDeleting}>
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