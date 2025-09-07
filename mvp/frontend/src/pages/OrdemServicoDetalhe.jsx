// frontend/src/pages/OrdemServicoDetalhe.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import moment from 'moment';
import { toast } from 'react-toastify';
import { FileText, User, Car, Tool, CheckSquare, DollarSign, Calendar, ArrowLeft } from 'lucide-react';

const OrdemServicoDetalhe = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [os, setOs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOsDetails = useCallback(async () => {
        setLoading(true);
        try {
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
            await api(`/ordens-servico/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            toast.success('Serviço iniciado com sucesso!');
            fetchOsDetails(); // Recarrega os dados para refletir o novo status
        } catch (err) {
            console.error("Erro ao iniciar serviço:", err);
            toast.error(err.msg || 'Não foi possível iniciar o serviço.');
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    if (loading) return <div className="loading-screen">Carregando Ordem de Serviço...</div>;
    if (error) return <div className="alert error">{error}</div>;
    if (!os) return <div className="alert info">Ordem de Serviço não encontrada.</div>;

    const isReadOnly = os.status_os !== 'Aguardando Início';

    return (
        <div className="page-container">
            <div className="page-section-header">
                <button onClick={() => navigate('/ordens-servico')} className="btn-back">
                    <ArrowLeft size={20} /> Voltar
                </button>
                <h2><FileText size={28} /> Detalhes da OS #{os.cod_ordem_servico}</h2>
                <span className={`status-badge status-${os.status_os.toLowerCase().replace(' ', '-')}`}>{os.status_os}</span>
            </div>

            <div className="os-details-grid">
                {/* Card Cliente e Veículo */}
                <div className="section-content">
                    <h3 className="card-title"><User size={20} /> Cliente & Veículo</h3>
                    <p><strong>Cliente:</strong> {os.nome_cliente}</p>
                    {os.veiculo_placa && <p><strong>Veículo:</strong> {os.veiculo_modelo} ({os.veiculo_placa})</p>}
                    <p><strong>Responsável:</strong> {os.funcionario_responsavel_nome || 'Não definido'}</p>
                </div>

                {/* Card Datas e Prazos */}
                <div className="section-content">
                    <h3 className="card-title"><Calendar size={20} /> Prazos</h3>
                    <p><strong>Abertura:</strong> {moment(os.data_abertura).format('DD/MM/YYYY HH:mm')}</p>
                    <p><strong>Previsão de Conclusão:</strong> {moment(os.data_conclusao_prevista).format('DD/MM/YYYY HH:mm')}</p>
                    {os.data_conclusao_efetiva && <p><strong>Concluído em:</strong> {moment(os.data_conclusao_efetiva).format('DD/MM/YYYY HH:mm')}</p>}
                </div>

                {/* Card Serviços e Produtos */}
                <div className="section-content full-width">
                    <h3 className="card-title"><Tool size={20} /> Serviços e Itens</h3>
                    <table className="simple-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Tipo</th>
                                <th>Qtd.</th>
                                <th>Valor Unit.</th>
                                <th>Valor Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {os.itens.map(item => (
                                <tr key={item.cod_item_os}>
                                    <td>{item.nome_servico || item.nome_produto}</td>
                                    <td>{item.tipo_item}</td>
                                    <td>{item.quantidade}</td>
                                    <td>{formatCurrency(item.valor_unitario)}</td>
                                    <td>{formatCurrency(item.valor_total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="total-os">
                        <strong>Valor Total da OS: {formatCurrency(os.valor_total_os)}</strong>
                    </div>
                </div>

                {/* Card Checklist Inicial */}
                <div className="section-content full-width">
                    <h3 className="card-title"><CheckSquare size={20} /> Checklist de Verificação Inicial</h3>
                    <div className="checklist-container">
                        {os.checklist.map(item => (
                            <div key={item.cod_item_checklist} className="checklist-item">
                                <div className="checklist-control">
                                    <input
                                        type="checkbox"
                                        id={`check-${item.cod_item_checklist}`}
                                        checked={item.concluido}
                                        disabled={isReadOnly}
                                        onChange={(e) => handleChecklistChange(item.cod_item_checklist, 'concluido', e.target.checked)}
                                    />
                                    <label htmlFor={`check-${item.cod_item_checklist}`}>{item.descricao_item}</label>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Observações (opcional)"
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

            <div className="os-actions">
                {os.status_os === 'Aguardando Início' && (
                    <button className="button-success" onClick={handleStartService}>
                        Salvar Checklist e Iniciar Serviço
                    </button>
                )}
                {os.status_os === 'Em Andamento' && (
                    <button className="button-primary" onClick={() => { /* Lógica para concluir */ }}>
                        Concluir Serviço
                    </button>
                )}
            </div>

            <style jsx>{`
                .os-details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                    margin-top: 1.5rem;
                }
                .full-width {
                    grid-column: 1 / -1;
                }
                .card-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 0.5rem;
                }
                .checklist-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .checklist-item {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    align-items: center;
                }
                .checklist-control {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .checklist-control input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                }
                .total-os {
                    text-align: right;
                    font-size: 1.2rem;
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid #eee;
                }
                .os-actions {
                    margin-top: 2rem;
                    display: flex;
                    justify-content: flex-end;
                }
            `}</style>
        </div>
    );
};

export default OrdemServicoDetalhe;