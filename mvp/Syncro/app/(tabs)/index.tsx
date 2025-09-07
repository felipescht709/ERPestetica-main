import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Button } from 'react-native';
import { AuthContext } from '../../services/AuthContext';
import api from '../../services/api';

// 1. Definindo os tipos para as props do StatCard
type StatCardProps = {
  title: string;
  value: string | number;
  color: string;
};

// 2. Adicionando os tipos ao componente
const StatCard = ({ title, value, color }: StatCardProps) => (
    <View style={[styles.card, { borderLeftColor: color }]}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
    </View>
);

// 2. Definindo a interface para os dados do dashboard
interface DashboardStats {
    agendamentosHoje: number;
    faturamentoMensal: number;
    totalClientes: number;
    servicosConcluidosMes: number;
}

export default function HomeScreen() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const authContext = useContext(AuthContext);
    const user = authContext?.user; // Acessando o usuário de forma segura

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 3. Buscando os dados reais da API
            const statsData = await api('/home');
            setStats(statsData);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados do dashboard.');
        } finally {
            setLoading(false);
        }
    }, []);
    
    // 4. Usando o useEffect para carregar os dados quando a tela abre
    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // 5. Adicionando telas de loading e erro
    if (loading && !stats) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1d4ed8" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <Button title="Tentar Novamente" onPress={loadDashboardData} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ padding: 15 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboardData} />}
        >
            <Text style={styles.welcomeTitle}>Bem-vindo, {user?.nome_usuario}!</Text>

            <View style={styles.grid}>
                <StatCard title="Agendamentos Hoje" value={stats?.agendamentosHoje ?? 0} color="#3b82f6" />
                <StatCard title="Faturamento do Mês" value={`R$ ${stats?.faturamentoMensal ?? '0,00'}`} color="#22c55e" />
                <StatCard title="Clientes Ativos" value={stats?.totalClientes ?? 0} color="#9333ea" />
                <StatCard title="Serviços Concluídos (Mês)" value={stats?.servicosConcluidosMes ?? 0} color="#f59e0b" />
            </View>
        </ScrollView>
    );
}

// Estilos
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#991b1b',
        textAlign: 'center',
        marginBottom: 15,
        fontSize: 16,
    },
    welcomeTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#1f2937',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '48%',
        marginBottom: 15,
        borderLeftWidth: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    cardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 8,
        color: '#1f2937',
    },
});