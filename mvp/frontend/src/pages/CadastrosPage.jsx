// frontend/src/pages/CadastrosPage.jsx
import React from 'react'; 
import { useParams, useNavigate } from 'react-router-dom';

// Importe os componentes de gerenciamento que vamos refatorar
import ClientsManagement from '../components/cadastros/ClientsManagement';
import ServicesManagement from '../components/cadastros/ServicesManagement';
import VehiclesManagement from '../components/cadastros/VehiclesManagement';

// Ícones para as abas
import { Users, Settings, Car } from 'lucide-react';

const CadastrosPage = () => {
    // O hook useParams nos permite ler o parâmetro da URL (ex: /cadastros/clientes)
    const { tipo } = useParams();
    const navigate = useNavigate();

    const renderContent = () => {
        switch (tipo) {
            case 'clientes':
                return <ClientsManagement />;
            case 'servicos':
                return <ServicesManagement />;
            case 'veiculos':
                return <VehiclesManagement />;
            default:
                // Se nenhum tipo for especificado ou for inválido, redireciona para clientes
                navigate('/cadastros/clientes', { replace: true });
                return null;
        }
    };

    const getActiveTabClass = (tabName) => {
        return tipo === tabName ? 'active' : '';
    };

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2>Central de Cadastros</h2>
            </div>

            {/* Abas de Navegação */}
            <div className="tabs-navigation">
                <button className={`tab-button ${getActiveTabClass('clientes')}`} onClick={() => navigate('/cadastros/clientes')}>
                    <Users size={20} />
                    <span>Clientes</span>
                </button>
                <button className={`tab-button ${getActiveTabClass('servicos')}`} onClick={() => navigate('/cadastros/servicos')}>
                    <Settings size={20} />
                    <span>Serviços</span>
                </button>
                <button className={`tab-button ${getActiveTabClass('veiculos')}`} onClick={() => navigate('/cadastros/veiculos')}>
                    <Car size={20} />
                    <span>Veículos</span>
                </button>
            </div>

            {/* Conteúdo dinâmico baseado na aba selecionada */}
            <div className="tab-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default CadastrosPage;