import { Text, View, StyleSheet } from 'react-native';

export default function FinanceiroScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Financeiro</Text>
      <Text>A tela para gerenciar Financeiro ficará aqui.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold' },
});