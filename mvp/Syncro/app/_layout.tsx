import React, { useEffect } from 'react';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
// O caminho mudou para apontar para a pasta src
import { AuthProvider, useAuth } from '../src/context/AuthContext'; 
import { ActivityIndicator, View } from 'react-native';

const InitialLayout = () => {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (user && inAuthGroup) {
      router.replace('/(auth)/login');
  
    } else if (!user && !inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, segments, loading, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    );
  }

  return <Slot />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        {/* As rotas normais que já tínhamos */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* NOVA ROTA MODAL */}
        <Stack.Screen 
          name="novo_agendamento" 
          options={{ 
            presentation: 'modal', 
            headerShown: false 
          }} 
        />
      </Stack>
    </AuthProvider>
  );
}