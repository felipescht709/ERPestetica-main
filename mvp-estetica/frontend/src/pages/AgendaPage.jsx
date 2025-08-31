import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment-timezone';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'moment/locale/pt-br'; // Importa a localização em português

import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import AppointmentModal from '../components/AppointmentModal';

import { Spinner } from 'react-bootstrap';
import { Plus, Coffee } from 'lucide-react';

// Define o locale globalmente para toda a aplicação
moment.locale('pt-br');
// Inicializa o localizer do moment, que já deve estar configurado para pt-br globalmente
const localizer = momentLocalizer(moment);

// Objeto de formatação completo para corrigir os títulos e garantir o pt-br
localizer.formats = {
    // Formats for Month View
    monthHeaderFormat: 'MMMM YYYY',
    weekdayFormat: 'ddd', // Header for days of the week: Seg, Ter, Qua...
    dateFormat: 'DD', // Just the number for the day in the month grid

    // Formats for Week View
    dayRangeHeaderFormat: ({ start, end }, culture, local) =>
        local.format(start, 'DD [de] MMMM', culture) + ' – ' + local.format(end, 'DD [de] MMMM [de] YYYY', culture),
    dayFormat: 'ddd, DD/MM', // Header for each day column: Seg, 16/09

    // Format for Day View
    dayHeaderFormat: 'dddd, DD [de] MMMM [de] YYYY',

    // Formats for Agenda (List) View
    agendaHeaderFormat: ({ start, end }, culture, local) =>
        local.format(start, 'dddd, DD/MM/YYYY', culture),
    agendaDateFormat: 'ddd, DD/MM', // Date format for each item in the list
    agendaTimeFormat: 'HH:mm', // Time for each item in the list
    agendaTimeRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'HH:mm', culture) + ' – ' + local.format(end, 'HH:mm', culture),

    // Formats for Time Slots and Events
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'HH:mm', culture) + ' – ' + local.format(end, 'HH:mm', culture),
};

// Função para gerar eventos de bloqueio (almoço, pausas) movida para fora do componente
const generateBlockerEvents = (rules, viewStart, viewEnd) => {
    const blockerEvents = [];
    const intervalRules = rules.filter(r => r.tipo_regra === 'intervalo_almoco' && r.ativo);

    for (let m = moment(viewStart); m.isSameOrBefore(viewEnd); m.add(1, 'days')) {
        const dayOfWeek = m.day();
        const ruleForDay = intervalRules.find(r => r.dia_semana === dayOfWeek);

        if (ruleForDay) {
            const diaFormatado = m.format('YYYY-MM-DD');
            blockerEvents.push({
                id: `blocker-${diaFormatado}-${ruleForDay.cod_configuracao}`,
                title: ruleForDay.descricao || 'Intervalo',
                start: moment.tz(`${diaFormatado} ${ruleForDay.hora_inicio}`, 'America/Sao_Paulo').toDate(),
                end: moment.tz(`${diaFormatado} ${ruleForDay.hora_fim}`, 'America/Sao_Paulo').toDate(),
                isBlocker: true,
            });
        }
    }
    return blockerEvents;
};


