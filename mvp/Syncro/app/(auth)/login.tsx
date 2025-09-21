import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

// Paleta de cores oficial da Syncro Auto
const COLORS = {
  primary: '#2C3E50',
  accent: '#1ABC9C',
  background: '#ECF0F1',
  text: '#2C3E50',
  white: '#FFFFFF',
  danger: '#E74C3C'
};

const LoginScreen = () => {
    const { login } = useAuth();
    // CORREÇÃO: Inicializando os estados como vazios para entrada do usuário.
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
      // Adicionando uma validação simples para não enviar campos vazios
      if (!email || !senha) {
        Alert.alert("Atenção", "Por favor, preencha o e-mail e a senha.");
        return;
      }

      setLoading(true);
      try {
        await login(email, senha);
        // A navegação será tratada automaticamente pelo RootLayout
      } catch (error) {
        console.error("Falha no login:", error);
        Alert.alert("Erro no Login", "Usuário ou senha inválidos.");
      } finally {
        setLoading(false);
      }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Syncro Auto</Text>
            
            <TextInput
                style={styles.input}
                placeholder="E-mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#8A8A8A"
            />
            <TextInput
                style={styles.input}
                placeholder="Senha"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
                placeholderTextColor="#8A8A8A"
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
            </TouchableOpacity>
        </View>
    );
};

// ... (seus styles permanecem os mesmos)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: COLORS.background,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
        textAlign: 'center',
        marginBottom: 40,
    },
    input: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 16,
        color: COLORS.text,
    },
    button: {
        backgroundColor: COLORS.accent,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default LoginScreen;