import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/utils/api';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';

// Paleta de cores oficial da Syncro Auto
const COLORS = {
  primary: '#2C3E50',
  accent: '#1ABC9C',
  background: '#ECF0F1',
  text: '#2C3E50',
  textSecondary: '#8A8A8A',
  white: '#FFFFFF',
  danger: '#E74C3C',
  border: '#D5D8DC'
};

export default function NovoAgendamentoScreen() {
    const router = useRouter();
    const [clientes, setClientes] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estados do formulário
    const [clienteId, setClienteId] = useState('');
    const [servicoId, setServicoId] = useState('');
    const [date, setDate] = useState(new Date());
    const [observacoes, setObservacoes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clientesRes, servicosRes] = await Promise.all([
                    api('/clientes'),
                    api('/servicos')
                ]);
                setClientes(clientesRes);
                setServicos(servicosRes);
            } catch (error) {
                Alert.alert("Erro", "Não foi possível carregar clientes e serviços.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleConfirmar = async () => {
        if (!clienteId || !servicoId) {
            Alert.alert("Atenção", "Por favor, selecione o cliente e o serviço.");
            return;
        }
        setIsSubmitting(true);

        const dataHoraInicio = dayjs(date).format('YYYY-MM-DDTHH:mm:ss');
        const payload = {
            cliente_cod: clienteId,
            data_hora_inicio: dataHoraInicio,
            observacoes: observacoes,
            servicos: [{ servico_cod: servicoId }] 
        };

        try {
            await api('/agendamentos', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            Alert.alert("Sucesso!", "Agendamento criado.");
            if (router.canGoBack()) router.back();
        } catch (error) {
            Alert.alert("Erro", error.message || "Não foi possível salvar o agendamento.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onDateTimeChange = (event, selectedDate) => {
        setShowDatePicker(false);
        setShowTimePicker(false);
        if (event.type === 'set' && selectedDate) {
            setDate(selectedDate);
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
                <Text style={styles.headerTitle}>Novo Agendamento</Text>
            </View>
            
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* --- CÓDIGO RESTAURADO --- */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>CLIENTE</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={clienteId} onValueChange={(itemValue) => setClienteId(itemValue)} style={styles.picker}>
                            <Picker.Item label="Selecione um cliente..." value="" />
                            {clientes.map(c => <Picker.Item key={c.cod_cliente} label={c.nome_cliente} value={c.cod_cliente} />)}
                        </Picker>
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>SERVIÇO</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={servicoId} onValueChange={(itemValue) => setServicoId(itemValue)} style={styles.picker}>
                            <Picker.Item label="Selecione um serviço..." value="" />
                            {servicos.map(s => <Picker.Item key={s.cod_servico} label={s.nome_servico} value={s.cod_servico} />)}
                        </Picker>
                    </View>
                </View>
                {/* --- FIM DO CÓDIGO RESTAURADO --- */}

                <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>DATA</Text>
                        <TouchableOpacity style={styles.inputButton} onPress={() => setShowDatePicker(true)}>
                            <Text style={styles.inputText}>{dayjs(date).format('DD/MM/YYYY')}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>HORA</Text>
                        <TouchableOpacity style={styles.inputButton} onPress={() => setShowTimePicker(true)}>
                            <Text style={styles.inputText}>{dayjs(date).format('HH:mm')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>OBSERVAÇÕES</Text>
                    <TextInput style={[styles.input, styles.textArea]} value={observacoes} onChangeText={setObservacoes} placeholder="Detalhes importantes..." multiline placeholderTextColor={COLORS.textSecondary}/>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={[styles.confirmButton, isSubmitting && styles.disabledButton]} onPress={handleConfirmar} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color={COLORS.white}/> : <Text style={styles.confirmButtonText}>Confirmar Agendamento</Text>}
                </TouchableOpacity>
            </View>

            {showDatePicker && (<DateTimePicker value={date} mode="date" display="default" onChange={onDateTimeChange} />)}
            {showTimePicker && (<DateTimePicker value={date} mode="time" display="default" onChange={onDateTimeChange} minuteInterval={15} />)}
        </View>
    );
}

// Estilos
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  backButton: { padding: 10 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginRight: 42 },
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
  disabledButton: { backgroundColor: COLORS.textSecondary }
});