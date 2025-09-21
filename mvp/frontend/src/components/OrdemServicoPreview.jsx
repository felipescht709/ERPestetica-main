// src/components/OrdemServicoPreview.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { FileText, User, CheckSquare, X, Wrench } from 'lucide-react';

// Novo componente para renderizar os itens do checklist de forma reutilizável
const ChecklistSection = ({ title, checklist, isReadOnly, onChecklistChange }) => (
    <div className="section-content">
        <h3 className="card-title"><CheckSquare size={20} /> {title}</h3>
        {(!checklist || checklist.length === 0) ? (
            <p className="empty-state-text">Nenhum item de checklist configurado para esta etapa.</p>
        ) : (
            <div className="checklist-container-modal">
                {checklist.map(item => (
                    <div key={item.cod_item_checklist} className="checklist-item-modal">
                        <div className="checklist-control">
                            <input
                                type="checkbox"
                                id={`check-modal-${item.cod_item_checklist}`}
                                checked={!!item.concluido}
                                disabled={isReadOnly}
                                onChange={(e) => onChecklistChange(item.cod_item_checklist, 'concluido', e.target.checked)}
                            />
                            <label htmlFor={`check-modal-${item.cod_item_checklist}`}>{item.descricao_item}</label>
                        </div>
                        <input
                            type="text"
                            placeholder="Obs."
                            className="input-field"
                            value={item.observacoes || ''}
                            disabled={isReadOnly}
                            onChange={(e) => onChecklistChange(item.cod_item_checklist, 'observacoes', e.target.value)}
                        />
                    </div>
                ))}
            </div>
        )}
    </div>
);


const OrdemServicoPreview = ({ osId, onClose, onServiceStarted }) => {
    const [os, setOs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOsDetails = useCallback(async () => {
        if (!osId) return;
        setLoading(true);
        setError(null);
        try {
            // Sua API deve retornar o objeto da OS com 'checklist_inicial'
            const data = await api(`/ordens_servico/${osId}`);
            setOs(data);
        } catch (err) {
            console.error("Erro ao buscar detalhes da OS:", err);
            setError(err.msg || 'Não foi possível carregar os detalhes da OS.');
        } finally {
            setLoading(false);
        }
    }, [osId]);

    useEffect(() => {
        fetchOsDetails();
    }, [fetchOsDetails]);

    const handleChecklistChange = (itemId, field, value) => {
        setOs(prevOs => ({
            ...prevOs,
            checklist_inicial: prevOs.checklist_inicial.map(item =>
                item.cod_item_checklist === itemId ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleStartService = async () => {
        // Validação: Garante que todos os itens do checklist inicial foram marcados
        const isChecklistComplete = os.checklist_inicial.every(item => item.concluido);
        if (!isChecklistComplete) {
            toast.warn('Por favor, marque todos os itens do checklist inicial para prosseguir.');
            return;
        }

        const payload = {
            status_os: 'Em Andamento',
            checklist_inicial: os.checklist_inicial, // Envia o checklist preenchido
        };

        try {
            await api(`/ordens-servico/${osId}/iniciar`, { // Rota sugerida para iniciar o serviço
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            toast.success('Serviço iniciado com sucesso!');
            onServiceStarted(); // Chama a função do componente pai para atualizar a lista e fechar
        } catch (err) {
            console.error("Erro ao iniciar serviço:", err);
            toast.error(err.msg || 'Não foi possível iniciar o serviço.');
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const isInitialChecklistReadOnly = os?.status_os !== 'Aguardando Início';

    return (
        <div className="modal-backdrop">
            <div className="modal-content large">
                <div className="modal-header">
                    {os ? (
                        <>
                            <h2><FileText size={24} /> OS #{os.cod_ordem_servico}</h2>
                            <span className={`status-badge status-${os.status_os?.toLowerCase().replace(' ', '-')}`}>{os.status_os}</span>
                        </>
                    ) : (
                        <h2>Carregando...</h2>
                    )}
                    <button onClick={onClose} className="btn-close-modal"><X size={24} /></button>
                </div>

                {loading && <div className="loading-screen">Carregando Detalhes...</div>}
                {error && <div className="alert error">{error}</div>}
                
                {os && (
                    <div className="modal-body">
                        {/* Informações do Cliente, Veículo e Itens */}
                        <div className="preview-grid">
                            <div className="section-content">
                                <h3 className="card-title"><User size={20} /> Cliente & Veículo</h3>
                                <p><strong>Cliente:</strong> {os.nome_cliente}</p>
                                {os.veiculo_placa && <p><strong>Veículo:</strong> {os.veiculo_modelo} ({os.veiculo_placa})</p>}
                                <p><strong>Responsável:</strong> {os.funcionario_responsavel_nome || 'Não definido'}</p>
                            </div>
                            
                            <div className="section-content">
                                 <h3 className="card-title"><Wrench size={20} /> Serviços e Itens</h3>
                                 <ul className="simple-list">
                                     {(os.itens || []).map(item => (
                                         <li key={item.cod_item_os}>
                                             <span>{item.quantidade}x {item.nome_servico || item.nome_produto}</span>
                                             <span>{formatCurrency(item.valor_total)}</span>
                                         </li>
                                     ))}
                                 </ul>
                                 <div className="total-os-preview">
                                    <strong>Total: {formatCurrency(os.valor_total_os)}</strong>
                                 </div>
                            </div>
                        </div>

                        {/* Checklist Inicial */}
                        <ChecklistSection 
                            title="Checklist de Verificação Inicial"
                            checklist={os.checklist_inicial}
                            isReadOnly={isInitialChecklistReadOnly}
                            onChecklistChange={handleChecklistChange}
                        />

                    </div>
                )}
                
                <div className="modal-footer">
                    <button className="button-secondary" onClick={onClose}>Fechar</button>
                    {os?.status_os === 'Aguardando Início' && (
                        <button className="button-success" onClick={handleStartService}>
                            Salvar e Iniciar Serviço
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrdemServicoPreview;