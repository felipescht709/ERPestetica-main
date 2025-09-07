import React, { useContext, useEffect } from 'react';
import { ActivityIndicator, View, LogBox } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthContext } from '../services/AuthContext';


LogBox.ignoreLogs(['Animated: `useNativeDriver` is not supported']);
const InitialLayout = () => {
    const authContext = useContext(AuthContext);
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // A lógica de redirecionamento só deve ser executada quando o contexto estiver pronto e não estiver carregando.
        if (!authContext || authContext.loadingAuth) {
            return;
        }

        const { isAuthenticated } = authContext;
        const inTabsGroup = segments[0] === '(tabs)';

        if (isAuthenticated && !inTabsGroup) {
            router.replace('/(tabs)/agenda'); // Redireciona para uma tela específica
        } else if (!isAuthenticated && inTabsGroup) {
            router.replace('/login');
        }
    }, [authContext, segments, router]);

    // Renderiza um indicador de carregamento enquanto o contexto ou o estado de autenticação estiverem sendo carregados.
    if (!authContext || authContext.loadingAuth) {
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#1d4ed8" /></View>;
    }

    return <Slot />;
};

export default InitialLayout;