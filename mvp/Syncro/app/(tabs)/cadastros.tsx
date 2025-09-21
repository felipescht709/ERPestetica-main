import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

// Paleta de cores oficial da Syncro Auto
const COLORS = {
  primary: '#2C3E50',       // Azul Grafite
  accent: '#1ABC9C',        // Verde Água Elétrico
  background: '#ECF0F1',    // Cinza Claro
  white: '#FFFFFF',
  text: '#2C3E50',
};

// Componente reutilizável para cada item do grid de cadastros
const CadastroItem = ({ title, iconName, href }: { title: string; iconName: keyof typeof MaterialIcons.glyphMap; href: string }) => {

  return (
    // O `asChild` permite que o Link passe as propriedades de navegação para o TouchableOpacity
    <Link href={href as any} asChild>
      <TouchableOpacity style={styles.card}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={iconName} size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </TouchableOpacity>
    </Link>
  );
};

export default function CadastrosScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cadastros</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.grid}>
          {/* Item adicionado conforme sua solicitação */}
          <CadastroItem title="Ordem de Serviço" iconName="description" href="/ordem-servico" />
          <CadastroItem title="Clientes" iconName="group" href="/clientes" />
          <CadastroItem title="Veículos" iconName="directions-car" href="/veiculos" />
          <CadastroItem title="Serviços" iconName="construction" href="/servicos" />
          <CadastroItem title="Produtos" iconName="inventory-2" href="/produtos-estoque" />
          <CadastroItem title="Equipamentos" iconName="handyman" href="/equipamentos" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  container: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%', // Garante duas colunas com um pequeno espaço
    aspectRatio: 1, // Mantém o card quadrado
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(44, 62, 80, 0.05)', // Um tom claro do nosso Azul Grafite
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
});