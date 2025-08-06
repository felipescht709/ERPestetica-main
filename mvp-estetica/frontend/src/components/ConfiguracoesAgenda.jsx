import React, { useState, useEffect } from 'react';
import api from '../utils/api'; 
import TabelaHorarios from './TabelaHorarios';
import FormRegrasGerais from './FormRegrasGerais';
import GestorBloqueios from './GestorBloqueios';

const ConfiguracoesAgenda = () => {
    const [abaAtiva, setAbaAtiva] = useState('horarios');
    const [configuracoes, setConfiguracoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchConfiguracoes = async () => {
        setLoading(true);
        try {
            const data = await api('/agenda/config');
            setConfiguracoes(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            console.error("Erro ao carregar configurações da agenda:", err);
            setError(err.message || "Não foi possível carregar as configurações.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfiguracoes();
    }, []);

    if (loading) return <div>Carregando configurações da agenda...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    // Seus componentes TabelaHorarios, FormRegrasGerais e GestorBloqueios,
    // que você confirmou já estarem corretos, serão renderizados aqui.
    return (
        <div>
            <h2>Configurações da Agenda</h2>
            <p>Defina os horários de funcionamento, regras de agendamento e bloqueios para organizar sua operação.</p>
            
            <div className="abas-navegacao" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee' }}>
                <button onClick={() => setAbaAtiva('horarios')} disabled={abaAtiva === 'horarios'}>Horários</button>
                <button onClick={() => setAbaAtiva('regras')} disabled={abaAtiva === 'regras'}>Regras Gerais</button>
                <button onClick={() => setAbaAtiva('bloqueios')} disabled={abaAtiva === 'bloqueios'}>Feriados e Bloqueios</button>
            </div>

            <div className="conteudo-aba">
                {abaAtiva === 'horarios' && <TabelaHorarios regras={configuracoes.filter(r => r.tipo_regra === 'horario_trabalho')} onUpdate={fetchConfiguracoes} />}
                {abaAtiva === 'regras' && <FormRegrasGerais regras={configuracoes} onUpdate={fetchConfiguracoes} />}
                {abaAtiva === 'bloqueios' && <GestorBloqueios regras={configuracoes.filter(r => ['feriado', 'bloqueio_especifico'].includes(r.tipo_regra))} onUpdate={fetchConfiguracoes} />}
            </div>
        </div>
    );
};

export default ConfiguracoesAgenda;