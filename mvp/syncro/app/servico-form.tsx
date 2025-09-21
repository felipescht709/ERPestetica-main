import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  border: '#D5D8DC',
};


export default function ServicoFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id;
  const isEditing = !!id;

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      const fetchServico = async () => {
        try {
          const servico = await api(`/servicos/${id}`);
          setNome(servico.nome_servico);
          setPreco(servico.preco?.toString().replace('.', ',') || '');
          setDuracao(servico.duracao_minutos?.toString() || '');
          setDescricao(servico.descricao_servico || '');
        } catch (error) {
          Alert.alert("Erro", "Não foi possível carregar os dados do serviço.");
        } finally {
          setLoading(false);
        }
      };
      fetchServico();
    }
  }, [id, isEditing]);

  const handleSave = async () => {
    if (!nome || !preco) {
      Alert.alert("Atenção", "Nome e Preço são obrigatórios.");
      return;
    }
    setIsSubmitting(true);
    
    const payload = {
      nome_servico: nome,
      preco: parseFloat(preco.replace(',', '.')),
      duracao_minutos: duracao ? parseInt(duracao) : null,
      descricao_servico: descricao
    };

    try {
      if (isEditing) {
        await api(`/servicos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/servicos', { method: 'POST', body: JSON.stringify(payload) });
      }
      Alert.alert("Sucesso!", `Serviço ${isEditing ? 'atualizado' : 'criado'}.`);
      if (router.canGoBack()) router.back();
    } catch (error) {
      Alert.alert("Erro", `Não foi possível ${isEditing ? 'atualizar' : 'criar'} o serviço.`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back-ios" size={22} color={COLORS.primary} style={{ marginLeft: 10 }}/>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Editar Serviço' : 'Novo Serviço'}</Text>
      </View>
      <ScrollView style={styles.container}>
        {/* ... JSX do formulário ... */}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.confirmButton, isSubmitting && styles.disabledButton]} onPress={handleSave} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={COLORS.white}/> : <Text style={styles.confirmButtonText}>Salvar Serviço</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Estilos
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  backButton: { padding: 10 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginRight: 42 }, // 42 para compensar o padding do backButton
  container: { flex: 1, padding: 20 },
  formGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: COLORS.white, borderRadius: 10, paddingHorizontal: 15, fontSize: 16, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, height: 50 },
  inputButton: { backgroundColor: COLORS.white, height: 50, borderRadius: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center' },
  inputText: { fontSize: 16, color: COLORS.text },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 15 },
  pickerContainer: { backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center' },
  picker: { height: 50, color: COLORS.text },
  row: { flexDirection: 'row', gap: 16 },
  footer: { padding: 20, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  confirmButton: { backgroundColor: COLORS.accent, height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  confirmButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  disabledButton: { backgroundColor: COLORS.textSecondary },
  inputIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 50,
  },
  inputIconText: { fontSize: 16, color: COLORS.textSecondary, paddingLeft: 15, paddingRight: 5 },
  inputWithIcon: { flex: 1, fontSize: 16, color: COLORS.text, paddingRight: 15 },
});