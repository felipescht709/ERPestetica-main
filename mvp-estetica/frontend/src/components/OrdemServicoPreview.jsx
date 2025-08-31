// src/components/OrdemServicoPreview.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import moment from 'moment';
import { toast } from 'react-toastify';
import { FileText, User, CheckSquare, X, Wrench } from 'lucide-react';

const OrdemServicoPreview = ({ osId, onClose, onServiceStarted }) => {
    const [os, setOs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOsDetails = useCallback(async () => {
        if (!osId) return;
        setLoading(true);
        setError(null);
        try {
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
            checklist: prevOs.checklist.map(item =>
                item.cod_item_checklist === itemId ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleStartService = async () => {
        const payload = {
            status_os: 'Em Andamento',
            checklist: os.checklist,
        };

        try {
            await api(`/ordens-servico/${osId}`, {
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
    const isReadOnly = os?.status_os !== 'Aguardando Início';

    return (
        <div className="modal-backdrop">
            <div className="modal-content large">
                <div className="modal-header">
                    {os ? (
                        <>
                            <h2><FileText size={24} /> Detalhes da OS #{os.cod_ordem_servico}</h2>
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
                        {/* Informações do Cliente e Veículo */}
                        <div className="section-content">
                            <h3 className="card-title"><User size={20} /> Cliente & Veículo</h3>
                            <p><strong>Cliente:</strong> {os.nome_cliente}</p>
                            {os.veiculo_placa && <p><strong>Veículo:</strong> {os.veiculo_modelo} ({os.veiculo_placa})</p>}
                            <p><strong>Responsável:</strong> {os.funcionario_responsavel_nome || 'Não definido'}</p>
                        </div>
                        
                        {/* Serviços e Itens */}
                        <div className="section-content">
                             <h3 className="card-title"><Wrench size={20} /> Serviços e Itens</h3>
                             <table className="simple-table">
                                 <thead>
                                     <tr>
                                         <th>Item</th>
                                         <th>Qtd.</th>
                                         <th>Valor Total</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {(os?.itens ?? []).map(item => (
                                         <tr key={item.cod_item_os}>
                                             <td>{item.nome_servico || item.nome_produto}</td>
                                             <td>{item.quantidade}</td>
                                             <td>{formatCurrency(item.valor_total)}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                             <div className="total-os">
                                <strong>Valor Total da OS: {formatCurrency(os.valor_total_os)}</strong>
                             </div>
                        </div>

                        {/* Checklist */}
                        <div className="section-content">
                            <h3 className="card-title"><CheckSquare size={20} /> Checklist de Verificação Inicial</h3>
                            <div className="checklist-container-modal">
                                {(os?.checklist ?? []).map(item => (
                                    <div key={item.cod_item_checklist} className="checklist-item-modal">
                                        <div className="checklist-control">
                                            <input
                                                type="checkbox"
                                                id={`check-modal-${item.cod_item_checklist}`}
                                                checked={item.concluido}
                                                disabled={isReadOnly}
                                                onChange={(e) => handleChecklistChange(item.cod_item_checklist, 'concluido', e.target.checked)}
                                            />
                                            <label htmlFor={`check-modal-${item.cod_item_checklist}`}>{item.descricao_item}</label>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Obs."
                                            className="input-field"
                                            value={item.observacoes || ''}
                                            disabled={isReadOnly}
                                            onChange={(e) => handleChecklistChange(item.cod_item_checklist, 'observacoes', e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="modal-footer">
                    <button className="button-secondary" onClick={onClose}>Fechar</button>
                    {os?.status_os === 'Aguardando Início' && (
                        <button className="button-success" onClick={handleStartService}>
                            Salvar Checklist e Iniciar Serviço
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrdemServicoPreview;