import React, { useState } from 'react';
import api from '../utils/api';

const VehicleForm = ({ onVehicleCreated }) => {
  const [form, setForm] = useState({ marca: '', modelo: '', cor: '', placa: '', ano_fabricacao: '', observacoes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/veiculos', form);
      onVehicleCreated(res.data); // retorna o veículo criado
      setForm({ marca: '', modelo: '', cor: '', placa: '', ano_fabricacao: '', observacoes: '' });
    } catch (err) {
      setError(err.response?.data?.msg || 'Erro ao cadastrar veículo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Cadastrar Veículo</h3>
      <input name="marca" placeholder="Marca" value={form.marca} onChange={handleChange} required />
      <input name="modelo" placeholder="Modelo" value={form.modelo} onChange={handleChange} required />
      <input name="cor" placeholder="Cor" value={form.cor} onChange={handleChange} />
      <input name="placa" placeholder="Placa" value={form.placa} onChange={handleChange} required />
      <input name="ano_fabricacao" placeholder="Ano de Fabricação" value={form.ano_fabricacao} onChange={handleChange} />
      <input name="observacoes" placeholder="Observações" value={form.observacoes} onChange={handleChange} />
      <button type="submit" disabled={loading}>Salvar</button>
      {error && <div style={{color:'red'}}>{error}</div>}
    </form>
  );
};

export default VehicleForm;
