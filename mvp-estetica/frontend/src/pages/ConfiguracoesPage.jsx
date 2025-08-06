import React, { useState } from 'react';
import ConfiguracoesAgenda from '../components/ConfiguracoesAgenda';

// Componentes "placeholder" para quando você for criar as outras seções.
const ConfiguracoesPerfil = () => (
    <div>
        <h2>Minhas Configurações de Perfil</h2>
        <p>Em breve, aqui você poderá alterar sua senha, foto e outras informações pessoais.</p>
    </div>
);

const ConfiguracoesEmpresa = () => (
    <div>
        <h2>Dados da Empresa</h2>
        <p>Em breve, aqui você poderá editar o nome, endereço e logo da sua empresa.</p>
    </div>
);


const ConfiguracoesPage = () => {
    // Estado que controla qual componente de configuração será exibido
    const [view, setView] = useState('agenda');

    const renderView = () => {
        switch (view) {
            case 'agenda':
                return <ConfiguracoesAgenda />;
            case 'perfil':
                return <ConfiguracoesPerfil />;
            case 'empresa':
                return <ConfiguracoesEmpresa />;
            default:
                return <ConfiguracoesAgenda />;
        }
    };

    return (
        <div className="page-container">
            <h1>Configurações</h1>
            
            <div className="config-main-nav" style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <button onClick={() => setView('agenda')} disabled={view === 'agenda'}>Agenda</button>
                <button onClick={() => setView('perfil')} disabled={view === 'perfil'}>Perfil</button>
                <button onClick={() => setView('empresa')} disabled={view === 'empresa'}>Empresa</button>
            </div>

            <div className="config-content">
                {renderView()}
            </div>
        </div>
    );
};

export default ConfiguracoesPage;