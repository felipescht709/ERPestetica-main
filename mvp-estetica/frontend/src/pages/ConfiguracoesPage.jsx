// frontend/src/pages/ConfiguracoesPage.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import moment from 'moment';
// Importar ícones do Lucide React
import { Settings, Plus, XCircle } from 'lucide-react';


const ConfiguracoesPage = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formMode, setFormMode] = useState('create'); // 'create' ou 'edit'
    const [selectedRule, setSelectedRule] = useState(null); // Regra selecionada para edição

    const [formData, setFormData] = useState({
        tipo_regra: '',
        dia_semana: '', // null por padrão para não aplicável, ou string vazia para selects
        data_especifica: '', // string YYYY-MM-DD
        hora_inicio: '', // string HH:mm
        hora_fim: '',    // string HH:mm
        intervalo_minutos: '', // number
        capacidade_simultanea: '', // NOVO: para máximo de agendamentos simultâneos
        descricao: '',
        ativo: true
    });

    const { userRole } = useContext(AuthContext);
    const allowedRolesForConfig = ['admin', 'gestor']; // Apenas admin e gestor podem configurar
    const canManageConfig = userRole && allowedRolesForConfig.includes(userRole);

    // Função para buscar as regras existentes
    const fetchRules = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            // Assumindo que o backend em /api/agenda/config filtra por cod_usuario_empresa
            const data = await api('/agenda/config', { method: 'GET' });
            setRules(data);
        } catch (err) {
            console.error('Erro ao buscar configurações da agenda:', err);
            setError(`Erro ao carregar configurações: ${err.message || 'Verifique sua conexão.'}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (canManageConfig) {
            fetchRules();
        } else {
            setError('Você não tem permissão para acessar esta página.');
            setLoading(false);
        }
    }, [canManageConfig, fetchRules]);

    // Handler para mudança nos campos do formulário
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Função para resetar o formulário
    const resetForm = useCallback(() => {
        setFormData({
            tipo_regra: '',
            dia_semana: '',
            data_especifica: '',
            hora_inicio: '',
            hora_fim: '',
            intervalo_minutos: '',
            capacidade_simultanea: '', // Resetar também
            descricao: '',
            ativo: true
        });
        setSelectedRule(null);
        setFormMode('create');
    }, []);

    // Handler para submissão do formulário (criar ou editar)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageConfig) {
            alert('Você não tem permissão para salvar configurações.'); // Usar modal customizado
            return;
        }

        try {
            const payload = { ...formData };
            // Ajustar tipos de dados e valores nulos para o backend
            payload.dia_semana = payload.dia_semana !== '' ? parseInt(payload.dia_semana) : null;
            payload.intervalo_minutos = payload.intervalo_minutos !== '' ? parseInt(payload.intervalo_minutos) : null;
            payload.capacidade_simultanea = payload.capacidade_simultanea !== '' ? parseInt(payload.capacidade_simultanea) : null; // NOVO
            payload.data_especifica = payload.data_especifica || null; // Envia null se vazio

            // Lógica de validação frontend aprimorada
            if (!payload.tipo_regra) { alert('Tipo de regra é obrigatório.'); return; } // Usar modal customizado
            if (['horario_operacao_padrao', 'horario_almoco'].includes(payload.tipo_regra)) {
                if (payload.dia_semana === null || !payload.hora_inicio || !payload.hora_fim) {
                    alert('Para horários de operação/almoço, Dia da Semana, Hora de Início e Hora de Fim são obrigatórios.'); return; // Usar modal customizado
                }
                if (payload.tipo_regra === 'horario_operacao_padrao' && payload.capacidade_simultanea === null) {
                    alert('Para Horário de Funcionamento, a Capacidade Simultânea é obrigatória.'); return; // Usar modal customizado
                }
            }
            if (['feriado_fixo', 'feriado_movel', 'excecao_dia_especifico'].includes(payload.tipo_regra) && !payload.data_especifica) {
                alert('Para feriados ou exceções, a Data Específica é obrigatória.'); return; // Usar modal customizado
            }
            if (payload.tipo_regra === 'intervalo_entre_agendamentos' && payload.intervalo_minutos === null) {
                alert('Para intervalo entre agendamentos, o número de minutos é obrigatório e deve ser positivo.'); return; // Usar modal customizado
            }


            let res;
            if (formMode === 'create') {
                res = await api('/agenda/config', { method: 'POST', body: payload });
                alert('Regra criada com sucesso!'); // Usar modal customizado
            } else { // formMode === 'edit'
                res = await api(`/agenda/config/${selectedRule.cod_configuracao}`, { method: 'PUT', body: payload });
                alert('Regra atualizada com sucesso!'); // Usar modal customizado
            }
            resetForm();
            fetchRules(); // Recarrega a lista
        } catch (err) {
            console.error('Erro ao salvar regra:', err);
            alert(`Erro ao salvar regra: ${err.message || 'Verifique sua conexão.'}`); // Usar modal customizado
        }
    };

    // Handler para iniciar o modo de edição
    const handleEdit = (rule) => {
        setSelectedRule(rule);
        setFormMode('edit');
        setFormData({
            tipo_regra: rule.tipo_regra,
            dia_semana: rule.dia_semana !== null ? rule.dia_semana.toString() : '',
            data_especifica: rule.data_especifica ? moment(rule.data_especifica).format('YYYY-MM-DD') : '',
            hora_inicio: rule.hora_inicio || '',
            hora_fim: rule.hora_fim || '',
            intervalo_minutos: rule.intervalo_minutos !== null ? rule.intervalo_minutos.toString() : '',
            capacidade_simultanea: rule.capacidade_simultanea !== null ? rule.capacidade_simultanea.toString() : '', // NOVO: Para edição
            descricao: rule.descricao || '',
            ativo: rule.ativo
        });
    };

    // Handler para deletar uma regra
    const handleDelete = async (cod_configuracao) => {
        if (!canManageConfig) {
            alert('Você não tem permissão para deletar configurações.'); // Usar modal customizado
            return;
        }
        if (window.confirm('Tem certeza que deseja deletar esta regra?')) { // Usar modal customizado
            try {
                await api(`/agenda/config/${cod_configuracao}`, { method: 'DELETE' });
                alert('Regra deletada com sucesso!'); // Usar modal customizado
                fetchRules();
            } catch (err) {
                console.error('Erro ao deletar regra:', err);
                alert(`Erro ao deletar regra: ${err.message || 'Verifique sua conexão.'}`); // Usar modal customizado
            }
        }
    };

    // Função auxiliar para exibir o dia da semana em português
    const getDiaSemanaNome = (num) => {
        const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        return dias[num];
    };

    if (loading) {
        return (
            <div className="section-content active empty-state">
                <p>Carregando configurações...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="section-content active alert error">
                <p>{error}</p>
            </div>
        );
    }

    if (!canManageConfig && !loading && !error) { // Mostrar mensagem de permissão negada apenas se não estiver carregando/com erro geral
        return (
            <div className="section-content active alert error">
                <p>Você não tem permissão para acessar as configurações.</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2><Settings size={28} style={{verticalAlign: 'middle', marginRight: '10px'}} /> Configurações</h2>
                {formMode === 'edit' && (
                     <button type="button" className="btn-primary-dark" onClick={resetForm}>
                        <Plus size={20} /> Adicionar Nova Regra
                    </button>
                )}
            </div>

            {/* Seção de Configuração da Agenda */}
            <div className="card mb-6 section-content"> {/* Adicionado section-content para o estilo de card */}
                <div className="card-header">
                    <h3 className="card-title">{formMode === 'create' ? 'Adicionar Nova Regra de Agenda' : 'Editar Regra de Agenda'}</h3>
                </div>
                <div className="card-content">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="tipo_regra">Tipo de Regra:</label>
                            <select name="tipo_regra" id="tipo_regra" value={formData.tipo_regra} onChange={handleChange} required className="input-field">
                                <option value="">Selecione o Tipo</option>
                                <option value="horario_operacao_padrao">Horário de Funcionamento Padrão</option>
                                <option value="horario_almoco">Horário de Almoço</option>
                                <option value="feriado_fixo">Feriado Fixo (todo ano)</option>
                                <option value="feriado_movel">Feriado Móvel (data específica)</option>
                                <option value="excecao_dia_especifico">Exceção para Dia Específico</option>
                                <option value="intervalo_entre_agendamentos">Intervalo entre Agendamentos</option>
                                {/* Futuramente: 'capacidade_diaria', 'bloqueio_tempo_arbitrario' */}
                            </select>
                        </div>

                        {/* Campos condicionais baseados no tipo_regra */}
                        {['horario_operacao_padrao', 'horario_almoco'].includes(formData.tipo_regra) && (
                            <div className="form-row"> {/* Use form-row para agrupar half-width */}
                                <div className="form-group half-width">
                                    <label htmlFor="dia_semana">Dia da Semana:</label>
                                    <select name="dia_semana" id="dia_semana" value={formData.dia_semana} onChange={handleChange} required={formData.tipo_regra !== 'horario_almoco'} className="input-field">
                                        <option value="">Selecione o Dia</option>
                                        <option value="1">Segunda-feira</option>
                                        <option value="2">Terça-feira</option>
                                        <option value="3">Quarta-feira</option>
                                        <option value="4">Quinta-feira</option>
                                        <option value="5">Sexta-feira</option>
                                        <option value="6">Sábado</option>
                                        <option value="0">Domingo</option>
                                        {/* Opcional: Adicionar "Todos os Dias" com valor especial, se o backend suportar */}
                                    </select>
                                </div>
                                <div className="form-group half-width">
                                    <label htmlFor="hora_inicio">Hora de Início:</label>
                                    <input type="time" name="hora_inicio" id="hora_inicio" value={formData.hora_inicio} onChange={handleChange} required className="input-field" />
                                </div>
                                <div className="form-group half-width">
                                    <label htmlFor="hora_fim">Hora de Fim:</label>
                                    <input type="time" name="hora_fim" id="hora_fim" value={formData.hora_fim} onChange={handleChange} required className="input-field" />
                                </div>
                                {formData.tipo_regra === 'horario_operacao_padrao' && ( // NOVO: Capacidade simultânea
                                    <div className="form-group half-width">
                                        <label htmlFor="capacidade_simultanea">Capacidade Simultânea:</label>
                                        <input type="number" name="capacidade_simultanea" id="capacidade_simultanea" value={formData.capacidade_simultanea} onChange={handleChange} required className="input-field" />
                                    </div>
                                )}
                            </div>
                        )}

                        {['feriado_fixo', 'feriado_movel', 'excecao_dia_especifico'].includes(formData.tipo_regra) && (
                            <div className="form-row"> {/* Use form-row para agrupar half-width */}
                                <div className="form-group half-width">
                                    <label htmlFor="data_especifica">Data Específica:</label>
                                    <input type="date" name="data_especifica" id="data_especifica" value={formData.data_especifica} onChange={handleChange} required className="input-field" />
                                </div>
                                {formData.tipo_regra === 'excecao_dia_especifico' && (
                                    <>
                                        <div className="form-group half-width">
                                            <label htmlFor="hora_inicio_excecao">Hora de Início (opcional):</label>
                                            <input type="time" name="hora_inicio" id="hora_inicio_excecao" value={formData.hora_inicio} onChange={handleChange} className="input-field" />
                                        </div>
                                        <div className="form-group half-width">
                                            <label htmlFor="hora_fim_excecao">Hora de Fim (opcional):</label>
                                            <input type="time" name="hora_fim" id="hora_fim_excecao" value={formData.hora_fim} onChange={handleChange} className="input-field" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {formData.tipo_regra === 'intervalo_entre_agendamentos' && (
                            <div className="form-group">
                                <label htmlFor="intervalo_minutos">Intervalo Mínimo (minutos):</label>
                                <input type="number" name="intervalo_minutos" id="intervalo_minutos" value={formData.intervalo_minutos} onChange={handleChange} required className="input-field" />
                            </div>
                        )}

                        <div className="form-group">
                            <input type="checkbox" name="ativo" id="ativo" checked={formData.ativo} onChange={handleChange} />
                            <label htmlFor="ativo" style={{ display: 'inline-block', marginLeft: '10px' }}>Regra Ativa</label>
                        </div>

                        <div className="modal-actions">
                            <button type="submit" className="button-primary">
                                {formMode === 'create' ? 'Adicionar Regra' : 'Atualizar Regra'}
                            </button>
                            {formMode === 'edit' && (
                                <button type="button" className="button-secondary" onClick={resetForm}>Cancelar Edição</button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Listagem das Regras Existentes */}
            <div className="card mt-6 section-content"> {/* Adicionado section-content para o estilo de card */}
                <div className="card-header">
                    <h3 className="card-title">Regras de Configuração Atuais</h3>
                </div>
                <div className="card-content">
                    {rules.length === 0 ? (
                        <p className="empty-state">Nenhuma regra de configuração encontrada.</p>
                    ) : (
                        <div className="list-group">
                            {rules.map(rule => (
                                <div key={rule.cod_configuracao} className="list-item">
                                    <div className="list-item-main-info">
                                        <h4 className="list-item-title">
                                            {rule.descricao || rule.tipo_regra.replace(/_/g, ' ').toUpperCase()}
                                        </h4>
                                        <p className="list-item-subtitle">
                                            {rule.tipo_regra === 'horario_operacao_padrao' && `Funcionamento: ${getDiaSemanaNome(rule.dia_semana)} das ${rule.hora_inicio} às ${rule.hora_fim}. Capacidade: ${rule.capacidade_simultanea || 'N/A'}`}
                                            {rule.tipo_regra === 'horario_almoco' && `Almoço: ${getDiaSemanaNome(rule.dia_semana)} das ${rule.hora_inicio} às ${rule.hora_fim}`}
                                            {['feriado_fixo', 'feriado_movel'].includes(rule.tipo_regra) && `Feriado: ${moment(rule.data_especifica).format('DD/MM/YYYY')}`}
                                            {rule.tipo_regra === 'excecao_dia_especifico' && `Exceção: ${moment(rule.data_especifica).format('DD/MM/YYYY')} ${rule.hora_inicio ? `das ${rule.hora_inicio} às ${rule.hora_fim}` : '(Dia Fechado)'}`}
                                            {rule.tipo_regra === 'intervalo_entre_agendamentos' && `Intervalo: ${rule.intervalo_minutos} minutos`}
                                        </p>
                                    </div>
                                    <div className="list-item-actions">
                                        <span className={`status-badge ${rule.ativo ? 'status-confirmado' : 'status-inativo'}`}>
                                            {rule.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                        <button onClick={() => handleEdit(rule)} className="btn-action" title="Editar">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(rule.cod_configuracao)} className="btn-action btn-delete" title="Deletar">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfiguracoesPage;
