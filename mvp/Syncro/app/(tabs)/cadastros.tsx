import { Text, View, StyleSheet } from 'react-native';

export default function CadastrosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastros</Text>
      <Text>A tela para gerenciar clientes, serviços, etc., ficará aqui.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold' },
});