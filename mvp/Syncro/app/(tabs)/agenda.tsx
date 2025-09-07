import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Calendar, CalendarProvider } from 'react-native-big-calendar';
import moment from 'moment';
import { debounce } from 'lodash';
import api from '../../services/api';
import AppointmentModal from '../../components/AppointmentModal';
import { FontAwesome } from '@expo/vector-icons';

interface AppointmentEvent {
  title: string;
  start: Date;
  end: Date;
  cod_agendamento?: number;
  backgroundColor?: string;
}

export default function AgendaScreen() {
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment().toDate());
  const [selectedEvent, setSelectedEvent] = useState<AppointmentEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const loadedMonths = useRef(new Set<string>());
  const loadingMonths = useRef(new Set<string>());

  const fetchDataForMonth = useCallback(async (monthDate: Date) => {
    const monthString = moment(monthDate).format('YYYY-MM');
    if (loadedMonths.current.has(monthString) || loadingMonths.current.has(monthString)) {
      console.log(`Mês ${monthString} já carregado ou em carregamento`);
      return;
    }

    const monthStart = moment(monthDate).startOf('month').toISOString();
    const monthEnd = moment(monthDate).endOf('month').toISOString();

    try {
      setLoading(true);
      loadingMonths.current.add(monthString);
      console.log(`Carregando agendamentos para ${monthString}`);
      const agendamentos = await api(`/agendamentos?start=${monthStart}&end=${monthEnd}`);
      if (!agendamentos || !Array.isArray(agendamentos)) {
        console.log('Nenhum agendamento retornado ou resposta inválida');
        return;
      }

      const newEvents: AppointmentEvent[] = agendamentos
        .filter((ag: any) => moment(ag.start).isValid() && (ag.end ? moment(ag.end).isValid() : true))
        .map((ag: any) => ({
          title: ag.title || 'Sem título',
          start: new Date(ag.start),
          end: new Date(ag.end || moment(ag.start).add(1, 'hour').toISOString()),
          cod_agendamento: ag.cod_agendamento,
          backgroundColor: ag.backgroundColor || '#1d4ed8',
        }));

      setEvents(prevEvents => {
        // Cria um mapa com todos os eventos, dando preferência aos novos/atualizados
        const eventsMap = new Map(prevEvents.map(e => [e.cod_agendamento, e]));
        newEvents.forEach(e => eventsMap.set(e.cod_agendamento, e));
        
        // Retorna um novo array a partir dos valores do mapa
        return Array.from(eventsMap.values());
      });
      loadedMonths.current.add(monthString);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String((error as any)?.msg || 'Erro desconhecido');
      console.error(`Erro ao carregar agendamentos para ${monthString}:`, errorMessage);
      Alert.alert('Erro', `Não foi possível carregar os agendamentos: ${errorMessage}`);
    } finally {
      loadingMonths.current.delete(monthString);
      setLoading(false);
    }
  }, []);

  // Carrega os dados do mês atual na primeira renderização
  useEffect(() => {
    fetchDataForMonth(selectedDate);
  }, [fetchDataForMonth]);

  const debouncedFetchDataForMonth = useMemo(() => debounce(fetchDataForMonth, 300), [fetchDataForMonth]);

  const handleSaveAppointment = useCallback(async () => {
    setIsModalVisible(false);
    setSelectedEvent(null);
    const monthToReload = moment(selectedDate).format('YYYY-MM');
    loadedMonths.current.delete(monthToReload);
    console.log(`Recarregando dados para o mês ${monthToReload}`);
    await fetchDataForMonth(selectedDate);
  }, [selectedDate, fetchDataForMonth]);

  const handleEventPress = useCallback((event: AppointmentEvent) => {
    setSelectedEvent(event);
    setSelectedDate(event.start);
    setIsModalVisible(true);
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" color="#1d4ed8" />
      ) : (
        <CalendarProvider
          date={selectedDate}
          onDateChanged={(newDate) => {
            setSelectedDate(newDate);
            debouncedFetchDataForMonth(newDate);
          }}
        >
          <Calendar
            events={events}
            height={600}
            mode="week" // Semana para agendamentos detalhados
            onPressEvent={handleEventPress}
            eventCellStyle={(event) => ({
              backgroundColor: event.backgroundColor,
              borderRadius: 5,
              padding: 5,
              borderLeftWidth: 4,
              borderLeftColor: '#2563eb',
            })}
            headerContentStyle={styles.headerContent}
            dayHeaderStyle={styles.dayHeader}
          />
        </CalendarProvider>
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setSelectedEvent(null);
          setIsModalVisible(true);
        }}
      >
        <FontAwesome name="plus" size={24} color="white" />
      </TouchableOpacity>
      <AppointmentModal
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveAppointment}
        selectedDate={moment(selectedDate).toISOString()}
        selectedEvent={selectedEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#1d4ed8',
    borderRadius: 28,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  },
  headerContent: {
    backgroundColor: '#1d4ed8',
    color: '#fff',
    padding: 10,
    borderRadius: 5,
  },
  dayHeader: {
    backgroundColor: '#e0e7ff',
    color: '#1d4ed8',
    padding: 5,
    borderRadius: 3,
  },
});