// frontend/src/pages/OrdemServicoDetalhe.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { FileText, User, Tool, CheckSquare, Calendar, ArrowLeft } from 'lucide-react';


// Reutilizando o componente de Checklist
const ChecklistSection = ({ title, checklist, isReadOnly, onChecklistChange }) => (
    <div className="section-content full-width">
        <h3 className="card-title"><CheckSquare size={20} /> {title}</h3>
         {(!checklist || checklist.length === 0) ? (
            <p className="empty-state-text">Nenhum item de checklist configurado para esta etapa.</p>
        ) : (
            <div className="checklist-container">
                {checklist.map(item => (
                    <div key={item.cod_item_checklist} className="checklist-item">
                        <div className="checklist-control">
                            <input
                                type="checkbox"
                                id={`check-detail-${item.cod_item_checklist}`}
                                checked={!!item.concluido}
                                disabled={isReadOnly}
                                onChange={(e) => onChecklistChange(item.cod_item_checklist, 'concluido', e.target.checked)}
                            />
                            <label htmlFor={`check-detail-${item.cod_item_checklist}`}>{item.descricao_item}</label>
                        </div>
                        <input
                            type="text"
                            placeholder="Observações"
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


const OrdemServicoDetalhe = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [os, setOs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOsDetails = useCallback(async () => {
        setLoading(true);
        try {
            // Sua API deve retornar a OS com 'checklist_inicial' e 'checklist_final'
            const data = await api(`/ordens-servico/${id}`);
            setOs(data);
        } catch (err) {
            console.error("Erro ao buscar detalhes da OS:", err);
            setError(err.message || 'Não foi possível carregar os detalhes da OS.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchOsDetails();
    }, [fetchOsDetails]);

    const handleFinalChecklistChange = (itemId, field, value) => {
        setOs(prevOs => ({
            ...prevOs,
            checklist_final: prevOs.checklist_final.map(item =>
                item.cod_item_checklist === itemId ? { ...item, [field]: value } : item
            )
        }));
    };
    
    const handleConcludeService = async () => {
        const isChecklistComplete = os.checklist_final.every(item => item.concluido);
        if (!isChecklistComplete) {
            toast.warn('Por favor, marque todos os itens do checklist final para concluir.');
            return;
        }

        const payload = {
            status_os: 'Concluída',
            checklist_final: os.checklist_final,
        };

        try {
            await api(`/ordens-servico/${id}/concluir`, { // Rota sugerida para concluir
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            toast.success('Serviço concluído com sucesso!');
            fetchOsDetails(); // Recarrega os dados para refletir o novo status
        } catch (err) {
            console.error("Erro ao concluir serviço:", err);
            toast.error(err.msg || 'Não foi possível concluir o serviço.');
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    if (loading) return <div className="loading-screen">Carregando Ordem de Serviço...</div>;
    if (error) return <div className="alert error">{error}</div>;
    if (!os) return <div className="alert info">Ordem de Serviço não encontrada.</div>;

    const isFinalChecklistReadOnly = os.status_os !== 'Em Andamento';

    return (
        <div className="page-container">
            <div className="page-section-header">
                <button onClick={() => navigate('/ordens-servico')} className="btn-back">
                    <ArrowLeft size={20} /> Voltar
                </button>
                <h2><FileText size={28} /> Detalhes da OS #{os.cod_ordem_servico}</h2>
                <span className={`status-badge status-${os.status_os.toLowerCase().replace(/ /g, '-')}`}>{os.status_os}</span>
            </div>

            <div className="os-details-grid">
                {/* Cards Cliente, Prazos, Serviços e Produtos... */}
                {/* ... (mantenha seus cards de detalhes aqui) ... */}

                {/* Checklist Inicial (Sempre Read-Only na tela de detalhes) */}
                <ChecklistSection 
                    title="Checklist Inicial (Registro de Entrada)"
                    checklist={os.checklist_inicial}
                    isReadOnly={true}
                    onChecklistChange={() => {}} // Não faz nada, pois é somente leitura
                />

                {/* Checklist Final (Aparece após o início, editável 'Em Andamento') */}
                {os.status_os !== 'Aguardando Início' && (
                     <ChecklistSection 
                        title="Checklist Final (Controle de Qualidade)"
                        checklist={os.checklist_final}
                        isReadOnly={isFinalChecklistReadOnly}
                        onChecklistChange={handleFinalChecklistChange}
                    />
                )}
            </div>

            <div className="os-actions">
                {os.status_os === 'Em Andamento' && (
                    <button className="button-primary" onClick={handleConcludeService}>
                        Salvar Checklist e Concluir Serviço
                    </button>
                )}
                 {/* Adicione outros botões de ação aqui, como para cancelar ou reabrir a OS */}
            </div>
            
            {/* ... (seu bloco <style jsx>) ... */}
        </div>
    );
};

export default OrdemServicoDetalhe;