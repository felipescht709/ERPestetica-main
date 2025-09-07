import React, { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../services/api';
import SelectDropdown from 'react-native-select-dropdown';
import { FontAwesome } from '@expo/vector-icons';

type Cliente = { cod_cliente: number; nome_cliente: string };
type Servico = { cod_servico: number; nome_servico: string; preco: number; duracao_minutos: number };
type Funcionario = { cod_usuario: number; nome_usuario: string };

type AppointmentEvent = {
  title: string;
  start: Date;
  end: Date;
  cod_agendamento?: number;
  backgroundColor?: string;
};

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedDate: string;
  selectedEvent?: AppointmentEvent | null;
};

interface FormData {
  cliente_cod: number | null;
  veiculo_cod: number | null;
  usuario_responsavel_cod: number | null;
  data_hora_inicio: string;
  status: string;
  observacoes_agendamento: string;
  servicos: Servico[];
}

const AppointmentModal = ({ isVisible, onClose, onSave, selectedDate, selectedEvent }: Props) => {
  const getInitialState = useCallback((): FormData => ({
    cliente_cod: selectedEvent ? null : null, // TODO: Mapear cliente_cod do evento, se disponível
    veiculo_cod: null,
    usuario_responsavel_cod: null,
    data_hora_inicio: selectedEvent ? selectedEvent.start.toISOString() : selectedDate,
    status: 'agendado',
    observacoes_agendamento: selectedEvent ? '' : '', // TODO: Mapear observações do evento
    servicos: selectedEvent ? [] : [], // TODO: Mapear serviços do evento
  }), [selectedDate, selectedEvent]);

  const [formData, setFormData] = useState<FormData>(getInitialState());
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [allServices, setAllServices] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setFormData(getInitialState());
    }
  }, [isVisible, getInitialState]);

  useEffect(() => {
    // Só busca os dados se o modal estiver visível e os dados ainda não foram carregados.
    if (!isVisible || clientes.length > 0) {
      return;
    }

    const fetchDependencies = async () => {
      try {
        setLoading(true);
        const [clientsRes, servicesRes] = await Promise.all([
          api('/clientes'),
          api('/servicos'),
        ]);
        setClientes(clientsRes);
        setAllServices(servicesRes);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
        Alert.alert('Erro ao Carregar Dados', `Não foi possível carregar os dados para o agendamento. Detalhes: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    fetchDependencies();
  }, [isVisible, clientes]);

  const handleSubmit = async () => {
    if (!formData.cliente_cod || formData.servicos.length === 0) {
      Alert.alert('Erro', 'Cliente e pelo menos um serviço são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api('/agendamentos', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          servicos: formData.servicos.map(s => s.cod_servico),
        }),
      });
      onSave();
    } catch (error: any) {
      Alert.alert('Erro ao Agendar', error.msg || 'Não foi possível criar o agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.modalBackdrop, { pointerEvents: 'auto' }]}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
          <ScrollView>
            <Text style={styles.modalTitle}>Novo Agendamento</Text>
            {loading ? (
              <ActivityIndicator size="large" />
            ) : (
              <>
                <SelectDropdown
                  data={clientes}
                  onSelect={(selectedItem: Cliente) =>
                    setFormData(prev => ({ ...prev, cliente_cod: selectedItem.cod_cliente, veiculo_cod: null }))
                  }
                  renderButton={(selectedItem, isOpened) => (
                    <Text style={styles.dropdownButtonText}>
                      {selectedItem ? selectedItem.nome_cliente : 'Selecione um Cliente *'}
                    </Text>
                  )}
                  renderItem={(item, index, isSelected) => (
                    <Text style={styles.dropdownRowText}>{item.nome_cliente}</Text>
                  )}
                  buttonStyle={styles.dropdown}
                  defaultButtonText="Selecione um Cliente *"
                  search
                />
                <SelectDropdown
                  data={allServices}
                  onSelect={(selectedItem: Servico) => {
                    setFormData(prev => {
                      const servicosAtuais = prev.servicos;
                      const jaExiste = servicosAtuais.find(s => s.cod_servico === selectedItem.cod_servico);
                      if (jaExiste) {
                        return { ...prev, servicos: servicosAtuais.filter(s => s.cod_servico !== selectedItem.cod_servico) };
                      } else {
                        return { ...prev, servicos: [...servicosAtuais, selectedItem] };
                      }
                    });
                  }}
                  renderButton={(selectedItem, isOpened) => (
                    <Text style={styles.dropdownButtonText}>
                      {formData.servicos.length > 0 ? `${formData.servicos.length} serviço(s) selecionado(s)` : 'Selecione os Serviços *'}
                    </Text>
                  )}
                  renderItem={(item: Servico, index, isSelected) => (
                    <View style={styles.dropdownRow}>
                      <Text style={styles.dropdownRowText}>{item.nome_servico}</Text>
                      {formData.servicos.some(s => s.cod_servico === item.cod_servico) && (
                        <FontAwesome name="check" size={16} color="#22c55e" />
                      )}
                    </View>
                  )}
                  buttonStyle={styles.dropdown}
                  defaultButtonText="Selecione os Serviços *"
                  search
                  searchPlaceHolder="Buscar serviço..."
                />
                <View style={styles.selectedItemsContainer}>
                  {formData.servicos.map(s => (
                    <View key={s.cod_servico} style={styles.selectedItemChip}>
                      <Text style={styles.selectedItemText}>{s.nome_servico}</Text>
                    </View>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Observações"
                  onChangeText={text => setFormData(prev => ({ ...prev, observacoes_agendamento: text }))}
                  multiline
                />
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.buttonSecondary} onPress={onClose}>
                    <Text>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.buttonPrimary} onPress={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonPrimaryText}>Salvar</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 16,
  },
  dropdown: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
    backgroundColor: '#fff',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  dropdownButtonText: {
    textAlign: 'left',
    fontSize: 16,
  },
  dropdownRowText: {
    flex: 1,
    fontSize: 16,
  },
  selectedItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    marginTop: -5,
  },
  selectedItemChip: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    margin: 2,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  selectedItemText: {
    color: '#1d4ed8',
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  buttonPrimary: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginLeft: 10,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  buttonPrimaryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
});

export default AppointmentModal;