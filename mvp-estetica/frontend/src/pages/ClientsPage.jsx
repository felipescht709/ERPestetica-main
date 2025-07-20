// frontend/src/pages/ClientsPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../utils/api'; // Supondo que api.jsx está em ../utils/api
// Importar ícones do Lucide React
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import ClientVehicles from '../components/ClientVehicles';
import VehicleForm from '../components/VehicleForm'; // Importar o VehicleForm

const ClientsPage = () => {
    const [clients, setClients] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentClient, setCurrentClient] = useState({
        cod_cliente: null,
        cpf: '',
        nome_cliente: '',
        data_nascimento: '',
        email: '',
        telefone: '',
        genero: '',
        observacoes_gerais: '',
        indicado_por: '', // Pode ser null ou cod_cliente de outro cliente
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // Novo estado para o termo de busca
    const [showVehiclesModal, setShowVehiclesModal] = useState(false);
    const [selectedClientForVehicles, setSelectedClientForVehicles] = useState(null);

    // Estados para o modal de cadastro de veículo no cliente
    const [showVehicleFormModal, setShowVehicleFormModal] = useState(false);
    const [availableVehicles, setAvailableVehicles] = useState([]);
    const [selectedVehicleToLink, setSelectedVehicleToLink] = useState('');


    useEffect(() => {
        fetchClients();
        fetchAvailableVehicles(); // Buscar veículos para a lista de seleção
    }, []);

    const fetchClients = async () => {
        try {
            const clients = await api('/clientes', { method: 'GET' });
            setClients(clients);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            setError('Erro ao carregar clientes. Tente novamente.');
        }
    };

    const fetchAvailableVehicles = async () => {
        try {
            const res = await api('/veiculos', { method: 'GET' });
            setAvailableVehicles(res);
        } catch (err) {
            console.error('Erro ao buscar veículos disponíveis:', err);
            setAvailableVehicles([]); // Em caso de erro, limpa a lista
        }
    };


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentClient({ ...currentClient, [name]: value });
    };

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
        if (value.length > 11) value = value.slice(0, 11); // Limita a 11 dígitos para telefone

        if (value.length > 10) {
            value = value.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3'); // (XX) XXXXX-XXXX
        } else if (value.length > 5) {
            value = value.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3'); // (XX) XXXX-XXXX
        } else if (value.length > 2) {
            value = value.replace(/^(\d\d)(\d{0,5})/, '($1) $2'); // (XX) XXXXX
        } else {
            value = value.replace(/^(\d*)/, '($1');
        }
        setCurrentClient({ ...currentClient, telefone: value });
    };

    const handleCpfChange = (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
        if (value.length > 11) value = value.slice(0, 11); // Limita a 11 dígitos para CPF

        if (value.length > 9) {
            value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4'); // XXX.XXX.XXX-XX
        } else if (value.length > 6) {
            value = value.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3'); // XXX.XXX.XXX
        } else if (value.length > 3) {
            value = value.replace(/^(\d{3})(\d{0,3})/, '$1.$2'); // XXX.XXX
        }
        setCurrentClient({ ...currentClient, cpf: value });
    };

    const handleCepChange = async (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
        if (value.length > 8) value = value.slice(0, 8); // Limita a 8 dígitos para CEP

        if (value.length > 5) {
            value = value.replace(/^(\d{5})(\d{3}).*/, '$1-$2'); // XXXXX-XXX
        }
        setCurrentClient({ ...currentClient, cep: value });

        if (value.length === 9) { // Quando o CEP estiver completo
            try {
                const response = await fetch(`https://viacep.com.br/ws/${value.replace('-', '')}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setCurrentClient((prev) => ({
                        ...prev,
                        logradouro: data.logradouro,
                        bairro: data.bairro,
                        cidade: data.localidade,
                        uf: data.uf,
                    }));
                } else {
                    setMessage('CEP não encontrado.');
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
                setError('Erro ao buscar CEP. Tente novamente.');
            }
        }
    };

    const validateForm = () => {
        const { cpf, nome_cliente, telefone } = currentClient;
        if (!cpf || !nome_cliente || !telefone) {
            setError('CPF, Nome do Cliente e Telefone são campos obrigatórios.');
            return false;
        }
        // Basic CPF format check
        if (cpf.replace(/\D/g, '').length !== 11) {
            setError('CPF inválido. Deve conter 11 dígitos.');
            return false;
        }
        // Basic Phone format check
        if (telefone.replace(/\D/g, '').length < 10) {
            setError('Telefone inválido. Mínimo de 10 dígitos.');
            return false;
        }
        // Basic email format check
        if (currentClient.email && !/\S+@\S+\.\S+/.test(currentClient.email)) {
            setError('Formato de e-mail inválido.');
            return false;
        }
        setError('');
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const clientToSave = { ...currentClient };
        // Cleanse data for backend submission
        clientToSave.cpf = clientToSave.cpf.replace(/\D/g, '');
        clientToSave.telefone = clientToSave.telefone.replace(/\D/g, '');
        clientToSave.cep = clientToSave.cep.replace(/\D/g, '');

        // Handle empty strings for optional fields that might be NULL in DB
        // Certifique-se de que campos opcionais vazios sejam enviados como null, não como string vazia
        Object.keys(clientToSave).forEach(key => {
            if (clientToSave[key] === '') {
                clientToSave[key] = null;
            }
        });


        try {
            let savedClient;
            if (isEditing) {
                await api(`/clientes/${currentClient.cod_cliente}`, {
                    method: 'PUT',
                    body: JSON.stringify(clientToSave),
                });
                setMessage('Cliente atualizado com sucesso!');
                savedClient = { ...currentClient }; // Usar o cliente atualizado para a vinculação
            } else {
                const res = await api('/clientes', {
                    method: 'POST',
                    body: JSON.stringify(clientToSave),
                });
                setMessage('Cliente adicionado com sucesso!');
                savedClient = res;
            }

            // Vincula veículo ao cliente se selecionado
            if (selectedVehicleToLink && savedClient.cod_cliente) {
                await api('/veiculos_clientes', { // Correção: o 'api' não é um objeto com método 'post', é uma função
                    method: 'POST',
                    body: JSON.stringify({
                        cod_veiculo: selectedVehicleToLink,
                        cod_cliente: savedClient.cod_cliente
                    }),
                });
                setMessage(prev => prev + ` Veículo vinculado com sucesso!`);
            }

            fetchClients();
            closeModal();
        } catch (err) {
            console.error('Erro ao salvar cliente:', err);
            setError(err.message || 'Erro ao salvar cliente. Verifique os dados e tente novamente.');
        }
    };

    const handleAddClick = () => {
        setIsEditing(false);
        setCurrentClient({
            cod_cliente: null,
            cpf: '',
            nome_cliente: '',
            data_nascimento: '',
            email: '',
            telefone: '',
            genero: '',
            observacoes_gerais: '',
            indicado_por: '',
            cep: '',
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            uf: '',
        });
        setSelectedVehicleToLink(''); // Limpa a seleção do veículo ao adicionar novo cliente
        setMessage('');
        setError('');
        setShowModal(true);
    };

    const handleEditClick = (client) => {
        setIsEditing(true);
        const formattedClient = { ...client };
        if (formattedClient.data_nascimento) {
            const date = new Date(formattedClient.data_nascimento);
            formattedClient.data_nascimento = date.toISOString().split('T')[0]; // Adjust for YYYY-MM-DD
        }

        formattedClient.cpf = client.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        formattedClient.telefone = client.telefone.replace(/^(\d\d)(\d{5})(\d{4})$/, '($1) $2-$3');
        formattedClient.cep = client.cep ? client.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : ''; // Handle null cep

        setCurrentClient(formattedClient);
        setSelectedVehicleToLink(''); // Limpa a seleção do veículo ao editar cliente
        setMessage('');
        setError('');
        setShowModal(true);
    };

    const handleDeleteClick = async (cod_cliente) => {
        if (window.confirm('Tem certeza que deseja desativar este cliente? Clientes desativados não aparecerão nas buscas ativas, mas seu histórico será mantido.')) {
            try {
                await api(`/clientes/${cod_cliente}`, { method: 'DELETE' });
                setMessage('Cliente desativado com sucesso!');
                fetchClients();
            } catch (err) {
                console.error('Erro ao desativar cliente:', err);
                setError('Erro ao desativar cliente. Tente novamente mais tarde.');
            }
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setMessage('');
        setError('');
    };

    // Callback para quando um veículo é criado no modal aninhado
    const handleVehicleCreatedInModal = (newVehicle) => {
        setMessage(`Veículo ${newVehicle.placa} cadastrado com sucesso! Agora você pode vinculá-lo.`);
        fetchAvailableVehicles(); // Recarregar a lista de veículos disponíveis
        setSelectedVehicleToLink(newVehicle.cod_veiculo); // Pré-selecionar o veículo recém-criado
        setShowVehicleFormModal(false); // Fechar o modal de cadastro de veículo
    };

    // Filtra clientes com base no termo de busca
    const filteredClients = clients.filter(client =>
        client.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.cpf.includes(searchTerm) ||
        client.telefone.includes(searchTerm) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2>Gerenciamento de Clientes</h2>
                <button className="btn-primary-dark" onClick={handleAddClick}>
                    <Plus size={20} />
                    Novo Cliente
                </button>
            </div>

            {message && <div className="alert success">{message}</div>}
            {error && <div className="alert error">{error}</div>}

            <div className="search-input-container">
                <Search size={20} className="search-icon" />
                <input
                    type="text"
                    placeholder="Buscar clientes por nome, CPF, telefone ou email..."
                    className="input-field"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="table-responsive section-content">
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th>CPF</th>
                            <th>Nome</th>
                            <th>Telefone</th>
                            <th>Email</th>
                            <th>Último Serviço</th>
                            <th>Total Gasto</th>
                            <th>Ações</th>
                            <th>Veículos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.length > 0 ? (
                            filteredClients.map((client) => (
                                <tr key={client.cod_cliente}>
                                    <td>{client.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')}</td>
                                    <td>{client.nome_cliente}</td>
                                    <td>{client.telefone.replace(/^(\d\d)(\d{5})(\d{4})$/, '($1) $2-$3')}</td>
                                    <td>{client.email || 'N/A'}</td>
                                    <td>{client.ultimo_servico ? new Date(client.ultimo_servico).toLocaleDateString() : 'N/A'}</td>
                                    <td>R$ {Number(client.total_gasto || 0).toFixed(2).replace('.', ',')}</td>
                                    <td className="actions">
                                        <button
                                            onClick={() => handleEditClick(client)}
                                            className="btn-action"
                                            title="Editar"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(client.cod_cliente)}
                                            className="btn-action btn-delete"
                                            title="Desativar Cliente"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                    <td>
                                        <button onClick={() => { setSelectedClientForVehicles(client.cod_cliente); setShowVehiclesModal(true); }} className="btn-action">Ver Veículos</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="empty-state-table">Nenhum cliente encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>{isEditing ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</h3>
                        {error && <div className="alert error">{error}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group half-width">
                                    <label htmlFor="cpf">CPF:</label>
                                    <input
                                        type="text"
                                        id="cpf"
                                        name="cpf"
                                        value={currentClient.cpf}
                                        onChange={handleCpfChange}
                                        maxLength="14"
                                        placeholder="XXX.XXX.XXX-XX"
                                        required
                                        className="input-field"
                                        disabled={isEditing} // CPF não editável para evitar inconsistências
                                    />
                                </div>
                                <div className="form-group half-width">
                                    <label htmlFor="nome_cliente">Nome do Cliente:</label>
                                    <input
                                        type="text"
                                        id="nome_cliente"
                                        name="nome_cliente"
                                        value={currentClient.nome_cliente}
                                        onChange={handleInputChange}
                                        required
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group half-width">
                                    <label htmlFor="data_nascimento">Data de Nascimento:</label>
                                    <input
                                        type="date"
                                        id="data_nascimento"
                                        name="data_nascimento"
                                        value={currentClient.data_nascimento}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                                <div className="form-group half-width">
                                    <label htmlFor="email">Email:</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={currentClient.email}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group half-width">
                                    <label htmlFor="telefone">Telefone:</label>
                                    <input
                                        type="text"
                                        id="telefone"
                                        name="telefone"
                                        value={currentClient.telefone}
                                        onChange={handlePhoneChange}
                                        maxLength="15"
                                        placeholder="(XX) XXXXX-XXXX"
                                        required
                                        className="input-field"
                                    />
                                </div>
                                <div className="form-group half-width">
                                    <label htmlFor="genero">Gênero:</label>
                                    <select
                                        id="genero"
                                        name="genero"
                                        value={currentClient.genero}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    >
                                        <option value="">Selecione</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Feminino">Feminino</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="observacoes_gerais">Observações Gerais:</label>
                                <textarea
                                    id="observacoes_gerais"
                                    name="observacoes_gerais"
                                    value={currentClient.observacoes_gerais}
                                    onChange={handleInputChange}
                                    className="input-field"
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label htmlFor="cep">CEP:</label>
                                <input
                                    type="text"
                                    id="cep"
                                    name="cep"
                                    value={currentClient.cep}
                                    onChange={handleCepChange}
                                    maxLength="9"
                                    placeholder="XXXXX-XXX"
                                    className="input-field"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="logradouro">Logradouro:</label>
                                <input
                                    type="text"
                                    id="logradouro"
                                    name="logradouro"
                                    value={currentClient.logradouro}
                                    onChange={handleInputChange}
                                    className="input-field"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group half-width">
                                    <label htmlFor="numero">Número:</label>
                                    <input
                                        type="text"
                                        id="numero"
                                        name="numero"
                                        value={currentClient.numero}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                                <div className="form-group half-width">
                                    <label htmlFor="complemento">Complemento:</label>
                                    <input
                                        type="text"
                                        id="complemento"
                                        name="complemento"
                                        value={currentClient.complemento}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group half-width">
                                    <label htmlFor="bairro">Bairro:</label>
                                    <input
                                        type="text"
                                        id="bairro"
                                        name="bairro"
                                        value={currentClient.bairro}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                                <div className="form-group half-width">
                                    <label htmlFor="cidade">Cidade:</label>
                                    <input
                                        type="text"
                                        id="cidade"
                                        name="cidade"
                                        value={currentClient.cidade}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="uf">UF:</label>
                                <input
                                    type="text"
                                    id="uf"
                                    name="uf"
                                    maxLength="2"
                                    value={currentClient.uf}
                                    onChange={handleInputChange}
                                    className="input-field"
                                />
                            </div>
                            <div className="form-group">
                                <label>Vincular a um Veículo Existente:</label>
                                <select
                                    value={selectedVehicleToLink}
                                    onChange={e => setSelectedVehicleToLink(Number(e.target.value))}
                                    className="input-field"
                                >
                                    <option value="">Selecione um veículo</option>
                                    {availableVehicles.map(v => (
                                        <option key={v.cod_veiculo} value={v.cod_veiculo}>{v.marca} {v.modelo} ({v.placa})</option>
                                    ))}
                                </select>
                                <button type="button" onClick={() => setShowVehicleFormModal(true)} className="button-secondary" style={{marginLeft:8}}>
                                    Cadastrar Novo Veículo
                                </button>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="button-primary">
                                    {isEditing ? 'Salvar Alterações' : 'Adicionar Cliente'}
                                </button>
                                <button type="button" onClick={closeModal} className="button-secondary">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                    {/* Modal para cadastro de veículo dentro do modal de cliente */}
                    {showVehicleFormModal && (
                        <div className="modal-backdrop" style={{zIndex: 1200}}>
                            <div className="modal-content">
                                <VehicleForm
                                    onClose={() => setShowVehicleFormModal(false)}
                                    onVehicleCreated={handleVehicleCreatedInModal}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de veículos do cliente */}
            {showVehiclesModal && ( 
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>Veículos do Cliente</h3>
                        <ClientVehicles
                            cod_cliente={selectedClientForVehicles}
                            onVehicleRemoved={fetchClients} // Recarrega clientes ao remover posse de um veículo
                        />
                        <div className="form-actions">
                            <button type="button" onClick={() => setShowVehiclesModal(false)} className="button-secondary">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientsPage;