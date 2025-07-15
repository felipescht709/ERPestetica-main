// src/components/Relatorios.jsx
import React from 'react';
import DashboardMetrics from './DashboardMetrics'; 
import '../styles/relatorios.css'; 

const RelatoriosComponent = ({ reportType, data, startDate, endDate, appointmentStatus, serviceCategory, responsibleUser }) => {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const formatDateTime = (dateTimeString) => {
        return new Date(dateTimeString).toLocaleString('pt-BR');
    };

    const renderReportContent = () => {
        if (!data || data.length === 0) {
            return <p>Nenhum dado encontrado para este relatório com os filtros selecionados.</p>;
        }

        switch (reportType) {
            case 'dashboard':
                // O componente DashboardMetrics espera a data diretamente, não em um array
                return <DashboardMetrics metrics={data} />;

            case 'agendamentos':
                return (
                    <div className="report-table-container">
                        <h3>Relatório de Agendamentos ({appointmentStatus || 'Todos'}) de {formatDate(startDate)} a {formatDate(endDate)}</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Cód. Agendamento</th>
                                    <th>Início</th>
                                    <th>Fim</th>
                                    <th>Preço Total</th>
                                    <th>Status</th>
                                    <th>Cliente</th>
                                    <th>Serviço</th>
                                    <th>Responsável</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(appointment => (
                                    <tr key={appointment.cod_agendamento}>
                                        <td>{appointment.cod_agendamento}</td>
                                        <td>{formatDateTime(appointment.data_hora_inicio)}</td>
                                        <td>{appointment.data_hora_fim ? formatDateTime(appointment.data_hora_fim) : 'N/A'}</td>
                                        <td>{formatCurrency(appointment.preco_total)}</td>
                                        <td>{appointment.status}</td>
                                        <td>{appointment.cliente_nome}</td>
                                        <td>{appointment.servico_nome}</td>
                                        <td>{appointment.responsavel_nome}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'clientes':
                return (
                    <div className="report-table-container">
                        <h3>Relatório de Clientes</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Cód. Cliente</th>
                                    <th>Nome</th>
                                    <th>CPF</th>
                                    <th>Telefone</th>
                                    <th>Email</th>
                                    <th>Ativo</th>
                                    <th>Total Gasto</th>
                                    <th>Último Serviço</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(client => (
                                    <tr key={client.cod_cliente}>
                                        <td>{client.cod_cliente}</td>
                                        <td>{client.nome_cliente}</td>
                                        <td>{client.cpf}</td>
                                        <td>{client.telefone}</td>
                                        <td>{client.email}</td>
                                        <td>{client.ativo ? 'Sim' : 'Não'}</td>
                                        <td>{formatCurrency(client.total_gasto || 0)}</td>
                                        <td>{client.ultimo_servico ? formatDate(client.ultimo_servico) : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'servicos':
                return (
                    <div className="report-table-container">
                        <h3>Relatório de Serviços ({serviceCategory || 'Todos'})</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Cód. Serviço</th>
                                    <th>Nome</th>
                                    <th>Preço</th>
                                    <th>Duração (min)</th>
                                    <th>Categoria</th>
                                    <th>Ativo</th>
                                    <th>Custo Material</th>
                                    <th>Custo Mão Obra</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(service => (
                                    <tr key={service.cod_servico}>
                                        <td>{service.cod_servico}</td>
                                        <td>{service.nome_servico}</td>
                                        <td>{formatCurrency(service.preco)}</td>
                                        <td>{service.duracao_minutos}</td>
                                        <td>{service.categoria}</td>
                                        <td>{service.ativo ? 'Sim' : 'Não'}</td>
                                        <td>{formatCurrency(service.custo_material || 0)}</td>
                                        <td>{formatCurrency(service.custo_mao_de_obra || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'financeiro':
                // O endpoint /financeiro/resumo retorna um único objeto com os totais
                const financialSummary = data[0] || {};
                return (
                    <div className="report-summary-container">
                        <h3>Resumo Financeiro de {formatDate(startDate)} a {formatDate(endDate)}</h3>
                        <p>Receita Total: <strong>{formatCurrency(financialSummary.total_revenue || 0)}</strong></p>
                        <p>Custo de Material: <strong>{formatCurrency(financialSummary.total_material_cost || 0)}</strong></p>
                        <p>Custo de Mão de Obra: <strong>{formatCurrency(financialSummary.total_labor_cost || 0)}</strong></p>
                        <p>Lucro Líquido: <strong>{formatCurrency((financialSummary.total_revenue - financialSummary.total_material_cost - financialSummary.total_labor_cost) || 0)}</strong></p>
                    </div>
                );

            case 'usuarios':
                return (
                    <div className="report-table-container">
                        <h3>Relatório de Usuários</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Cód. Usuário</th>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Função</th>
                                    <th>Ativo</th>
                                    <th>Empresa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(user => (
                                    <tr key={user.cod_usuario}>
                                        <td>{user.cod_usuario}</td>
                                        <td>{user.nome_usuario}</td>
                                        <td>{user.email}</td>
                                        <td>{user.role}</td>
                                        <td>{user.ativo ? 'Sim' : 'Não'}</td>
                                        <td>{user.nome_empresa}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            default:
                return <p>Selecione um tipo de relatório.</p>;
        }
    };

    return (
        <div className="relatorios-content">
            {renderReportContent()}
        </div>
    );
};

export default RelatoriosComponent;