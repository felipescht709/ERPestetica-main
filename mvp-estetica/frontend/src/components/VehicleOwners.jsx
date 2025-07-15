import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const VehicleOwners = ({ cod_veiculo }) => {
  const [owners, setOwners] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOwners();
    fetchClientes();
  }, [cod_veiculo]);

  const fetchOwners = async () => {
    try {
      const res = await api.get(`/veiculos_clientes/${cod_veiculo}`);
      setOwners(res.data);
    } catch (err) {
      setOwners([]);
    }
  };

  const fetchClientes = async () => {
    try {
      const res = await api.get('/clientes');
      setClientes(res.data);
    } catch (err) {
      setClientes([]);
    }
  };

  const handleAddOwner = async () => {
    if (!selectedCliente) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/veiculos_clientes', { cod_veiculo, cod_cliente: selectedCliente });
      setSelectedCliente('');
      fetchOwners();
    } catch (err) {
      setError(err.response?.data?.msg || 'Erro ao adicionar proprietário');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOwner = async (cod_cliente) => {
    setLoading(true);
    setError('');
    try {
      await api.put('/veiculos_clientes/remover', { cod_veiculo, cod_cliente });
      fetchOwners();
    } catch (err) {
      setError(err.response?.data?.msg || 'Erro ao remover proprietário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h4>Proprietários do Veículo</h4>
      <ul>
        {owners.map((o) => (
          <li key={o.cod_cliente}>
            {o.nome_cliente} {o.is_proprietario_atual ? '(Atual)' : ''}
            {o.is_proprietario_atual && (
              <button onClick={() => handleRemoveOwner(o.cod_cliente)} disabled={loading}>Remover</button>
            )}
            <span style={{fontSize:'0.8em',color:'#888'}}> Início: {o.data_inicio_posse && o.data_inicio_posse.substring(0,10)}
              {o.data_fim_posse && ` | Fim: ${o.data_fim_posse.substring(0,10)}`}
            </span>
          </li>
        ))}
      </ul>
      <div>
        <select value={selectedCliente} onChange={e => setSelectedCliente(e.target.value)}>
          <option value="">Selecione um cliente</option>
          {clientes.map(c => <option key={c.cod_cliente} value={c.cod_cliente}>{c.nome_cliente}</option>)}
        </select>
        <button onClick={handleAddOwner} disabled={loading || !selectedCliente}>Adicionar Proprietário</button>
      </div>
      {error && <div style={{color:'red'}}>{error}</div>}
    </div>
  );
};

export default VehicleOwners;
