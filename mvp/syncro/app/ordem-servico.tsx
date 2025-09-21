import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { api } from '../src/utils/api';
import { useAuth } from '../src/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

// Paleta de cores oficial da Syncro Auto
const COLORS = {
  primary: '#2C3E50',
  accent: '#1ABC9C',
  background: '#ECF0F1',
  white: '#FFFFFF',
  text: '#2C3E50',
  textSecondary: '#8A8A8A',
  success: '#27AE60',
  warning: '#F39C12',
  danger: '#E74C3C',
};

// Objeto para mapear status para cores e ícones, facilitando a manutenção
const statusMap = {
  'Em Aberto': { color: COLORS.primary, icon: 'hourglass-top' },
  'Em Andamento': { color: COLORS.warning, icon: 'pending' },
  'Concluída': { color: COLORS.success, icon: 'task-alt' },
  'Cancelada': { color: COLORS.danger, icon: 'cancel' },
  'Aguardando Peças': { color: '#3498DB', icon: 'build' },
};

// --- Componente para cada Card da Lista ---
const OrdemServicoCard = ({ item }) => {
  const statusInfo = statusMap[item.status_os] || { color: COLORS.textSecondary, icon: 'help-outline' };
  
  return (
    <Link href={`/orde-servico/${item.cod_ordem_servico}`} asChild>
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardIconContainer}>
          <MaterialIcons name="description" size={28} color={COLORS.primary} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>OS #{item.cod_ordem_servico}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
              <MaterialIcons name={statusInfo.icon} size={14} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{item.status_os}</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>{item.cliente_nome} | {item.veiculo_modelo}</Text>
        </View>
        <Text style={styles.cardValue}>R$ {parseFloat(item.valor_total || 0).toFixed(2).replace('.', ',')}</Text>
      </TouchableOpacity>
    </Link>
  );
};

// --- Tela Principal ---
export default function OrdemServicoScreen() {
  const [ordens, setOrdens] = useState([]);
  const [statusFiltro, setStatusFiltro] = useState('Em Aberto');
  const [termoBusca, setTermoBusca] = useState('');
  const [debouncedBusca, setDebouncedBusca] = useState('');
  const [loading, setLoading] = useState(true);

  // Debounce para a busca: só busca na API após o usuário parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBusca(termoBusca);
    }, 500); // Atraso de 500ms
    return () => clearTimeout(timer);
  }, [termoBusca]);

  const loadOrdens = useCallback(async () => {
    setLoading(true);
    try {
      // Usamos a rota do backend com os parâmetros de busca e status
      const response = await api(`/ordens_servico?status=${statusFiltro}&search=${debouncedBusca}`);
      setOrdens(response);
    } catch (error) {
      console.error("Erro ao buscar ordens de serviço:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFiltro, debouncedBusca]);

  useEffect(() => {
    loadOrdens();
  }, [loadOrdens]);

  const filtros = ['Em Aberto', 'Concluídas', 'Canceladas'];

  return (
    <View style={styles.screen}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Ordens de Serviço</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente, placa ou OS..."
          placeholderTextColor={COLORS.textSecondary}
          value={termoBusca}
          onChangeText={setTermoBusca}
        />
        <View style={styles.filterContainer}>
          {filtros.map(filtro => (
            <TouchableOpacity 
              key={filtro}
              style={[styles.filterButton, statusFiltro === filtro && styles.filterButtonActive]}
              onPress={() => setStatusFiltro(filtro)}
            >
              <Text style={[styles.filterText, statusFiltro === filtro && styles.filterTextActive]}>{filtro}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }}/>
      ) : (
        <FlatList
          data={ordens}
          keyExtractor={(item) => item.cod_ordem_servico.toString()}
          renderItem={({ item }) => <OrdemServicoCard item={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma Ordem de Serviço encontrada.</Text>}
          onRefresh={loadOrdens}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', marginBottom: 16 },
  searchInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: COLORS.text,
  },
  filterContainer: { flexDirection: 'row', marginTop: 16 },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
  },
  filterButtonActive: { backgroundColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontWeight: '600' },
  filterTextActive: { color: COLORS.white },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(44, 62, 80, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  statusText: { marginLeft: 4, fontSize: 12, fontWeight: 'bold' },
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginLeft: 16 },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.textSecondary, fontSize: 16 },
});