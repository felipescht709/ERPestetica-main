import React, { useState, useEffect } from 'react';
import api from '../utils/api';

// Helper para encontrar uma regra específica.
const findRule = (regras, tipo) => regras.find(r => r.tipo_regra === tipo);

const FormRegrasGerais = ({ regras, onUpdate }) => {
    // Estados para os campos existentes
    const [limiteDiario, setLimiteDiario] = useState('');
    const [intervaloPadrao, setIntervaloPadrao] = useState('');
    
    // --- NOVO: Estado para o nosso "interruptor de segurança" ---
    const [validacoesAtivas, setValidacoesAtivas] = useState(false);

    // useEffect agora também inicializa o estado do nosso novo interruptor
    useEffect(() => {
        const regraLimite = findRule(regras, 'limite_agendamentos_dia');
        const regraIntervalo = findRule(regras, 'intervalo_padrao');
        // --- NOVO: Procura pela regra que ativa as validações ---
        const regraValidacoes = findRule(regras, 'ativar_validacoes_avancadas');

        setLimiteDiario(regraLimite?.valor_numerico || '');
        setIntervaloPadrao(regraIntervalo?.intervalo_minutos || '');
        // O interruptor estará "ligado" se a regra existir e estiver ativa.
        setValidacoesAtivas(regraValidacoes ? regraValidacoes.ativo : false);
    }, [regras]);

    // Função para salvar as regras numéricas (limite e intervalo)
    const handleSaveRule = async (tipoRegra) => {
        let payload = { tipo_regra: tipoRegra };
        const regraExistente = findRule(regras, tipoRegra);

        if (tipoRegra === 'limite_agendamentos_dia') {
            payload.valor_numerico = parseInt(limiteDiario, 10) || null; // Permite limpar o campo
        } else if (tipoRegra === 'intervalo_padrao') {
            payload.intervalo_minutos = parseInt(intervaloPadrao, 10) || null; // Permite limpar o campo
        } else {
            return;
        }

        try {
            if (regraExistente) {
                await api(`/agenda/config/${regraExistente.cod_configuracao}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await api('/agenda/config', { method: 'POST', body: JSON.stringify(payload) });
            }
            alert('Regra salva com sucesso!');
            onUpdate();
        } catch (error) {
            console.error(`Erro ao salvar regra ${tipoRegra}:`, error);
            alert(`Falha ao salvar regra: ${error.message}`);
        }
    };
    
    // --- NOVA FUNÇÃO: Para ligar/desligar o interruptor de segurança ---
    const handleToggleValidations = async (e) => {
        const isChecked = e.target.checked;
        setValidacoesAtivas(isChecked);

        const tipoRegra = 'ativar_validacoes_avancadas';
        const payload = { tipo_regra: tipoRegra, ativo: isChecked, descricao: "Controla as validações de horário e limite da agenda" };
        const regraExistente = findRule(regras, tipoRegra);

        try {
            if (regraExistente) {
                await api(`/agenda/config/${regraExistente.cod_configuracao}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await api('/agenda/config', { method: 'POST', body: JSON.stringify(payload) });
            }
            alert(`Validações avançadas ${isChecked ? 'ATIVADAS' : 'DESATIVADAS'}!`);
            onUpdate();
        } catch (error) {
            console.error('Erro ao alternar validações:', error);
            alert(`Falha ao salvar: ${error.message}`);
            // Reverte o estado em caso de erro
            setValidacoesAtivas(!isChecked);
        }
    };


    return (
        <div className="form-regras-gerais-container">
            <h3>Regras Gerais da Agenda</h3>

            {/* --- NOVO TRECHO ADICIONADO --- */}
            <div className="form-group" style={{ padding: '1rem', border: '1px solid #007bff', borderRadius: '5px', marginBottom: '1.5rem', backgroundColor: '#f0f7ff' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' }}>
                    <input 
                        type="checkbox"
                        style={{ width: '20px', height: '20px' }}
                        checked={validacoesAtivas}
                        onChange={handleToggleValidations}
                    />
                    Ativar restrições avançadas da agenda
                </label>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#555' }}>
                    Quando ativo, o sistema irá validar o horário de funcionamento, feriados e o limite máximo de agendamentos por dia.
                </p>
            </div>
            {/* --- FIM DO NOVO TRECHO --- */}

            <div className="form-group">
                <label htmlFor="limiteDiario">Limite máximo de agendamentos por dia</label>
                <input
                    type="number"
                    id="limiteDiario"
                    className="form-input"
                    value={limiteDiario}
                    onChange={(e) => setLimiteDiario(e.target.value)}
                    placeholder="Ex: 10 (deixe em branco para ilimitado)"
                />
                <button onClick={() => handleSaveRule('limite_agendamentos_dia')} className="btn btn-secondary">Salvar Limite</button>
            </div>

            <div className="form-group">
                <label htmlFor="intervaloPadrao">Intervalo mínimo entre horários (em minutos)</label>
                <input
                    type="number"
                    id="intervaloPadrao"
                    className="form-input"
                    value={intervaloPadrao}
                    onChange={(e) => setIntervaloPadrao(e.target.value)}
                    placeholder="Ex: 30 (para agendamentos de 30 em 30 min)"
                />
                <button onClick={() => handleSaveRule('intervalo_padrao')} className="btn btn-secondary">Salvar Intervalo</button>
            </div>
        </div>
    );
};

export default FormRegrasGerais;