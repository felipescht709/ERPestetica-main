import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { Spinner } from 'react-bootstrap';
import { Plus, Edit, Trash2, Clock, CalendarOff, Coffee } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const ConfiguracoesAgenda = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [currentRule, setCurrentRule] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState(null);

    const diasDaSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

    const fetchRules = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api('/agenda/config', { method: 'GET' });
            setRules(data);
        } catch (err) {
            setError(err.msg || 'Erro ao carregar as configurações da agenda.');
            toast.error(err.msg || 'Erro ao carregar as configurações da agenda.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const handleAddNew = (tipo_regra) => {
        setCurrentRule({
            tipo_regra,
            dia_semana: (tipo_regra === 'horario_trabalho' || tipo_regra === 'intervalo_almoco') ? 1 : null,
            data_especifica: tipo_regra === 'feriado' ? new Date().toISOString().split('T')[0] : null,
            hora_inicio: tipo_regra === 'intervalo_almoco' ? '12:00' : '08:00',
            hora_fim: tipo_regra === 'intervalo_almoco' ? '13:00' : '18:00',
            capacidade_simultanea: 1,
            descricao: '',
            ativo: true,
        });
        setShowModal(true);
    };

    const handleEdit = (rule) => {
        setCurrentRule({
            ...rule,
            data_especifica: rule.data_especifica ? new Date(rule.data_especifica).toISOString().split('T')[0] : null,
        });
        setShowModal(true);
    };

    const handleDelete = (rule) => {
        setRuleToDelete(rule);
        setShowConfirmModal(true);
    };

    const executeDelete = async () => {
        if (!ruleToDelete) return;
        try {
            await api(`/agenda/config/${ruleToDelete.cod_configuracao}`, { method: 'DELETE' });
            toast.success('Regra removida com sucesso!');
            fetchRules();
        } catch (err) {
            toast.error(err.msg || 'Erro ao remover a regra.');
        } finally {
            setShowConfirmModal(false);
            setRuleToDelete(null);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const isEditing = !!currentRule.cod_configuracao;
        const url = isEditing ? `/agenda/config/${currentRule.cod_configuracao}` : '/agenda/config';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await api(url, { method, body: JSON.stringify(currentRule) });
            toast.success(`Regra ${isEditing ? 'atualizada' : 'criada'} com sucesso!`);
            setShowModal(false);
            setCurrentRule(null);
            fetchRules();
        } catch (err) {
            toast.error(err.msg || `Erro ao ${isEditing ? 'atualizar' : 'criar'} a regra.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderRuleForm = () => (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>{currentRule?.cod_configuracao ? 'Editar Regra' : 'Nova Regra'}</h3>
                <form onSubmit={handleSave}>
                    {currentRule.tipo_regra === 'horario_trabalho' || currentRule.tipo_regra === 'intervalo_almoco' ? (
                        <>
                            <div className="form-group">
                                <label>Dia da Semana</label>
                                <select className="input-field" value={currentRule.dia_semana} onChange={(e) => setCurrentRule({ ...currentRule, dia_semana: parseInt(e.target.value) })}>
                                    {diasDaSemana.map((dia, index) => <option key={index} value={index}>{dia}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group half-width">
                                    <label>Hora Início</label>
                                    <input type="time" className="input-field" value={currentRule.hora_inicio} onChange={(e) => setCurrentRule({ ...currentRule, hora_inicio: e.target.value })} />
                                </div>
                                <div className="form-group half-width">
                                    <label>Hora Fim</label>
                                    <input type="time" className="input-field" value={currentRule.hora_fim} onChange={(e) => setCurrentRule({ ...currentRule, hora_fim: e.target.value })} />
                                </div>
                            </div>
                            {currentRule.tipo_regra === 'horario_trabalho' && (
                                <div className="form-group">
                                    <label>Capacidade Simultânea</label>
                                    <input type="number" min="1" className="input-field" value={currentRule.capacidade_simultanea || 1} onChange={(e) => setCurrentRule({ ...currentRule, capacidade_simultanea: parseInt(e.target.value) })} />
                                </div>
                            )}
                            {currentRule.tipo_regra === 'intervalo_almoco' && (
                                <div className="form-group">
                                    <label>Descrição (Ex: Almoço)</label>
                                    <input type="text" className="input-field" placeholder="Descrição da pausa" value={currentRule.descricao || ''} onChange={(e) => setCurrentRule({ ...currentRule, descricao: e.target.value })} />
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label>Data Específica</label>
                                <input type="date" className="input-field" value={currentRule.data_especifica} onChange={(e) => setCurrentRule({ ...currentRule, data_especifica: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Descrição (Ex: Feriado de Natal)</label>
                                <input type="text" className="input-field" value={currentRule.descricao} onChange={(e) => setCurrentRule({ ...currentRule, descricao: e.target.value })} />
                            </div>
                        </>
                    )}
                    <div className="form-group form-check">
                        <input type="checkbox" className="form-check-input" id="ativoCheck" checked={currentRule.ativo} onChange={(e) => setCurrentRule({ ...currentRule, ativo: e.target.checked })} />
                        <label className="form-check-label" htmlFor="ativoCheck">Regra Ativa</label>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="button-secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" className="button-primary" disabled={isSubmitting}>
                            {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    if (loading) return <div className="loading-screen"><Spinner animation="border" /></div>;
    if (error) return <div className="alert error">{error}</div>;

    const horarios = rules.filter(r => r.tipo_regra === 'horario_trabalho').sort((a, b) => a.dia_semana - b.dia_semana);
    const feriados = rules.filter(r => r.tipo_regra === 'feriado').sort((a, b) => new Date(a.data_especifica) - new Date(b.data_especifica));
    const intervalos = rules.filter(r => r.tipo_regra === 'intervalo_almoco').sort((a, b) => a.dia_semana - b.dia_semana);

    return (
        <div className="config-agenda-container">
            <ConfirmationModal
                show={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={executeDelete}
                title="Confirmar Exclusão"
                message="Tem certeza que deseja remover esta regra? Esta ação não pode ser desfeita."
                isDestructive={true}
            />
            {showModal && renderRuleForm()}

            <div className="section-content">
                <div className="page-section-header">
                    <h2><Clock size={24} className="me-2" /> Horários de Funcionamento</h2>
                    <button className="btn-primary-dark" onClick={() => handleAddNew('horario_trabalho')}>
                        <Plus size={20} /> Adicionar Horário
                    </button>
                </div>
                <div className="table-responsive">
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>Dia da Semana</th>
                                <th>Horário</th>
                                <th>Capacidade</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {horarios.length > 0 ? horarios.map(rule => (
                                <tr key={rule.cod_configuracao}>
                                    <td>{diasDaSemana[rule.dia_semana]}</td>
                                    <td>{rule.ativo ? `${rule.hora_inicio} - ${rule.hora_fim}` : 'Fechado'}</td>
                                    <td>{rule.capacidade_simultanea || 1}</td>
                                    <td>
                                        <span className={`status-badge ${rule.ativo ? 'status-confirmado' : 'status-cancelado'}`}>
                                            {rule.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn-action" onClick={() => handleEdit(rule)} title="Editar"><Edit size={18} /></button>
                                        <button className="btn-action btn-delete" onClick={() => handleDelete(rule)} title="Excluir"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="empty-state-table">Nenhum horário de funcionamento cadastrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="section-content mt-4">
                <div className="page-section-header">
                    <h2><Coffee size={24} className="me-2" /> Intervalos (Almoço, Pausas)</h2>
                    <button className="btn-primary-dark" onClick={() => handleAddNew('intervalo_almoco')}>
                        <Plus size={20} /> Adicionar Intervalo
                    </button>
                </div>
                <div className="table-responsive">
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>Dia da Semana</th>
                                <th>Intervalo</th>
                                <th>Descrição</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {intervalos.length > 0 ? intervalos.map(rule => (
                                <tr key={rule.cod_configuracao}>
                                    <td>{diasDaSemana[rule.dia_semana]}</td>
                                    <td>{rule.ativo ? `${rule.hora_inicio} - ${rule.hora_fim}` : 'N/A'}</td>
                                    <td>{rule.descricao || '-'}</td>
                                    <td>
                                        <span className={`status-badge ${rule.ativo ? 'status-confirmado' : 'status-cancelado'}`}>
                                            {rule.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn-action" onClick={() => handleEdit(rule)} title="Editar"><Edit size={18} /></button>
                                        <button className="btn-action btn-delete" onClick={() => handleDelete(rule)} title="Excluir"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="empty-state-table">Nenhum intervalo cadastrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="section-content mt-4">
                <div className="page-section-header">
                    <h2><CalendarOff size={24} className="me-2" /> Feriados e Bloqueios</h2>
                    <button className="btn-primary-dark" onClick={() => handleAddNew('feriado')}>
                        <Plus size={20} /> Adicionar Bloqueio
                    </button>
                </div>
                <div className="table-responsive">
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Descrição</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feriados.length > 0 ? feriados.map(rule => (
                                <tr key={rule.cod_configuracao}>
                                    <td>{new Date(rule.data_especifica).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                    <td>{rule.descricao}</td>
                                    <td>
                                        <span className={`status-badge ${rule.ativo ? 'status-confirmado' : 'status-cancelado'}`}>
                                            {rule.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn-action" onClick={() => handleEdit(rule)} title="Editar"><Edit size={18} /></button>
                                        <button className="btn-action btn-delete" onClick={() => handleDelete(rule)} title="Excluir"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="empty-state-table">Nenhum feriado ou bloqueio cadastrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ConfiguracoesAgenda;
