import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import moment from 'moment';
import { Spinner } from 'react-bootstrap';
import { CalendarClock, AlertCircle, Info } from 'lucide-react';

const ProximosAgendamentos = () => {
    const [agendamentos, setAgendamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProximosAgendamentos = async () => {
            setLoading(true);
            setError(null);
            try {
                // Define o intervalo para o dia de hoje
                const hojeInicio = moment().startOf('day').toISOString();
                const hojeFim = moment().endOf('day').toISOString();

                // CORREÇÃO: Busca agendamentos de hoje com status 'agendado' ou 'em_andamento'
                const response = await api(`/agendamentos?start=${hojeInicio}&end=${hojeFim}&status=agendado,em_andamento`, { method: 'GET' });
                
                // Filtra para pegar apenas os que ainda não aconteceram e ordena
                const agora = moment();
                const proximos = response
                    .filter(ag => moment(ag.start).isAfter(agora))
                    .sort((a, b) => moment(a.start).diff(moment(b.start)));

                setAgendamentos(proximos);
            } catch (err) {
                console.error("Erro ao buscar próximos agendamentos:", err);
                setError(err.msg || "Não foi possível carregar os agendamentos.");
            } finally {
                setLoading(false);
            }
        };

        fetchProximosAgendamentos();
        // Opcional: Recarregar a cada 5 minutos
        const intervalId = setInterval(fetchProximosAgendamentos, 300000); 
        return () => clearInterval(intervalId); // Limpa o intervalo ao desmontar
    }, []);

    const renderContent = () => {
        if (loading) {
            return <div className="text-center p-4"><Spinner animation="border" size="sm" /> Carregando...</div>;
        }
        if (error) {
            return <div className="alert alert-danger d-flex align-items-center"><AlertCircle className="me-2" /> {error}</div>;
        }
        if (agendamentos.length === 0) {
            return <div className="text-center p-4 text-muted d-flex align-items-center justify-content-center"><Info className="me-2" /> Nenhum próximo agendamento para hoje.</div>;
        }
        return (
            <ul className="list-group list-group-flush">
                {agendamentos.slice(0, 5).map(ag => ( // Mostra no máximo os próximos 5
                    <li key={ag.cod_agendamento} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong className="d-block" style={{color: ag.backgroundColor}}>{moment(ag.start).format('HH:mm')} - {ag.title}</strong>
                            <small className="text-muted">{ag.nome_servico}</small>
                        </div>
                        <span className="badge bg-primary rounded-pill">{ag.usuario_responsavel_nome || 'N/A'}</span>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="card shadow-sm">
            <div className="card-header d-flex align-items-center">
                <CalendarClock className="me-2" />
                <h5 className="mb-0">Próximos Agendamentos do Dia</h5>
            </div>
            {renderContent()}
        </div>
    );
};

export default ProximosAgendamentos;