const AgendaPage = () => {
    // Seus estados existentes
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [currentViewDate, setCurrentViewDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');
    const [configRules, setConfigRules] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
        const [servicos, setServicos] = useState([]);
        const [selectedFuncionarios, setSelectedFuncionarios] = useState([]);
        const [selectedServicos, setSelectedServicos] = useState([]);
        const [selectedStatus, setSelectedStatus] = useState([]);
        const { userRole } = useContext(AuthContext);
    
        const statusOptions = [
            { value: 'agendado', label: 'Agendado' },
            { value: 'em_andamento', label: 'Em Andamento' },
            { value: 'concluido', label: 'Concluído' },
            { value: 'cancelado', label: 'Cancelado' },
            { value: 'pendente', label: 'Pendente' },
            { value: 'confirmado_cliente', label: 'Confirmado pelo Cliente' },
        ];    
        // NOVO: Callback para aplicar estilos aos eventos do calendário
        const eventPropGetter = useCallback(
            (event) => {
                // Estilo para eventos de bloqueio (almoço/pausas)
                if (event.isBlocker) {
                    return {
                        className: 'rbc-event-blocked',
                        style: {
                            backgroundColor: '#e0e0e0', // Cinza claro
                            borderColor: '#b0b0b0',
                            color: '#616161',
                        }
                    };
                }

                // Estilo para agendamentos confirmados pelo cliente
                if (event.status === 'confirmado_cliente') {
                    return {
                        style: { backgroundColor: 'var(--purple-600)', borderColor: 'var(--purple-600)' } // Corrigido para usar aspas simples
                    }
                }
    
                // Estilo padrão para agendamentos normais
                const style = {
                    backgroundColor: event.backgroundColor,
                    borderColor: event.borderColor,
                    borderRadius: '5px',
                    color: '#fff',
                    border: '0px',
                    display: 'block'
                };
                return { style };
            },
            []
        );

        // Função otimizada para buscar agendamentos e regras da agenda em paralelo
         const fetchData = useCallback(async (start, end, filters) => {
            setLoading(true);
            setError(null);
            try {
                            const params = new URLSearchParams({
                                start: moment(start).toISOString(),
                                end: moment(end).toISOString(),
                            });
            
                            if (filters.responsaveis?.length > 0) {
                                params.append('responsaveis', filters.responsaveis.join(','));
                            }
                            if (filters.status?.length > 0) {
                                params.append('status', filters.status.join(','));
                            }
                            if (filters.servicos?.length > 0) {
                                params.append('servicos', filters.servicos.join(','));
                            }
                            const apiUrl = `/agendamentos?${params.toString()}`;
                
                            const [appointmentsResponse, configResponse] = await Promise.all([
                                api(apiUrl, { method: 'GET' }),
                                api('/agenda/config', { method: 'GET' })
                            ]);

            // ATUALIZAÇÃO: Mapeamento simplificado para usar as cores e aliases da API
            const mappedEvents = appointmentsResponse.map(app => ({
                ...app, // Passa todas as propriedades da API (title, backgroundColor, borderColor, etc)
                id: app.cod_agendamento, // Garante que o ID está correto
                start: new Date(app.start), // Converte a string de data para objeto Date
                end: new Date(app.end),     // Converte a string de data para objeto Date
                resource: { ...app } // Armazena todos os dados originais para o modal
            }));

            // Gera os eventos de bloqueio e os mescla com os agendamentos
            const blockerEvents = generateBlockerEvents(configResponse, start, end);

            setEvents([...mappedEvents, ...blockerEvents]);
            setConfigRules(Array.isArray(configResponse) ? configResponse : []);

        } catch (err) {
            console.error('Erro ao buscar dados da agenda:', err);
            setError(err.message || 'Erro ao carregar dados da agenda.');
        } finally {
            setLoading(false);
        } // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // A dependência de generateBlockerEvents foi removida
    // Efeito para buscar a lista de funcionários e serviços uma única vez
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const [usersRes, servicesRes] = await Promise.all([
                    api('/usuarios', { method: 'GET' }),
                    api('/servicos', { method: 'GET' })
                ]);
                // Filtra para incluir apenas usuários que podem ser responsáveis
                setFuncionarios(usersRes.filter(u => ['tecnico', 'atendente', 'gerente', 'admin'].includes(u.role)));
                setServicos(servicesRes);
            } catch (err) {
                console.error("Erro ao buscar dados para filtros:", err);
            }
        };
        fetchFilterData();
    }, []);

    // Efeito para buscar os dados sempre que a data ou a visualização mudam
        useEffect(() => {
            let start, end;
    
            // Lógica para definir o intervalo de datas com base na visualização
            if (currentView === 'agenda') {
                // Para a visualização 'agenda', buscamos um período fixo (ex: 30 dias) a partir da data atual
                start = moment(currentViewDate).startOf('day').toDate();
                end = moment(currentViewDate).add(30, 'days').endOf('day').toDate();
            } else {
                // Para as outras visualizações (mês, semana, dia), usamos o início/fim da própria visualização
                start = moment(currentViewDate).startOf(currentView).toDate();
                end = moment(currentViewDate).endOf(currentView).toDate();
            }
           const currentFilters = {
                responsaveis: selectedFuncionarios,
                status: selectedStatus,
                servicos: selectedServicos,
            };
            fetchData(start, end, currentFilters);
        }, [currentViewDate, currentView, fetchData, selectedFuncionarios, selectedStatus, selectedServicos]);

    // Função poderosa que aplica estilos aos dias do calendário
    const dayPropGetter = useCallback((date) => {
        const diaFormatado = moment(date).format('YYYY-MM-DD');
        
        // Procura por regras de feriado/bloqueio ativas
        const diaBloqueado = configRules.find(
            rule => rule.tipo_regra === 'feriado' && rule.ativo && moment(rule.data_especifica).format('YYYY-MM-DD') === diaFormatado
        );

        if (diaBloqueado) {
            return {
                className: 'rbc-day-bg-blocked',
                title: diaBloqueado.descricao || 'Dia bloqueado'
            };
        }

        // Procura por dias da semana sem expediente
        const diaDaSemana = moment(date).day();
        const regraDoDia = configRules.find(
            rule => rule.tipo_regra === 'horario_trabalho' && rule.dia_semana === diaDaSemana
        );
        
        if (!regraDoDia || !regraDoDia.ativo) {
            return {
                className: 'rbc-day-bg-closed',
                title: 'Fechado'
            };
        }

        return {}; // Retorna um objeto vazio para dias normais
    }, [configRules]);

    // Previne a abertura do modal em dias bloqueados
    const handleSelectSlot = useCallback(({ start }) => {
        const props = dayPropGetter(start);
        if (props.className === 'rbc-day-bg-blocked' || props.className === 'rbc-day-bg-closed') {
            alert(props.title || "Este dia não está disponível para agendamentos.");
            return;
        }

        setSelectedAppointment({ start, end: moment(start).add(60, 'minutes').toDate() });
        setShowModal(true);
    }, [dayPropGetter]);

    const handleSelectEvent = useCallback((event) => {
        // Impede a abertura do modal para eventos de bloqueio
        if (event.isBlocker) {
            return;
        }
        setSelectedAppointment(event);
        setShowModal(true);
    }, []);

    const handleViewChange = useCallback((view) => {
        setCurrentView(view);
    }, []);

    const handleNavigate = useCallback((newDate) => {
        setCurrentViewDate(newDate);
    }, []);

    if (loading) {
        return <div className="loading-screen"><Spinner animation="border" /></div>;
    }

    const currentFilters = {
        responsaveis: selectedFuncionarios,
        status: selectedStatus,
        servicos: selectedServicos,
    }

    if (error) {
        return <div className="alert error my-4"><h3>Erro</h3><p>{error}</p></div>;
    }

    return (
            <div className="page-container">
                        <div className="page-header-controls">
                            <h2>Agenda de Agendamentos</h2>
                            <div className="actions-and-filters">
                                <div className="filter-group" title="Segure CTRL (ou Command em Mac) para selecionar múltiplos">
                                    <label htmlFor="status-filter">Status</label>
                                    <select id="status-filter" multiple value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(Array.from(e.target.selectedOptions, o => o.value))}
                                        className="form-control">
                                        {statusOptions.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-group" title="Segure CTRL (ou Command em Mac) para selecionar múltiplos">
                                    <label htmlFor="servico-filter">Serviço</label>
                                    <select id="servico-filter" multiple value={selectedServicos}
                                        onChange={(e) => setSelectedServicos(Array.from(e.target.selectedOptions, o => o.value))}
                                        className="form-control">
                                        {servicos.map(s => (
                                            <option key={s.cod_servico} value={s.cod_servico}>{s.nome_servico}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-group" title="Segure CTRL (ou Command em Mac) para selecionar múltiplos">
                                    <label htmlFor="funcionario-filter">Responsável</label>
                                    <select id="funcionario-filter" multiple value={selectedFuncionarios}
                                        onChange={(e) => setSelectedFuncionarios(Array.from(e.target.selectedOptions, o => o.value))}
                                        className="form-control">
                                        {funcionarios.map(f => (
                                            <option key={f.cod_usuario} value={f.cod_usuario}>{f.nome_usuario}</option>
                                        ))}
                                    </select>
                                </div>
                                {(selectedFuncionarios.length > 0 || selectedServicos.length > 0 || selectedStatus.length > 0) && (
                                    <button 
                                        className="btn-secondary-outline" 
                                        onClick={() => {
                                            setSelectedFuncionarios([]);
                                            setSelectedServicos([]);
                                            setSelectedStatus([]);
                                        }}
                                        title="Limpar todos os filtros"
                                    >
                                        Limpar Filtros
                                    </button>
                                )}
                                <button className="btn-primary-dark" onClick={() => handleSelectSlot({ start: new Date() })}>
                                    <Plus size={20} /> Novo Agendamento
                                </button>
                            </div>
                        </div>

            <div style={{ height: '700px' }}>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 650 }}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    onView={handleViewChange}
                    onNavigate={handleNavigate}
                    view={currentView}
                    date={currentViewDate}
                    culture='pt-br'
                    dayPropGetter={dayPropGetter} // Aplica os estilos dinâmicos aos dias
                    eventPropGetter={eventPropGetter} // <-- AQUI A MÁGICA ACONTECE
                    messages={{
                        allDay: 'Dia Inteiro',
                        previous: 'Anterior',
                        next: 'Próximo',
                        today: 'Hoje',
                        month: 'Mês',
                        week: 'Semana',
                        day: 'Dia',
                        agenda: 'Lista',
                        date: 'Data',
                        time: 'Hora',
                        event: 'Evento',
                        noEventsInRange: 'Nenhum agendamento neste período.',
                        showMore: total => `+ Ver mais (${total})`
                    }}
                    min={new Date(0, 0, 0, 6, 0, 0)} // Horário mínimo visível
                    max={new Date(0, 0, 0, 20, 0, 0)} // Horário máximo visível
                />
            </div>

            {showModal && (
                <AppointmentModal
                    appointment={selectedAppointment}
                    configRules={configRules}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedAppointment(null);
                    }}
                    onSave={() => {
                        setShowModal(false);
                        setSelectedAppointment(null);
                        // Recarrega os dados para mostrar o novo agendamento
                        const start = moment(currentViewDate).startOf(currentView).toDate();
                        const end = moment(currentViewDate).endOf(currentView).toDate();
                        fetchData(start, end, currentFilters);
                    }}
                />
            )}
        </div>
    );
};

export default AgendaPage;