import React from 'react';
import { AuthProvider } from '../services/AuthContext'; // Caminho correto a partir da raiz
import InitialLayout from '../components/InitialLayout'; // Vamos criar este componente

const RootLayout = () => {
    return (
        <AuthProvider>
            <InitialLayout />
        </AuthProvider>
    );
};

export default RootLayout;