import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const TabelaHorarios = ({ regras, onUpdate }) => {
    const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const [horarios, setHorarios] = useState({});

    useEffect(() => {
        const initialState = {};
        DIAS_SEMANA.forEach((_, index) => {
            const regraDoDia = regras.find(r => r.dia_semana === index);
            initialState[index] = {
                id: regraDoDia?.cod_configuracao || null,
                ativo: regraDoDia ? regraDoDia.ativo : false,
                inicio: regraDoDia?.hora_inicio || '08:00',
                fim: regraDoDia?.hora_fim || '18:00',
            };
        });
        setHorarios(initialState);
    }, [regras]);

    const handleInputChange = (diaIndex, campo, valor) => {
        setHorarios(prev => ({
            ...prev,
            [diaIndex]: { ...prev[diaIndex], [campo]: valor }
        }));
    };

    // ****** FUNÇÃO DE SALVAR COM DEPURAÇÃO ******
    const handleSave = async (diaIndex) => {
        // LOG 1: Confirma que a função foi chamada
        console.log(`[handleSave] Iniciado para o dia: ${DIAS_SEMANA[diaIndex]} (índice ${diaIndex})`);

        const horarioDia = horarios[diaIndex];

        // LOG 2: Mostra os dados que serão salvos
        console.log('[handleSave] Dados do dia:', horarioDia);

        if (!horarioDia) {
            console.error('[handleSave] ERRO: Objeto "horarioDia" não encontrado. Não é possível salvar.');
            alert("Erro interno: não foi possível encontrar os dados para este dia. Contacte o suporte.");
            return;
        }

        const payload = {
            tipo_regra: 'horario_trabalho',
            dia_semana: diaIndex,
            hora_inicio: horarioDia.inicio,
            hora_fim: horarioDia.fim,
            ativo: horarioDia.ativo,
        };

        // LOG 3: Mostra o payload final antes de enviar
        console.log('[handleSave] Payload a ser enviado para a API:', payload);

        try {
            if (horarioDia.id) {
                console.log(`[handleSave] Executando PUT para o ID: ${horarioDia.id}`);
                await api(`/agenda/config/${horarioDia.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                console.log('[handleSave] Executando POST para criar nova regra.');
                await api('/agenda/config', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }
            console.log('[handleSave] Sucesso! Chamando onUpdate.');
            alert(`Horário de ${DIAS_SEMANA[diaIndex]} salvo com sucesso!`);
            onUpdate();
        } catch (error) {
            console.error("[handleSave] ERRO na chamada da API:", error);
            alert(`Falha ao salvar: ${error.message}`);
        }
    };

    // O JSX da tabela permanece o mesmo
    return (
        <div className="tabela-horarios-container">
            <h3>Horários de Funcionamento</h3>
            <p>Marque os dias de atendimento e defina a jornada de trabalho. O sistema usará esses horários para disponibilizar a agenda.</p>
            <table className="horarios-table">
                <thead>
                    <tr>
                        <th>Dia da Semana</th>
                        <th>Status</th>
                        <th>Horário de Início</th>
                        <th>Horário de Fim</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {DIAS_SEMANA.map((dia, index) => {
                        const horarioDia = horarios[index] || {};
                        return (
                            <tr key={index} className={!horarioDia.ativo ? 'inativo' : ''}>
                                <td>{dia}</td>
                                <td>
                                    <label className="switch">
                                        <input type="checkbox" checked={horarioDia.ativo || false} onChange={(e) => handleInputChange(index, 'ativo', e.target.checked)} />
                                        <span className="slider round"></span>
                                    </label>
                                    {horarioDia.ativo ? ' Aberto' : ' Fechado'}
                                </td>
                                <td><input type="time" className="form-input" value={horarioDia.inicio || ''} disabled={!horarioDia.ativo} onChange={(e) => handleInputChange(index, 'inicio', e.target.value)} /></td>
                                <td><input type="time" className="form-input" value={horarioDia.fim || ''} disabled={!horarioDia.ativo} onChange={(e) => handleInputChange(index, 'fim', e.target.value)} /></td>
                                <td><button onClick={() => handleSave(index)} className="btn btn-primary">Salvar</button></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default TabelaHorarios;