// frontend/src/pages/AgendaPage.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'moment/locale/pt-br';

import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import AppointmentModal from '../components/AppointmentModal';

// Importe componentes do react-bootstrap que AINDA SÃO USADOS.
// Removi Container, Row, Col, Button, pois estamos usando div's e classes CSS customizadas,
// e o botão agora tem uma nova classe de estilo.
import { Spinner, Alert } from 'react-bootstrap'; 

// Importar ícones do Lucide React
import { Plus, Calendar as CalendarIcon } from 'lucide-react'; // Renomear Calendar do Lucide para evitar conflito


moment.locale('pt-br');
const localizer = momentLocalizer(moment);

localizer.formats = {
    dateFormat: 'DD/MM',
    dayFormat: 'ddd DD/MM',
    weekdayFormat: 'ddd',
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'HH:mm', culture) + ' - ' + local.format(end, 'HH:mm', culture),
    eventTimeRangeStartFormat: ({ start }, culture, local) => local.format(start, 'HH:mm', culture) + ' - ',
    eventTimeRangeEndFormat: ({ end }, culture, local) => ' - ' + local.format(end, 'HH:mm', culture),
    selectRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'DD/MM HH:mm', culture) + ' - ' + local.format(end, 'DD/MM HH:mm', culture),
    agendaDateFormat: 'ddd DD/MM',
    agendaTimeFormat: 'HH:mm',
    agendaTimeRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'HH:mm', culture) + ' - ' + local.format(end, 'HH:mm', culture),
    monthHeaderFormat: 'MMMM',
    dayHeaderFormat: 'dddd, DD/MM',
    weekHeaderFormat: (momentA, momentB, culture, local) =>
        local.format(momentA, 'DD/MM', culture) + ' - ' + local.format(momentB, 'DD/MM', culture),
    dayRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'DD/MM', culture) + ' - ' + local.format(end, 'DD/MM', culture),
};

const AgendaPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [currentView, setCurrentView] = useState('month'); // Estado para a view atual do calendário
    const [currentViewDate, setCurrentViewDate] = useState(new Date()); // Estado para a data atual do calendário

    const { userRole } = useContext(AuthContext);
    const canCreateEdit = ['admin', 'gerente', 'atendente', 'gestor'].includes(userRole);

    const fetchAppointments = useCallback(async (start, end) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api(`/agendamentos/range?start=${start.toISOString()}&end=${end.toISOString()}`, { method: 'GET' });
            const formattedEvents = data.map(app => ({
                id: app.cod_agendamento,
                title: `${app.cliente_nome} - ${app.servico_nome}`,
                start: new Date(app.data_hora_inicio),
                end: new Date(app.data_hora_fim),
                allDay: false,
                resource: app, // Guarda o objeto original do agendamento aqui
            }));
            setEvents(formattedEvents);
        } catch (err) {
            console.error('Erro ao buscar agendamentos:', err);
            setError('Erro ao carregar agendamentos. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Carrega agendamentos para o mês atual na montagem
        fetchAppointments(moment(currentViewDate).startOf('month').toDate(), moment(currentViewDate).endOf('month').toDate());
    }, [fetchAppointments, currentViewDate]);

    const handleSelectSlot = useCallback(({ start, end }) => {
        if (!canCreateEdit) {
            alert('Você não tem permissão para criar agendamentos.'); // Considerar usar um modal customizado
            return;
        }
        setSelectedAppointment({
            data_hora_inicio: start,
            data_hora_fim: end,
            status: 'agendado', // Default para novo agendamento
            // outros campos padrão para um novo agendamento
        });
        setShowModal(true);
    }, [canCreateEdit]);

    const handleSelectEvent = useCallback((event) => {
        setSelectedAppointment(event.resource); // Pega o objeto original
        setShowModal(true);
    }, []);

    const handleNavigate = useCallback((newDate, view, action) => {
        setCurrentViewDate(newDate);
        // Não é necessário buscar aqui, pois o useEffect já reage a `currentViewDate`
    }, []);

    const handleView = useCallback((newView) => {
        setCurrentView(newView);
        // Não é necessário buscar aqui, pois o useEffect já reage a `currentViewDate`
    }, []);

    if (loading) {
        return (
            <div className="loading-screen"> {/* Usando classe CSS customizada */}
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando agenda...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert error my-4"> {/* Usando classe CSS customizada */}
                <h3>Erro ao Carregar Agenda</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2><CalendarIcon size={28} style={{verticalAlign: 'middle', marginRight: '10px'}} /> Agenda de Agendamentos</h2>
                {canCreateEdit && (
                    <button className="btn-primary-dark" onClick={() => handleSelectSlot({ start: new Date(), end: new Date(new Date().setHours(new Date().getHours() + 1)) })}>
                        <Plus size={20} />
                        Novo Agendamento
                    </button>
                )}
            </div>

            <div style={{ height: '80vh' }} className="calendar-container section-content"> {/* Altura responsiva */}
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    selectable
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    onNavigate={handleNavigate}
                    onView={handleView}
                    view={currentView} // Controla a view com estado
                    date={currentViewDate} // Controla a data com estado
                    culture='pt-br'
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
                />
            </div>

            {showModal && (
                <AppointmentModal
                    appointment={selectedAppointment}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedAppointment(null);
                    }}
                    onSave={() => {
                        setShowModal(false);
                        setSelectedAppointment(null);
                        // Re-fetch agendamentos após salvar para atualizar a visualização
                        fetchAppointments(moment(currentViewDate).startOf(currentView).toDate(), moment(currentViewDate).endOf(currentView).toDate());
                    }}
                />
            )}
        </div>
    );
};

export default AgendaPage;
