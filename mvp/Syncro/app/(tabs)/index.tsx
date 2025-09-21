import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router'; // Importe o Link

// Paleta de cores oficial da Syncro Auto
const COLORS = {
  primary: '#2C3E50',       // Azul Grafite
  accent: '#1ABC9C',        // Verde Água Elétrico
  background: '#ECF0F1',    // Cinza Claro
  text: '#2C3E50',
  textSecondary: '#8A8A8A',
  white: '#FFFFFF',
  danger: '#E74C3C'
};

// --- Componentes da Tela ---

const StatCard = ({ title, value }) => (
    <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
    </View>
);

const AppointmentItem = ({ item }) => (
  <View style={styles.appointmentItem}>
    <Image 
      source={{ uri: `https://avatar.iran.liara.run/public/boy?username=${item.cliente_nome}` }} 
      style={styles.avatar}
    />
    <View style={styles.appointmentDetails}>
      <Text style={styles.appointmentTime}>{item.horario} - {item.cliente_nome}</Text>
      <Text style={styles.appointmentService}>{item.veiculo} | {item.servico}</Text>
    </View>
  </View>
);

// --- Tela Principal ---

export default function HomeScreen() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, logout } = useAuth();

    const loadDashboardData = useCallback(async () => {
        if (!user) return; 

        setLoading(true);
        setError(null);
        try {
            const response = await api('/home');
            setStats(response.dashboard);
        } catch (err) {
            setError('Não foi possível carregar os dados. Tente novamente.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);
    
    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    if (loading && !stats) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.button} onPress={loadDashboardData}>
                    <Text style={styles.buttonText}>Tentar Novamente</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
          <ScrollView
              style={styles.container}
              contentContainerStyle={{ paddingBottom: 120 }}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboardData} />}
              showsVerticalScrollIndicator={false}
          >
              {/* Header */}
              <View style={styles.header}>
                  <Text style={styles.headerTitle}>Syncro Auto</Text>
                  <TouchableOpacity onPress={logout}>
                      <MaterialIcons name="logout" size={26} color={COLORS.primary} />
                  </TouchableOpacity>
              </View>

              <Text style={styles.greeting}>Olá, {user?.nome_usuario || 'Usuário'}</Text>

              {/* Cards de Métricas */}
              <View style={styles.grid}>
                  <StatCard title="Faturamento do Dia" value={`R$ ${stats?.faturamentoDia ?? '0,00'}`} />
                  <StatCard title="Serviços de Hoje" value={stats?.servicosHoje ?? 0} />
              </View>
              <StatCard title="OS Abertas" value={stats?.osAbertas ?? 0} />
              
              {/* --- Seção de Próximos Agendamentos --- */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Próximos Agendamentos</Text>
                {stats?.proximosAgendamentos && stats.proximosAgendamentos.length > 0 ? (
                  stats.proximosAgendamentos.map((item) => (
                    <AppointmentItem key={item.id} item={item} />
                  ))
                ) : (
                  <Text style={styles.noAppointmentsText}>Nenhum próximo agendamento para hoje.</Text>
                )}
              </View>
              
          </ScrollView>

            <Link href="/novo_agendamento" asChild>
                <TouchableOpacity style={styles.fab}>
                    <MaterialIcons name="add" size={32} color={COLORS.white} />
                </TouchableOpacity>
            </Link>
        </View>
    );
}

// --- Estilos ---
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.background },
    container: { flex: 1, paddingHorizontal: 20 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 10 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
    greeting: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 24 },
    grid: { flexDirection: 'row', justifyContent: 'space-between' },
    card: {
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 12,
        width: '48%',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardTitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
    cardValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
    section: { marginTop: 16 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginBottom: 16 },
    appointmentItem: {
      backgroundColor: COLORS.white,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      elevation: 2,
    },
    avatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 16 },
    appointmentDetails: { flex: 1 },
    appointmentTime: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
    appointmentService: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
    noAppointmentsText: { textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 20 },
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
    errorText: { color: COLORS.danger, textAlign: 'center', marginBottom: 15, fontSize: 16 },
    button: { backgroundColor: COLORS.accent, padding: 15, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});