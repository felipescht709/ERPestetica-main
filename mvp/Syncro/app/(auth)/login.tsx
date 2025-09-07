import React, { useState, useContext } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
    ActivityIndicator, ScrollView, SafeAreaView
} from 'react-native';
import { AuthContext } from '../../services/AuthContext';
import api from '../../services/api';

// Cores baseadas no seu style.css e auth.css
const COLORS = {
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    background: '#f3f4f6',
    card: '#ffffff',
    text: '#1f2937',
    subtleText: '#6b7280',
    errorText: '#c62828',
    errorBg: '#ffebee',
    border: '#e5e7eb',
};

const AuthScreen = () => {
    // Estado para alternar entre os formulários
    const [isRegisterMode, setIsRegisterMode] = useState(false);

    // Estados para os campos do formulário (combinando login e registro)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nome_usuario, setNomeUsuario] = useState('');
    const [nome_empresa, setNomeEmpresa] = useState('');
    const [cnpj, setCnpj] = useState('');
    
    // Estados de controle
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const authContext = useContext(AuthContext);

    if (!authContext) {
        // Idealmente, o AuthProvider envolve tudo, então isso não deve acontecer.
        return <ActivityIndicator />;
    }
    const { login } = authContext;

    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        // Limpa todos os campos e mensagens ao alternar
        setEmail('');
        setPassword('');
        setNomeUsuario('');
        setNomeEmpresa('');
        setCnpj('');
        setMessage('');
    };

    const handleSubmit = async () => {
        setLoading(true);
        setMessage('');

        // Validações básicas
        if (!email.includes('@') || password.length < 6) {
            setMessage('Email inválido ou senha muito curta (mínimo 6 caracteres).');
            setLoading(false);
            return;
        }

        const endpoint = isRegisterMode ? '/auth/register' : '/auth/login';
        let requestBody: any = { email, senha: password };

        if (isRegisterMode) {
            if (!nome_usuario.trim() || !nome_empresa.trim() || !cnpj.trim()) {
                setMessage('Nome, Nome da Empresa e CNPJ são obrigatórios.');
                setLoading(false);
                return;
            }
            requestBody = {
                ...requestBody,
                nome_usuario: nome_usuario.trim(),
                nome_empresa: nome_empresa.trim(),
                cnpj: cnpj.trim(),
                role: 'admin', // Primeira conta é sempre admin
            };
        }

        try {
            const data = await api(endpoint, {
                method: 'POST',
                body: JSON.stringify(requestBody),
            });

            // A função `login` do nosso contexto cuida de tudo
            await login(data.token);
            // O redirecionamento é feito automaticamente pelo InitialLayout

        } catch (error: any) {
            // Mostra a mensagem de erro vinda do backend
            setMessage(error.msg || 'Ocorreu um erro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>{isRegisterMode ? 'Registrar Empresa' : 'Login'}</Text>

                <View style={styles.card}>
                    {message ? <Text style={styles.errorText}>{message}</Text> : null}

                    {isRegisterMode && (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder="Seu Nome Completo"
                                value={nome_usuario}
                                onChangeText={setNomeUsuario}
                                placeholderTextColor={COLORS.subtleText}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Nome da Empresa"
                                value={nome_empresa}
                                onChangeText={setNomeEmpresa}
                                placeholderTextColor={COLORS.subtleText}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="CNPJ"
                                value={cnpj}
                                onChangeText={setCnpj}
                                keyboardType="numeric"
                                placeholderTextColor={COLORS.subtleText}
                            />
                        </>
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder="E-mail"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={COLORS.subtleText}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Senha"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholderTextColor={COLORS.subtleText}
                    />

                    {loading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
                    ) : (
                        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                            <Text style={styles.buttonText}>{isRegisterMode ? 'Registrar' : 'Entrar'}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity onPress={toggleMode} disabled={loading}>
                    <Text style={styles.switchText}>
                        {isRegisterMode ? 'Já tem uma conta? Faça Login' : 'Não tem uma conta? Registre-se'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

// Estilos traduzidos do seu auth.css
const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        color: COLORS.primaryDark,
        marginBottom: 25,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 10,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    input: {
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
        fontSize: 16,
        color: COLORS.text,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchText: {
        marginTop: 20,
        textAlign: 'center',
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    errorText: {
        color: COLORS.errorText,
        backgroundColor: COLORS.errorBg,
        textAlign: 'center',
        marginBottom: 15,
        padding: 10,
        borderRadius: 5,
        fontWeight: 'bold',
    },
});

export default AuthScreen;