import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { api } from '../src/utils/api';
import { MaterialIcons } from '@expo/vector-icons';

// Paleta de cores oficial da Syncro Auto
const COLORS = {
  primary: '#2C3E50',
  accent: '#1ABC9C',
  background: '#ECF0F1',
  white: '#FFFFFF',
  text: '#2C3E50',
  textSecondary: '#8A8A8A',
};

const ServicoItem = ({ item }) => (
  <Link href={{ pathname: "/servico-form", params: { id: item.cod_servico } }} asChild>
    <TouchableOpacity style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.nome_servico}</Text>
        <Text style={styles.cardSubtitle}>Duração: {item.duracao_minutos || 'Não informada'}</Text>
      </View>
      <Text style={styles.cardValue}>R$ {parseFloat(item.preco || 0).toFixed(2).replace('.', ',')}</Text>
    </TouchableOpacity>
  </Link>
);

export default function ServicosScreen() {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadServicos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api('/servicos');
      setServicos(response);
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
      // Opcional: Adicionar um Alert para o usuário
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Roda toda vez que a tela ganha foco
  useFocusEffect(loadServicos);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back-ios" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Serviços</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={servicos}
          keyExtractor={(item) => item.cod_servico.toString()}
          renderItem={({ item }) => <ServicoItem item={item} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum serviço cadastrado.</Text>}
          onRefresh={loadServicos}
          refreshing={loading}
        />
      )}

      <Link href="/servico-form" asChild>
        <TouchableOpacity style={styles.fab}>
          <MaterialIcons name="add" size={32} color={COLORS.white} />
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  backButton: { padding: 10 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 42, // Compensa o botão de voltar para centralizar
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  cardSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.accent },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.textSecondary, fontSize: 16 },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
});