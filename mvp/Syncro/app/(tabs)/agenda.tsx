import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { MaterialIcons } from '@expo/vector-icons';
import Modal from "react-native-modal";
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

// Paleta de cores oficial da Syncro Auto
const COLORS = {
  primary: '#2C3E50',
  accent: '#1ABC9C',
  background: '#ECF0F1',
  text: '#2C3E50',
  textSecondary: '#8A8A8A',
  white: '#FFFFFF',
  danger: '#E74C3C',
  success: '#27AE60',
  warning: '#F39C12',
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HOUR_HEIGHT = 80; // Altura de cada hora na linha do tempo

// --- Componente da Tela de Agenda ---

export default function AgendaScreen() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const { user } = useAuth();

  const loadEvents = useCallback(async (date) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const dateString = date.format('YYYY-MM-DD');
      // A rota de agendamentos já existe e pode ser usada para buscar por data
      const response = await api(`/agendamentos?start=${dateString}&end=${dateString}`);
      setEvents(response);
    } catch (err) {
      setError('Não foi possível carregar os agendamentos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEvents(currentDate);
  }, [currentDate, loadEvents]);

  const timelineHours = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => i + 7); // Das 7:00 às 21:00
  }, []);
  
  const handleEventPress = (event) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const changeDate = (amount) => {
    setCurrentDate(currentDate.add(amount, 'day'));
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda</Text>
        {/* Adicionar seletor de Dia/Semana futuramente */}
      </View>

      {/* Navegador de Data */}
      <View style={styles.dateNavigator}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navButton}>
          <MaterialIcons name="chevron-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.dateText}>{currentDate.format('dddd, D [de] MMMM')}</Text>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.navButton}>
          <MaterialIcons name="chevron-right" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Conteúdo da Agenda */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.timelineContainer}>
            {/* Linhas do tempo e horas */}
            {timelineHours.map(hour => (
              <View key={hour} style={styles.hourSlot}>
                <Text style={styles.hourText}>{String(hour).padStart(2, '0')}:00</Text>
                <View style={styles.hourLine} />
              </View>
            ))}
            
            {/* Eventos posicionados dinamicamente */}
            {events.map(event => {
              const start = dayjs(event.data_hora_inicio);
              const end = dayjs(event.data_hora_fim);
              const top = (start.hour() - 7 + start.minute() / 60) * HOUR_HEIGHT;
              const durationMinutes = end.diff(start, 'minute');
              const height = (durationMinutes / 60) * HOUR_HEIGHT - 4; // -4 para um pequeno espaçamento

              const statusColor = event.status === 'concluido' ? COLORS.success : (event.status === 'em_andamento' ? COLORS.warning : COLORS.primary);

              return (
                <TouchableOpacity 
                  key={event.cod_agendamento} 
                  style={[styles.eventCard, { top, height, borderLeftColor: statusColor }]}
                  onPress={() => handleEventPress(event)}
                >
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.cliente_nome}</Text>
                  <Text style={styles.eventText} numberOfLines={1}>{event.servicos_nomes}</Text>
                  <Text style={styles.eventTime}>{start.format('HH:mm')} - {end.format('HH:mm')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Botão Flutuante de Ação */}
      <TouchableOpacity style={styles.fab}>
        <MaterialIcons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>
      
      {/* Modal de Ações */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setModalVisible(false)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{selectedEvent?.cliente_nome}</Text>
          <Text style={styles.modalSubtitle}>{selectedEvent?.servicos_nomes}</Text>
          {/* Adicione os botões de ação aqui */}
        </View>
      </Modal>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 50, paddingBottom: 10, paddingHorizontal: 20, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  dateNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#ddd' },
  dateText: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, textTransform: 'capitalize' },
  navButton: { padding: 8 },
  timelineContainer: { paddingLeft: 60, paddingTop: 20, paddingRight: 10 },
  hourSlot: { height: HOUR_HEIGHT, flexDirection: 'row', alignItems: 'flex-start' },
  hourText: { position: 'absolute', left: -50, top: -8, color: COLORS.textSecondary, fontSize: 12 },
  hourLine: { flex: 1, height: 1, backgroundColor: '#ddd', marginLeft: 10, marginTop: 0 },
  eventCard: {
    position: 'absolute',
    left: 70,
    right: 10,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 5,
    elevation: 3,
  },
  eventTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
  eventText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  eventTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, fontStyle: 'italic' },
  fab: {
      position: 'absolute',
      bottom: 80,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: COLORS.accent,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.danger, fontSize: 16 },
  button: { backgroundColor: COLORS.accent, padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontWeight: 'bold' },
});