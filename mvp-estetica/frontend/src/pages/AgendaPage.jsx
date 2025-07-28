// frontend/src/pages/AgendaPage.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment'; // Mantenha a importação de moment

// REMOVA ESTA LINHA: import 'moment/locale/pt-br'; // Já está no main.jsx
// REMOVA ESTA LINHA: moment.locale('pt-br'); // Já está no main.jsx

import 'react-big-calendar/lib/css/react-big-calendar.css';

import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import AppointmentModal from '../components/AppointmentModal';

import { Spinner, Alert } from 'react-bootstrap';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';

const localizer = momentLocalizer(moment); // Inicializa o localizer com o moment globalmente configurado

localizer.formats = {
    dateFormat: 'DD/MM',
    dayFormat: 'dddd',   // Mude para 'dddd' para o nome completo do dia da semana
    weekdayFormat: 'dddd', // Garante que o cabeçalho semanal também use o nome completo
    monthHeaderFormat: 'MMMM YYYY',
    agendaHeaderFormat: 'DD MMMM YYYY',
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'HH:mm', culture) + ' - ' + local.format(end, 'HH:mm', culture),
    eventTimeRangeStartFormat: ({ start }, culture, local) => local.format(start, 'HH:mm', culture) + ' - ',
    eventTimeRangeEndFormat: ({ end }, culture, local) => ' - ' + local.format(end, 'HH:mm', culture),
};


const AgendaPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [currentViewDate, setCurrentViewDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');

    const { userRole } = useContext(AuthContext);

    const fetchAppointments = useCallback(async (start, end) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api(`/agendamentos?start=${moment(start).toISOString()}&end=${moment(end).toISOString()}`, { method: 'GET' });
            
            const mappedEvents = response.map(app => ({
                id: app.cod_agendamento,
                title: `${app.cliente_nome} - ${app.servico_nome} ${app.veiculo_placa ? `(${app.veiculo_placa})` : ''}`,
                start: new Date(app.data_hora_inicio),
                end: new Date(app.data_hora_fim),
                allDay: false,
                resource: {
                    cod_agendamento: app.cod_agendamento,
                    cliente_cod: app.cod_cliente,
                    servico_cod: app.cod_servico,
                    veiculo_cod: app.cod_veiculo,
                    usuario_responsavel_cod: app.usuario_responsavel_cod,
                    preco_total: app.preco_total,
                    status: app.status,
                    tipo_agendamento: app.tipo_agendamento,
                    forma_pagamento: app.forma_pagamento,
                    observacoes_agendamento: app.observacoes_agendamento,
                    duracao_minutos: app.duracao_minutos,
                }
            }));
            setEvents(mappedEvents);
        } catch (err) {
            console.error('Erro ao buscar agendamentos:', err);
            setError(err.message || 'Erro ao carregar agendamentos.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const start = moment(currentViewDate).startOf(currentView).toDate();
        const end = moment(currentViewDate).endOf(currentView).toDate();
        fetchAppointments(start, end);
    }, [currentViewDate, currentView, fetchAppointments]);

    const handleSelectSlot = useCallback(({ start, end }) => {
        setSelectedAppointment({ start, end });
        setShowModal(true);
    }, []);

    const handleSelectEvent = useCallback((event) => {
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
        return (
            <div className="loading-screen">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert error my-4">
                <h3>Erro ao Carregar Agenda</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2>Agenda de Agendamentos</h2>
                <button className="btn-primary-dark" onClick={() => handleSelectSlot({ start: new Date(), end: new Date(Date.now() + 60 * 60 * 1000) })}>
                    <Plus size={20} />
                    Novo Agendamento
                </button>
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
                    min={new Date(0, 0, 0, 6, 0, 0)}
                    max={new Date(0, 0, 0, 20, 0, 0)}
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
                        const start = moment(currentViewDate).startOf(currentView).toDate();
                        const end = moment(currentViewDate).endOf(currentView).toDate();
                        fetchAppointments(start, end);
                    }}
                />
            )}
        </div>
    );
};

export default AgendaPage;