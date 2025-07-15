import React, { useEffect, useState, useContext } from 'react';
import api from '../utils/api';
// Importe seu contexto de autenticação se quiser checar permissões
// import { AuthContext } from '../context/AuthContext';

const ClientVehicles = ({ cod_cliente }) => {
  const [vehicles, setVehicles] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // const { user } = useContext(AuthContext); // Descomente se quiser checar permissões

  useEffect(() => {
    fetchClientVehicles();
    fetchAllVehicles();
  }, [cod_cliente]);

  const fetchClientVehicles = async () => {
    try {
      const res = await api.get(`/veiculos_clientes/${cod_cliente}`);
      setVehicles(res.data.filter(v => v.is_proprietario_atual));
    } catch (err) {
      setVehicles([]);
    }
  };

  const fetchAllVehicles = async () => {
    try {
      const res = await api.get('/veiculos');
      setAllVehicles(res.data);
    } catch (err) {
      setAllVehicles([]);
    }
  };

  const handleAddVehicle = async () => {
    if (!selectedVehicle) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/veiculos_clientes', { cod_veiculo: selectedVehicle, cod_cliente });
      setSelectedVehicle('');
      fetchClientVehicles();
    } catch (err) {
      setError(err.response?.data?.msg || 'Erro ao associar veículo');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVehicle = async (cod_veiculo) => {
    setLoading(true);
    setError('');
    try {
      await api.put('/veiculos_clientes/remover', { cod_veiculo, cod_cliente });
      fetchClientVehicles();
    } catch (err) {
      setError(err.response?.data?.msg || 'Erro ao remover veículo');
    } finally {
      setLoading(false);
    }
  };

  // const canEdit = user && ['admin', 'gerente'].includes(user.role); // Descomente se quiser checar permissões
  const canEdit = true; // Troque para a linha acima se usar AuthContext

  return (
    <div>
      <h4>Veículos do Cliente</h4>
      <ul>
        {vehicles.map(v => (
          <li key={v.cod_veiculo}>
            {v.marca} {v.modelo} ({v.placa})
            {canEdit && (
              <button onClick={() => handleRemoveVehicle(v.cod_veiculo)} disabled={loading}>Remover</button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <div>
          <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
            <option value="">Selecione um veículo para associar</option>
            {allVehicles.filter(v => !vehicles.some(own => own.cod_veiculo === v.cod_veiculo)).map(v => (
              <option key={v.cod_veiculo} value={v.cod_veiculo}>{v.marca} {v.modelo} ({v.placa})</option>
            ))}
          </select>
          <button onClick={handleAddVehicle} disabled={loading || !selectedVehicle}>Adicionar Veículo</button>
        </div>
      )}
      {error && <div style={{color:'red'}}>{error}</div>}
    </div>
  );
};

export default ClientVehicles;
